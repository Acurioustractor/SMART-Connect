-- Fix for scraped_content trigger mismatch
-- The trigger tries to update 'updated_at' but the column is 'last_updated'

-- Option 1: Update the function to handle last_updated for scraped_content
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the old trigger on scraped_content
DROP TRIGGER IF EXISTS update_scraped_content_updated_at ON public.scraped_content;

-- Create new trigger using the correct function
CREATE TRIGGER update_scraped_content_last_updated BEFORE UPDATE ON public.scraped_content
FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

-- Note: Other tables (pdf_documents, content_recommendations, etc.) might have 'updated_at'
-- so keep the original function for them
