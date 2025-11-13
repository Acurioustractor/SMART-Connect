/**
 * Import all videos from SMART Recovery Australia YouTube channel
 * Fetches video list and adds them to the database
 * Run with: npx tsx hub/scripts/import-youtube-channel.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  url: string;
  duration?: string;
  viewCount?: number;
}

/**
 * Fetch videos from YouTube channel using yt-dlp
 */
async function fetchYouTubeChannelVideos(channelUrl: string): Promise<YouTubeVideo[]> {
  console.log(`\n📺 Fetching videos from: ${channelUrl}\n`);

  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // Use yt-dlp to get channel video list as JSON
    const cmd = `yt-dlp --flat-playlist --dump-json "${channelUrl}"`;
    console.log('Running yt-dlp to fetch video list...\n');

    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer

    if (stderr) {
      console.log('yt-dlp warnings:', stderr.slice(0, 500));
    }

    // Parse JSON lines (each line is a video)
    const videos: YouTubeVideo[] = [];
    const lines = stdout.trim().split('\n');

    console.log(`Found ${lines.length} videos\n`);

    for (const line of lines) {
      try {
        const video = JSON.parse(line);
        videos.push({
          id: video.id,
          title: video.title || 'Untitled',
          description: video.description || '',
          publishedAt: video.upload_date || new Date().toISOString().split('T')[0],
          thumbnailUrl: video.thumbnail || video.thumbnails?.[0]?.url || '',
          url: `https://www.youtube.com/watch?v=${video.id}`,
          duration: video.duration_string,
          viewCount: video.view_count,
        });
      } catch (parseError) {
        console.error('Failed to parse video line:', line.slice(0, 100));
      }
    }

    return videos;
  } catch (error: any) {
    console.error('Error fetching YouTube videos:', error.message);
    throw error;
  }
}

/**
 * Add videos to Supabase
 */
async function addVideosToDatabase(videos: YouTubeVideo[]) {
  console.log(`\n📊 Adding ${videos.length} videos to database...\n`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];

    try {
      // Check if video already exists
      const { data: existing } = await supabase
        .from('media_items')
        .select('id')
        .eq('source_url', video.url)
        .single();

      if (existing) {
        console.log(`[${i + 1}/${videos.length}] ⏭️  Skipped (exists): ${video.title.slice(0, 60)}`);
        skipped++;
        continue;
      }

      // Parse upload date
      const uploadDate = video.publishedAt.length === 8
        ? `${video.publishedAt.slice(0, 4)}-${video.publishedAt.slice(4, 6)}-${video.publishedAt.slice(6, 8)}`
        : video.publishedAt;

      // Insert new video
      const { error } = await supabase
        .from('media_items')
        .insert({
          title: video.title,
          description: video.description,
          source_url: video.url,
          media_type: 'video',
          source_platform: 'youtube',
          thumbnail_url: video.thumbnailUrl,
          published_at: uploadDate,
          download_status: 'pending',
          transcription_status: 'pending',
          embedding_status: 'pending',
          metadata: {
            youtube_id: video.id,
            view_count: video.viewCount,
            duration_string: video.duration,
          },
        });

      if (error) {
        console.error(`[${i + 1}/${videos.length}] ❌ Failed: ${video.title.slice(0, 60)}`);
        console.error(`   Error: ${error.message}`);
        failed++;
      } else {
        console.log(`[${i + 1}/${videos.length}] ✅ Added: ${video.title.slice(0, 60)}`);
        added++;
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`[${i + 1}/${videos.length}] ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n\n📊 Summary');
  console.log('==========');
  console.log(`✅ Added: ${added}`);
  console.log(`⏭️  Skipped (already exists): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📺 Total: ${videos.length}`);
}

/**
 * Main function
 */
async function main() {
  const channelUrl = process.argv[2] || 'https://www.youtube.com/@smartrecoveryaustralia4868/videos';

  console.log('🎬 YouTube Channel Import Tool');
  console.log('================================');
  console.log(`Channel: ${channelUrl}`);

  try {
    // Fetch videos
    const videos = await fetchYouTubeChannelVideos(channelUrl);

    if (videos.length === 0) {
      console.log('\n⚠️  No videos found!');
      return;
    }

    // Show sample
    console.log('\n📝 Sample videos:');
    videos.slice(0, 5).forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.title.slice(0, 70)}`);
    });

    // Add to database
    await addVideosToDatabase(videos);

    console.log('\n✅ Import complete!');
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    console.error('\nMake sure:');
    console.error('1. yt-dlp is installed (brew install yt-dlp)');
    console.error('2. Environment variables are set in .env.local');
    console.error('3. Supabase connection is working');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { fetchYouTubeChannelVideos, addVideosToDatabase };
