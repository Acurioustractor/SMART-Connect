#!/usr/bin/env tsx

/**
 * Quick Content Checker - No dev server needed!
 *
 * This script checks what content you have vs what's expected
 * without needing to run a full crawl or start the dev server.
 *
 * Usage:
 *   npx tsx scripts/check-for-new-content.ts
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

const TARGET_SITE = 'https://smartrecoveryaustralia.com.au'

async function checkContent() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  SMART Connect - Quick Content Check                      ║
╚═══════════════════════════════════════════════════════════╝
`))

  console.log(chalk.blue('📊 Analyzing your content database...\n'))

  // Get all content
  const { data: allContent, error } = await supabase
    .from('scraped_content')
    .select('id, url, content_type, last_updated, scraped_at')
    .order('last_updated', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch content: ${error.message}`)
  }

  if (!allContent || allContent.length === 0) {
    console.log(chalk.yellow('⚠️  No content found in database!\n'))
    console.log(chalk.gray('   Run a scrape to get started:\n'))
    console.log(chalk.gray('   npx tsx scripts/scrape-smart-site.ts\n'))
    return
  }

  const totalPages = allContent.length
  const pdfCount = allContent.filter(c =>
    c.content_type === 'pdf' || c.url.toLowerCase().endsWith('.pdf')
  ).length
  const regularPages = totalPages - pdfCount

  // Calculate age stats
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  let recentContent = 0
  let monthOldContent = 0
  let threeMonthsOldContent = 0
  let olderContent = 0

  allContent.forEach(c => {
    const lastUpdate = new Date(c.last_updated)
    if (lastUpdate > oneWeekAgo) {
      recentContent++
    } else if (lastUpdate > oneMonthAgo) {
      monthOldContent++
    } else if (lastUpdate > threeMonthsAgo) {
      threeMonthsOldContent++
    } else {
      olderContent++
    }
  })

  // Print results
  console.log(chalk.green('✅ Current Content:'))
  console.log(chalk.gray(`   Total pages: ${totalPages}`))
  console.log(chalk.gray(`   Regular pages: ${regularPages}`))
  console.log(chalk.gray(`   PDFs: ${pdfCount}\n`))

  console.log(chalk.blue('📅 Content Freshness:'))
  console.log(chalk.green(`   ✨ Updated in last week: ${recentContent}`))
  console.log(chalk.yellow(`   📆 Updated in last month: ${monthOldContent}`))
  console.log(chalk.gray(`   📊 Updated in last 3 months: ${threeMonthsOldContent}`))
  console.log(chalk.red(`   ⏰ Older than 3 months: ${olderContent}\n`))

  // Sample oldest content
  if (olderContent > 0) {
    console.log(chalk.yellow('⏰ Oldest Content (may need updating):'))
    const oldest = allContent.slice(0, 5)
    oldest.forEach(c => {
      const age = Math.floor((now.getTime() - new Date(c.last_updated).getTime()) / (24 * 60 * 60 * 1000))
      console.log(chalk.gray(`   - ${c.url}`))
      console.log(chalk.gray(`     Last updated: ${age} days ago\n`))
    })
  }

  // Check embeddings
  const { data: embeddings } = await supabase
    .from('content_embeddings')
    .select('scraped_content_id')
    .not('scraped_content_id', 'is', null)

  const embeddedIds = new Set(embeddings?.map(e => e.scraped_content_id))
  const contentWithEmbeddings = allContent.filter(c => embeddedIds.has(c.id)).length
  const contentWithoutEmbeddings = totalPages - contentWithEmbeddings
  const embeddingCoverage = Math.round((contentWithEmbeddings / totalPages) * 100)

  console.log(chalk.blue('🔍 Embedding Coverage:'))
  console.log(chalk.gray(`   Pages with embeddings: ${contentWithEmbeddings}`))
  console.log(chalk.gray(`   Pages without embeddings: ${contentWithoutEmbeddings}`))
  console.log(chalk.gray(`   Coverage: ${embeddingCoverage}%\n`))

  // Check PDFs
  const { data: pdfDocs } = await supabase
    .from('pdf_documents')
    .select('scraped_content_id, url')

  const linkedPDFIds = new Set(pdfDocs?.map(d => d.scraped_content_id))
  const pdfPages = allContent.filter(c =>
    c.content_type === 'pdf' || c.url.toLowerCase().endsWith('.pdf')
  )
  const linkedPDFs = pdfPages.filter(p => linkedPDFIds.has(p.id)).length
  const unlinkedPDFs = pdfCount - linkedPDFs

  console.log(chalk.blue('📄 PDF Status:'))
  console.log(chalk.gray(`   Total PDFs: ${pdfCount}`))
  console.log(chalk.gray(`   Linked to pdf_documents: ${linkedPDFs}`))
  console.log(chalk.gray(`   Unlinked: ${unlinkedPDFs}\n`))

  // Recommendations
  console.log(chalk.magenta('💡 Recommendations:\n'))

  if (contentWithoutEmbeddings > 0) {
    console.log(chalk.yellow(`   🔍 Generate embeddings for ${contentWithoutEmbeddings} pages:`))
    console.log(chalk.gray(`      npx tsx scripts/generate-embeddings.ts ${Math.min(contentWithoutEmbeddings, 100)}\n`))
  }

  if (unlinkedPDFs > 0) {
    console.log(chalk.yellow(`   📄 Link ${unlinkedPDFs} PDFs:`))
    console.log(chalk.gray(`      npx tsx scripts/manage-pdfs.ts link\n`))
  }

  if (olderContent > 50) {
    console.log(chalk.yellow(`   📆 ${olderContent} pages are >3 months old. Consider refreshing:`))
    console.log(chalk.gray(`      npx tsx scripts/scrape-smart-site.ts\n`))
  }

  if (recentContent < 10 && totalPages > 100) {
    console.log(chalk.yellow(`   ⚠️  Only ${recentContent} pages updated recently. Check for new content:`))
    console.log(chalk.gray(`      Start dev server: npm run dev`))
    console.log(chalk.gray(`      Then: npx tsx scripts/incremental-scrape.ts discover\n`))
  }

  // Estimate if site has grown
  console.log(chalk.blue('📈 Estimated Site Size:'))
  console.log(chalk.gray(`   smartrecoveryaustralia.com.au typically has 800-1200 pages`))
  console.log(chalk.gray(`   You currently have: ${totalPages} pages\n`))

  if (totalPages < 800) {
    console.log(chalk.yellow(`   📊 Your database might be missing content. Consider a full scrape.\n`))
  } else {
    console.log(chalk.green(`   ✅ Your database looks fairly complete!\n`))
  }
}

async function main() {
  try {
    await checkContent()
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`))
    process.exit(1)
  }
}

main()
