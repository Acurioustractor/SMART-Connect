-- =====================================================
-- SMART Connect - Interviews & Analysis Schema
-- =====================================================
-- This adds interview storage and analysis to Supabase
-- Run this AFTER the main supabase-schema.sql
-- =====================================================

-- =====================================================
-- INTERVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  interview_date DATE,
  interview_type TEXT DEFAULT 'general' CHECK (interview_type IN ('smart_platform_review', 'general')),
  affiliation TEXT,
  role TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  raw_content TEXT NOT NULL, -- The full markdown content
  metadata JSONB, -- Flexible storage for additional fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interviews_name ON public.interviews(name);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON public.interviews(interview_date DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_type ON public.interviews(interview_type);

-- =====================================================
-- INTERVIEW ANALYSIS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interview_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,

  -- Core Analysis Fields
  executive_summary TEXT NOT NULL,
  one_line_takeaway TEXT,

  -- Structured data
  key_themes JSONB, -- Array of {theme, description, evidence[], significance}
  powerful_quotes JSONB, -- Array of {quote, context, significance}
  learnworld_content_suggestions JSONB, -- Array of course suggestions
  facilitator_insights JSONB, -- {challenges[], strengths[], supportNeeds[], learningPreferences}
  platform_implications JSONB, -- Array of {insight, featureIdea, priority, rationale}
  cultural_considerations JSONB, -- {relevant, insights[], recommendations[]}

  -- Metadata
  model_used TEXT DEFAULT 'gpt-4-turbo-preview',
  tokens_used INTEGER,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analysis_interview ON public.interview_analysis(interview_id);
CREATE INDEX IF NOT EXISTS idx_analysis_date ON public.interview_analysis(analyzed_at DESC);

-- =====================================================
-- INTERVIEW EMBEDDINGS (for vector search)
-- =====================================================
-- Enable pgvector extension first
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.interview_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  content_chunk TEXT NOT NULL, -- The actual text chunk
  chunk_index INTEGER NOT NULL, -- Order of chunks
  embedding vector(1536), -- OpenAI ada-002 embeddings are 1536 dimensions
  metadata JSONB, -- {section: 'summary'|'themes'|'quotes', speaker: 'interviewer'|'participant'}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_interview ON public.interview_embeddings(interview_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.interview_embeddings USING ivfflat (embedding vector_cosine_ops);

-- =====================================================
-- LEARNWORLD COURSES (generated from analysis)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.learnworld_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_audience TEXT,
  format TEXT, -- 'podcast', 'video_series', 'workshop', etc.
  estimated_length TEXT,
  key_learning_outcomes JSONB, -- Array of strings

  -- Link to interviews that suggested this course
  source_interviews UUID[], -- Array of interview_ids

  -- Status tracking
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'planned', 'in_development', 'published')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.learnworld_courses(status, priority);

-- =====================================================
-- PLATFORM FEATURES (suggested from analysis)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.platform_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_name TEXT NOT NULL,
  description TEXT NOT NULL,
  insight TEXT, -- The insight that led to this feature idea
  rationale TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Link to interviews that suggested this feature
  source_interviews UUID[], -- Array of interview_ids

  -- Status tracking
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'reviewing', 'planned', 'in_development', 'shipped')),
  votes INTEGER DEFAULT 0, -- Community voting

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_features_status ON public.platform_features(status, priority);
CREATE INDEX IF NOT EXISTS idx_features_votes ON public.platform_features(votes DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learnworld_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_features ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read interviews and analysis
CREATE POLICY "Anyone can view interviews"
ON public.interviews FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can view analysis"
ON public.interview_analysis FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can view embeddings"
ON public.interview_embeddings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can view courses"
ON public.learnworld_courses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can view features"
ON public.platform_features FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert/update/delete (add more specific policies as needed)
CREATE POLICY "Service role can manage interviews"
ON public.interviews FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role can manage analysis"
ON public.interview_analysis FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role can manage embeddings"
ON public.interview_embeddings FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role can manage courses"
ON public.learnworld_courses FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role can manage features"
ON public.platform_features FOR ALL
TO service_role
USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to search interviews by semantic similarity
CREATE OR REPLACE FUNCTION match_interview_content(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  interview_id uuid,
  interview_name text,
  content_chunk text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ie.interview_id,
    i.name as interview_name,
    ie.content_chunk,
    1 - (ie.embedding <=> query_embedding) as similarity
  FROM public.interview_embeddings ie
  JOIN public.interviews i ON ie.interview_id = i.id
  WHERE 1 - (ie.embedding <=> query_embedding) > match_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to get all analysis for an interview
CREATE OR REPLACE FUNCTION get_interview_with_analysis(interview_uuid uuid)
RETURNS TABLE (
  interview_name text,
  interview_content text,
  executive_summary text,
  key_themes jsonb,
  powerful_quotes jsonb,
  learnworld_suggestions jsonb,
  platform_implications jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    i.name,
    i.raw_content,
    ia.executive_summary,
    ia.key_themes,
    ia.powerful_quotes,
    ia.learnworld_content_suggestions,
    ia.platform_implications
  FROM public.interviews i
  LEFT JOIN public.interview_analysis ia ON i.id = ia.interview_id
  WHERE i.id = interview_uuid;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON public.interviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.learnworld_courses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_features_updated_at BEFORE UPDATE ON public.platform_features
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- Most cited interviews (referenced in course/feature suggestions)
CREATE OR REPLACE VIEW public.most_influential_interviews AS
SELECT
  i.id,
  i.name,
  i.interview_date,
  i.interview_type,
  COUNT(DISTINCT c.id) as course_suggestions,
  COUNT(DISTINCT f.id) as feature_suggestions,
  (COUNT(DISTINCT c.id) + COUNT(DISTINCT f.id)) as total_citations
FROM public.interviews i
LEFT JOIN public.learnworld_courses c ON i.id = ANY(c.source_interviews)
LEFT JOIN public.platform_features f ON i.id = ANY(f.source_interviews)
GROUP BY i.id, i.name, i.interview_date, i.interview_type
ORDER BY total_citations DESC;

-- LearnWorld course pipeline
CREATE OR REPLACE VIEW public.course_pipeline AS
SELECT
  status,
  priority,
  COUNT(*) as count,
  STRING_AGG(title, ', ') as titles
FROM public.learnworld_courses
GROUP BY status, priority
ORDER BY
  CASE status
    WHEN 'suggested' THEN 1
    WHEN 'planned' THEN 2
    WHEN 'in_development' THEN 3
    WHEN 'published' THEN 4
  END,
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
