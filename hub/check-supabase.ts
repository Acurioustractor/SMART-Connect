import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('Supabase URL:', supabaseUrl)
console.log('Service key exists:', !!supabaseKey)

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
    if (pages && pages.length > 0) {
      console.log(`Sample (first 5):`)
      pages.forEach((page: any, i: number) => {
        console.log(`  ${i + 1}. ${page.title} (${page.url})`)
        console.log(`     - Category: ${page.category || 'N/A'}`)
        console.log(`     - Words: ${page.word_count || 'N/A'}`)
        console.log(`     - Scraped: ${page.scraped_at}`)
      })
    }
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
    if (pdfs && pdfs.length > 0) {
      console.log(`Sample (first 5):`)
      pdfs.forEach((pdf: any, i: number) => {
        console.log(`  ${i + 1}. ${pdf.title}`)
        console.log(`     - Category: ${pdf.category || 'N/A'}`)
        console.log(`     - Pages: ${pdf.page_count || 'N/A'}`)
      })
    }
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
