#!/usr/bin/env tsx

/**
 * Manually process completed crawl results
 * Usage: tsx scripts/process-crawl-results.ts <jobId>
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080'
const jobId = process.argv[2]

if (!jobId) {
  console.error('Usage: tsx scripts/process-crawl-results.ts <jobId>')
  process.exit(1)
}

async function processResults() {
  try {
    console.log('Processing crawl results...')
    console.log('This may take several minutes...')
    console.log()

    const response = await fetch(`${BASE_URL}/api/content/scrape-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'process_results',
        jobId
      })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Processing failed')
    }

    console.log('✅ Processing Complete!')
    console.log('═'.repeat(50))
    console.log(`Pages processed: ${data.processed}`)
    console.log(`PDFs extracted: ${data.pdfs}`)
    console.log(`Embeddings created: ${data.embeddings}`)

    if (data.errors?.length > 0) {
      console.log(`Errors: ${data.errors.length}`)
    }
    console.log()
    console.log('Content is now ready for semantic search!')

  } catch (error: any) {
    console.error('Error:', error.message)
  }
}

processResults()
