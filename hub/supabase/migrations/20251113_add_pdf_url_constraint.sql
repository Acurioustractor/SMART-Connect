-- Migration: Add unique constraint to pdf_documents.url
-- This fixes the "no unique or exclusion constraint matching the ON CONFLICT specification" error
-- when upserting PDF documents

-- First, remove any duplicate URLs that might exist
-- Keep the most recent version of each URL
DELETE FROM public.pdf_documents
WHERE id NOT IN (
  SELECT DISTINCT ON (url) id
  FROM public.pdf_documents
  ORDER BY url, updated_at DESC
);

-- Now add the unique constraint
ALTER TABLE public.pdf_documents
ADD CONSTRAINT pdf_documents_url_unique UNIQUE (url);

-- Create an index for better performance (optional, but recommended)
CREATE INDEX IF NOT EXISTS idx_pdf_documents_url ON public.pdf_documents(url);
