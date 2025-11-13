#!/usr/bin/env tsx

/**
 * SMART Recovery Australia Full Site Scraper
 *
 * This script crawls the entire smartrecoveryaustralia.com.au website,
 * extracts all content and PDFs, generates embeddings, and stores
 * everything in Supabase for semantic search and recommendations.
 *
 * Usage:
 *   npm run scrape-smart-site
 *   or
 *   tsx scripts/scrape-smart-site.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080'
const TARGET_SITE = 'https://smartrecoveryaustralia.com.au'

interface JobStatus {
  success: boolean
  jobId?: string
  status?: string
  progress?: number
  completed?: number
  total?: number
  isComplete?: boolean
  error?: string
}

interface ProcessResults {
  success: boolean
  pagesProcessed?: number
  pdfsProcessed?: number
  errorsCount?: number
  error?: string
}

async function main() {
  console.log('🚀 SMART Recovery Australia - Full Site Scraper')
  console.log('=' .repeat(60))
  console.log()

  // Check environment
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('❌ ERROR: FIRECRAWL_API_KEY not found in .env.local')
    console.error('   Please add your Firecrawl API key to continue.')
    process.exit(1)
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY not found in .env.local')
    console.error('   OpenAI API key is required for generating embeddings.')
    process.exit(1)
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: Supabase credentials not found in .env.local')
    console.error('   Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }

  console.log('✅ Environment variables verified')
  console.log(`📍 Target URL: ${TARGET_SITE}`)
  console.log(`🔗 API Base: ${BASE_URL}`)
  console.log()

  try {
    // Step 1: Start the crawl
    console.log('Step 1: Starting full website crawl...')
    const crawlResult = await startCrawl()

    if (!crawlResult.success || !crawlResult.jobId) {
      throw new Error(crawlResult.error || 'Failed to start crawl')
    }

    console.log(`✅ Crawl started successfully`)
    console.log(`   Job ID: ${crawlResult.jobId}`)
    console.log()

    // Step 2: Monitor progress
    console.log('Step 2: Monitoring crawl progress...')
    const completedCrawl = await monitorCrawl(crawlResult.jobId)

    if (!completedCrawl.success) {
      throw new Error('Crawl failed or timed out')
    }

    console.log(`✅ Crawl completed!`)
    console.log(`   Total pages: ${completedCrawl.total}`)
    console.log(`   Pages scraped: ${completedCrawl.completed}`)
    console.log()

    // Step 3: Start processing and monitor progress
    console.log('Step 3: Processing results and generating embeddings...')
    console.log('   This may take several minutes for large sites...')
    const startProcessResult = await startProcessing(crawlResult.jobId)

    if (!startProcessResult.success) {
      throw new Error(startProcessResult.error || 'Failed to start processing')
    }

    console.log(`✅ Processing started`)
    console.log()

    // Step 4: Monitor processing progress
    console.log('Step 4: Monitoring processing progress...')
    const completedProcess = await monitorProcessing(crawlResult.jobId)

    if (!completedProcess.success) {
      throw new Error('Processing failed or timed out')
    }

    console.log(`✅ Processing completed!`)
    console.log(`   Pages processed: ${completedProcess.pagesProcessed}`)
    console.log(`   PDFs extracted: ${completedProcess.pdfsProcessed}`)

    if (completedProcess.errorsCount > 0) {
      console.log(`   ⚠️  Errors: ${completedProcess.errorsCount}`)
      console.log(`   (Check server logs for details)`)
    }
    console.log()

    // Step 5: Summary
    console.log('=' .repeat(60))
    console.log('🎉 SCRAPING COMPLETE!')
    console.log('=' .repeat(60))
    console.log()
    console.log('Your SMART Recovery Australia content is now:')
    console.log('  ✓ Stored in Supabase')
    console.log('  ✓ Embedded for semantic search')
    console.log('  ✓ Ready for recommendations')
    console.log('  ✓ Available to the small language model')
    console.log()
    console.log('Next steps:')
    console.log('  1. Test semantic search: /api/content/search')
    console.log('  2. View recommendations: /api/content/recommendations')
    console.log('  3. Check content stats: /api/content/search?action=stats')
    console.log()
    console.log('To keep content fresh, run this script weekly or monthly.')
    console.log()

  } catch (error: any) {
    console.error()
    console.error('❌ SCRAPING FAILED')
    console.error('=' .repeat(60))
    console.error('Error:', error.message)
    console.error()
    console.error('Troubleshooting:')
    console.error('  1. Check your API keys are valid')
    console.error('  2. Ensure your dev server is running (npm run dev)')
    console.error('  3. Check Firecrawl rate limits')
    console.error('  4. Review logs above for specific errors')
    console.error()
    process.exit(1)
  }
}

/**
 * Start the crawl job
 */
async function startCrawl(): Promise<JobStatus> {
  try {
    const response = await fetch(`${BASE_URL}/api/content/scrape-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start_crawl',
        url: TARGET_SITE
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || error.error || 'Failed to start crawl')
    }

    return await response.json()
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Monitor crawl progress until complete
 */
async function monitorCrawl(jobId: string): Promise<JobStatus> {
  const maxAttempts = 120 // 20 minutes with 10s intervals
  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${BASE_URL}/api/content/scrape-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_status',
          jobId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || error.error || 'Failed to check status')
      }

      const status: JobStatus = await response.json()

      // Update progress display
      if (status.progress !== undefined && status.completed !== undefined && status.total !== undefined) {
        process.stdout.write(
          `\r   Progress: ${status.completed}/${status.total} pages (${status.progress}%)   `
        )
      }

      // Check if complete
      if (status.isComplete) {
        console.log() // New line after progress
        return status
      }

      // Wait before checking again
      await sleep(10000) // 10 seconds
      attempts++

    } catch (error: any) {
      console.error(`\n   Error checking status: ${error.message}`)
      await sleep(10000)
      attempts++
    }
  }

  // Timeout
  return {
    success: false,
    error: 'Crawl timeout after 20 minutes'
  }
}

/**
 * Start processing crawl results
 */
async function startProcessing(jobId: string): Promise<JobStatus> {
  try {
    const response = await fetch(`${BASE_URL}/api/content/scrape-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'process_results',
        jobId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || error.error || 'Failed to start processing')
    }

    return await response.json()
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Monitor processing progress until complete
 */
async function monitorProcessing(jobId: string): Promise<ProcessResults> {
  const maxAttempts = 360 // 60 minutes with 10s intervals
  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${BASE_URL}/api/content/scrape-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_processing',
          jobId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || error.error || 'Failed to check processing status')
      }

      const status: any = await response.json()

      // Update progress display
      if (status.pagesProcessed !== undefined && status.pagesScraped !== undefined) {
        const progress = status.pagesScraped > 0
          ? Math.round((status.pagesProcessed / status.pagesScraped) * 100)
          : 0
        process.stdout.write(
          `\r   Progress: ${status.pagesProcessed}/${status.pagesScraped} pages (${progress}%)   `
        )
      }

      // Check if complete
      if (status.isComplete) {
        console.log() // New line after progress
        return {
          success: true,
          pagesProcessed: status.pagesProcessed,
          pdfsProcessed: status.pdfsProcessed,
          errorsCount: status.errorsCount
        }
      }

      // Wait before checking again
      await sleep(10000) // 10 seconds
      attempts++

    } catch (error: any) {
      console.error(`\n   Error checking processing status: ${error.message}`)
      await sleep(10000)
      attempts++
    }
  }

  // Timeout
  return {
    success: false,
    error: 'Processing timeout after 60 minutes'
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}

export { main as scrapeSMARTSite }
