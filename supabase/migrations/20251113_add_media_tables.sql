-- Media Management System for SMART Recovery Australia
-- Created: 2025-11-13
-- Purpose: Store and manage audio/video media, transcripts, and embeddings

-- ============================================================================
-- TABLE: media_items
-- Stores metadata for all media content (audio, video, podcasts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Core metadata
    title TEXT NOT NULL,
    description TEXT,
    media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('audio', 'video', 'podcast')),
    outlet_host TEXT, -- e.g., "2GB", "3CR", "ABC Radio", "YouTube"

    -- URLs and storage
    source_url TEXT NOT NULL UNIQUE,
    file_path TEXT, -- Path in Supabase Storage after download
    thumbnail_url TEXT,

    -- Publication info
    publish_date DATE,
    publish_date_approx BOOLEAN DEFAULT false, -- true if date is approximate
    duration_seconds INTEGER,

    -- Content details
    featured_people TEXT[], -- Array of interviewee/host names
    why_matters TEXT, -- Why this media is significant
    topics TEXT[], -- Key topics covered
    tags TEXT[],

    -- Processing status
    download_status VARCHAR(50) DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed', 'skipped')),
    transcription_status VARCHAR(50) DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed', 'not_needed')),
    embedding_status VARCHAR(50) DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed')),

    -- Error tracking
    download_error TEXT,
    transcription_error TEXT,
    last_processed_at TIMESTAMPTZ,

    -- Analytics
    view_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- File metadata
    file_size_bytes BIGINT,
    mime_type TEXT,
    audio_codec TEXT,
    video_codec TEXT,
    bitrate_kbps INTEGER,

    -- Quality and relevance
    quality_score DECIMAL(3,2) DEFAULT 0.00 CHECK (quality_score BETWEEN 0 AND 1),
    relevance_score DECIMAL(3,2) DEFAULT 0.00 CHECK (relevance_score BETWEEN 0 AND 1),

    -- Search (to be populated by trigger)
    search_vector tsvector
);

-- Create indexes for performance
CREATE INDEX idx_media_items_media_type ON public.media_items(media_type);
CREATE INDEX idx_media_items_publish_date ON public.media_items(publish_date DESC);
CREATE INDEX idx_media_items_download_status ON public.media_items(download_status);
CREATE INDEX idx_media_items_transcription_status ON public.media_items(transcription_status);
CREATE INDEX idx_media_items_source_url ON public.media_items(source_url);
CREATE INDEX idx_media_items_search_vector ON public.media_items USING gin(search_vector);
CREATE INDEX idx_media_items_topics ON public.media_items USING gin(topics);
CREATE INDEX idx_media_items_tags ON public.media_items USING gin(tags);

-- ============================================================================
-- TABLE: media_transcripts
-- Stores full transcripts and segments from transcription services
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Full transcript
    transcript_text TEXT NOT NULL,
    transcript_markdown TEXT, -- Formatted with timestamps, speakers, etc.

    -- Transcription metadata
    transcription_service VARCHAR(50) DEFAULT 'openai-whisper' CHECK (transcription_service IN ('openai-whisper', 'assembly-ai', 'google-speech', 'manual')),
    language VARCHAR(10) DEFAULT 'en',
    confidence_score DECIMAL(3,2),

    -- Segments (JSONB for flexibility)
    segments JSONB, -- Array of {start, end, text, confidence, speaker}

    -- Processing info
    word_count INTEGER,
    processing_time_seconds INTEGER,
    cost_usd DECIMAL(10,4),

    -- Search
    search_vector tsvector,

    UNIQUE(media_item_id) -- One transcript per media item
);

-- Create indexes
CREATE INDEX idx_media_transcripts_media_item ON public.media_transcripts(media_item_id);
CREATE INDEX idx_media_transcripts_language ON public.media_transcripts(language);
CREATE INDEX idx_media_transcripts_search_vector ON public.media_transcripts USING gin(search_vector);

-- ============================================================================
-- TABLE: media_embeddings
-- Stores vector embeddings from transcripts for semantic search
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    transcript_id UUID REFERENCES public.media_transcripts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Chunk info
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_time_seconds DECIMAL(10,2), -- Timestamp in media where this chunk occurs
    end_time_seconds DECIMAL(10,2),

    -- Embedding
    embedding vector(1536), -- OpenAI ada-002 dimensions

    -- Metadata
    chunk_word_count INTEGER,

    UNIQUE(media_item_id, chunk_index)
);

-- Create indexes
CREATE INDEX idx_media_embeddings_media_item ON public.media_embeddings(media_item_id);
CREATE INDEX idx_media_embeddings_transcript ON public.media_embeddings(transcript_id);
CREATE INDEX idx_media_embeddings_vector ON public.media_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- TABLE: media_speakers
-- Track speakers across media (e.g., April Long, Josette Freeman)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_speakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Speaker info
    name TEXT NOT NULL UNIQUE,
    role TEXT, -- e.g., "CEO", "National Program Manager", "Group Facilitator"
    bio TEXT,
    photo_url TEXT,

    -- Analytics
    media_count INTEGER DEFAULT 0,
    total_speaking_time_seconds INTEGER DEFAULT 0
);

-- ============================================================================
-- TABLE: media_speaker_appearances
-- Many-to-many relationship between media and speakers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_speaker_appearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    speaker_id UUID NOT NULL REFERENCES public.media_speakers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Appearance details
    role_in_media VARCHAR(50), -- 'interviewee', 'host', 'guest', 'narrator'
    speaking_time_seconds INTEGER,

    UNIQUE(media_item_id, speaker_id)
);

CREATE INDEX idx_media_speaker_appearances_media ON public.media_speaker_appearances(media_item_id);
CREATE INDEX idx_media_speaker_appearances_speaker ON public.media_speaker_appearances(speaker_id);

-- ============================================================================
-- TABLE: media_processing_jobs
-- Track background jobs for downloading, transcribing, embedding
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Job details
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('download', 'transcribe', 'embed', 'full_pipeline')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

    -- Target
    media_item_id UUID REFERENCES public.media_items(id) ON DELETE CASCADE,
    batch_id UUID, -- For batch processing

    -- Progress
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    items_processed INTEGER DEFAULT 0,
    items_total INTEGER,

    -- Results
    result_data JSONB, -- Store job results
    error_message TEXT,
    error_stack TEXT,

    -- Retry
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

CREATE INDEX idx_media_processing_jobs_status ON public.media_processing_jobs(status);
CREATE INDEX idx_media_processing_jobs_media_item ON public.media_processing_jobs(media_item_id);
CREATE INDEX idx_media_processing_jobs_batch ON public.media_processing_jobs(batch_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update search_vector for media_items
CREATE OR REPLACE FUNCTION update_media_items_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.outlet_host, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.why_matters, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.topics, ' '), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_media_items_search_vector
    BEFORE INSERT OR UPDATE ON public.media_items
    FOR EACH ROW
    EXECUTE FUNCTION update_media_items_search_vector();

-- Update search_vector for media_transcripts
CREATE OR REPLACE FUNCTION update_media_transcripts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.transcript_text, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_media_transcripts_search_vector
    BEFORE INSERT OR UPDATE ON public.media_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_media_transcripts_search_vector();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_media_items_updated_at
    BEFORE UPDATE ON public.media_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_media_transcripts_updated_at
    BEFORE UPDATE ON public.media_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_media_processing_jobs_updated_at
    BEFORE UPDATE ON public.media_processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS for all tables (adjust policies as needed)
-- ============================================================================

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_speaker_appearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Public read access for media content
CREATE POLICY "Public can read media_items"
    ON public.media_items FOR SELECT
    USING (true);

CREATE POLICY "Public can read media_transcripts"
    ON public.media_transcripts FOR SELECT
    USING (true);

CREATE POLICY "Public can read media_embeddings"
    ON public.media_embeddings FOR SELECT
    USING (true);

CREATE POLICY "Public can read media_speakers"
    ON public.media_speakers FOR SELECT
    USING (true);

-- Admin access for modifications (adjust based on your auth system)
-- For now, allow service role full access
CREATE POLICY "Service role can manage media_items"
    ON public.media_items FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage media_transcripts"
    ON public.media_transcripts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage media_embeddings"
    ON public.media_embeddings FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage media_processing_jobs"
    ON public.media_processing_jobs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View combining media with transcript status
CREATE OR REPLACE VIEW public.media_with_transcripts AS
SELECT
    m.*,
    t.transcript_text,
    t.word_count AS transcript_word_count,
    t.language,
    t.confidence_score,
    COUNT(DISTINCT e.id) AS embedding_count
FROM public.media_items m
LEFT JOIN public.media_transcripts t ON m.id = t.media_item_id
LEFT JOIN public.media_embeddings e ON m.id = e.media_item_id
GROUP BY m.id, t.id;

-- View for media analytics
CREATE OR REPLACE VIEW public.media_analytics AS
SELECT
    media_type,
    COUNT(*) AS total_items,
    SUM(CASE WHEN transcription_status = 'completed' THEN 1 ELSE 0 END) AS transcribed_items,
    SUM(CASE WHEN embedding_status = 'completed' THEN 1 ELSE 0 END) AS embedded_items,
    SUM(view_count) AS total_views,
    SUM(play_count) AS total_plays,
    AVG(quality_score) AS avg_quality_score
FROM public.media_items
GROUP BY media_type;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.media_items IS 'Stores metadata for all media content including podcasts, radio interviews, and videos from various sources';
COMMENT ON TABLE public.media_transcripts IS 'Stores transcripts generated from media items using transcription services';
COMMENT ON TABLE public.media_embeddings IS 'Vector embeddings from transcript chunks for semantic search';
COMMENT ON TABLE public.media_speakers IS 'Directory of people who appear in media content';
COMMENT ON TABLE public.media_speaker_appearances IS 'Links speakers to their appearances in media items';
COMMENT ON TABLE public.media_processing_jobs IS 'Tracks background processing jobs for media pipeline';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.media_items TO anon, authenticated;
GRANT SELECT ON public.media_transcripts TO anon, authenticated;
GRANT SELECT ON public.media_embeddings TO anon, authenticated;
GRANT SELECT ON public.media_speakers TO anon, authenticated;
GRANT SELECT ON public.media_with_transcripts TO anon, authenticated;
GRANT SELECT ON public.media_analytics TO anon, authenticated;

GRANT ALL ON public.media_items TO service_role;
GRANT ALL ON public.media_transcripts TO service_role;
GRANT ALL ON public.media_embeddings TO service_role;
GRANT ALL ON public.media_speakers TO service_role;
GRANT ALL ON public.media_speaker_appearances TO service_role;
GRANT ALL ON public.media_processing_jobs TO service_role;
