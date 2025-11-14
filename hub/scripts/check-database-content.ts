#!/usr/bin/env tsx

/**
 * Quick diagnostic script to check what content is in the database
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('🔍 Checking database content...\n')

  try {
    // Check scraped_content table
    const { data: pages, error: pagesError, count: pagesCount } = await supabase
      .from('scraped_content')
      .select('id, url, title, content_type, category, word_count', { count: 'exact' })
      .limit(10)

    if (pagesError) {
      console.error('❌ Error querying scraped_content:', pagesError.message)
    } else {
      console.log(`📄 scraped_content table: ${pagesCount || 0} records`)
      if (pages && pages.length > 0) {
        console.log('   Sample records:')
        pages.forEach((page, i) => {
          console.log(`   ${i + 1}. ${page.title || 'Untitled'}`)
          console.log(`      URL: ${page.url}`)
          console.log(`      Type: ${page.content_type}, Category: ${page.category || 'none'}, Words: ${page.word_count || 0}`)
        })
      } else {
        console.log('   ⚠️  No pages found in database')
      }
    }

    console.log()

    // Check pdf_documents table
    const { data: pdfs, error: pdfsError, count: pdfsCount } = await supabase
      .from('pdf_documents')
      .select('id, url, title, category, page_count', { count: 'exact' })
      .limit(10)

    if (pdfsError) {
      console.error('❌ Error querying pdf_documents:', pdfsError.message)
    } else {
      console.log(`📑 pdf_documents table: ${pdfsCount || 0} records`)
      if (pdfs && pdfs.length > 0) {
        console.log('   Sample records:')
        pdfs.forEach((pdf, i) => {
          console.log(`   ${i + 1}. ${pdf.title || 'Untitled'}`)
          console.log(`      URL: ${pdf.url}`)
          console.log(`      Category: ${pdf.category || 'none'}, Pages: ${pdf.page_count || 0}`)
        })
      } else {
        console.log('   ⚠️  No PDFs found in database')
      }
    }

    console.log()

    // Check content_embeddings table
    const { count: embeddingsCount, error: embeddingsError } = await supabase
      .from('content_embeddings')
      .select('id', { count: 'exact', head: true })

    if (embeddingsError) {
      console.error('❌ Error querying content_embeddings:', embeddingsError.message)
    } else {
      console.log(`🧠 content_embeddings table: ${embeddingsCount || 0} records`)
    }

    console.log()
    console.log('=' .repeat(60))

    if ((pagesCount || 0) === 0 && (pdfsCount || 0) === 0) {
      console.log('\n❌ DATABASE IS EMPTY - No content found!')
      console.log('\n💡 To populate the database, run:')
      console.log('   cd hub')
      console.log('   npm run scrape-smart-site')
      console.log('\n   This will scrape smartrecoveryaustralia.com.au and populate all tables.')
    } else {
      console.log(`\n✅ Database has ${(pagesCount || 0) + (pdfsCount || 0)} content items`)
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

main()
