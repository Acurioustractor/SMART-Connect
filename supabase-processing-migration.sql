-- Migration to add processing status and columns to scraping_jobs table
-- This supports asynchronous processing of crawl results

-- Add new status values for processing phase
ALTER TABLE public.scraping_jobs
  DROP CONSTRAINT IF EXISTS scraping_jobs_status_check;

ALTER TABLE public.scraping_jobs
  ADD CONSTRAINT scraping_jobs_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'processing', 'processed'));

-- Add new columns for tracking processing phase
ALTER TABLE public.scraping_jobs
  ADD COLUMN IF NOT EXISTS pages_processed INTEGER DEFAULT 0;

ALTER TABLE public.scraping_jobs
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.scraping_jobs
  ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the difference between phases
COMMENT ON TABLE public.scraping_jobs IS 'Tracks both crawling (fetching pages) and processing (generating embeddings) phases. Crawling completes when status=completed, processing completes when status=processed.';

COMMENT ON COLUMN public.scraping_jobs.pages_scraped IS 'Number of pages scraped during crawl phase';
COMMENT ON COLUMN public.scraping_jobs.pages_processed IS 'Number of pages processed (embeddings generated) during processing phase';
COMMENT ON COLUMN public.scraping_jobs.processing_started_at IS 'When the processing phase started (after crawl completed)';
COMMENT ON COLUMN public.scraping_jobs.processing_completed_at IS 'When the processing phase completed';
