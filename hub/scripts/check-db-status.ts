#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://gokmsihcbejttzimbrlw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva21zaWhjYmVqdHR6aW1icmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk3NjI0MywiZXhwIjoyMDc4NTUyMjQzfQ.xrUixKFNTZMvYy_zILNk8qEWFeFPcTFdtl9TlDrwxuU'
)

async function checkStatus() {
  const jobId = 'e783a1e1-5d33-41df-897d-04650bb79ec2'

  const { data: job, error } = await supabase
    .from('scraping_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('\n📊 Job Status from Database:')
  console.log('═'.repeat(60))
  console.log(`Job ID: ${job.id}`)
  console.log(`Status: ${job.status}`)
  console.log(`Firecrawl Job ID: ${job.firecrawl_job_id}`)
  console.log(`Progress: ${job.progress_percent}%`)
  console.log(`Pages Discovered: ${job.pages_discovered || 0}`)
  console.log(`Pages Scraped: ${job.pages_scraped || 0}`)
  console.log(`Started: ${job.started_at}`)
  console.log(`Error: ${job.error_message || 'None'}`)
  console.log()

  if (job.firecrawl_job_id) {
    console.log('🔗 Firecrawl Job ID:', job.firecrawl_job_id)
    console.log('📝 You can check Firecrawl status directly at:')
    console.log(`   https://www.firecrawl.dev/app/crawls/${job.firecrawl_job_id}`)
    console.log()
  }
}

checkStatus()
