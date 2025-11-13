# Media Processing System

## Overview

Automated pipeline for downloading, transcribing, and creating embeddings from podcast and audio interviews for the SMART Recovery knowledge base.

## Supported Media Sources

### ✅ Fully Supported

| Source | Status | Notes |
|--------|--------|-------|
| **YouTube** | ✅ Supported | Videos and audio, uses yt-dlp |
| **3CR Community Radio** | ✅ Supported | Direct MP3 extraction from HTML |
| **ABC Radio** | ✅ Supported | Uses yt-dlp with special handling |
| **SoundCloud** | ✅ Supported | Uses yt-dlp with fallback file detection |
| **Omny Studio** | ✅ Supported | Extracts audio URL from page, falls back to yt-dlp |
| **Generic URLs** | ✅ Supported | Direct HTTP/HTTPS downloads of audio files |

### ⚠️ Limited Support

| Source | Status | Notes |
|--------|--------|-------|
| **Podbean** | ⚠️ Limited | Direct URL extraction with yt-dlp fallback. May fail with recursion errors on some URLs. **Solution:** Update yt-dlp regularly |
| **Apple Podcasts** | ⚠️ Limited | Uses yt-dlp. Success varies by episode. |

### ❌ Not Supported

| Source | Status | Reason | Alternative |
|--------|--------|--------|-------------|
| **Spotify** | ❌ Not Supported | Requires Spotify API credentials and special authentication. Spotify actively prevents direct audio downloads. | Use Spotify API with proper authentication, or find alternative source |

## Requirements

### System Dependencies

- **yt-dlp**: Media download tool (fork of youtube-dl)
  ```bash
  # Install on macOS
  brew install yt-dlp

  # Install with pip
  pip install -U yt-dlp

  # Update to latest version
  bash hub/scripts/update-yt-dlp.sh
  ```

### Environment Variables

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (for transcription)
OPENAI_API_KEY=your_openai_api_key

# Server URL
NEXT_PUBLIC_BASE_URL=http://localhost:3080
```

## Usage

### Process All Pending Media

```bash
# From hub/scripts directory
npx tsx process-all-media.ts

# Or with options
npx tsx process-all-media.ts --filter pending --limit 10 --max-retries 5
```

### Available Options

```
--filter <type>        Filter: pending|failed|all [default: pending]
--limit <number>       Limit number of items to process
--concurrency <number> Process N items in parallel [default: 1]
--max-retries <number> Max retry attempts for failed requests [default: 3]
--retry-delay <ms>     Initial delay between retries (exponential backoff) [default: 2000]
```

### Examples

```bash
# Process first 5 pending items
npx tsx process-all-media.ts --limit 5

# Retry all failed items with aggressive retry settings
npx tsx process-all-media.ts --filter failed --max-retries 5 --retry-delay 1000

# Process 3 items in parallel
npx tsx process-all-media.ts --concurrency 3
```

## Pipeline Stages

### 1. Download
- Detects media source from URL
- Uses appropriate downloader (yt-dlp, direct HTTP, custom extractor)
- Uploads to Supabase Storage
- Handles file format conversions

### 2. Transcribe
- Downloads file from Supabase Storage
- Splits large files into chunks (< 25MB for Whisper API)
- Transcribes using OpenAI Whisper API
- Generates timestamped segments
- Formats as markdown

### 3. Embed
- Chunks transcript into ~1000 character segments
- Creates vector embeddings using OpenAI text-embedding-ada-002
- Stores in Supabase for semantic search

## Troubleshooting

### Common Errors

#### 1. Headers Timeout Error
```
❌ Error: fetch failed (Cause: Headers Timeout Error)
```

**Cause:** Server taking too long to respond, usually due to long downloads or processing.

**Solution:**
- Check if the server is running: `http://localhost:3080`
- Media file may be very large - wait longer or check server logs
- Retry with the built-in retry logic (automatic with exponential backoff)

#### 2. File Extension Mismatch (SoundCloud)
```
❌ Failed: ENOENT: no such file or directory, stat '/tmp/media-downloads/955128238.opus'
```

**Cause:** yt-dlp downloads file with different extension than expected.

**Solution:** ✅ **FIXED** - Code now searches for any file matching the ID with any extension.

#### 3. Podbean Recursion Error
```
ERROR: RecursionError: maximum recursion depth exceeded
```

**Cause:** yt-dlp's generic extractor falling back repeatedly on certain Podbean URLs.

**Solution:**
```bash
# Update yt-dlp to latest version
bash hub/scripts/update-yt-dlp.sh
```

**Alternative:** ✅ **IMPROVED** - Code now attempts direct audio URL extraction before falling back to yt-dlp.

#### 4. Spotify Authentication Error
```
❌ Failed: Spotify downloads require special authentication
```

**Cause:** Spotify requires API credentials and does not allow direct downloads.

**Solution:**
- **Option 1:** Find the same episode on a different platform (YouTube, Apple Podcasts, etc.)
- **Option 2:** Implement Spotify API integration (requires Spotify Developer account and premium subscription)
- **Option 3:** Manually download using authorized Spotify tools

**Why Spotify is Different:**
- Spotify uses DRM (Digital Rights Management)
- Content is encrypted and requires special decryption keys
- Terms of Service prohibit unauthorized downloads
- yt-dlp cannot access Spotify content without authentication

## Error Recovery & Retry Logic

### Automatic Retries

The system automatically retries failed requests with exponential backoff:

- **Default retries:** 3 attempts
- **Initial delay:** 2 seconds
- **Backoff multiplier:** 2x (2s → 4s → 8s)
- **Max delay:** 30 seconds

### Retryable Errors

These errors trigger automatic retry:
- Network timeouts (`ETIMEDOUT`, `ECONNREFUSED`)
- Fetch failures
- HTTP 408 (Request Timeout)
- HTTP 429 (Too Many Requests)
- HTTP 5xx (Server Errors)

### Non-Retryable Errors

These errors fail immediately:
- HTTP 400 (Bad Request)
- HTTP 401/403 (Authentication/Authorization)
- HTTP 404 (Not Found)
- Spotify authentication errors
- File format errors

## Costs

### OpenAI API Costs

**Transcription (Whisper):**
- $0.006 per minute of audio
- 1-hour interview ≈ $0.36
- 20 interviews/month ≈ $7.20

**Embeddings (text-embedding-ada-002):**
- $0.0001 per 1K tokens
- ~1K tokens = ~750 words
- 8,000-word transcript ≈ $0.0011
- 20 transcripts/month ≈ $0.02

**Total estimated cost:** ~$10-20/month for regular processing

## Monitoring & Logging

### Log Locations

When running the processing script, logs show:
- Timestamps for each operation
- Download progress and file sizes
- Transcription word counts and costs
- Embedding creation progress
- Database operations

### Performance Metrics

The system logs processing time for:
- Database queries
- Download operations
- File uploads to Supabase
- Transcription API calls
- Embedding generation
- Total end-to-end time

Example output:
```
[2025-01-13T12:34:56.789Z] [Media Process] Request received
[2025-01-13T12:34:56.801Z] [Media Process] Database fetch completed in 12ms
[2025-01-13T12:34:56.850Z] [Media Process] Starting download from source...
[2025-01-13T12:35:42.123Z] [Media Process] Download completed in 45273ms
...
[2025-01-13T12:42:15.456Z] [Media Process] Processing complete! Total time: 439667ms (439.7s)
```

## Database Schema

### media_items
- Stores metadata about each media source
- Tracks processing status (download, transcription, embedding)
- Links to stored files and transcripts

### media_transcripts
- Full text of transcriptions
- Markdown formatted with timestamps
- Segment data with timing information
- Word count and processing costs

### media_embeddings
- Vector embeddings for semantic search
- Chunked text with timestamps
- Links back to source transcript and media item

### media_processing_jobs
- Tracks processing job status
- Stores results and error messages
- Progress tracking for long-running jobs

## Maintenance

### Regular Tasks

1. **Update yt-dlp monthly:**
   ```bash
   bash hub/scripts/update-yt-dlp.sh
   ```

2. **Monitor costs:**
   - Check OpenAI API usage dashboard
   - Review Supabase storage usage

3. **Clean up failed items:**
   ```bash
   npx tsx process-all-media.ts --filter failed
   ```

4. **Review error logs:**
   - Check for patterns in failures
   - Update handlers for problematic sources

### Performance Optimization

**For large batches:**
- Increase concurrency: `--concurrency 3`
- Process in smaller chunks: `--limit 10`
- Run during off-peak hours

**For slow networks:**
- Reduce concurrency: `--concurrency 1`
- Increase retry delay: `--retry-delay 5000`

## Adding New Media Sources

### 1. Add Source Detection

Edit `hub/lib/media-downloader.ts`:

```typescript
export function detectMediaSource(url: string): string {
  if (url.includes('newplatform.com')) {
    return 'newplatform';
  }
  // ...
}
```

### 2. Implement Download Handler

```typescript
async function downloadFromNewPlatform(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  // Implement download logic
  // Try to extract direct audio URL
  // Fall back to yt-dlp if needed
}
```

### 3. Add to Switch Statement

```typescript
switch (source) {
  case 'newplatform':
    return await downloadFromNewPlatform(url, options);
  // ...
}
```

### 4. Test Thoroughly

- Test with multiple URLs from the platform
- Verify file formats are handled correctly
- Check transcription quality
- Confirm embeddings are created

## Security Considerations

- Media files are temporarily stored in `/tmp/media-downloads`
- Files are cleaned up after upload to Supabase
- API keys must be kept secure in `.env.local`
- Supabase Service Role Key has full database access

## Contributing

When adding support for new media sources:
1. Follow existing patterns (try direct extraction, fall back to yt-dlp)
2. Add comprehensive error handling
3. Update this documentation
4. Test with multiple examples
5. Consider rate limiting and API costs

## Support

For issues or questions:
1. Check this README first
2. Review error messages and logs
3. Try updating yt-dlp: `bash hub/scripts/update-yt-dlp.sh`
4. Search for similar issues in the codebase
5. Check yt-dlp documentation: https://github.com/yt-dlp/yt-dlp

---

Last updated: 2025-01-13
