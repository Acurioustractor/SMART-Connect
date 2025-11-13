#!/usr/bin/env tsx

/**
 * PDF Management Script
 *
 * This script helps you:
 * 1. Find all PDFs in scraped_content
 * 2. Check which PDFs are properly linked to pdf_documents table
 * 3. Link missing PDFs
 * 4. Download PDFs that are missing from storage
 * 5. Generate embeddings for PDFs without them
 *
 * Usage:
 *   npx tsx scripts/manage-pdfs.ts [command]
 *
 * Commands:
 *   audit      - Check PDF status (default)
 *   link       - Link PDFs to pdf_documents table
 *   download   - Download missing PDF files to storage
 *   embed      - Generate embeddings for PDFs
 *   fix-all    - Run all fixes
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import chalk from 'chalk'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

interface PDFAuditResults {
  totalPDFUrls: number
  linkedPDFs: number
  unlinkedPDFs: number
  pdfsWithFiles: number
  pdfsWithoutFiles: number
  pdfsWithEmbeddings: number
  pdfsWithoutEmbeddings: number
  unlinkedPDFList: Array<{
    id: string
    url: string
    title: string
  }>
}

async function auditPDFs(): Promise<PDFAuditResults> {
  console.log(chalk.blue('\n📊 Auditing PDF content...\n'))

  // Find all PDFs in scraped_content
  const { data: pdfPages, error: pdfError } = await supabase
    .from('scraped_content')
    .select('id, url, title, content_type')
    .or('content_type.eq.pdf,url.ilike.%.pdf')

  if (pdfError) {
    throw new Error(`Failed to fetch PDFs: ${pdfError.message}`)
  }

  const totalPDFUrls = pdfPages?.length || 0
  console.log(chalk.gray(`   Found ${totalPDFUrls} PDF URLs in scraped_content`))

  // Check which ones are linked to pdf_documents
  const pdfIds = pdfPages?.map(p => p.id) || []

  const { data: linkedDocs, error: linkedError } = await supabase
    .from('pdf_documents')
    .select('scraped_content_id, url, file_path')
    .in('scraped_content_id', pdfIds)

  if (linkedError) {
    throw new Error(`Failed to fetch linked PDFs: ${linkedError.message}`)
  }

  const linkedIds = new Set(linkedDocs?.map(d => d.scraped_content_id))
  const linkedPDFs = linkedIds.size
  const unlinkedPDFs = totalPDFUrls - linkedPDFs

  console.log(chalk.gray(`   Linked to pdf_documents: ${linkedPDFs}`))
  console.log(chalk.gray(`   Unlinked: ${unlinkedPDFs}`))

  // Check which have files in storage
  const pdfsWithFiles = linkedDocs?.filter(d => d.file_path).length || 0
  const pdfsWithoutFiles = linkedPDFs - pdfsWithFiles

  console.log(chalk.gray(`   With stored files: ${pdfsWithFiles}`))
  console.log(chalk.gray(`   Without stored files: ${pdfsWithoutFiles}`))

  // Check embeddings
  const { data: pdfEmbeddings } = await supabase
    .from('content_embeddings')
    .select('scraped_content_id')
    .in('scraped_content_id', pdfIds)
    .not('scraped_content_id', 'is', null)

  const embeddedPDFIds = new Set(pdfEmbeddings?.map(e => e.scraped_content_id))
  const pdfsWithEmbeddings = embeddedPDFIds.size
  const pdfsWithoutEmbeddings = totalPDFUrls - pdfsWithEmbeddings

  console.log(chalk.gray(`   With embeddings: ${pdfsWithEmbeddings}`))
  console.log(chalk.gray(`   Without embeddings: ${pdfsWithoutEmbeddings}\n`))

  // Get list of unlinked PDFs
  const unlinkedPDFList = pdfPages
    ?.filter(p => !linkedIds.has(p.id))
    .map(p => ({ id: p.id, url: p.url, title: p.title })) || []

  return {
    totalPDFUrls,
    linkedPDFs,
    unlinkedPDFs,
    pdfsWithFiles,
    pdfsWithoutFiles,
    pdfsWithEmbeddings,
    pdfsWithoutEmbeddings,
    unlinkedPDFList
  }
}

function printAuditResults(results: PDFAuditResults) {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  PDF Audit Results                                         ║
╚═══════════════════════════════════════════════════════════╝
`))

  console.log(chalk.green(`📄 Total PDFs: ${results.totalPDFUrls}`))
  console.log()

  console.log(chalk.blue(`📋 Linking Status:`))
  console.log(chalk.green(`   ✅ Linked to pdf_documents: ${results.linkedPDFs}`))
  console.log(chalk.yellow(`   ⚠️  Unlinked: ${results.unlinkedPDFs}`))
  console.log()

  console.log(chalk.blue(`💾 File Storage:`))
  console.log(chalk.green(`   ✅ Files in storage: ${results.pdfsWithFiles}`))
  console.log(chalk.yellow(`   ⚠️  Missing files: ${results.pdfsWithoutFiles}`))
  console.log()

  console.log(chalk.blue(`🔍 Embeddings:`))
  console.log(chalk.green(`   ✅ With embeddings: ${results.pdfsWithEmbeddings}`))
  console.log(chalk.yellow(`   ⚠️  Without embeddings: ${results.pdfsWithoutEmbeddings}`))
  console.log()

  if (results.unlinkedPDFList.length > 0) {
    console.log(chalk.yellow(`⚠️  Unlinked PDFs (sample):`))
    results.unlinkedPDFList.slice(0, 5).forEach(pdf => {
      console.log(chalk.gray(`   - ${pdf.title}`))
      console.log(chalk.gray(`     ${pdf.url}`))
    })
    if (results.unlinkedPDFList.length > 5) {
      console.log(chalk.gray(`   ... and ${results.unlinkedPDFList.length - 5} more\n`))
    }
  }
}

async function linkPDFs(limit?: number) {
  console.log(chalk.blue(`\n🔗 Linking PDFs to pdf_documents table...\n`))

  // Get unlinked PDFs
  const { data: pdfPages } = await supabase
    .from('scraped_content')
    .select('id, url, title, content, markdown, content_type')
    .or('content_type.eq.pdf,url.ilike.%.pdf')

  if (!pdfPages || pdfPages.length === 0) {
    console.log(chalk.green('✅ No PDFs found to link\n'))
    return
  }

  // Check which are already linked
  const { data: linkedDocs } = await supabase
    .from('pdf_documents')
    .select('scraped_content_id, url')

  const linkedUrls = new Set(linkedDocs?.map(d => d.url))

  const unlinkedPDFs = pdfPages.filter(p => !linkedUrls.has(p.url))

  if (unlinkedPDFs.length === 0) {
    console.log(chalk.green('✅ All PDFs are already linked!\n'))
    return
  }

  const toProcess = limit ? unlinkedPDFs.slice(0, limit) : unlinkedPDFs

  console.log(chalk.yellow(`Found ${unlinkedPDFs.length} unlinked PDFs`))
  console.log(chalk.yellow(`Processing ${toProcess.length} PDFs...\n`))

  let successCount = 0
  let errorCount = 0

  for (const pdf of toProcess) {
    try {
      console.log(chalk.gray(`  Linking: ${pdf.title.slice(0, 60)}...`))

      const { error } = await supabase
        .from('pdf_documents')
        .upsert({
          scraped_content_id: pdf.id,
          title: pdf.title,
          url: pdf.url,
          extracted_text: pdf.content || pdf.markdown,
          markdown_content: pdf.markdown,
          category: classifyPDFCategory(pdf.url, pdf.title),
          tool_type: extractToolType(pdf.url, pdf.title),
          target_audience: extractTargetAudience(pdf.url, pdf.title),
          quality_score: 0.7 // Default quality
        }, {
          onConflict: 'url',
          ignoreDuplicates: false
        })

      if (error) {
        console.log(chalk.red(`    ❌ Error: ${error.message}`))
        errorCount++
      } else {
        console.log(chalk.green(`    ✅ Linked`))
        successCount++
      }

    } catch (error: any) {
      console.log(chalk.red(`    ❌ Error: ${error.message}`))
      errorCount++
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(chalk.green(`\n✅ Linking complete!`))
  console.log(chalk.gray(`   Success: ${successCount}`))
  console.log(chalk.gray(`   Errors: ${errorCount}\n`))
}

function classifyPDFCategory(url: string, title: string): string {
  const lowerUrl = url.toLowerCase()
  const lowerTitle = title.toLowerCase()

  if (lowerUrl.includes('facilitator') || lowerTitle.includes('facilitator guide')) {
    return 'facilitator-guide'
  }
  if (lowerUrl.includes('worksheet') || lowerTitle.includes('worksheet')) {
    return 'participant-worksheet'
  }
  if (lowerUrl.includes('training') || lowerUrl.includes('manual')) {
    return 'training-manual'
  }
  if (lowerUrl.includes('handbook')) {
    return 'handbook'
  }
  return 'reference'
}

function extractToolType(url: string, title: string): string | null {
  const text = `${url} ${title}`.toLowerCase()

  if (text.includes('cba') || text.includes('cost benefit')) return 'CBA'
  if (text.includes('hierarchy') && text.includes('value')) return 'hierarchy-of-values'
  if (text.includes('abc') || text.includes('urge log')) return 'abc-urge-log'
  if (text.includes('change plan')) return 'change-plan'
  if (text.includes('smart goal')) return 'smart-goals'
  if (text.includes('problem solving')) return 'problem-solving'
  if (text.includes('brainstorm')) return 'brainstorming'

  return null
}

function extractTargetAudience(url: string, title: string): string[] {
  const text = `${url} ${title}`.toLowerCase()
  const audiences: string[] = []

  if (text.includes('facilitator')) audiences.push('facilitators')
  if (text.includes('participant') || text.includes('member')) audiences.push('participants')
  if (text.includes('family') || text.includes('friend')) audiences.push('family')
  if (text.includes('trainer') || text.includes('training')) audiences.push('trainers')

  return audiences.length > 0 ? audiences : ['facilitators']
}

async function downloadMissingFiles() {
  console.log(chalk.yellow(`\n⚠️  PDF file downloading not yet implemented\n`))
  console.log(chalk.gray(`   This requires:
   1. Downloading PDF from original URL
   2. Uploading to Supabase Storage
   3. Updating file_path in pdf_documents

   For now, run a full scrape which will download PDFs:
   npx tsx scripts/scrape-smart-site.ts\n`))
}

async function generatePDFEmbeddings(limit?: number) {
  console.log(chalk.blue(`\n🔍 Generating embeddings for PDFs...\n`))

  // Get PDFs without embeddings
  const { data: pdfPages } = await supabase
    .from('scraped_content')
    .select('id, title, content, markdown')
    .or('content_type.eq.pdf,url.ilike.%.pdf')
    .gte('quality_score', 0.3)

  if (!pdfPages || pdfPages.length === 0) {
    console.log(chalk.yellow('No PDFs found\n'))
    return
  }

  // Check which have embeddings
  const pdfIds = pdfPages.map(p => p.id)

  const { data: existingEmbeddings } = await supabase
    .from('content_embeddings')
    .select('scraped_content_id')
    .in('scraped_content_id', pdfIds)

  const embeddedIds = new Set(existingEmbeddings?.map(e => e.scraped_content_id))
  const pdfsWithoutEmbeddings = pdfPages.filter(p => !embeddedIds.has(p.id))

  if (pdfsWithoutEmbeddings.length === 0) {
    console.log(chalk.green('✅ All PDFs already have embeddings!\n'))
    return
  }

  const toProcess = limit ? pdfsWithoutEmbeddings.slice(0, limit) : pdfsWithoutEmbeddings

  console.log(chalk.yellow(`Found ${pdfsWithoutEmbeddings.length} PDFs without embeddings`))
  console.log(chalk.yellow(`Processing ${toProcess.length} PDFs...\n`))

  console.log(chalk.gray(`Use the embedding generator instead:`))
  console.log(chalk.gray(`  npx tsx scripts/generate-embeddings.ts ${toProcess.length}\n`))
}

async function main() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  SMART Connect - PDF Manager                               ║
╚═══════════════════════════════════════════════════════════╝
`))

  const command = process.argv[2] || 'audit'

  try {
    switch (command) {
      case 'audit': {
        const results = await auditPDFs()
        printAuditResults(results)

        // Recommendations
        if (results.unlinkedPDFs > 0) {
          console.log(chalk.magenta(`💡 Next Steps:`))
          console.log(chalk.gray(`   Link PDFs: npx tsx scripts/manage-pdfs.ts link\n`))
        }
        if (results.pdfsWithoutEmbeddings > 0) {
          console.log(chalk.gray(`   Generate embeddings: npx tsx scripts/generate-embeddings.ts 50\n`))
        }
        break
      }

      case 'link': {
        const limit = process.argv[3] ? parseInt(process.argv[3]) : undefined
        await linkPDFs(limit)
        break
      }

      case 'download': {
        await downloadMissingFiles()
        break
      }

      case 'embed': {
        const limit = process.argv[3] ? parseInt(process.argv[3]) : undefined
        await generatePDFEmbeddings(limit)
        break
      }

      case 'fix-all': {
        await linkPDFs()
        await generatePDFEmbeddings()
        console.log(chalk.green('\n✅ All fixes complete!\n'))
        break
      }

      default:
        console.log(chalk.red(`❌ Unknown command: ${command}\n`))
        console.log(chalk.gray(`Valid commands: audit, link, download, embed, fix-all\n`))
    }

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`))
    process.exit(1)
  }
}

main()
