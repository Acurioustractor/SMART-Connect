-- =====================================================
-- SMART Connect Hub - Content Scraping & Recommendation Schema
-- =====================================================
-- This schema supports:
-- - Web content scraping and storage
-- - PDF document management
-- - Vector embeddings for semantic search
-- - Content recommendations
-- - Facilitator insight tracking
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- SCRAPED WEB CONTENT
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scraped_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  markdown TEXT NOT NULL,
  content_type TEXT DEFAULT 'page' CHECK (content_type IN ('page', 'pdf', 'resource', 'tool', 'article')),

  -- Metadata
  meta_description TEXT,
  meta_keywords TEXT[],
  author TEXT,
  published_date TIMESTAMP WITH TIME ZONE,

  -- Classification
  category TEXT, -- 'facilitator-resources', 'tools', 'research', 'training', etc.
  tags TEXT[],
  word_count INTEGER,
  reading_time_minutes INTEGER,

  -- Quality metrics
  quality_score FLOAT DEFAULT 0, -- 0-1 score for content quality
  relevance_score FLOAT DEFAULT 0, -- 0-1 score for SMART Recovery relevance
  is_verified BOOLEAN DEFAULT false, -- Manually verified by admin

  -- Scraping info
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scrape_status TEXT DEFAULT 'success' CHECK (scrape_status IN ('success', 'failed', 'pending', 'stale')),
  error_message TEXT,

  -- Links and relationships
  parent_url TEXT, -- URL this was discovered from
  external_links TEXT[], -- Links to external resources
  internal_links TEXT[], -- Links to other SMART Recovery pages

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(meta_description, '')), 'C')
  ) STORED
);

-- Create indexes for scraped_content
CREATE INDEX IF NOT EXISTS idx_scraped_content_url ON public.scraped_content(url);
CREATE INDEX IF NOT EXISTS idx_scraped_content_category ON public.scraped_content(category);
CREATE INDEX IF NOT EXISTS idx_scraped_content_type ON public.scraped_content(content_type);
CREATE INDEX IF NOT EXISTS idx_scraped_content_updated ON public.scraped_content(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_content_search ON public.scraped_content USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_scraped_content_tags ON public.scraped_content USING GIN(tags);

-- =====================================================
-- PDF DOCUMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pdf_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scraped_content_id UUID REFERENCES public.scraped_content(id) ON DELETE CASCADE,

  -- PDF metadata
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  file_path TEXT, -- If stored locally or in storage bucket
  file_size_bytes BIGINT,
  page_count INTEGER,

  -- Content
  extracted_text TEXT,
  markdown_content TEXT,

  -- Classification
  category TEXT, -- 'facilitator-guide', 'participant-worksheet', 'training-manual', etc.
  tool_type TEXT, -- 'CBA', 'cost-benefit', 'hierarchy-of-values', etc.
  target_audience TEXT[], -- ['facilitators', 'participants', 'family']
  smart_tool_number TEXT, -- e.g., 'Tool 1', 'Tool 2', etc.

  -- Metadata
  author TEXT,
  version TEXT,
  published_date DATE,
  language TEXT DEFAULT 'en',

  -- Usage tracking
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,

  -- Quality
  is_verified BOOLEAN DEFAULT false,
  quality_score FLOAT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pdf_documents
CREATE INDEX IF NOT EXISTS idx_pdf_documents_category ON public.pdf_documents(category);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_tool_type ON public.pdf_documents(tool_type);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_audience ON public.pdf_documents USING GIN(target_audience);

-- =====================================================
-- CONTENT EMBEDDINGS (for semantic search)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.content_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reference to source content
  scraped_content_id UUID REFERENCES public.scraped_content(id) ON DELETE CASCADE,
  pdf_document_id UUID REFERENCES public.pdf_documents(id) ON DELETE CASCADE,

  -- Content chunk (for long documents)
  chunk_index INTEGER DEFAULT 0,
  chunk_text TEXT NOT NULL,
  chunk_size INTEGER,

  -- Embedding
  embedding vector(1536), -- OpenAI ada-002 embeddings

  -- Metadata for better context
  section_title TEXT,
  content_type TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: must reference either scraped_content or pdf_document
  CONSTRAINT content_reference_check CHECK (
    (scraped_content_id IS NOT NULL AND pdf_document_id IS NULL) OR
    (scraped_content_id IS NULL AND pdf_document_id IS NOT NULL)
  )
);

-- Create indexes for content_embeddings
CREATE INDEX IF NOT EXISTS idx_content_embeddings_scraped ON public.content_embeddings(scraped_content_id);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_pdf ON public.content_embeddings(pdf_document_id);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_vector ON public.content_embeddings USING ivfflat (embedding vector_cosine_ops);

-- =====================================================
-- CONTENT RECOMMENDATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.content_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What content is being recommended
  scraped_content_id UUID REFERENCES public.scraped_content(id) ON DELETE CASCADE,
  pdf_document_id UUID REFERENCES public.pdf_documents(id) ON DELETE CASCADE,

  -- Recommendation context
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
    'facilitator_support', -- Helps with facilitator challenges
    'tool_suggestion', -- Suggests relevant SMART tools
    'training_material', -- Training/professional development
    'participant_resource', -- For sharing with participants
    'similar_content', -- Related content
    'trending', -- Popular/frequently accessed
    'new_content', -- Recently added
    'missing_tool' -- Identified gap in tools
  )),

  -- Recommendation metadata
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT, -- Why this is being recommended
  confidence_score FLOAT, -- 0-1 confidence in recommendation

  -- Targeting
  target_audience TEXT[], -- ['facilitators', 'coordinators', 'all']
  relevant_themes TEXT[], -- Interview themes this addresses
  relevant_challenges TEXT[], -- Facilitator challenges this helps with

  -- Relevance to interviews/insights
  related_interview_ids UUID[], -- Links to interview analysis
  based_on_facilitator_feedback BOOLEAN DEFAULT false,

  -- Engagement tracking
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  dismissal_count INTEGER DEFAULT 0,

  -- Freshness
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher = more important
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: must reference either scraped_content or pdf_document
  CONSTRAINT recommendation_reference_check CHECK (
    (scraped_content_id IS NOT NULL AND pdf_document_id IS NULL) OR
    (scraped_content_id IS NULL AND pdf_document_id IS NOT NULL)
  )
);

-- Create indexes for content_recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON public.content_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_active ON public.content_recommendations(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_audience ON public.content_recommendations USING GIN(target_audience);
CREATE INDEX IF NOT EXISTS idx_recommendations_themes ON public.content_recommendations USING GIN(relevant_themes);

-- =====================================================
-- FACILITATOR INSIGHTS (aggregated from conversations)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.facilitator_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Insight content
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'challenge', -- A challenge facilitators face
    'success_story', -- What's working well
    'tool_gap', -- Missing tool or resource
    'improvement_idea', -- Suggestion for improvement
    'training_need', -- Training/support need identified
    'best_practice', -- Effective practice shared
    'concern', -- Concern or issue raised
    'question' -- Common question
  )),

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  full_content TEXT,

  -- Source
  source_type TEXT CHECK (source_type IN ('interview', 'chat', 'feedback', 'manual')),
  source_ids UUID[], -- IDs of interviews, conversations, etc.
  quote_excerpts TEXT[], -- Key quotes supporting this insight

  -- Frequency & impact
  mention_count INTEGER DEFAULT 1, -- How many times this came up
  urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  impact_score FLOAT DEFAULT 0, -- 0-1 score for potential impact

  -- Classification
  themes TEXT[], -- Related themes
  regions TEXT[], -- Geographic regions if relevant
  meeting_types TEXT[], -- Face-to-face, online, etc.

  -- Action tracking
  status TEXT DEFAULT 'identified' CHECK (status IN (
    'identified', -- Just discovered
    'reviewing', -- Being analyzed
    'planning', -- Planning response
    'in_progress', -- Working on it
    'completed', -- Addressed
    'wont_fix' -- Decided not to address
  )),
  assigned_to TEXT,
  action_items JSONB, -- List of actions to take

  -- Recommendations generated
  generated_recommendations UUID[], -- IDs of recommendations created from this
  suggested_content UUID[], -- Content that could help

  -- Engagement
  upvote_count INTEGER DEFAULT 0,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for facilitator_insights
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.facilitator_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_status ON public.facilitator_insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_urgency ON public.facilitator_insights(urgency_level);
CREATE INDEX IF NOT EXISTS idx_insights_themes ON public.facilitator_insights USING GIN(themes);

-- =====================================================
-- CONTENT USAGE ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.content_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  -- What content was accessed
  scraped_content_id UUID REFERENCES public.scraped_content(id) ON DELETE CASCADE,
  pdf_document_id UUID REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES public.content_recommendations(id) ON DELETE SET NULL,

  -- Action type
  action_type TEXT NOT NULL CHECK (action_type IN (
    'view', 'download', 'share', 'save', 'dismiss', 'click', 'search_result'
  )),

  -- Context
  session_id TEXT,
  referrer_url TEXT,
  search_query TEXT, -- If found via search
  user_agent TEXT,

  -- Engagement metrics
  time_spent_seconds INTEGER,
  scroll_depth_percent INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for content_usage
CREATE INDEX IF NOT EXISTS idx_content_usage_user ON public.content_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_usage_scraped ON public.content_usage(scraped_content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_usage_pdf ON public.content_usage(pdf_document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_usage_action ON public.content_usage(action_type, created_at DESC);

-- =====================================================
-- SCRAPING JOBS (track crawling progress)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scraping_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Job details
  firecrawl_job_id TEXT UNIQUE,
  job_type TEXT NOT NULL CHECK (job_type IN ('full_crawl', 'partial_crawl', 'single_page', 'pdf_extraction')),
  target_url TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress_percent INTEGER DEFAULT 0,

  -- Results
  pages_discovered INTEGER DEFAULT 0,
  pages_scraped INTEGER DEFAULT 0,
  pdfs_found INTEGER DEFAULT 0,
  pdfs_processed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,

  -- Configuration
  config JSONB, -- Scraping configuration used

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  triggered_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for scraping_jobs
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON public.scraping_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_firecrawl ON public.scraping_jobs(firecrawl_job_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.scraped_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilitator_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_jobs ENABLE ROW LEVEL SECURITY;

-- Scraped Content: Everyone can read, only service role can write
CREATE POLICY "Anyone can view scraped content"
ON public.scraped_content FOR SELECT
USING (true);

-- PDF Documents: Everyone can read, only service role can write
CREATE POLICY "Anyone can view PDFs"
ON public.pdf_documents FOR SELECT
USING (true);

-- Content Embeddings: Everyone can read for search
CREATE POLICY "Anyone can search embeddings"
ON public.content_embeddings FOR SELECT
USING (true);

-- Content Recommendations: Everyone can read active recommendations
CREATE POLICY "Anyone can view active recommendations"
ON public.content_recommendations FOR SELECT
USING (is_active = true);

-- Facilitator Insights: Everyone can read, authenticated can create
CREATE POLICY "Anyone can view insights"
ON public.facilitator_insights FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create insights"
ON public.facilitator_insights FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Content Usage: Users can only see their own usage
CREATE POLICY "Users can view own content usage"
ON public.content_usage FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can record content usage"
ON public.content_usage FOR INSERT
WITH CHECK (true);

-- Scraping Jobs: Authenticated users can view and create
CREATE POLICY "Authenticated users can view scraping jobs"
ON public.scraping_jobs FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create scraping jobs"
ON public.scraping_jobs FOR INSERT
WITH CHECK (auth.uid() = triggered_by);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_scraped_content_updated_at BEFORE UPDATE ON public.scraped_content
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdf_documents_updated_at BEFORE UPDATE ON public.pdf_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON public.content_recommendations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON public.facilitator_insights
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraping_jobs_updated_at BEFORE UPDATE ON public.scraping_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for semantic search across content
CREATE OR REPLACE FUNCTION search_content_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content_type text,
  title text,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    COALESCE(sc.content_type, 'pdf') as content_type,
    COALESCE(sc.title, pd.title) as title,
    ce.chunk_text,
    1 - (ce.embedding <=> query_embedding) as similarity
  FROM public.content_embeddings ce
  LEFT JOIN public.scraped_content sc ON ce.scraped_content_id = sc.id
  LEFT JOIN public.pdf_documents pd ON ce.pdf_document_id = pd.id
  WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get popular content
CREATE OR REPLACE FUNCTION get_popular_content(
  days_back int DEFAULT 30,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  content_id uuid,
  content_type text,
  title text,
  url text,
  view_count bigint,
  download_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(cu.scraped_content_id, cu.pdf_document_id) as content_id,
    CASE
      WHEN cu.scraped_content_id IS NOT NULL THEN 'page'
      ELSE 'pdf'
    END as content_type,
    COALESCE(sc.title, pd.title) as title,
    COALESCE(sc.url, pd.url) as url,
    COUNT(CASE WHEN cu.action_type = 'view' THEN 1 END) as view_count,
    COUNT(CASE WHEN cu.action_type = 'download' THEN 1 END) as download_count
  FROM public.content_usage cu
  LEFT JOIN public.scraped_content sc ON cu.scraped_content_id = sc.id
  LEFT JOIN public.pdf_documents pd ON cu.pdf_document_id = pd.id
  WHERE cu.created_at > NOW() - INTERVAL '1 day' * days_back
  GROUP BY COALESCE(cu.scraped_content_id, cu.pdf_document_id), sc.title, pd.title, sc.url, pd.url
  HAVING COUNT(*) > 0
  ORDER BY COUNT(*) DESC
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Content performance view
CREATE OR REPLACE VIEW public.content_performance AS
SELECT
  sc.id,
  sc.title,
  sc.url,
  sc.category,
  sc.content_type,
  sc.word_count,
  sc.quality_score,
  COUNT(DISTINCT cu.user_id) as unique_visitors,
  COUNT(CASE WHEN cu.action_type = 'view' THEN 1 END) as views,
  COUNT(CASE WHEN cu.action_type = 'download' THEN 1 END) as downloads,
  COUNT(CASE WHEN cu.action_type = 'save' THEN 1 END) as saves,
  AVG(cu.time_spent_seconds) as avg_time_spent_seconds,
  sc.last_updated
FROM public.scraped_content sc
LEFT JOIN public.content_usage cu ON sc.id = cu.scraped_content_id
GROUP BY sc.id, sc.title, sc.url, sc.category, sc.content_type, sc.word_count, sc.quality_score, sc.last_updated;

-- Recommendation effectiveness view
CREATE OR REPLACE VIEW public.recommendation_effectiveness AS
SELECT
  cr.recommendation_type,
  cr.title,
  cr.confidence_score,
  cr.view_count,
  cr.click_count,
  cr.save_count,
  cr.dismissal_count,
  CASE
    WHEN cr.view_count > 0 THEN (cr.click_count::float / cr.view_count * 100)
    ELSE 0
  END as click_through_rate,
  CASE
    WHEN cr.view_count > 0 THEN (cr.save_count::float / cr.view_count * 100)
    ELSE 0
  END as save_rate,
  cr.created_at
FROM public.content_recommendations cr
WHERE cr.is_active = true
ORDER BY cr.click_count DESC;

-- Facilitator insights summary view
CREATE OR REPLACE VIEW public.insights_summary AS
SELECT
  fi.insight_type,
  fi.urgency_level,
  fi.status,
  COUNT(*) as count,
  AVG(fi.impact_score) as avg_impact_score,
  SUM(fi.mention_count) as total_mentions,
  MAX(fi.created_at) as most_recent
FROM public.facilitator_insights fi
GROUP BY fi.insight_type, fi.urgency_level, fi.status
ORDER BY COUNT(*) DESC;

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Add some default categories for content classification
CREATE TABLE IF NOT EXISTS public.content_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO public.content_categories (name, description, parent_category, sort_order) VALUES
  ('Facilitator Resources', 'Resources specifically for facilitators', NULL, 1),
  ('Tools & Worksheets', 'SMART Recovery tools and worksheets', NULL, 2),
  ('Training Materials', 'Training and professional development', NULL, 3),
  ('Participant Resources', 'Resources for participants and members', NULL, 4),
  ('Research & Evidence', 'Research papers and evidence base', NULL, 5),
  ('Family & Friends', 'Resources for family and friends', NULL, 6),
  ('Handbooks & Manuals', 'Comprehensive guides and manuals', NULL, 7),
  ('Meeting Resources', 'Resources for running meetings', 'Facilitator Resources', 8),
  ('Cultural Safety', 'Culturally safe practice resources', 'Facilitator Resources', 9),
  ('Self-Care', 'Facilitator self-care and wellbeing', 'Facilitator Resources', 10)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
--
-- To use this schema:
--
-- 1. Go to your Supabase project dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
--
-- This creates:
-- - Tables for scraped content, PDFs, embeddings
-- - Content recommendation system
-- - Facilitator insights tracking
-- - Analytics and usage tracking
-- - Helper functions for search and analytics
-- - Row Level Security policies
--
-- After running this, you can start scraping content and
-- the system will automatically store and embed it for
-- semantic search and recommendations.
--
-- =====================================================
