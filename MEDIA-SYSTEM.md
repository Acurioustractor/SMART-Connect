# Media Management & Transcription System

A comprehensive system for scraping, transcribing, and managing media content (audio, video, podcasts) for SMART Recovery Australia.

## Overview

This system provides:

1. **Media Scraping** - Download media from various sources (YouTube, 3CR, ABC, Omny Studio, etc.)
2. **Transcription** - Convert audio/video to text using OpenAI Whisper API
3. **Semantic Search** - Search transcripts using vector embeddings
4. **Media Library** - Browse, filter, and manage media content
5. **Intelligence Integration** - Add transcripts to RAG system for AI chat

## Architecture

### Database Schema

**Tables:**
- `media_items` - Core media metadata (title, URL, type, status, etc.)
- `media_transcripts` - Full transcripts with segments and timestamps
- `media_embeddings` - Vector embeddings for semantic search
- `media_speakers` - Directory of people featured in media
- `media_speaker_appearances` - Link speakers to media items
- `media_processing_jobs` - Track background processing jobs

**Key Features:**
- Full-text search using PostgreSQL tsvector
- Semantic search using pgvector (1536-dimensional embeddings)
- Automatic search vector updates via triggers
- Row-level security (RLS) policies
- Analytics views and helper functions

See: `/supabase/migrations/20251113_add_media_tables.sql`

### Processing Pipeline

```
1. Import → 2. Download → 3. Transcribe → 4. Embed → 5. Search
    ↓            ↓             ↓             ↓          ↓
  Metadata    Audio File    Transcript    Vectors   Intelligence
```

**Steps:**

1. **Import** - Add media metadata to database
2. **Download** - Fetch audio/video from source URL
3. **Transcribe** - Convert to text using Whisper API
4. **Embed** - Generate vector embeddings for chunks
5. **Search** - Enable semantic and keyword search

## Components

### Backend (API Routes)

**Media Management:**
- `GET /api/media` - List media with filters
- `POST /api/media` - Create media item
- `PATCH /api/media` - Update media item
- `DELETE /api/media` - Delete media item

**Processing:**
- `POST /api/media/process` - Process media (download + transcribe + embed)
- `GET /api/media/process` - Get job status

**Transcripts:**
- `GET /api/media/transcript` - Get transcript for media item

**Search:**
- `POST /api/media/search` - Semantic search using embeddings
- `GET /api/media/search` - Keyword search

**Import:**
- `POST /api/media/import` - Bulk import media from list

### Frontend Pages

**Media Library (`/media`):**
- Grid view of all media items
- Filter by type (audio/video/podcast)
- Filter by status (transcribed/pending)
- Search media by keywords
- Process media with one click
- View stats (total items, transcribed, etc.)

**Media Detail (`/media/[id]`):**
- Full media metadata
- Complete transcript with timestamps
- Download transcript (TXT, MD, SRT)
- Related media suggestions
- Speaker information

### Utilities

**Media Downloader (`/hub/lib/media-downloader.ts`):**
- Auto-detect source (YouTube, 3CR, ABC, Omny, etc.)
- Download using `yt-dlp` or direct HTTP
- Extract metadata (duration, bitrate, codec)
- Upload to Supabase Storage

**Transcription Service (`/hub/lib/media-transcription.ts`):**
- OpenAI Whisper API integration
- Segment-level timestamps
- Confidence scores
- Multiple output formats (JSON, SRT, VTT, Markdown)
- Chunk transcript for embeddings

### Scripts

**Import Media Data (`/scripts/import-media-data.ts`):**
- Imports the 21 media items provided by user
- Auto-detects media type and topics
- Extracts featured speakers
- Optionally triggers processing

## Usage

### 1. Setup

**Install Dependencies:**
```bash
npm install
```

**Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

**Install yt-dlp (for media downloads):**
```bash
# Ubuntu/Debian
sudo apt install yt-dlp

# Or using pip
pip install -U yt-dlp

# Or download binary
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Run Migrations:**
```bash
# Apply media table migrations
psql -h your_db_host -U postgres -d postgres -f supabase/migrations/20251113_add_media_tables.sql
psql -h your_db_host -U postgres -d postgres -f supabase/migrations/20251113_add_media_search_functions.sql
```

**Create Storage Bucket:**
```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-files', 'media-files', true);
```

### 2. Import Media Data

**Via Script:**
```bash
cd scripts
npx tsx import-media-data.ts
```

**Via API:**
```bash
curl -X POST http://localhost:3000/api/media/import \
  -H "Content-Type: application/json" \
  -d '{
    "items": [...],
    "autoProcess": false
  }'
```

### 3. Process Media

**Via UI:**
1. Navigate to `/media`
2. Click "Process" on any pending media item
3. Wait for download → transcribe → embed

**Via API:**
```bash
curl -X POST http://localhost:3000/api/media/process \
  -H "Content-Type: application/json" \
  -d '{
    "mediaItemId": "uuid-here",
    "steps": ["download", "transcribe", "embed"]
  }'
```

### 4. Search Media

**Semantic Search (via API):**
```bash
curl -X POST http://localhost:3000/api/media/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gambling harm and addiction support",
    "limit": 10,
    "threshold": 0.7
  }'
```

**Keyword Search:**
```bash
curl http://localhost:3000/api/media/search?q=recovery&limit=20
```

### 5. View Transcripts

**Via UI:**
- Navigate to `/media/[id]` for any transcribed media
- View full text or timestamped segments
- Download in multiple formats

**Via API:**
```bash
curl http://localhost:3000/api/media/transcript?mediaItemId=uuid-here
```

## Supported Media Sources

| Source | Type | Download Method | Notes |
|--------|------|----------------|-------|
| YouTube | Video/Audio | yt-dlp | Fully supported |
| 3CR Community Radio | Audio | Direct MP3 / yt-dlp | Most episodes have direct links |
| ABC Radio | Audio | yt-dlp | Uses ABC iview API |
| Omny Studio | Podcast | Direct MP3 / yt-dlp | Podcast platform |
| Podbean | Podcast | yt-dlp | Podcast hosting |
| SoundCloud | Audio | yt-dlp | Music/podcast platform |
| Apple Podcasts | Podcast | yt-dlp / RSS | May require RSS feed |
| Spotify | Podcast | Not supported | Requires auth/special tools |

## Cost Estimates

**OpenAI Whisper API:**
- $0.006 per minute of audio
- Example: 1-hour interview = $0.36

**OpenAI Embeddings (ada-002):**
- $0.0001 per 1K tokens
- Example: 5000-word transcript ≈ 6000 tokens = $0.0006

**Total for 1-hour interview:**
- Download: Free (yt-dlp)
- Transcription: $0.36
- Embeddings: ~$0.001
- **Total: ~$0.37**

**For 21 media items (est. avg 30 min each):**
- Total audio: 10.5 hours
- Transcription: $3.78
- Embeddings: $0.02
- **Total: ~$3.80**

## Database Functions

**Semantic Search:**
```sql
SELECT * FROM search_media_embeddings(
    query_embedding := '{...}',
    match_threshold := 0.7,
    match_count := 10
);
```

**Hybrid Search:**
```sql
SELECT * FROM hybrid_search_media(
    query_text := 'addiction recovery',
    query_embedding := '{...}',
    match_count := 10,
    semantic_weight := 0.7,
    keyword_weight := 0.3
);
```

**Find Related Media:**
```sql
SELECT * FROM get_related_media(
    source_media_id := 'uuid-here',
    match_count := 5
);
```

**Search by Speaker:**
```sql
SELECT * FROM search_media_by_speaker(
    speaker_name := 'April Long',
    match_count := 20
);
```

**Get Stats:**
```sql
SELECT * FROM get_media_stats();
```

## Integration with RAG System

Media transcripts are automatically integrated into the existing RAG (Retrieval-Augmented Generation) system:

1. **Embeddings** - Transcript chunks are embedded using the same model (ada-002)
2. **Search** - Media results appear alongside PDFs and web content in search
3. **Chat** - AI chat can reference media transcripts as context
4. **Recommendations** - Related media suggested based on content similarity

To use in chat:
```typescript
// In /api/chat route
const mediaResults = await searchMediaEmbeddings(userQuery);
const context = [...pdfResults, ...webResults, ...mediaResults];
// Pass to OpenAI with context
```

## Extending the System

### Add New Media Source

Edit `/hub/lib/media-downloader.ts`:

```typescript
// 1. Add detection
export function detectMediaSource(url: string): string {
  if (url.includes('newsource.com')) {
    return 'newsource';
  }
  // ...
}

// 2. Add download handler
async function downloadFromNewSource(url: string, options: MediaDownloadOptions) {
  // Implement download logic
  return { success: true, filePath: '...' };
}

// 3. Add to main download function
export async function downloadMedia(url: string, options) {
  switch (source) {
    case 'newsource':
      return await downloadFromNewSource(url, options);
    // ...
  }
}
```

### Add Custom Metadata Fields

1. Extend database schema:
```sql
ALTER TABLE media_items
ADD COLUMN custom_field TEXT;
```

2. Update TypeScript types in API routes
3. Update frontend forms and displays

### Add Speaker Analytics

The system tracks speakers across media items. You can:

1. View all media by speaker: `search_media_by_speaker('April Long')`
2. Calculate speaking time: `SUM(duration_seconds)` grouped by speaker
3. Track speaker appearances over time
4. Generate speaker profiles with bios and photos

## Troubleshooting

**yt-dlp not found:**
```bash
which yt-dlp  # Should show path
# If not installed, see Setup section
```

**Whisper API errors:**
- Check `OPENAI_API_KEY` is set
- Verify file size < 25MB
- Check audio format is supported (mp3, mp4, m4a, wav, etc.)

**Download fails:**
- Some sources may require cookies/authentication
- Try downloading manually and uploading file
- Check source URL is still valid

**Embedding errors:**
- Ensure transcript text is not empty
- Check chunk size (should be < 8191 tokens)
- Verify OpenAI API quota

**Storage upload fails:**
- Verify Supabase bucket 'media-files' exists
- Check storage policies allow service_role uploads
- Ensure file path doesn't contain invalid characters

## Future Enhancements

- [ ] Audio player with transcript highlighting
- [ ] Speaker diarization (detect who's speaking)
- [ ] Auto-detect topics using GPT-4
- [ ] Generate summaries for each media item
- [ ] Create highlight reels from transcripts
- [ ] Multi-language transcription
- [ ] Real-time transcription for live streams
- [ ] Podcast RSS feed integration
- [ ] Auto-import new episodes
- [ ] Social media sharing with clips

## Files Created

```
/supabase/migrations/
  20251113_add_media_tables.sql
  20251113_add_media_search_functions.sql

/hub/lib/
  media-downloader.ts
  media-transcription.ts

/hub/app/api/media/
  route.ts
  process/route.ts
  transcript/route.ts
  search/route.ts
  import/route.ts

/hub/app/media/
  page.tsx
  [id]/page.tsx

/scripts/
  import-media-data.ts

MEDIA-SYSTEM.md (this file)
```

## Support

For questions or issues:
- Check logs in browser console and server terminal
- Review Supabase logs for database errors
- Verify all environment variables are set
- Ensure migrations have been applied
- Test with a simple media item first (short YouTube video)

---

**Built for SMART Recovery Australia**
*Empowering recovery through accessible media and knowledge*
