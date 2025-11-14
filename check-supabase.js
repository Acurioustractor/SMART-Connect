#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://gokmsihcbejttzimbrlw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdva21zaWhjYmVqdHR6aW1icmx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk3NjI0MywiZXhwIjoyMDc4NTUyMjQzfQ.xrUixKFNTZMvYy_zILNk8qEWFeFPcTFdtl9TlDrwxuU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  console.log('Checking Supabase data...\n')

  // Check scraped_content
  const { data: pages, error: pagesError, count: pagesCount } = await supabase
    .from('scraped_content')
    .select('*', { count: 'exact' })
    .limit(5)

  console.log('=== SCRAPED CONTENT ===')
  if (pagesError) {
    console.error('Error:', pagesError.message)
  } else {
    console.log(`Total rows: ${pagesCount}`)
    console.log(`Sample (first 5):`)
    pages.forEach((page, i) => {
      console.log(`  ${i + 1}. ${page.title} (${page.url})`)
      console.log(`     - Category: ${page.category || 'N/A'}`)
      console.log(`     - Words: ${page.word_count || 'N/A'}`)
      console.log(`     - Scraped: ${page.scraped_at}`)
    })
  }

  // Check PDFs
  const { data: pdfs, error: pdfsError, count: pdfsCount } = await supabase
    .from('pdf_documents')
    .select('*', { count: 'exact' })
    .limit(5)

  console.log('\n=== PDF DOCUMENTS ===')
  if (pdfsError) {
    console.error('Error:', pdfsError.message)
  } else {
    console.log(`Total rows: ${pdfsCount}`)
    console.log(`Sample (first 5):`)
    pdfs.forEach((pdf, i) => {
      console.log(`  ${i + 1}. ${pdf.title}`)
      console.log(`     - Category: ${pdf.category || 'N/A'}`)
      console.log(`     - Pages: ${pdf.page_count || 'N/A'}`)
    })
  }

  // Check embeddings
  const { count: embeddingsCount } = await supabase
    .from('content_embeddings')
    .select('*', { count: 'exact', head: true })

  console.log('\n=== EMBEDDINGS ===')
  console.log(`Total embeddings: ${embeddingsCount}`)

  console.log('\n=== TABLE COLUMNS ===')
  // Show what columns exist
  if (pages && pages.length > 0) {
    console.log('scraped_content columns:', Object.keys(pages[0]).join(', '))
  }
}

checkData().catch(console.error)
