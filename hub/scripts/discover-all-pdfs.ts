#!/usr/bin/env tsx

/**
 * Comprehensive PDF Discovery Script
 *
 * This script finds ALL PDFs on the SMART Recovery site by:
 * 1. Extracting PDF links from all scraped page content
 * 2. Running a focused crawl to find PDFs in navigation
 * 3. Tracking which pages link to each PDF (source tracking)
 * 4. Checking which PDFs are already in the database
 * 5. Downloading and processing new PDFs
 *
 * Usage:
 *   npx tsx scripts/discover-all-pdfs.ts [command]
 *
 * Commands:
 *   scan       - Scan existing content for PDF links (default)
 *   crawl      - Run a full crawl to discover PDFs
 *   download   - Download and process discovered PDFs
 *   all        - Run scan, crawl, and download
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

interface PDFLink {
  pdfUrl: string
  sourcePages: string[]
  title?: string
  isInDatabase: boolean
}

interface PDFDiscoveryResults {
  totalPDFsFound: number
  newPDFs: number
  existingPDFs: number
  pdfLinks: Map<string, PDFLink>
}

/**
 * Extract all PDF links from scraped content
 */
async function scanExistingContentForPDFs(): Promise<Map<string, PDFLink>> {
  console.log(chalk.blue('📄 Scanning existing content for PDF links...\n'))

  // Get all scraped content
  const { data: allContent, error } = await supabase
    .from('scraped_content')
    .select('url, title, content, markdown, internal_links, external_links')
    .neq('content_type', 'pdf') // Don't scan PDFs themselves

  if (error) {
    throw new Error(`Failed to fetch content: ${error.message}`)
  }

  console.log(chalk.gray(`   Scanning ${allContent?.length || 0} pages for PDF links...\n`))

  const pdfLinks = new Map<string, PDFLink>()

  // Regex patterns to find PDF links
  const pdfPatterns = [
    /href=["']([^"']*\.pdf[^"']*)["']/gi,           // HTML href attributes
    /\[([^\]]+)\]\(([^)]*\.pdf[^)]*)\)/gi,          // Markdown links
    /(https?:\/\/[^\s<>"]+\.pdf)/gi,                 // Direct URLs
  ]

  for (const page of allContent || []) {
    const textToSearch = [
      page.content,
      page.markdown,
      page.internal_links?.join(' '),
      page.external_links?.join(' ')
    ].filter(Boolean).join('\n')

    for (const pattern of pdfPatterns) {
      const matches = textToSearch.matchAll(pattern)

      for (const match of matches) {
        // Extract PDF URL from match
        let pdfUrl = match[1] || match[2] || match[0]

        // Clean up URL - remove quotes, trim whitespace
        pdfUrl = pdfUrl.trim().replace(/^['"]|['"]$/g, '')

        // Remove malformed markdown syntax (e.g., "file.pdf](https://...")
        // This happens when markdown is improperly parsed
        pdfUrl = pdfUrl.replace(/\]\(https?:\/\/[^)]+$/, '')

        // Also clean up if there's a markdown link at the end
        const pdfMatch = pdfUrl.match(/^(https?:\/\/[^\s\]]+\.pdf)/i)
        if (pdfMatch) {
          pdfUrl = pdfMatch[1]
        }

        // Make relative URLs absolute
        if (pdfUrl.startsWith('/')) {
          pdfUrl = `${TARGET_SITE}${pdfUrl}`
        } else if (!pdfUrl.startsWith('http')) {
          continue // Skip invalid URLs
        }

        // Ensure it's actually a PDF URL
        if (!pdfUrl.toLowerCase().includes('.pdf')) {
          continue
        }

        // Final validation - must be a valid URL
        try {
          new URL(pdfUrl)
        } catch {
          console.log(chalk.yellow(`   ⚠️  Skipping malformed URL: ${pdfUrl.slice(0, 80)}`))
          continue
        }

        // Add to our collection
        if (!pdfLinks.has(pdfUrl)) {
          pdfLinks.set(pdfUrl, {
            pdfUrl,
            sourcePages: [],
            isInDatabase: false
          })
        }

        const pdfLink = pdfLinks.get(pdfUrl)!
        if (!pdfLink.sourcePages.includes(page.url)) {
          pdfLink.sourcePages.push(page.url)
        }
      }
    }
  }

  console.log(chalk.green(`✅ Found ${pdfLinks.size} unique PDF links in content\n`))
  return pdfLinks
}

/**
 * Check which PDFs are already in the database
 */
async function checkExistingPDFs(pdfLinks: Map<string, PDFLink>): Promise<void> {
  console.log(chalk.blue('🔍 Checking which PDFs are already in database...\n'))

  const pdfUrls = Array.from(pdfLinks.keys())

  // Check scraped_content table
  const { data: existingContent } = await supabase
    .from('scraped_content')
    .select('url, title')
    .in('url', pdfUrls)

  const existingUrls = new Set(existingContent?.map(c => c.url) || [])

  // Mark PDFs that exist in database
  for (const [url, pdfLink] of pdfLinks) {
    pdfLink.isInDatabase = existingUrls.has(url)

    // Get title from database if available
    const existingItem = existingContent?.find(c => c.url === url)
    if (existingItem) {
      pdfLink.title = existingItem.title
    }
  }

  const existingCount = Array.from(pdfLinks.values()).filter(p => p.isInDatabase).length
  const newCount = pdfLinks.size - existingCount

  console.log(chalk.gray(`   Existing in DB: ${existingCount}`))
  console.log(chalk.gray(`   New PDFs: ${newCount}\n`))
}

/**
 * Run a Firecrawl crawl focused on discovering PDFs
 */
async function crawlForPDFs(): Promise<string[]> {
  console.log(chalk.blue('🔍 Running focused crawl to discover PDFs...\n'))

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
    throw new Error('Failed to start crawl')
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
      finalStatus = status
      console.log(chalk.green(`\n✅ Crawl complete!`))
      console.log(chalk.gray(`   Pages found: ${status.completed || 'unknown'}\n`))
    } else if (status.status === 'failed') {
      throw new Error('Crawl failed')
    } else {
      process.stdout.write(chalk.gray(`   Progress: ${status.progress || 0}% (${status.completed || 0} pages)\r`))
    }

    attempts++
  }

  if (!isComplete) {
    throw new Error('Crawl timed out')
  }

  // Extract PDF URLs
  const pdfUrls = finalStatus.data
    .map((page: any) => page.metadata?.sourceURL || page.url)
    .filter((url: string) => url && url.toLowerCase().endsWith('.pdf'))

  return [...new Set(pdfUrls)]
}

/**
 * Merge crawled PDFs with scanned PDFs
 */
function mergePDFSources(
  scannedPDFs: Map<string, PDFLink>,
  crawledPDFs: string[]
): Map<string, PDFLink> {
  console.log(chalk.blue('🔗 Merging PDF sources...\n'))

  for (const pdfUrl of crawledPDFs) {
    if (!scannedPDFs.has(pdfUrl)) {
      scannedPDFs.set(pdfUrl, {
        pdfUrl,
        sourcePages: [],
        isInDatabase: false
      })
    }
  }

  console.log(chalk.green(`✅ Total unique PDFs: ${scannedPDFs.size}\n`))
  return scannedPDFs
}

/**
 * Download and process PDFs using Firecrawl
 */
async function downloadAndProcessPDFs(
  pdfLinks: Map<string, PDFLink>,
  limit?: number
): Promise<void> {
  // Filter to only new PDFs
  const newPDFs = Array.from(pdfLinks.values()).filter(p => !p.isInDatabase)

  if (newPDFs.length === 0) {
    console.log(chalk.green('✅ All PDFs are already in the database!\n'))
    return
  }

  const toProcess = limit ? newPDFs.slice(0, limit) : newPDFs

  console.log(chalk.blue(`\n📥 Downloading and processing ${toProcess.length} PDFs...\n`))

  let successCount = 0
  let errorCount = 0

  for (const pdfLink of toProcess) {
    try {
      console.log(chalk.gray(`  Processing: ${pdfLink.pdfUrl.split('/').pop()?.slice(0, 60)}...`))

      // Use the scrape API to process the PDF
      const response = await fetch(`${BASE_URL}/api/content/scrape-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scrape_single',
          url: pdfLink.pdfUrl,
          parentUrl: pdfLink.sourcePages[0] || TARGET_SITE
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log(chalk.green(`    ✅ Processed successfully`))
        successCount++
      } else {
        console.log(chalk.red(`    ❌ Failed: ${result.error || 'Unknown error'}`))
        errorCount++
      }

    } catch (error: any) {
      console.log(chalk.red(`    ❌ Error: ${error.message}`))
      errorCount++
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log(chalk.green(`\n✅ Processing complete!`))
  console.log(chalk.gray(`   Success: ${successCount}`))
  console.log(chalk.gray(`   Errors: ${errorCount}\n`))
}

/**
 * Print discovery results
 */
function printResults(results: PDFDiscoveryResults) {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  PDF Discovery Results                                     ║
╚═══════════════════════════════════════════════════════════╝
`))

  console.log(chalk.green(`📊 Total PDFs found: ${results.totalPDFsFound}`))
  console.log(chalk.yellow(`   🆕 New PDFs to download: ${results.newPDFs}`))
  console.log(chalk.blue(`   ✅ Already in database: ${results.existingPDFs}`))
  console.log()

  // Show sample new PDFs
  const newPDFs = Array.from(results.pdfLinks.values()).filter(p => !p.isInDatabase)

  if (newPDFs.length > 0) {
    console.log(chalk.yellow(`🆕 Sample New PDFs:`))
    newPDFs.slice(0, 10).forEach(pdf => {
      const filename = pdf.pdfUrl.split('/').pop() || 'unknown'
      console.log(chalk.gray(`   - ${filename}`))
      console.log(chalk.gray(`     URL: ${pdf.pdfUrl}`))
      if (pdf.sourcePages.length > 0) {
        console.log(chalk.gray(`     Found on: ${pdf.sourcePages.length} page(s)`))
      }
      console.log()
    })
    if (newPDFs.length > 10) {
      console.log(chalk.gray(`   ... and ${newPDFs.length - 10} more\n`))
    }
  }

  // Show PDFs with most source pages (most linked to)
  const sortedPDFs = Array.from(results.pdfLinks.values())
    .filter(p => p.sourcePages.length > 0)
    .sort((a, b) => b.sourcePages.length - a.sourcePages.length)
    .slice(0, 5)

  if (sortedPDFs.length > 0) {
    console.log(chalk.magenta(`🔗 Most Referenced PDFs:`))
    sortedPDFs.forEach(pdf => {
      const filename = pdf.pdfUrl.split('/').pop() || 'unknown'
      console.log(chalk.gray(`   - ${filename}`))
      console.log(chalk.gray(`     Linked from ${pdf.sourcePages.length} pages`))
    })
    console.log()
  }
}

async function main() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  SMART Connect - Comprehensive PDF Discovery              ║
╚═══════════════════════════════════════════════════════════╝
`))

  const command = process.argv[2] || 'scan'
  const limit = process.argv[3] ? parseInt(process.argv[3]) : undefined

  try {
    let pdfLinks = new Map<string, PDFLink>()

    switch (command) {
      case 'scan': {
        // Scan existing content for PDF links
        pdfLinks = await scanExistingContentForPDFs()
        await checkExistingPDFs(pdfLinks)

        const results: PDFDiscoveryResults = {
          totalPDFsFound: pdfLinks.size,
          newPDFs: Array.from(pdfLinks.values()).filter(p => !p.isInDatabase).length,
          existingPDFs: Array.from(pdfLinks.values()).filter(p => p.isInDatabase).length,
          pdfLinks
        }

        printResults(results)

        if (results.newPDFs > 0) {
          console.log(chalk.magenta(`💡 Next Steps:`))
          console.log(chalk.gray(`   Download new PDFs: npx tsx scripts/discover-all-pdfs.ts download ${Math.min(10, results.newPDFs)}\n`))
        }
        break
      }

      case 'crawl': {
        // Run a crawl to find PDFs
        const crawledPDFs = await crawlForPDFs()

        // Also scan existing content
        pdfLinks = await scanExistingContentForPDFs()

        // Merge both sources
        pdfLinks = mergePDFSources(pdfLinks, crawledPDFs)
        await checkExistingPDFs(pdfLinks)

        const results: PDFDiscoveryResults = {
          totalPDFsFound: pdfLinks.size,
          newPDFs: Array.from(pdfLinks.values()).filter(p => !p.isInDatabase).length,
          existingPDFs: Array.from(pdfLinks.values()).filter(p => p.isInDatabase).length,
          pdfLinks
        }

        printResults(results)

        if (results.newPDFs > 0) {
          console.log(chalk.magenta(`💡 Next Steps:`))
          console.log(chalk.gray(`   Download new PDFs: npx tsx scripts/discover-all-pdfs.ts download ${Math.min(10, results.newPDFs)}\n`))
        }
        break
      }

      case 'download': {
        // Scan for PDFs
        pdfLinks = await scanExistingContentForPDFs()
        await checkExistingPDFs(pdfLinks)

        // Download and process
        await downloadAndProcessPDFs(pdfLinks, limit)

        console.log(chalk.green(`✅ Done! Now link PDFs to pdf_documents table:`))
        console.log(chalk.gray(`   npx tsx scripts/manage-pdfs.ts link\n`))
        break
      }

      case 'all': {
        // Complete workflow
        console.log(chalk.cyan(`🚀 Running complete PDF discovery and processing...\n`))

        // 1. Scan existing content
        pdfLinks = await scanExistingContentForPDFs()

        // 2. Run crawl
        const crawledPDFs = await crawlForPDFs()
        pdfLinks = mergePDFSources(pdfLinks, crawledPDFs)

        // 3. Check database
        await checkExistingPDFs(pdfLinks)

        const results: PDFDiscoveryResults = {
          totalPDFsFound: pdfLinks.size,
          newPDFs: Array.from(pdfLinks.values()).filter(p => !p.isInDatabase).length,
          existingPDFs: Array.from(pdfLinks.values()).filter(p => p.isInDatabase).length,
          pdfLinks
        }

        printResults(results)

        // 4. Download and process
        if (results.newPDFs > 0) {
          await downloadAndProcessPDFs(pdfLinks, limit)

          console.log(chalk.green(`✅ Complete! Now link PDFs to pdf_documents table:`))
          console.log(chalk.gray(`   npx tsx scripts/manage-pdfs.ts link\n`))
        }
        break
      }

      default:
        console.log(chalk.red(`❌ Unknown command: ${command}\n`))
        console.log(chalk.gray(`Valid commands: scan, crawl, download, all\n`))
        console.log(chalk.gray(`Examples:`))
        console.log(chalk.gray(`   npx tsx scripts/discover-all-pdfs.ts scan              # Scan existing content`))
        console.log(chalk.gray(`   npx tsx scripts/discover-all-pdfs.ts crawl             # Run full crawl`))
        console.log(chalk.gray(`   npx tsx scripts/discover-all-pdfs.ts download 10       # Download 10 PDFs`))
        console.log(chalk.gray(`   npx tsx scripts/discover-all-pdfs.ts all 20            # Complete workflow\n`))
    }

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`))
    console.error(chalk.gray(error.stack))
    process.exit(1)
  }
}

main()
