#!/usr/bin/env tsx

/**
 * Incremental Scraper - Find and scrape new/updated content
 *
 * This script:
 * 1. Checks what URLs are already scraped
 * 2. Runs a new crawl to discover all URLs
 * 3. Identifies NEW urls and STALE urls (old content)
 * 4. Only processes new/stale content to save time and API costs
 *
 * Usage:
 *   npx tsx scripts/incremental-scrape.ts [mode]
 *
 * Modes:
 *   discover  - Just find what's new/changed (default)
 *   new       - Scrape only new URLs
 *   stale     - Update stale content (>30 days old)
 *   all       - Scrape both new and stale
 */

import { createClient } from '@supabase/supabase-js'
import chalk from 'chalk'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080'
const TARGET_SITE = 'https://smartrecoveryaustralia.com.au'
const STALE_DAYS = 30 // Content older than 30 days is considered stale

interface CrawlDiscovery {
  allUrls: string[]
  newUrls: string[]
  existingUrls: string[]
  staleUrls: string[]
  pdfUrls: string[]
}

async function getExistingUrls(): Promise<Map<string, Date>> {
  console.log(chalk.blue('📊 Fetching existing content from database...\n'))

  const { data, error } = await supabase
    .from('scraped_content')
    .select('url, last_updated')

  if (error) {
    throw new Error(`Failed to fetch existing URLs: ${error.message}`)
  }

  const urlMap = new Map<string, Date>()
  data?.forEach(item => {
    urlMap.set(item.url, new Date(item.last_updated))
  })

  console.log(chalk.green(`✅ Found ${urlMap.size} existing URLs in database\n`))
  return urlMap
}

async function discoverAllUrls(): Promise<string[]> {
  console.log(chalk.blue('🔍 Starting discovery crawl...\n'))

  // Start a crawl to discover all URLs
  const startResponse = await fetch(`${BASE_URL}/api/content/scrape-full`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'start_crawl',
      url: TARGET_SITE
    })
  })

  const startResult = await startResponse.json()

  if (!startResult.success || !startResult.jobId) {
    throw new Error('Failed to start discovery crawl')
  }

  console.log(chalk.gray(`   Job ID: ${startResult.jobId}`))

  // Monitor crawl progress
  let isComplete = false
  let attempts = 0
  let finalStatus: any = null
  const maxAttempts = 60 // 10 minutes

  while (!isComplete && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10s

    const statusResponse = await fetch(`${BASE_URL}/api/content/scrape-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'check_status',
        jobId: startResult.jobId
      })
    })

    const status = await statusResponse.json()

    if (status.status === 'completed') {
      isComplete = true
      finalStatus = status // Save the final status with data
      console.log(chalk.green(`\n✅ Discovery crawl complete!`))
      console.log(chalk.gray(`   Pages found: ${status.completed || 'unknown'}\n`))
    } else if (status.status === 'failed') {
      throw new Error('Discovery crawl failed')
    } else {
      process.stdout.write(chalk.gray(`   Progress: ${status.progress || 0}% (${status.completed || 0} pages)\r`))
    }

    attempts++
  }

  if (!isComplete) {
    throw new Error('Discovery crawl timed out')
  }

  // Extract URLs from the status data (already included in check_status response)
  if (!finalStatus || !finalStatus.data) {
    throw new Error('Failed to get crawl results')
  }

  const urls = finalStatus.data.map((page: any) =>
    page.metadata?.sourceURL || page.url
  ).filter(Boolean)

  return [...new Set(urls)] // Remove duplicates
}

async function analyzeUrls(allUrls: string[], existingUrls: Map<string, Date>): Promise<CrawlDiscovery> {
  console.log(chalk.blue('🔬 Analyzing URLs...\n'))

  const newUrls: string[] = []
  const staleUrls: string[] = []
  const pdfUrls: string[] = []
  const existingUrlsList: string[] = []

  const now = new Date()
  const staleThreshold = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000)

  for (const url of allUrls) {
    // Check if URL is for a PDF
    if (url.toLowerCase().endsWith('.pdf')) {
      pdfUrls.push(url)
    }

    const lastUpdated = existingUrls.get(url)

    if (!lastUpdated) {
      // New URL not in database
      newUrls.push(url)
    } else {
      existingUrlsList.push(url)

      // Check if stale
      if (lastUpdated < staleThreshold) {
        staleUrls.push(url)
      }
    }
  }

  return {
    allUrls,
    newUrls,
    existingUrls: existingUrlsList,
    staleUrls,
    pdfUrls
  }
}

function printDiscoveryResults(discovery: CrawlDiscovery) {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  Discovery Results                                         ║
╚═══════════════════════════════════════════════════════════╝
`))

  console.log(chalk.green(`📊 Total URLs found: ${discovery.allUrls.length}`))
  console.log(chalk.yellow(`   🆕 New URLs: ${discovery.newUrls.length}`))
  console.log(chalk.blue(`   ✅ Existing URLs: ${discovery.existingUrls.length}`))
  console.log(chalk.gray(`   ⏰ Stale URLs (>${STALE_DAYS} days): ${discovery.staleUrls.length}`))
  console.log(chalk.magenta(`   📄 PDF URLs: ${discovery.pdfUrls.length}`))

  if (discovery.newUrls.length > 0) {
    console.log(chalk.yellow(`\n🆕 Sample New URLs:`))
    discovery.newUrls.slice(0, 5).forEach(url => {
      console.log(chalk.gray(`   - ${url}`))
    })
    if (discovery.newUrls.length > 5) {
      console.log(chalk.gray(`   ... and ${discovery.newUrls.length - 5} more`))
    }
  }

  if (discovery.staleUrls.length > 0) {
    console.log(chalk.gray(`\n⏰ Sample Stale URLs:`))
    discovery.staleUrls.slice(0, 5).forEach(url => {
      console.log(chalk.gray(`   - ${url}`))
    })
    if (discovery.staleUrls.length > 5) {
      console.log(chalk.gray(`   ... and ${discovery.staleUrls.length - 5} more`))
    }
  }

  console.log()
}

async function scrapeUrls(urls: string[], label: string) {
  if (urls.length === 0) {
    console.log(chalk.green(`✅ No ${label} URLs to scrape!\n`))
    return
  }

  console.log(chalk.blue(`\n🚀 Scraping ${urls.length} ${label} URLs...\n`))

  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  for (const url of urls) {
    try {
      console.log(chalk.gray(`  Processing: ${url.slice(0, 80)}...`))

      const response = await fetch(`${BASE_URL}/api/content/scrape-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scrape_single',
          url,
          parentUrl: TARGET_SITE
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log(chalk.green(`    ✅ ${result.title || 'Scraped successfully'}`))
        if (result.isPdf) {
          console.log(chalk.magenta(`       📄 PDF processed`))
        }
        successCount++
      } else {
        console.log(chalk.red(`    ❌ Failed: ${result.error || 'Unknown error'}`))
        errors.push(`${url}: ${result.error}`)
        errorCount++
      }

    } catch (error: any) {
      console.log(chalk.red(`    ❌ Error: ${error.message}`))
      errors.push(`${url}: ${error.message}`)
      errorCount++
    }

    // Rate limiting - wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log(chalk.cyan(`\n📊 Scraping Summary:`))
  console.log(chalk.green(`   ✅ Success: ${successCount}`))
  console.log(chalk.red(`   ❌ Errors: ${errorCount}`))

  if (errors.length > 0 && errors.length <= 5) {
    console.log(chalk.yellow(`\n⚠️  Errors encountered:`))
    errors.forEach(err => console.log(chalk.gray(`   - ${err}`)))
  } else if (errors.length > 5) {
    console.log(chalk.yellow(`\n⚠️  ${errors.length} errors encountered (showing first 5):`))
    errors.slice(0, 5).forEach(err => console.log(chalk.gray(`   - ${err}`)))
  }

  console.log()
}

async function main() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  SMART Connect - Incremental Scraper                      ║
╚═══════════════════════════════════════════════════════════╝
`))

  const mode = process.argv[2] || 'discover'

  try {
    // Step 1: Get existing URLs from database
    const existingUrls = await getExistingUrls()

    // Step 2: Discover all URLs from website
    const allUrls = await discoverAllUrls()

    // Step 3: Analyze what's new/stale
    const discovery = await analyzeUrls(allUrls, existingUrls)

    // Step 4: Print results
    printDiscoveryResults(discovery)

    // Step 5: Take action based on mode
    switch (mode) {
      case 'discover':
        console.log(chalk.blue(`📋 Discovery complete! Run with mode to take action:`))
        console.log(chalk.gray(`   npx tsx scripts/incremental-scrape.ts new      # Scrape new URLs`))
        console.log(chalk.gray(`   npx tsx scripts/incremental-scrape.ts stale    # Update stale content`))
        console.log(chalk.gray(`   npx tsx scripts/incremental-scrape.ts all      # Scrape both\n`))
        break

      case 'new':
        await scrapeUrls(discovery.newUrls, 'new')
        break

      case 'stale':
        await scrapeUrls(discovery.staleUrls, 'stale')
        break

      case 'all':
        await scrapeUrls([...discovery.newUrls, ...discovery.staleUrls], 'new/stale')
        break

      default:
        console.log(chalk.red(`❌ Unknown mode: ${mode}`))
        console.log(chalk.gray(`   Valid modes: discover, new, stale, all\n`))
    }

    // Recommendations
    if (discovery.newUrls.length > 0 || discovery.staleUrls.length > 0) {
      console.log(chalk.magenta(`💡 Recommendation:`))
      if (discovery.newUrls.length > 20) {
        console.log(chalk.gray(`   Many new URLs found! Run a full scrape to capture everything:`))
        console.log(chalk.gray(`   npx tsx scripts/scrape-smart-site.ts\n`))
      } else if (discovery.staleUrls.length > 50) {
        console.log(chalk.gray(`   Many stale URLs! Consider updating them:`))
        console.log(chalk.gray(`   npx tsx scripts/scrape-smart-site.ts\n`))
      }
    }

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`))
    process.exit(1)
  }
}

main()
