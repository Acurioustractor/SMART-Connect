#!/usr/bin/env tsx

/**
 * Generate embeddings for content that doesn't have them yet
 *
 * This script finds all scraped_content records without embeddings
 * and generates vector embeddings for semantic search.
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts [limit]
 *
 * Examples:
 *   npx tsx scripts/generate-embeddings.ts      # Generate for all missing
 *   npx tsx scripts/generate-embeddings.ts 50   # Generate for 50 pages
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import chalk from 'chalk'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

const CHUNK_SIZE = 500 // words per chunk
const RATE_LIMIT_DELAY = 100 // ms between API calls

interface ContentToEmbed {
  id: string
  title: string
  content: string
  markdown: string
}

async function getContentWithoutEmbeddings(limit?: number): Promise<ContentToEmbed[]> {
  // Get all content IDs that have embeddings
  const { data: existingEmbeddings } = await supabase
    .from('content_embeddings')
    .select('scraped_content_id')
    .not('scraped_content_id', 'is', null)

  const embeddedIds = new Set(existingEmbeddings?.map(e => e.scraped_content_id) || [])

  // Get content without embeddings
  let query = supabase
    .from('scraped_content')
    .select('id, title, content, markdown')
    .gte('quality_score', 0.3) // Only embed decent quality content
    .order('quality_score', { ascending: false })

  if (limit) {
    query = query.limit(limit * 2) // Get extra in case some have embeddings
  }

  const { data: allContent } = await query

  if (!allContent) return []

  // Filter out content that already has embeddings
  return allContent.filter(c => !embeddedIds.has(c.id))
}

function chunkContent(content: string, title: string): string[] {
  const words = content.split(/\s+/)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ')
    if (chunk.trim().length > 50) { // Only include meaningful chunks
      chunks.push(chunk)
    }
  }

  // If no chunks, use title + first 500 chars of content
  if (chunks.length === 0 && content.length > 0) {
    chunks.push(`${title}\n\n${content.slice(0, 2000)}`)
  }

  return chunks
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text.slice(0, 8000) // Ensure we don't exceed token limit
  })

  return response.data[0].embedding
}

async function generateEmbeddingsForContent(content: ContentToEmbed, index: number, total: number) {
  console.log(chalk.blue(`\n[${index + 1}/${total}] Processing: ${content.title.slice(0, 60)}...`))

  try {
    // Create chunks
    const chunks = chunkContent(content.content || content.markdown, content.title)

    if (chunks.length === 0) {
      console.log(chalk.yellow('  ⚠️  No content to embed, skipping...'))
      return { success: false, chunks: 0 }
    }

    console.log(chalk.gray(`  Chunking: ${chunks.length} chunks`))

    // Generate embeddings for each chunk
    let successCount = 0
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk)

        // Store in database
        const { error } = await supabase
          .from('content_embeddings')
          .insert({
            scraped_content_id: content.id,
            chunk_index: i,
            chunk_text: chunk.slice(0, 5000), // Limit chunk text size
            chunk_size: chunk.split(/\s+/).length,
            embedding,
            section_title: i === 0 ? content.title : `${content.title} (Part ${i + 1})`,
            content_type: 'page'
          })

        if (error) {
          console.log(chalk.red(`  ❌ Error storing chunk ${i + 1}: ${error.message}`))
        } else {
          successCount++
        }

        // Rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
        }

      } catch (error: any) {
        console.log(chalk.red(`  ❌ Error embedding chunk ${i + 1}: ${error.message}`))
      }
    }

    console.log(chalk.green(`  ✅ Generated ${successCount}/${chunks.length} embeddings`))

    return { success: successCount > 0, chunks: successCount }

  } catch (error: any) {
    console.log(chalk.red(`  ❌ Error: ${error.message}`))
    return { success: false, chunks: 0 }
  }
}

async function main() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  SMART Connect - Embedding Generator                      ║
╚═══════════════════════════════════════════════════════════╝
`))

  const limit = process.argv[2] ? parseInt(process.argv[2]) : undefined

  console.log(chalk.blue('🔍 Finding content without embeddings...\n'))

  const contentToEmbed = await getContentWithoutEmbeddings(limit)

  if (contentToEmbed.length === 0) {
    console.log(chalk.green('✅ All content already has embeddings!\n'))
    return
  }

  const actualLimit = limit ? Math.min(limit, contentToEmbed.length) : contentToEmbed.length
  const contentBatch = contentToEmbed.slice(0, actualLimit)

  console.log(chalk.yellow(`Found ${contentToEmbed.length} pages without embeddings`))
  console.log(chalk.yellow(`Processing ${actualLimit} pages...\n`))

  // Estimate cost
  const estimatedTokens = actualLimit * 2000 // Rough estimate
  const estimatedCost = (estimatedTokens / 1000000) * 0.13 // $0.13 per 1M tokens
  console.log(chalk.gray(`Estimated cost: $${estimatedCost.toFixed(2)}\n`))

  // Process each content item
  const startTime = Date.now()
  let totalChunks = 0
  let successCount = 0

  for (let i = 0; i < contentBatch.length; i++) {
    const result = await generateEmbeddingsForContent(contentBatch[i], i, contentBatch.length)
    if (result.success) {
      successCount++
      totalChunks += result.chunks
    }

    // Progress indicator
    const progress = Math.round((i + 1) / contentBatch.length * 100)
    process.stdout.write(chalk.gray(`\nProgress: ${progress}%\n`))
  }

  const duration = Math.round((Date.now() - startTime) / 1000)

  console.log(chalk.green(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ Embedding Generation Complete                         ║
╚═══════════════════════════════════════════════════════════╝

📊 Results:
   Processed: ${successCount}/${actualLimit} pages
   Total embeddings created: ${totalChunks}
   Duration: ${duration}s

${contentToEmbed.length - actualLimit > 0 ? `⚠️  ${contentToEmbed.length - actualLimit} pages still need embeddings. Run again to continue.` : '✅ All content now has embeddings!'}
`))

  // Show updated coverage
  console.log(chalk.blue('📈 Checking new embedding coverage...\n'))

  const { count: totalContent } = await supabase
    .from('scraped_content')
    .select('*', { count: 'exact', head: true })

  const { data: embeddedContent } = await supabase
    .from('content_embeddings')
    .select('scraped_content_id')
    .not('scraped_content_id', 'is', null)

  const uniqueEmbedded = new Set(embeddedContent?.map(e => e.scraped_content_id)).size
  const coverage = totalContent ? Math.round((uniqueEmbedded / totalContent) * 100) : 0

  console.log(chalk.green(`   Coverage: ${uniqueEmbedded}/${totalContent} (${coverage}%)\n`))
}

main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error)
  process.exit(1)
})
