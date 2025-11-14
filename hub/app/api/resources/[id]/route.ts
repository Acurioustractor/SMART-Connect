import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * GET /api/resources/[id]
 * Get detailed information about a specific resource
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resourceId = params.id
    const supabase = getSupabase()

    // Try to find in scraped_content first
    const { data: scrapedContent, error: scrapedError } = await supabase
      .from('scraped_content')
      .select('*')
      .eq('id', resourceId)
      .single()

    if (!scrapedError && scrapedContent) {
      // Get embeddings for this content
      const { data: embeddings } = await supabase
        .from('content_embeddings')
        .select('*')
        .eq('scraped_content_id', resourceId)

      // Get recommendations that include this content
      const { data: recommendations } = await supabase
        .from('content_recommendations')
        .select('*')
        .eq('scraped_content_id', resourceId)

      // Get usage analytics
      const { data: usage } = await supabase
        .from('content_usage')
        .select('*')
        .eq('scraped_content_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(100)

      const usageStats = calculateUsageStats(usage)

      // Enrich with interview insights
      const relatedInsights = await getRelatedInsights(scrapedContent)

      // Enrich with learning content suggestions
      const learningSuggestions = await getLearningSuggestions(scrapedContent)

      // Get similar content
      const similarContent = await getSimilarContent(supabase, resourceId, 'scraped')

      return NextResponse.json({
        success: true,
        resource: {
          id: scrapedContent.id,
          title: scrapedContent.title,
          content: scrapedContent.markdown,
          htmlContent: scrapedContent.content,
          url: scrapedContent.url,
          type: scrapedContent.content_type,
          category: scrapedContent.category,
          tags: scrapedContent.tags,
          metadata: {
            description: scrapedContent.meta_description,
            keywords: scrapedContent.meta_keywords,
            author: scrapedContent.author,
            publishedDate: scrapedContent.published_date,
            wordCount: scrapedContent.word_count,
            readingTime: scrapedContent.reading_time_minutes,
            qualityScore: scrapedContent.quality_score,
            relevanceScore: scrapedContent.relevance_score,
            isVerified: scrapedContent.is_verified
          },
          links: {
            parent: scrapedContent.parent_url,
            external: scrapedContent.external_links,
            internal: scrapedContent.internal_links
          },
          embeddings: embeddings || [],
          recommendations: recommendations || [],
          usage: usageStats,
          relatedInsights,
          learningSuggestions,
          similarContent,
          createdAt: scrapedContent.scraped_at,
          updatedAt: scrapedContent.last_updated
        }
      })
    }

    // Try PDF documents
    const { data: pdf, error: pdfError } = await supabase
      .from('pdf_documents')
      .select('*')
      .eq('id', resourceId)
      .single()

    if (!pdfError && pdf) {
      // Get embeddings for this PDF
      const { data: embeddings } = await supabase
        .from('content_embeddings')
        .select('*')
        .eq('pdf_document_id', resourceId)

      // Get recommendations
      const { data: recommendations } = await supabase
        .from('content_recommendations')
        .select('*')
        .eq('pdf_document_id', resourceId)

      // Get usage analytics
      const { data: usage } = await supabase
        .from('content_usage')
        .select('*')
        .eq('pdf_document_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(100)

      const usageStats = calculateUsageStats(usage)

      // Enrich with interview insights
      const relatedInsights = await getRelatedInsights(pdf)

      // Enrich with learning content suggestions
      const learningSuggestions = await getLearningSuggestions(pdf)

      // Get similar content
      const similarContent = await getSimilarContent(supabase, resourceId, 'pdf')

      return NextResponse.json({
        success: true,
        resource: {
          id: pdf.id,
          title: pdf.title,
          content: pdf.markdown_content,
          extractedText: pdf.extracted_text,
          url: pdf.url,
          filePath: pdf.file_path,
          type: 'pdf',
          category: pdf.category,
          tags: pdf.target_audience,
          metadata: {
            toolType: pdf.tool_type,
            targetAudience: pdf.target_audience,
            smartToolNumber: pdf.smart_tool_number,
            author: pdf.author,
            version: pdf.version,
            publishedDate: pdf.published_date,
            language: pdf.language,
            pageCount: pdf.page_count,
            fileSize: pdf.file_size_bytes,
            downloadCount: pdf.download_count,
            viewCount: pdf.view_count,
            qualityScore: pdf.quality_score,
            isVerified: pdf.is_verified
          },
          embeddings: embeddings || [],
          recommendations: recommendations || [],
          usage: usageStats,
          relatedInsights,
          learningSuggestions,
          similarContent,
          createdAt: pdf.created_at,
          updatedAt: pdf.updated_at
        }
      })
    }

    // Resource not found
    return NextResponse.json(
      {
        error: 'Resource not found',
        resourceId
      },
      { status: 404 }
    )

  } catch (error: any) {
    console.error('Resource detail error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch resource',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate usage statistics
 */
function calculateUsageStats(usage: any[]) {
  if (!usage || usage.length === 0) {
    return {
      totalViews: 0,
      totalDownloads: 0,
      totalSaves: 0,
      uniqueUsers: 0,
      avgTimeSpent: 0,
      avgScrollDepth: 0
    }
  }

  const views = usage.filter(u => u.action_type === 'view')
  const downloads = usage.filter(u => u.action_type === 'download')
  const saves = usage.filter(u => u.action_type === 'save')
  const uniqueUsers = new Set(usage.map(u => u.user_id).filter(Boolean)).size

  const timeSpentValues = usage
    .filter(u => u.time_spent_seconds != null)
    .map(u => u.time_spent_seconds)
  const avgTimeSpent = timeSpentValues.length > 0
    ? timeSpentValues.reduce((a, b) => a + b, 0) / timeSpentValues.length
    : 0

  const scrollDepthValues = usage
    .filter(u => u.scroll_depth_percent != null)
    .map(u => u.scroll_depth_percent)
  const avgScrollDepth = scrollDepthValues.length > 0
    ? scrollDepthValues.reduce((a, b) => a + b, 0) / scrollDepthValues.length
    : 0

  return {
    totalViews: views.length,
    totalDownloads: downloads.length,
    totalSaves: saves.length,
    uniqueUsers,
    avgTimeSpent: Math.round(avgTimeSpent),
    avgScrollDepth: Math.round(avgScrollDepth),
    recentActivity: usage.slice(0, 10)
  }
}

/**
 * Get related interview insights
 */
async function getRelatedInsights(resource: any) {
  try {
    const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')

    if (!fs.existsSync(analysisPath)) {
      return []
    }

    const analysisFiles = fs.readdirSync(analysisPath).filter(f => f.endsWith('.json'))
    const allAnalyses = analysisFiles.map(file => {
      const content = fs.readFileSync(path.join(analysisPath, file), 'utf-8')
      return JSON.parse(content)
    })

    const relatedInsights: any[] = []
    const resourceText = (resource.title + ' ' + (resource.meta_description || resource.category || '')).toLowerCase()

    for (const analysis of allAnalyses) {
      // Check platform implications
      if (analysis.platformImplications) {
        for (const impl of analysis.platformImplications) {
          const implText = (impl.featureIdea + ' ' + impl.insight).toLowerCase()
          if (hasTextOverlap(resourceText, implText)) {
            relatedInsights.push({
              facilitator: analysis.name,
              type: 'platform_recommendation',
              insight: impl.insight,
              featureIdea: impl.featureIdea,
              priority: impl.priority,
              rationale: impl.rationale
            })
          }
        }
      }

      // Check facilitator challenges this might address
      if (analysis.facilitatorInsights?.challenges) {
        for (const challenge of analysis.facilitatorInsights.challenges) {
          if (hasTextOverlap(resourceText, challenge.toLowerCase())) {
            relatedInsights.push({
              facilitator: analysis.name,
              type: 'addresses_challenge',
              challenge
            })
          }
        }
      }
    }

    return relatedInsights
  } catch (error) {
    console.error('Error getting related insights:', error)
    return []
  }
}

/**
 * Get learning content suggestions related to this resource
 */
async function getLearningSuggestions(resource: any) {
  try {
    const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')

    if (!fs.existsSync(analysisPath)) {
      return []
    }

    const analysisFiles = fs.readdirSync(analysisPath).filter(f => f.endsWith('.json'))
    const allAnalyses = analysisFiles.map(file => {
      const content = fs.readFileSync(path.join(analysisPath, file), 'utf-8')
      return JSON.parse(content)
    })

    const allSuggestions = allAnalyses.flatMap(a => a.learnWorldContentSuggestions || [])
    const resourceText = (resource.title + ' ' + (resource.meta_description || resource.category || '')).toLowerCase()

    return allSuggestions.filter(suggestion => {
      const suggestionText = (suggestion.courseTitle + ' ' + suggestion.description).toLowerCase()
      return hasTextOverlap(resourceText, suggestionText)
    })
  } catch (error) {
    console.error('Error getting learning suggestions:', error)
    return []
  }
}

/**
 * Get similar content based on embeddings
 */
async function getSimilarContent(supabase: any, resourceId: string, type: 'scraped' | 'pdf') {
  try {
    // Get embedding for this resource
    const embeddingQuery = type === 'scraped'
      ? supabase.from('content_embeddings').select('embedding').eq('scraped_content_id', resourceId).limit(1)
      : supabase.from('content_embeddings').select('embedding').eq('pdf_document_id', resourceId).limit(1)

    const { data: embeddingData } = await embeddingQuery

    if (!embeddingData || embeddingData.length === 0) {
      return []
    }

    const embedding = embeddingData[0].embedding

    // Find similar content using vector similarity
    const { data: similar } = await supabase.rpc('search_content_by_embedding', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 6 // Get 6 to exclude self
    })

    if (!similar) {
      return []
    }

    // Filter out the current resource and return top 5
    return similar
      .filter((item: any) => item.id !== resourceId)
      .slice(0, 5)
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.content_type,
        similarity: item.similarity
      }))
  } catch (error) {
    console.error('Error getting similar content:', error)
    return []
  }
}

/**
 * Check if two texts have overlapping keywords
 */
function hasTextOverlap(text1: string, text2: string): boolean {
  const getKeywords = (text: string) => {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from']
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
  }

  const keywords1 = getKeywords(text1)
  const keywords2 = getKeywords(text2)

  const overlap = keywords1.filter(k => keywords2.includes(k))
  return overlap.length >= 2 // At least 2 common keywords
}

export const config = {
  maxDuration: 60
}
