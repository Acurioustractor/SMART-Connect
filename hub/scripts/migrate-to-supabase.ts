/**
 * Migration Script: Move Interviews and Analysis to Supabase
 *
 * This script:
 * 1. Reads all interview markdown files
 * 2. Reads all analysis JSON files
 * 3. Uploads them to Supabase
 * 4. Generates and stores embeddings for vector search
 *
 * Run with: npx tsx scripts/migrate-to-supabase.ts
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '', // Use service role for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface InterviewMetadata {
  name: string
  email?: string
  interviewDate?: string
  affiliation?: string
  role?: string
  status?: string
}

interface AnalysisData {
  executiveSummary: string
  keyThemes: any[]
  powerfulQuotes: any[]
  learnWorldContentSuggestions: any[]
  facilitatorInsights: any
  platformImplications: any[]
  culturalConsiderations: any
  oneLineTakeaway: string
  modelUsed?: string
  tokensUsed?: number
}

async function extractMetadataFromContent(content: string): Promise<InterviewMetadata> {
  const nameMatch = content.match(/^#\s+(.+)$/m)
  const emailMatch = content.match(/Email:\s*(.+)$/m)
  const dateMatch = content.match(/Interview date:\s*(.+)$/m)
  const affiliationMatch = content.match(/SRAU Affiliation:\s*(.+)$/m)
  const roleMatch = content.match(/Notes\s*:\s*(.+)$/m)
  const statusMatch = content.match(/Status:\s*(.+)$/m)

  return {
    name: nameMatch ? nameMatch[1].trim() : 'Unknown',
    email: emailMatch ? emailMatch[1].trim() : undefined,
    interviewDate: dateMatch ? dateMatch[1].trim() : undefined,
    affiliation: affiliationMatch ? affiliationMatch[1].trim() : undefined,
    role: roleMatch ? roleMatch[1].trim() : undefined,
    status: statusMatch ? statusMatch[1].trim() : 'completed'
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text.substring(0, 8000), // Limit to prevent token overflow
  })
  return response.data[0].embedding
}

async function chunkText(text: string, chunkSize: number = 1000): Promise<string[]> {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/)
  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += sentence + '. '
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

async function migrateInterviews() {
  console.log('🚀 Starting migration to Supabase...\n')

  const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')
  const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')

  // Get all interview files
  const files = fs.readdirSync(interviewsPath)
  const mdFiles = files.filter(file =>
    file.endsWith('.md') &&
    !file.includes('template') &&
    !file.includes('Final email')
  )

  console.log(`Found ${mdFiles.length} interviews to migrate\n`)

  let successCount = 0
  let failCount = 0

  for (const filename of mdFiles) {
    try {
      console.log(`Processing: ${filename}`)

      // Read interview content
      const filePath = path.join(interviewsPath, filename)
      const content = fs.readFileSync(filePath, 'utf-8')

      // Extract metadata
      const metadata = await extractMetadataFromContent(content)

      // Insert interview
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          name: metadata.name,
          email: metadata.email,
          interview_date: metadata.interviewDate,
          affiliation: metadata.affiliation,
          role: metadata.role,
          status: metadata.status || 'completed',
          raw_content: content,
          metadata: metadata
        })
        .select()
        .single()

      if (interviewError) {
        console.error(`  ❌ Failed to insert interview: ${interviewError.message}`)
        failCount++
        continue
      }

      console.log(`  ✓ Inserted interview with ID: ${interview.id}`)

      // Check if analysis exists
      const analysisFile = path.join(analysisPath, filename.replace('.md', '.json'))
      if (fs.existsSync(analysisFile)) {
        const analysisData: AnalysisData = JSON.parse(fs.readFileSync(analysisFile, 'utf-8'))

        // Insert analysis
        const { data: analysis, error: analysisError } = await supabase
          .from('interview_analysis')
          .insert({
            interview_id: interview.id,
            executive_summary: analysisData.executiveSummary,
            one_line_takeaway: analysisData.oneLineTakeaway,
            key_themes: analysisData.keyThemes,
            powerful_quotes: analysisData.powerfulQuotes,
            learnworld_content_suggestions: analysisData.learnWorldContentSuggestions,
            facilitator_insights: analysisData.facilitatorInsights,
            platform_implications: analysisData.platformImplications,
            cultural_considerations: analysisData.culturalConsiderations,
            model_used: analysisData.modelUsed || 'gpt-4-turbo-preview',
            tokens_used: analysisData.tokensUsed
          })
          .select()
          .single()

        if (analysisError) {
          console.error(`  ❌ Failed to insert analysis: ${analysisError.message}`)
        } else {
          console.log(`  ✓ Inserted analysis`)
        }

        // Extract LearnWorld course suggestions and create records
        if (analysisData.learnWorldContentSuggestions && analysisData.learnWorldContentSuggestions.length > 0) {
          for (const course of analysisData.learnWorldContentSuggestions) {
            const { error: courseError } = await supabase
              .from('learnworld_courses')
              .insert({
                title: course.courseTitle,
                description: course.description,
                target_audience: course.targetAudience,
                format: course.format,
                estimated_length: course.estimatedLength,
                key_learning_outcomes: course.keyLearningOutcomes,
                source_interviews: [interview.id],
                status: 'suggested',
                priority: 'medium'
              })

            if (!courseError) {
              console.log(`  ✓ Created LearnWorld course: ${course.courseTitle}`)
            }
          }
        }

        // Extract platform implications and create feature records
        if (analysisData.platformImplications && analysisData.platformImplications.length > 0) {
          for (const impl of analysisData.platformImplications) {
            const { error: featureError } = await supabase
              .from('platform_features')
              .insert({
                feature_name: impl.featureIdea,
                description: impl.insight,
                insight: impl.insight,
                rationale: impl.rationale,
                priority: impl.priority?.toLowerCase() || 'medium',
                source_interviews: [interview.id],
                status: 'suggested'
              })

            if (!featureError) {
              console.log(`  ✓ Created platform feature: ${impl.featureIdea}`)
            }
          }
        }
      }

      // Generate and store embeddings
      console.log(`  📊 Generating embeddings...`)
      const chunks = await chunkText(content)

      for (let i = 0; i < Math.min(chunks.length, 20); i++) { // Limit to 20 chunks to avoid rate limits
        const chunk = chunks[i]
        const embedding = await generateEmbedding(chunk)

        const { error: embeddingError } = await supabase
          .from('interview_embeddings')
          .insert({
            interview_id: interview.id,
            content_chunk: chunk,
            chunk_index: i,
            embedding: embedding,
            metadata: {
              section: i === 0 ? 'header' : 'content',
              chunk_length: chunk.length
            }
          })

        if (embeddingError) {
          console.error(`  ❌ Failed to insert embedding ${i}: ${embeddingError.message}`)
        }

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      console.log(`  ✓ Generated ${Math.min(chunks.length, 20)} embeddings`)

      successCount++
      console.log()

      // Add delay between interviews to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error: any) {
      console.error(`  ❌ Error processing ${filename}: ${error.message}\n`)
      failCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`Migration Complete!`)
  console.log(`✓ Success: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log('='.repeat(50))
}

// Run migration
migrateInterviews().catch(console.error)
