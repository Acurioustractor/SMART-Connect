-- Media Search Functions for SMART Recovery Australia
-- Created: 2025-11-13
-- Purpose: Semantic and hybrid search functions for media embeddings

-- ============================================================================
-- FUNCTION: search_media_embeddings
-- Semantic search using vector similarity
-- ============================================================================
CREATE OR REPLACE FUNCTION search_media_embeddings(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    media_item_id uuid,
    transcript_id uuid,
    chunk_text text,
    chunk_index int,
    start_time_seconds decimal,
    end_time_seconds decimal,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        me.id,
        me.media_item_id,
        me.transcript_id,
        me.chunk_text,
        me.chunk_index,
        me.start_time_seconds,
        me.end_time_seconds,
        1 - (me.embedding <=> query_embedding) AS similarity
    FROM public.media_embeddings me
    WHERE 1 - (me.embedding <=> query_embedding) > match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- FUNCTION: hybrid_search_media
-- Combines semantic search with keyword matching
-- ============================================================================
CREATE OR REPLACE FUNCTION hybrid_search_media(
    query_text text,
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    semantic_weight float DEFAULT 0.7,
    keyword_weight float DEFAULT 0.3
)
RETURNS TABLE (
    media_item_id uuid,
    title text,
    description text,
    outlet_host text,
    source_url text,
    chunk_text text,
    combined_score float,
    semantic_score float,
    keyword_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH semantic_results AS (
        SELECT
            me.media_item_id,
            me.chunk_text,
            1 - (me.embedding <=> query_embedding) AS similarity
        FROM public.media_embeddings me
        ORDER BY me.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    keyword_results AS (
        SELECT
            mt.media_item_id,
            mt.transcript_text AS chunk_text,
            ts_rank(mt.search_vector, plainto_tsquery('english', query_text)) AS rank
        FROM public.media_transcripts mt
        WHERE mt.search_vector @@ plainto_tsquery('english', query_text)
        ORDER BY rank DESC
        LIMIT match_count * 2
    ),
    combined AS (
        SELECT
            COALESCE(sr.media_item_id, kr.media_item_id) AS media_item_id,
            COALESCE(sr.chunk_text, kr.chunk_text) AS chunk_text,
            COALESCE(sr.similarity, 0) AS semantic_score,
            COALESCE(kr.rank, 0) AS keyword_score,
            (COALESCE(sr.similarity, 0) * semantic_weight) +
            (COALESCE(kr.rank, 0) * keyword_weight) AS combined_score
        FROM semantic_results sr
        FULL OUTER JOIN keyword_results kr ON sr.media_item_id = kr.media_item_id
    )
    SELECT
        c.media_item_id,
        mi.title,
        mi.description,
        mi.outlet_host,
        mi.source_url,
        c.chunk_text,
        c.combined_score,
        c.semantic_score,
        c.keyword_score
    FROM combined c
    JOIN public.media_items mi ON c.media_item_id = mi.id
    ORDER BY c.combined_score DESC
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- FUNCTION: get_related_media
-- Find related media based on a given media item's embeddings
-- ============================================================================
CREATE OR REPLACE FUNCTION get_related_media(
    source_media_id uuid,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    media_item_id uuid,
    title text,
    description text,
    media_type varchar(50),
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH source_embedding AS (
        SELECT AVG(embedding) AS avg_embedding
        FROM public.media_embeddings
        WHERE media_item_id = source_media_id
    )
    SELECT DISTINCT
        me.media_item_id,
        mi.title,
        mi.description,
        mi.media_type,
        1 - (me.embedding <=> se.avg_embedding) AS similarity
    FROM public.media_embeddings me
    CROSS JOIN source_embedding se
    JOIN public.media_items mi ON me.media_item_id = mi.id
    WHERE me.media_item_id != source_media_id
    ORDER BY me.embedding <=> se.avg_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- FUNCTION: search_media_by_speaker
-- Find all media featuring a specific speaker
-- ============================================================================
CREATE OR REPLACE FUNCTION search_media_by_speaker(
    speaker_name text,
    match_count int DEFAULT 20
)
RETURNS TABLE (
    media_item_id uuid,
    title text,
    media_type varchar(50),
    publish_date date,
    outlet_host text,
    source_url text,
    featured_people text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mi.id AS media_item_id,
        mi.title,
        mi.media_type,
        mi.publish_date,
        mi.outlet_host,
        mi.source_url,
        mi.featured_people
    FROM public.media_items mi
    WHERE speaker_name = ANY(mi.featured_people)
       OR mi.title ILIKE '%' || speaker_name || '%'
    ORDER BY mi.publish_date DESC NULLS LAST
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- FUNCTION: get_media_stats
-- Get statistics about media library
-- ============================================================================
CREATE OR REPLACE FUNCTION get_media_stats()
RETURNS TABLE (
    total_media int,
    total_transcribed int,
    total_embedded int,
    total_audio int,
    total_video int,
    total_podcasts int,
    total_transcript_words bigint,
    avg_duration_seconds float,
    most_featured_speaker text,
    most_featured_speaker_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT
            COUNT(*) AS total_media,
            SUM(CASE WHEN transcription_status = 'completed' THEN 1 ELSE 0 END) AS total_transcribed,
            SUM(CASE WHEN embedding_status = 'completed' THEN 1 ELSE 0 END) AS total_embedded,
            SUM(CASE WHEN media_type = 'audio' THEN 1 ELSE 0 END) AS total_audio,
            SUM(CASE WHEN media_type = 'video' THEN 1 ELSE 0 END) AS total_video,
            SUM(CASE WHEN media_type = 'podcast' THEN 1 ELSE 0 END) AS total_podcasts,
            AVG(duration_seconds) AS avg_duration_seconds
        FROM public.media_items
    ),
    transcript_stats AS (
        SELECT
            SUM(word_count) AS total_transcript_words
        FROM public.media_transcripts
    ),
    speaker_stats AS (
        SELECT
            speaker,
            COUNT(*) AS speaker_count
        FROM public.media_items,
        LATERAL unnest(featured_people) AS speaker
        GROUP BY speaker
        ORDER BY speaker_count DESC
        LIMIT 1
    )
    SELECT
        stats.total_media::int,
        stats.total_transcribed::int,
        stats.total_embedded::int,
        stats.total_audio::int,
        stats.total_video::int,
        stats.total_podcasts::int,
        COALESCE(transcript_stats.total_transcript_words, 0),
        stats.avg_duration_seconds,
        speaker_stats.speaker,
        speaker_stats.speaker_count
    FROM stats
    CROSS JOIN transcript_stats
    LEFT JOIN speaker_stats ON true;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION search_media_embeddings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION hybrid_search_media TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_related_media TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_media_by_speaker TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_media_stats TO anon, authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION search_media_embeddings IS 'Semantic search across media transcript embeddings using vector similarity';
COMMENT ON FUNCTION hybrid_search_media IS 'Combines semantic and keyword search for comprehensive media search';
COMMENT ON FUNCTION get_related_media IS 'Find media items related to a given media item based on content similarity';
COMMENT ON FUNCTION search_media_by_speaker IS 'Search for all media featuring a specific speaker';
COMMENT ON FUNCTION get_media_stats IS 'Get comprehensive statistics about the media library';
