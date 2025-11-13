# Media Processing Guide

Complete guide to importing and processing media (podcasts, interviews, videos) in SMART Connect.

## Overview

The media processing system consists of three main stages:
1. **Import** - Add media metadata to the database
2. **Download** - Download audio/video files using yt-dlp
3. **Transcribe** - Convert audio to text using OpenAI Whisper
4. **Embed** - Create semantic search embeddings

## Quick Start

### Step 1: Import Media Items

First, import your media items with their metadata:

```bash
cd hub/scripts
npx tsx import-media-data.ts
```

This will import 21 pre-configured media items (podcasts, interviews, videos) into your database.

### Step 2: Process All Media

Download, transcribe, and create embeddings for all imported media:

```bash
# Process all pending items (default)
npx tsx process-all-media.ts

# Process first 5 items (for testing)
npx tsx process-all-media.ts --limit 5

# Process 3 items in parallel (faster but uses more resources)
npx tsx process-all-media.ts --concurrency 3
```

## Detailed Usage

### Import Script Options

The `import-media-data.ts` script:
- Imports media from a predefined list
- Automatically detects media type (audio, video, podcast)
- Extracts topics and featured people
- Checks for duplicates

To enable automatic processing after import, edit the script and change:
```typescript
autoProcess: false  // Change to true
```

### Processing Script Options

```bash
npx tsx process-all-media.ts [options]

Options:
  --filter <type>        Filter items: pending|failed|all [default: pending]
  --limit <number>       Process only N items
  --concurrency <number> Process N items in parallel [default: 1]
  --help, -h            Show help
```

**Examples:**

```bash
# Process all pending items one by one
npx tsx process-all-media.ts

# Retry all failed items
npx tsx process-all-media.ts --filter failed

# Process everything (including already-completed items)
npx tsx process-all-media.ts --filter all

# Test with just 2 items
npx tsx process-all-media.ts --limit 2

# Faster processing with 5 concurrent jobs
npx tsx process-all-media.ts --concurrency 5
```

### Process a Single Item

Use the API directly to process one specific item:

```bash
curl -X POST http://localhost:3080/api/media/process \
  -H "Content-Type: application/json" \
  -d '{
    "mediaItemId": "YOUR_ITEM_ID",
    "steps": ["download", "transcribe", "embed"]
  }'
```

Or skip certain steps:
```json
{
  "mediaItemId": "YOUR_ITEM_ID",
  "steps": ["download"]  // Only download, skip transcription
}
```

## Media Types Supported

The system supports:
- **Audio**: Radio interviews, podcasts (MP3, M4A, WAV, etc.)
- **Video**: YouTube videos, Vimeo, etc. (extracts audio automatically)
- **Platforms**:
  - YouTube / YouTube Music
  - Spotify (if audio is accessible)
  - Apple Podcasts
  - SoundCloud
  - ABC Radio
  - 3CR Community Radio
  - Generic audio URLs

## Processing Pipeline Details

### 1. Download Stage
- Uses `yt-dlp` to download from 1000+ supported sites
- Automatically extracts audio from video files
- Converts to optimal format for transcription
- Uploads to Supabase Storage (`media-files` bucket)
- Extracts metadata: duration, file size, codec info

**Status values:**
- `pending` - Not yet downloaded
- `downloading` - In progress
- `completed` - Successfully downloaded
- `failed` - Download error (check `download_error` field)

### 2. Transcription Stage
- Uses OpenAI Whisper API (most accurate speech-to-text)
- Creates timestamped segments
- Formats as markdown with timestamps
- Saves to `media_transcripts` table
- Calculates word count and processing cost

**Status values:**
- `pending` - Not yet transcribed
- `processing` - In progress
- `completed` - Successfully transcribed
- `failed` - Transcription error (check `transcription_error` field)

### 3. Embedding Stage
- Chunks transcript into ~1000 character segments
- Creates vector embeddings using OpenAI Ada-002
- Stores in `media_embeddings` table with timestamps
- Enables semantic search across all media content

**Status values:**
- `pending` - Not yet embedded
- `processing` - In progress
- `completed` - Successfully embedded
- `failed` - Embedding error

## Database Tables

### `media_items`
Main table for media metadata:
- `title`, `description`, `media_type`, `outlet_host`
- `source_url` - Original URL
- `file_path` - Supabase Storage path
- `publish_date`, `duration_seconds`, `file_size_bytes`
- `featured_people[]`, `topics[]`, `tags[]`
- Processing status fields for each stage

### `media_transcripts`
Full transcriptions with timing:
- `transcript_text` - Plain text
- `transcript_markdown` - Formatted with timestamps
- `segments[]` - JSON array of timed segments
- `word_count`, `language`, `confidence_score`

### `media_embeddings`
Semantic search vectors:
- `chunk_text` - Text segment
- `chunk_index` - Order in transcript
- `start_time_seconds`, `end_time_seconds`
- `embedding` - 1536-dimensional vector
- Enables semantic search via pgvector

### `media_processing_jobs`
Job tracking and monitoring:
- `job_type`, `status`, `progress_percent`
- `started_at`, `completed_at`
- `result_data` - Detailed results
- `error_message` - If failed

## Cost Estimates

Processing costs (per hour of audio):

| Service | Cost | Notes |
|---------|------|-------|
| Download | Free | yt-dlp is open source |
| Transcription | ~$0.36 | Whisper API: $0.006/min |
| Embeddings | ~$0.04 | Ada-002: ~$0.0004/1K tokens |
| **Total** | **~$0.40/hour** | Approximate |

**Example:** Processing all 21 imported items (~15 hours total):
- Estimated cost: ~$6.00
- Processing time: 2-4 hours (sequential) or 30-60 min (parallel)

## Monitoring Progress

### Check Processing Status

Query the database:

```sql
-- Overview of all media items
SELECT
  title,
  media_type,
  download_status,
  transcription_status,
  embedding_status
FROM media_items
ORDER BY created_at DESC;

-- Count by status
SELECT
  download_status,
  COUNT(*) as count
FROM media_items
GROUP BY download_status;
```

### View Recent Jobs

```bash
curl http://localhost:3080/api/media/process
```

### Check Specific Item

```bash
curl "http://localhost:3080/api/media/process?mediaItemId=YOUR_ITEM_ID"
```

## Troubleshooting

### Download Failures

**Problem:** `download_status = 'failed'`

**Common causes:**
1. Geoblocked content (ABC, 3CR may be Australia-only)
2. Removed/private content
3. Platform requires authentication
4. Rate limiting

**Solutions:**
- Check `download_error` field for details
- For geoblocked content, may need VPN or proxy
- Retry with: `npx tsx process-all-media.ts --filter failed`

### Transcription Failures

**Problem:** `transcription_status = 'failed'`

**Common causes:**
1. No audio track found
2. File format not supported
3. OpenAI API key missing/invalid
4. File too large (>25MB limit)

**Solutions:**
- Ensure `OPENAI_API_KEY` is set in `.env.local`
- Check if download actually completed
- May need to re-download with different format

### Out of Memory

**Problem:** Script crashes during processing

**Solutions:**
- Reduce concurrency: `--concurrency 1`
- Process in batches: `--limit 5`
- Increase Node memory: `NODE_OPTIONS="--max-old-space-size=4096" npx tsx process-all-media.ts`

## Environment Variables Required

Make sure these are set in `hub/.env.local`:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (required for transcription & embeddings)
OPENAI_API_KEY=sk-your-openai-key

# Optional
NEXT_PUBLIC_BASE_URL=http://localhost:3080  # Your server URL
```

## API Endpoints

### POST `/api/media/import`
Import media items in bulk
```json
{
  "items": [{
    "title": "Interview Title",
    "type": "Radio interview (audio)",
    "outlet_host": "ABC Radio",
    "date": "2024-01-15",
    "url": "https://example.com/audio",
    "why_matters": "Key insights about..."
  }],
  "autoProcess": false
}
```

### POST `/api/media/process`
Process a single media item
```json
{
  "mediaItemId": "uuid",
  "steps": ["download", "transcribe", "embed"]
}
```

### GET `/api/media/process`
Get processing job status
- `?jobId=uuid` - Specific job
- `?mediaItemId=uuid` - Jobs for media item
- No params - Recent jobs

### GET `/api/media/search`
Semantic search across all transcripts
```json
{
  "query": "gambling harm prevention",
  "limit": 10
}
```

### GET `/api/media/transcript`
Get transcript for a media item
- `?mediaItemId=uuid`

## Next Steps

After processing media:

1. **Use the chat interface** - Ask questions about the content
2. **Semantic search** - Find relevant segments across all media
3. **Generate content** - Use transcripts for blog posts, summaries
4. **Track speakers** - Filter by `featured_people`
5. **Topic analysis** - Analyze coverage of different topics

## Adding New Media

To add more media items, edit `hub/scripts/import-media-data.ts`:

```typescript
const mediaData = [
  // Add new items here
  {
    title: "New Interview Title",
    type: "Podcast",
    outlet_host: "Podcast Name",
    date: "2024-01-15",
    url: "https://example.com/episode",
    why_matters: "Important because..."
  },
  // ... existing items
];
```

Then run:
```bash
npx tsx import-media-data.ts
npx tsx process-all-media.ts
```

## Best Practices

1. **Test first** - Use `--limit 2` to test the pipeline
2. **Sequential for stability** - Use `--concurrency 1` for long runs
3. **Monitor costs** - Check OpenAI usage dashboard
4. **Handle failures** - Retry failed items after investigating errors
5. **Backup transcripts** - Export important transcripts as files
6. **Tag content** - Add meaningful tags for easier filtering

---

For more information, see:
- [MEDIA-SYSTEM.md](./MEDIA-SYSTEM.md) - System architecture
- [API Documentation](./hub/app/api/media/) - API source code
