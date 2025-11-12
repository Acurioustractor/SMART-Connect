#!/usr/bin/env tsx

/**
 * Quick crawl status checker
 * Usage: tsx scripts/check-crawl-status.ts <jobId>
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080'
const jobId = process.argv[2]

if (!jobId) {
  console.error('Usage: tsx scripts/check-crawl-status.ts <jobId>')
  process.exit(1)
}

async function checkStatus() {
  try {
    const response = await fetch(`${BASE_URL}/api/content/scrape-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'check_status',
        jobId
      })
    })

    const data = await response.json()

    console.log('Job Status:')
    console.log('═'.repeat(50))
    console.log(`Status: ${data.status}`)
    console.log(`Progress: ${data.completed || 0}/${data.total || 0} pages (${data.progress || 0}%)`)
    console.log(`Complete: ${data.isComplete ? 'Yes ✓' : 'No - still crawling...'}`)
    console.log()

    if (data.isComplete) {
      console.log('Ready to process! Run:')
      console.log(`tsx scripts/process-crawl-results.ts ${jobId}`)
    }

  } catch (error: any) {
    console.error('Error:', error.message)
  }
}

checkStatus()
