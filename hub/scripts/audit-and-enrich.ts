#!/usr/bin/env tsx

/**
 * SMART Connect - Data Audit & Enrichment Script
 *
 * This script:
 * 1. Audits current Supabase data for gaps and quality issues
 * 2. Enriches metadata using GPT-4
 * 3. Classifies PDFs more accurately
 * 4. Builds initial content relationships
 *
 * Usage:
 *   npm run audit-data        # Run full audit
 *   npm run enrich-metadata   # Enrich missing metadata
 *   npm run classify-pdfs     # Classify PDFs
 *   npm run build-relationships # Extract content relationships
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import chalk from 'chalk'

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// ============================================
// 1. DATA AUDIT
// ============================================

interface AuditResults {
  totalScrapedContent: number
  totalPdfs: number
  totalEmbeddings: number
  totalRecommendations: number
  totalInsights: number

  qualityIssues: {
    missingPublishedDate: number
    missingAuthor: number
    missingDescription: number
    missingTags: number
    lowQualityScore: number
  }

  pdfIssues: {
    missingToolType: number
    missingTargetAudience: number
    missingCategory: number
    notLinkedToContent: number
  }

  embeddingCoverage: {
    contentWithEmbeddings: number
    contentWithoutEmbeddings: number
    coveragePercentage: number
  }
}

async function auditDatabase(): Promise<AuditResults> {
  console.log(chalk.blue('\n📊 Running Database Audit...\n'))

  // Count totals
  const { count: totalScrapedContent } = await supabase
    .from('scraped_content')
    .select('*', { count: 'exact', head: true })

  const { count: totalPdfs } = await supabase
    .from('pdf_documents')
    .select('*', { count: 'exact', head: true })

  const { count: totalEmbeddings } = await supabase
    .from('content_embeddings')
    .select('*', { count: 'exact', head: true })

  const { count: totalRecommendations } = await supabase
    .from('content_recommendations')
    .select('*', { count: 'exact', head: true })

  const { count: totalInsights } = await supabase
    .from('facilitator_insights')
    .select('*', { count: 'exact', head: true })

  // Quality issues
  const { count: missingPublishedDate } = await supabase
    .from('scraped_content')
    .select('*', { count: 'exact', head: true })
    .is('published_date', null)

  const { count: missingAuthor } = await supabase
    .from('scraped_content')
    .select('*', { count: 'exact', head: true })
    .is('author', null)

  const { count: missingDescription } = await supabase
    .from('scraped_content')
    .select('*', { count: 'exact', head: true })
    .or('meta_description.is.null,meta_description.eq.')

  const { count: missingTags } = await supabase
    .from('scraped_content')
    .select('*', { count: 'exact', head: true })
    .or('tags.is.null,tags.eq.{}')

  const { count: lowQualityScore } = await supabase
    .from('scraped_content')
    .select('*', { count: 'exact', head: true })
    .lt('quality_score', 0.5)

  // PDF issues
  const { count: missingToolType } = await supabase
    .from('pdf_documents')
    .select('*', { count: 'exact', head: true })
    .is('tool_type', null)

  const { count: missingTargetAudience } = await supabase
    .from('pdf_documents')
    .select('*', { count: 'exact', head: true })
    .or('target_audience.is.null,target_audience.eq.{}')

  const { count: missingCategory } = await supabase
    .from('pdf_documents')
    .select('*', { count: 'exact', head: true })
    .is('category', null)

  const { count: notLinkedToContent } = await supabase
    .from('pdf_documents')
    .select('*', { count: 'exact', head: true })
    .is('scraped_content_id', null)

  // Embedding coverage
  const { data: contentWithEmbeddings } = await supabase
    .from('content_embeddings')
    .select('scraped_content_id')
    .not('scraped_content_id', 'is', null)

  const uniqueContentIds = new Set(contentWithEmbeddings?.map(e => e.scraped_content_id))
  const contentWithEmbeddingsCount = uniqueContentIds.size
  const contentWithoutEmbeddingsCount = (totalScrapedContent || 0) - contentWithEmbeddingsCount
  const coveragePercentage = totalScrapedContent
    ? Math.round((contentWithEmbeddingsCount / totalScrapedContent) * 100)
    : 0

  const results: AuditResults = {
    totalScrapedContent: totalScrapedContent || 0,
    totalPdfs: totalPdfs || 0,
    totalEmbeddings: totalEmbeddings || 0,
    totalRecommendations: totalRecommendations || 0,
    totalInsights: totalInsights || 0,
    qualityIssues: {
      missingPublishedDate: missingPublishedDate || 0,
      missingAuthor: missingAuthor || 0,
      missingDescription: missingDescription || 0,
      missingTags: missingTags || 0,
      lowQualityScore: lowQualityScore || 0
    },
    pdfIssues: {
      missingToolType: missingToolType || 0,
      missingTargetAudience: missingTargetAudience || 0,
      missingCategory: missingCategory || 0,
      notLinkedToContent: notLinkedToContent || 0
    },
    embeddingCoverage: {
      contentWithEmbeddings: contentWithEmbeddingsCount,
      contentWithoutEmbeddings: contentWithoutEmbeddingsCount,
      coveragePercentage
    }
  }

  printAuditResults(results)
  return results
}

function printAuditResults(results: AuditResults) {
  console.log(chalk.green('✅ Database Totals:'))
  console.log(`   Scraped Content: ${results.totalScrapedContent}`)
  console.log(`   PDF Documents: ${results.totalPdfs}`)
  console.log(`   Embeddings: ${results.totalEmbeddings}`)
  console.log(`   Recommendations: ${results.totalRecommendations}`)
  console.log(`   Facilitator Insights: ${results.totalInsights}`)

  console.log(chalk.yellow('\n⚠️  Content Quality Issues:'))
  console.log(`   Missing Published Date: ${results.qualityIssues.missingPublishedDate}`)
  console.log(`   Missing Author: ${results.qualityIssues.missingAuthor}`)
  console.log(`   Missing Description: ${results.qualityIssues.missingDescription}`)
  console.log(`   Missing Tags: ${results.qualityIssues.missingTags}`)
  console.log(`   Low Quality Score (<0.5): ${results.qualityIssues.lowQualityScore}`)

  console.log(chalk.yellow('\n⚠️  PDF Issues:'))
  console.log(`   Missing Tool Type: ${results.pdfIssues.missingToolType}`)
  console.log(`   Missing Target Audience: ${results.pdfIssues.missingTargetAudience}`)
  console.log(`   Missing Category: ${results.pdfIssues.missingCategory}`)
  console.log(`   Not Linked to Content: ${results.pdfIssues.notLinkedToContent}`)

  console.log(chalk.blue('\n📈 Embedding Coverage:'))
  console.log(`   Content WITH embeddings: ${results.embeddingCoverage.contentWithEmbeddings}`)
  console.log(`   Content WITHOUT embeddings: ${results.embeddingCoverage.contentWithoutEmbeddings}`)
  console.log(`   Coverage: ${results.embeddingCoverage.coveragePercentage}%`)

  // Recommendations
  console.log(chalk.magenta('\n💡 Recommendations:'))
  if (results.qualityIssues.missingTags > results.totalScrapedContent * 0.3) {
    console.log(`   ⚡ High priority: Enrich tags for ${results.qualityIssues.missingTags} pages`)
  }
  if (results.pdfIssues.missingToolType > 0) {
    console.log(`   ⚡ Classify ${results.pdfIssues.missingToolType} PDFs by tool type`)
  }
  if (results.embeddingCoverage.coveragePercentage < 100) {
    console.log(`   ⚡ Generate embeddings for ${results.embeddingCoverage.contentWithoutEmbeddings} pages`)
  }
  console.log()
}

// ============================================
// 2. METADATA ENRICHMENT
// ============================================

async function enrichMetadata(limit: number = 10) {
  console.log(chalk.blue(`\n🔧 Enriching Metadata for up to ${limit} pages...\n`))

  // Get pages with missing metadata
  const { data: contentToEnrich } = await supabase
    .from('scraped_content')
    .select('id, url, title, content, meta_description, tags, author, published_date, quality_score')
    .or('meta_description.is.null,tags.is.null,author.is.null,published_date.is.null')
    .limit(limit)

  if (!contentToEnrich || contentToEnrich.length === 0) {
    console.log(chalk.green('✅ No content needs enrichment!'))
    return
  }

  console.log(`Found ${contentToEnrich.length} pages to enrich`)

  for (const content of contentToEnrich) {
    try {
      console.log(chalk.gray(`\n  Processing: ${content.title.slice(0, 60)}...`))

      // Use GPT-4 to enrich metadata
      const enrichment = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a metadata enrichment specialist for SMART Recovery content.
            Analyze the content and extract:
            1. Meta description (compelling 150-160 char summary)
            2. Tags (relevant SMART Recovery concepts, tools, themes)
            3. Author (if mentioned, otherwise "SMART Recovery Australia")
            4. Published date (if mentioned, in YYYY-MM-DD format)
            5. Target audience (facilitators, participants, family, general)

            Return as JSON.`
          },
          {
            role: 'user',
            content: `Title: ${content.title}

URL: ${content.url}

Content (first 2000 chars):
${content.content.slice(0, 2000)}

Extract metadata as JSON.`
          }
        ],
        response_format: { type: 'json_object' }
      })

      const metadata = JSON.parse(enrichment.choices[0].message.content || '{}')

      // Update the record
      const updates: any = {}

      if (!content.meta_description && metadata.meta_description) {
        updates.meta_description = metadata.meta_description
      }

      if ((!content.tags || content.tags.length === 0) && metadata.tags) {
        updates.tags = Array.isArray(metadata.tags) ? metadata.tags : []
      }

      if (!content.author && metadata.author) {
        updates.author = metadata.author
      }

      if (!content.published_date && metadata.published_date) {
        updates.published_date = metadata.published_date
      }

      // Recalculate quality score
      const newQualityScore = calculateQualityScore({
        ...content,
        ...updates
      })
      updates.quality_score = newQualityScore

      const { error } = await supabase
        .from('scraped_content')
        .update(updates)
        .eq('id', content.id)

      if (error) {
        console.log(chalk.red(`  ❌ Error updating: ${error.message}`))
      } else {
        console.log(chalk.green(`  ✅ Enriched (quality: ${content.quality_score.toFixed(2)} → ${newQualityScore.toFixed(2)})`))
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (error: any) {
      console.log(chalk.red(`  ❌ Error: ${error.message}`))
    }
  }

  console.log(chalk.green(`\n✅ Enrichment complete!\n`))
}

function calculateQualityScore(content: any): number {
  let score = 0

  // Content length
  const wordCount = content.content?.split(/\s+/).length || 0
  if (wordCount > 100) score += 0.1
  if (wordCount > 500) score += 0.1
  if (wordCount > 1000) score += 0.1

  // Title
  if (content.title && content.title.length > 10) score += 0.2

  // Description
  if (content.meta_description && content.meta_description.length > 20) score += 0.2

  // Tags
  if (content.tags && content.tags.length > 0) score += 0.1
  if (content.tags && content.tags.length > 3) score += 0.1

  // Author
  if (content.author) score += 0.1

  // Published date
  if (content.published_date) score += 0.1

  return Math.min(score, 1.0)
}

// ============================================
// 3. PDF CLASSIFICATION
// ============================================

async function classifyPdfs(limit: number = 10) {
  console.log(chalk.blue(`\n📄 Classifying up to ${limit} PDFs...\n`))

  const { data: pdfs } = await supabase
    .from('pdf_documents')
    .select('id, title, url, extracted_text, tool_type, category, target_audience')
    .or('tool_type.is.null,category.is.null,target_audience.is.null')
    .limit(limit)

  if (!pdfs || pdfs.length === 0) {
    console.log(chalk.green('✅ No PDFs need classification!'))
    return
  }

  console.log(`Found ${pdfs.length} PDFs to classify`)

  for (const pdf of pdfs) {
    try {
      console.log(chalk.gray(`\n  Classifying: ${pdf.title.slice(0, 60)}...`))

      const classification = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a SMART Recovery content classifier.
            Analyze this PDF and extract:
            1. tool_type: One of [CBA, hierarchy-of-values, abc-urge-log, change-plan, smart-goals, problem-solving, brainstorming, other]
            2. category: One of [facilitator-guide, participant-worksheet, training-manual, reference, handbook]
            3. target_audience: Array of [facilitators, participants, family, trainers, coordinators]
            4. smart_tool_number: If this is a numbered tool (e.g., "Tool 1", "Tool 5")

            Return as JSON.`
          },
          {
            role: 'user',
            content: `Title: ${pdf.title}

URL: ${pdf.url}

Content (first 2000 chars):
${pdf.extracted_text?.slice(0, 2000) || 'No extracted text available'}

Classify this PDF.`
          }
        ],
        response_format: { type: 'json_object' }
      })

      const classification_data = JSON.parse(classification.choices[0].message.content || '{}')

      const updates: any = {}

      if (!pdf.tool_type && classification_data.tool_type) {
        updates.tool_type = classification_data.tool_type
      }

      if (!pdf.category && classification_data.category) {
        updates.category = classification_data.category
      }

      if ((!pdf.target_audience || pdf.target_audience.length === 0) && classification_data.target_audience) {
        updates.target_audience = Array.isArray(classification_data.target_audience)
          ? classification_data.target_audience
          : [classification_data.target_audience]
      }

      if (classification_data.smart_tool_number) {
        updates.smart_tool_number = classification_data.smart_tool_number
      }

      const { error } = await supabase
        .from('pdf_documents')
        .update(updates)
        .eq('id', pdf.id)

      if (error) {
        console.log(chalk.red(`  ❌ Error: ${error.message}`))
      } else {
        console.log(chalk.green(`  ✅ Classified as: ${classification_data.tool_type} (${classification_data.category})`))
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (error: any) {
      console.log(chalk.red(`  ❌ Error: ${error.message}`))
    }
  }

  console.log(chalk.green(`\n✅ PDF classification complete!\n`))
}

// ============================================
// 4. BUILD CONTENT RELATIONSHIPS
// ============================================

async function buildRelationships(limit: number = 20) {
  console.log(chalk.blue(`\n🔗 Building content relationships...\n`))

  // First, create the table if it doesn't exist
  await createRelationshipsTable()

  // Get random pairs of content to analyze
  const { data: allContent } = await supabase
    .from('scraped_content')
    .select('id, title, content, tags, category')
    .gte('quality_score', 0.6)
    .limit(100)

  if (!allContent || allContent.length < 2) {
    console.log(chalk.yellow('⚠️  Not enough content to build relationships'))
    return
  }

  let relationshipsCreated = 0

  // Compare content pairs
  for (let i = 0; i < Math.min(limit, allContent.length - 1); i++) {
    const contentA = allContent[i]
    const contentB = allContent[i + 1]

    try {
      console.log(chalk.gray(`\n  Analyzing: "${contentA.title.slice(0, 40)}..." <-> "${contentB.title.slice(0, 40)}..."`))

      const analysis = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `Analyze if these two SMART Recovery content pieces are related.
            If related, specify:
            1. relationship_type: One of [references, prerequisite, related_tool, same_topic, supports, example_of]
            2. strength: 0.0-1.0 (how strong the relationship is)
            3. evidence: Brief explanation

            If not related, return { "is_related": false }

            Return as JSON.`
          },
          {
            role: 'user',
            content: `Content A:
Title: ${contentA.title}
Tags: ${contentA.tags?.join(', ') || 'none'}
Content: ${contentA.content.slice(0, 1000)}

Content B:
Title: ${contentB.title}
Tags: ${contentB.tags?.join(', ') || 'none'}
Content: ${contentB.content.slice(0, 1000)}

Are these related?`
          }
        ],
        response_format: { type: 'json_object' }
      })

      const relationship = JSON.parse(analysis.choices[0].message.content || '{}')

      if (relationship.is_related !== false && relationship.relationship_type) {
        // Check if relationship already exists
        const { data: existing } = await supabase
          .from('content_relationships')
          .select('id')
          .eq('source_content_id', contentA.id)
          .eq('target_content_id', contentB.id)
          .eq('relationship_type', relationship.relationship_type)
          .single()

        if (!existing) {
          const { error } = await supabase
            .from('content_relationships')
            .insert({
              source_content_id: contentA.id,
              source_type: 'page',
              target_content_id: contentB.id,
              target_type: 'page',
              relationship_type: relationship.relationship_type,
              relationship_strength: relationship.strength || 0.5,
              metadata: {
                evidence: relationship.evidence || '',
                extracted_at: new Date().toISOString()
              }
            })

          if (error) {
            console.log(chalk.red(`  ❌ Error: ${error.message}`))
          } else {
            relationshipsCreated++
            console.log(chalk.green(`  ✅ Found: ${relationship.relationship_type} (strength: ${relationship.strength})`))
          }
        } else {
          console.log(chalk.gray(`  ⏭️  Relationship already exists`))
        }
      } else {
        console.log(chalk.gray(`  ⏭️  Not related`))
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error: any) {
      console.log(chalk.red(`  ❌ Error: ${error.message}`))
    }
  }

  console.log(chalk.green(`\n✅ Created ${relationshipsCreated} new relationships!\n`))
}

async function createRelationshipsTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS content_relationships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_content_id UUID,
        source_type TEXT CHECK (source_type IN ('page', 'pdf', 'interview')),
        target_content_id UUID,
        target_type TEXT CHECK (target_type IN ('page', 'pdf', 'interview')),
        relationship_type TEXT CHECK (relationship_type IN (
          'references',
          'prerequisite',
          'related_tool',
          'same_topic',
          'updated_version',
          'translation',
          'adaptation',
          'example_of',
          'supports',
          'contradicts'
        )),
        relationship_strength FLOAT DEFAULT 0.5,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        verified BOOLEAN DEFAULT false
      );

      CREATE INDEX IF NOT EXISTS idx_content_rel_source ON content_relationships(source_content_id, source_type);
      CREATE INDEX IF NOT EXISTS idx_content_rel_target ON content_relationships(target_content_id, target_type);
      CREATE INDEX IF NOT EXISTS idx_content_rel_type ON content_relationships(relationship_type);
    `
  })

  if (error && !error.message.includes('already exists')) {
    console.log(chalk.yellow(`⚠️  Note: Could not create table via RPC. You may need to run SQL manually.`))
  }
}

// ============================================
// MAIN CLI
// ============================================

async function main() {
  const command = process.argv[2]

  switch (command) {
    case 'audit':
      await auditDatabase()
      break

    case 'enrich':
      const enrichLimit = parseInt(process.argv[3] || '10')
      await enrichMetadata(enrichLimit)
      break

    case 'classify':
      const classifyLimit = parseInt(process.argv[3] || '10')
      await classifyPdfs(classifyLimit)
      break

    case 'relationships':
      const relLimit = parseInt(process.argv[3] || '20')
      await buildRelationships(relLimit)
      break

    case 'all':
      await auditDatabase()
      await enrichMetadata(10)
      await classifyPdfs(10)
      await buildRelationships(10)
      break

    default:
      console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  SMART Connect - Data Audit & Enrichment Tool            ║
╚═══════════════════════════════════════════════════════════╝

Commands:
  audit                 Run database audit
  enrich [limit]        Enrich metadata (default: 10 pages)
  classify [limit]      Classify PDFs (default: 10 PDFs)
  relationships [limit] Build content relationships (default: 20 pairs)
  all                   Run all tasks with default limits

Examples:
  tsx scripts/audit-and-enrich.ts audit
  tsx scripts/audit-and-enrich.ts enrich 50
  tsx scripts/audit-and-enrich.ts classify 20
  tsx scripts/audit-and-enrich.ts relationships 30
  tsx scripts/audit-and-enrich.ts all
      `))
  }
}

main().catch(console.error)
