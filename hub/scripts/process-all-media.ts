/**
 * Script to batch process all pending media items
 * Downloads media, transcribes audio, and creates embeddings
 * Run with: npx tsx hub/scripts/process-all-media.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProcessingStats {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; title: string; error: string }>;
}

/**
 * Process a single media item
 */
async function processMediaItem(mediaItem: any, baseUrl: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`\n📥 Processing: ${mediaItem.title}`);
    console.log(`   URL: ${mediaItem.source_url}`);
    console.log(`   Type: ${mediaItem.media_type}`);

    // Create AbortController with 30-minute timeout for large audio files
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000); // 30 minutes

    const response = await fetch(`${baseUrl}/api/media/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaItemId: mediaItem.id,
        steps: ['download', 'transcribe', 'embed'],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const result = await response.json();

    if (result.success) {
      console.log('   ✅ Success!');
      if (result.results.download) {
        console.log(`      Download: ${result.results.download.success ? '✓' : '✗'}`);
      }
      if (result.results.transcribe) {
        console.log(`      Transcribe: ${result.results.transcribe.success ? '✓' : '✗'} (${result.results.transcribe.wordCount || 0} words)`);
      }
      if (result.results.embed) {
        console.log(`      Embeddings: ${result.results.embed.success ? '✓' : '✗'} (${result.results.embed.embeddingCount || 0} chunks)`);
      }
      return { success: true };
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    // Provide clearer error message for timeout/abort errors
    if (error.name === 'AbortError') {
      const errorMsg = 'Request timeout (exceeded 30 minutes) - file may be too large';
      console.log(`   ❌ Error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main processing function
 */
async function processAllMedia(options: {
  filter?: 'pending' | 'failed' | 'all';
  limit?: number;
  concurrency?: number;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3080';
  const { filter = 'pending', limit, concurrency = 1 } = options;

  console.log('🎬 Media Processing Pipeline');
  console.log('=============================');
  console.log(`Server: ${baseUrl}`);
  console.log(`Filter: ${filter}`);
  console.log(`Concurrency: ${concurrency}`);
  if (limit) console.log(`Limit: ${limit}`);
  console.log('');

  // Build query
  let query = supabase.from('media_items').select('*');

  if (filter === 'pending') {
    query = query.or('download_status.eq.pending,transcription_status.eq.pending,embedding_status.eq.pending');
  } else if (filter === 'failed') {
    query = query.or('download_status.eq.failed,transcription_status.eq.failed,embedding_status.eq.failed');
  }

  query = query.order('created_at', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  // Fetch media items
  const { data: mediaItems, error } = await query;

  if (error) {
    console.error('❌ Error fetching media items:', error);
    return;
  }

  if (!mediaItems || mediaItems.length === 0) {
    console.log('✅ No media items to process!');
    return;
  }

  console.log(`📋 Found ${mediaItems.length} media items to process\n`);

  const stats: ProcessingStats = {
    total: mediaItems.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Process items
  if (concurrency === 1) {
    // Sequential processing
    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];
      console.log(`\n[${i + 1}/${mediaItems.length}]`);

      // Skip if already fully processed
      if (
        item.download_status === 'completed' &&
        item.transcription_status === 'completed' &&
        item.embedding_status === 'completed'
      ) {
        console.log(`⏭️  Skipping (already processed): ${item.title}`);
        stats.skipped++;
        continue;
      }

      const result = await processMediaItem(item, baseUrl);
      stats.processed++;

      if (result.success) {
        stats.succeeded++;
      } else {
        stats.failed++;
        stats.errors.push({
          id: item.id,
          title: item.title,
          error: result.error || 'Unknown error',
        });
      }

      // Small delay between items to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    // Parallel processing (with concurrency limit)
    const chunks: any[][] = [];
    for (let i = 0; i < mediaItems.length; i += concurrency) {
      chunks.push(mediaItems.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(item => processMediaItem(item, baseUrl))
      );

      results.forEach((result, idx) => {
        stats.processed++;
        if (result.success) {
          stats.succeeded++;
        } else {
          stats.failed++;
          stats.errors.push({
            id: chunk[idx].id,
            title: chunk[idx].title,
            error: result.error || 'Unknown error',
          });
        }
      });

      // Delay between chunks
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log('\n\n📊 Processing Summary');
  console.log('======================');
  console.log(`Total items: ${stats.total}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`✅ Succeeded: ${stats.succeeded}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`⏭️  Skipped: ${stats.skipped}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.title}`);
      console.log(`   Error: ${err.error}`);
    });
  }

  console.log('\n✨ Processing complete!');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: any = {
  filter: 'pending',
  concurrency: 1,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--filter' && args[i + 1]) {
    options.filter = args[i + 1];
    i++;
  } else if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--concurrency' && args[i + 1]) {
    options.concurrency = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Media Processing Script

Usage:
  npx tsx hub/scripts/process-all-media.ts [options]

Options:
  --filter <type>        Filter items to process (pending|failed|all) [default: pending]
  --limit <number>       Limit number of items to process
  --concurrency <number> Number of items to process in parallel [default: 1]
  --help, -h            Show this help message

Examples:
  # Process all pending items (default)
  npx tsx hub/scripts/process-all-media.ts

  # Process first 5 pending items
  npx tsx hub/scripts/process-all-media.ts --limit 5

  # Retry all failed items
  npx tsx hub/scripts/process-all-media.ts --filter failed

  # Process all items (even completed ones will be checked)
  npx tsx hub/scripts/process-all-media.ts --filter all

  # Process 3 items in parallel
  npx tsx hub/scripts/process-all-media.ts --concurrency 3
`);
    process.exit(0);
  }
}

// Run processing
processAllMedia(options);

export { processAllMedia };
