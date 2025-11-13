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
  errors: Array<{ id: string; title: string; error: string; retries: number }>;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 2000, // 2 seconds
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
};

/**
 * Categorize errors as retryable or permanent
 */
function isRetryableError(error: any, statusCode?: number): boolean {
  // Network and timeout errors are retryable
  const errorMsg = error.message?.toLowerCase() || '';

  // Retryable network errors
  if (
    errorMsg.includes('fetch failed') ||
    errorMsg.includes('econnrefused') ||
    errorMsg.includes('etimedout') ||
    errorMsg.includes('enotfound') ||
    errorMsg.includes('timeout') ||
    errorMsg.includes('socket hang up') ||
    errorMsg.includes('network') ||
    error.name === 'AbortError'
  ) {
    return true;
  }

  // Retryable HTTP status codes
  if (statusCode) {
    // 408 Request Timeout, 429 Too Many Requests, 5xx Server Errors
    if (statusCode === 408 || statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
      return true;
    }
  }

  // Non-retryable errors
  if (statusCode && (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404)) {
    return false;
  }

  // Default to not retrying for unknown errors
  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Process a single media item with retry logic
 */
async function processMediaItem(
  mediaItem: any,
  baseUrl: string,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{
  success: boolean;
  error?: string;
  retries: number;
}> {
  console.log(`\n📥 Processing: ${mediaItem.title}`);
  console.log(`   URL: ${mediaItem.source_url}`);
  console.log(`   Type: ${mediaItem.media_type}`);

  let lastError: any;
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Show retry attempt if not first attempt
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1, retryConfig);
        console.log(`   🔄 Retry attempt ${attempt}/${retryConfig.maxRetries} (after ${delay}ms delay)...`);
        await sleep(delay);
      }

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

      lastStatusCode = response.status;

      // Check response status before parsing
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage += ` - ${errorText.slice(0, 200)}`;
            }
          } catch {
            // Ignore text parsing errors
          }
        }

        // Check if this error is retryable
        const error = new Error(errorMessage);
        if (attempt < retryConfig.maxRetries && isRetryableError(error, response.status)) {
          console.log(`   ⚠️  Retryable error: ${errorMessage}`);
          lastError = error;
          continue; // Retry
        }

        console.log(`   ❌ Failed: ${errorMessage}`);
        return { success: false, error: errorMessage, retries: attempt };
      }

      const result = await response.json();

      if (result.success) {
        if (attempt > 0) {
          console.log(`   ✅ Success after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}!`);
        } else {
          console.log('   ✅ Success!');
        }
        if (result.results.download) {
          console.log(`      Download: ${result.results.download.success ? '✓' : '✗'}`);
        }
        if (result.results.transcribe) {
          console.log(`      Transcribe: ${result.results.transcribe.success ? '✓' : '✗'} (${result.results.transcribe.wordCount || 0} words)`);
        }
        if (result.results.embed) {
          console.log(`      Embeddings: ${result.results.embed.success ? '✓' : '✗'} (${result.results.embed.embeddingCount || 0} chunks)`);
        }
        return { success: true, retries: attempt };
      } else {
        // Application-level error
        const error = new Error(result.error);
        if (attempt < retryConfig.maxRetries && isRetryableError(error)) {
          console.log(`   ⚠️  Retryable error: ${result.error}`);
          lastError = error;
          continue; // Retry
        }

        console.log(`   ❌ Failed: ${result.error}`);
        return { success: false, error: result.error, retries: attempt };
      }
    } catch (error: any) {
      lastError = error;

      // Provide clearer error messages for different error types
      if (error.name === 'AbortError') {
        const errorMsg = 'Request timeout (exceeded 30 minutes) - file may be too large';
        // Don't retry AbortError after 30 minutes
        console.log(`   ❌ Error: ${errorMsg}`);
        return { success: false, error: errorMsg, retries: attempt };
      }

      // Enhanced error reporting for fetch failures
      let errorMsg = error.message;
      if (error.cause) {
        errorMsg += ` (Cause: ${error.cause.message || error.cause})`;
      }

      // Check if this error is retryable
      if (attempt < retryConfig.maxRetries && isRetryableError(error, lastStatusCode)) {
        // Provide helpful context for common errors
        let contextMsg = errorMsg;
        if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED')) {
          contextMsg += ` - Is the server running at ${baseUrl}?`;
        } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
          contextMsg += ' - DNS resolution failed';
        } else if (errorMsg.includes('ETIMEDOUT')) {
          contextMsg += ' - Connection timed out';
        }

        console.log(`   ⚠️  Retryable error: ${contextMsg}`);
        continue; // Retry
      }

      // Non-retryable error or exhausted retries
      // Provide helpful context for common errors
      if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED')) {
        errorMsg += ` - Is the server running at ${baseUrl}?`;
      } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
        errorMsg += ' - DNS resolution failed';
      } else if (errorMsg.includes('ETIMEDOUT')) {
        errorMsg += ' - Connection timed out';
      }

      console.log(`   ❌ Error: ${errorMsg}`);
      return { success: false, error: errorMsg, retries: attempt };
    }
  }

  // Exhausted all retries
  const finalError = lastError?.message || 'Unknown error after all retries';
  console.log(`   ❌ Failed after ${retryConfig.maxRetries} retries: ${finalError}`);
  return { success: false, error: `Failed after ${retryConfig.maxRetries} retries: ${finalError}`, retries: retryConfig.maxRetries };
}

/**
 * Main processing function
 */
async function processAllMedia(options: {
  filter?: 'pending' | 'failed' | 'all';
  limit?: number;
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3080';
  const {
    filter = 'pending',
    limit,
    concurrency = 1,
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    retryDelayMs = DEFAULT_RETRY_CONFIG.initialDelayMs,
  } = options;

  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries,
    initialDelayMs: retryDelayMs,
  };

  console.log('🎬 Media Processing Pipeline');
  console.log('=============================');
  console.log(`Server: ${baseUrl}`);
  console.log(`Filter: ${filter}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Max Retries: ${retryConfig.maxRetries}`);
  console.log(`Retry Delay: ${retryConfig.initialDelayMs}ms (exponential backoff)`);
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

      const result = await processMediaItem(item, baseUrl, retryConfig);
      stats.processed++;

      if (result.success) {
        stats.succeeded++;
      } else {
        stats.failed++;
        stats.errors.push({
          id: item.id,
          title: item.title,
          error: result.error || 'Unknown error',
          retries: result.retries,
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
        chunk.map(item => processMediaItem(item, baseUrl, retryConfig))
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
            retries: result.retries,
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
      console.log(`   Retries: ${err.retries}`);
    });
  }

  console.log('\n✨ Processing complete!');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: any = {
  filter: 'pending',
  concurrency: 1,
  maxRetries: DEFAULT_RETRY_CONFIG.maxRetries,
  retryDelayMs: DEFAULT_RETRY_CONFIG.initialDelayMs,
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
  } else if (args[i] === '--max-retries' && args[i + 1]) {
    options.maxRetries = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--retry-delay' && args[i + 1]) {
    options.retryDelayMs = parseInt(args[i + 1], 10);
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
  --max-retries <number> Maximum number of retry attempts for failed requests [default: 3]
  --retry-delay <ms>     Initial delay in milliseconds between retries (exponential backoff) [default: 2000]
  --help, -h            Show this help message

Examples:
  # Process all pending items (default)
  npx tsx hub/scripts/process-all-media.ts

  # Process first 5 pending items
  npx tsx hub/scripts/process-all-media.ts --limit 5

  # Retry all failed items with more aggressive retry settings
  npx tsx hub/scripts/process-all-media.ts --filter failed --max-retries 5 --retry-delay 1000

  # Process all items (even completed ones will be checked)
  npx tsx hub/scripts/process-all-media.ts --filter all

  # Process 3 items in parallel
  npx tsx hub/scripts/process-all-media.ts --concurrency 3

  # Disable retries (max-retries 0)
  npx tsx hub/scripts/process-all-media.ts --max-retries 0
`);
    process.exit(0);
  }
}

// Run processing
processAllMedia(options);

export { processAllMedia };
