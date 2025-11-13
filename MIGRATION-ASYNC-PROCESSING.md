# Async Processing Migration

## Overview

This migration adds support for asynchronous processing of scraped content. Previously, the processing phase (generating embeddings) would time out on large sites. Now the processing runs in the background and can be monitored via polling.

## Changes

### Database Schema

The `scraping_jobs` table has been updated with:
- New statuses: `processing`, `processed`
- New columns:
  - `pages_processed`: Track processing progress separately from crawl progress
  - `processing_started_at`: When processing phase started
  - `processing_completed_at`: When processing phase completed

### API Changes

The `/api/content/scrape-full` endpoint now supports:
- `action: 'process_results'` - Starts processing in background, returns immediately
- `action: 'check_processing'` - Check processing progress and status

### Script Changes

The `scrape-smart-site.ts` script now:
1. Starts processing (returns immediately)
2. Polls for processing progress every 10 seconds
3. Shows real-time progress updates
4. Times out after 60 minutes instead of 5 minutes

## How to Apply Migration

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase-processing-migration.sql`
4. Run the SQL script

### Option 2: Using Supabase CLI (if you have it set up)

```bash
supabase db push supabase-processing-migration.sql
```

### Option 3: Manual Application

If you prefer to apply manually, run these SQL commands in your Supabase SQL editor:

```sql
-- Add new status values
ALTER TABLE public.scraping_jobs
  DROP CONSTRAINT IF EXISTS scraping_jobs_status_check;

ALTER TABLE public.scraping_jobs
  ADD CONSTRAINT scraping_jobs_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'processing', 'processed'));

-- Add new columns
ALTER TABLE public.scraping_jobs
  ADD COLUMN IF NOT EXISTS pages_processed INTEGER DEFAULT 0;

ALTER TABLE public.scraping_jobs
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.scraping_jobs
  ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;
```

## Testing

After applying the migration:

1. Ensure your dev server is running: `npm run dev`
2. Run the scraping script: `npm run scrape-smart-site`
3. You should see:
   - Step 3: Processing started (returns immediately)
   - Step 4: Progress updates every 10 seconds
   - No timeout errors for large sites

## Benefits

- ✅ No more timeout errors on large sites
- ✅ Real-time progress tracking
- ✅ Processing continues even if HTTP connection drops
- ✅ Can monitor progress from anywhere (not just the script)
- ✅ Better separation of concerns (crawl vs process phases)

## Rollback

If you need to rollback:

```sql
-- Remove new columns
ALTER TABLE public.scraping_jobs
  DROP COLUMN IF EXISTS pages_processed;

ALTER TABLE public.scraping_jobs
  DROP COLUMN IF EXISTS processing_started_at;

ALTER TABLE public.scraping_jobs
  DROP COLUMN IF EXISTS processing_completed_at;

-- Restore original status constraint
ALTER TABLE public.scraping_jobs
  DROP CONSTRAINT IF EXISTS scraping_jobs_status_check;

ALTER TABLE public.scraping_jobs
  ADD CONSTRAINT scraping_jobs_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
```

Then revert the code changes using git.
