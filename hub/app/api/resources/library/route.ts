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

interface Resource {
  id: string
  title: string
  description?: string
  url: string
  type: 'page' | 'pdf' | 'tool' | 'resource'
  category?: string
  tags?: string[]
  content?: string
  metadata?: any
  relatedInsights?: any[]
  learnWorldsSuggestions?: any[]
  createdAt?: string
  updatedAt?: string
}

/**
 * GET /api/resources/library
 * Returns all resources from the SMART Recovery website
 * Supports filtering, searching, and pagination
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // Parse query parameters
    const filters = {
      type: searchParams.get('type'),
      category: searchParams.get('category'),
      tag: searchParams.get('tag'),
      search: searchParams.get('search'),
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: searchParams.get('sortBy') || 'updated_at',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      includeInsights: searchParams.get('includeInsights') === 'true',
      includeLearningContent: searchParams.get('includeLearningContent') === 'true'
    }

    const supabase = getSupabase()

    // Build query for scraped content
    let contentQuery = supabase
      .from('scraped_content')
      .select('*')

    // Apply filters
    if (filters.type && filters.type !== 'all') {
      contentQuery = contentQuery.eq('content_type', filters.type)
    }
    if (filters.category) {
      contentQuery = contentQuery.eq('category', filters.category)
    }
    if (filters.tag) {
      contentQuery = contentQuery.contains('tags', [filters.tag])
    }
    if (filters.search) {
      contentQuery = contentQuery.textSearch('search_vector', filters.search, {
        type: 'websearch',
        config: 'english'
      })
    }

    // Apply sorting and pagination
    contentQuery = contentQuery
      .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })
      .range(filters.offset, filters.offset + filters.limit - 1)

    const { data: scrapedContent, error: scrapedError, count: totalCount } = await contentQuery

    if (scrapedError) {
      throw scrapedError
    }

    // Get PDFs
    const { data: pdfs, error: pdfError } = await supabase
      .from('pdf_documents')
      .select('*')
      .order('updated_at', { ascending: false })

    if (pdfError) {
      console.error('PDF fetch error:', pdfError)
    }

    // Combine all resources
    const allResources: Resource[] = [
      ...(scrapedContent || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.meta_description,
        url: item.url,
        type: item.content_type as any,
        category: item.category,
        tags: item.tags,
        content: item.markdown,
        metadata: {
          wordCount: item.word_count,
          readingTime: item.reading_time_minutes,
          qualityScore: item.quality_score,
          relevanceScore: item.relevance_score,
          isVerified: item.is_verified
        },
        createdAt: item.scraped_at,
        updatedAt: item.last_updated
      })),
      ...(pdfs || []).map(pdf => ({
        id: pdf.id,
        title: pdf.title,
        description: `${pdf.category || 'PDF Document'} - ${pdf.page_count || 0} pages`,
        url: pdf.url,
        type: 'pdf' as const,
        category: pdf.category,
        tags: pdf.target_audience,
        content: pdf.markdown_content,
        metadata: {
          toolType: pdf.tool_type,
          targetAudience: pdf.target_audience,
          smartToolNumber: pdf.smart_tool_number,
          pageCount: pdf.page_count,
          fileSize: pdf.file_size_bytes,
          downloadCount: pdf.download_count,
          viewCount: pdf.view_count,
          qualityScore: pdf.quality_score,
          isVerified: pdf.is_verified
        },
        createdAt: pdf.created_at,
        updatedAt: pdf.updated_at
      }))
    ]

    // If requested, enrich with interview insights connections
    if (filters.includeInsights) {
      await enrichWithInsights(supabase, allResources)
    }

    // If requested, enrich with LearnWorlds content suggestions
    if (filters.includeLearningContent) {
      await enrichWithLearningContent(allResources)
    }

    // Get statistics
    const stats = await getLibraryStats(supabase)

    return NextResponse.json({
      success: true,
      resources: allResources,
      total: allResources.length,
      stats,
      filters: filters
    })

  } catch (error: any) {
    console.error('Resource library error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch resources',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * Enrich resources with related interview insights
 */
async function enrichWithInsights(supabase: any, resources: Resource[]) {
  try {
    // Load interview analyses
    const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')

    if (!fs.existsSync(analysisPath)) {
      return
    }

    const analysisFiles = fs.readdirSync(analysisPath).filter(f => f.endsWith('.json'))
    const allAnalyses = analysisFiles.map(file => {
      const content = fs.readFileSync(path.join(analysisPath, file), 'utf-8')
      return JSON.parse(content)
    })

    // For each resource, find related insights
    for (const resource of resources) {
      const relatedInsights: any[] = []

      // Check if resource relates to any facilitator insights, themes, or recommendations
      for (const analysis of allAnalyses) {
        // Check platform implications
        if (analysis.platformImplications) {
          for (const impl of analysis.platformImplications) {
            if (resourceMatchesInsight(resource, impl)) {
              relatedInsights.push({
                facilitator: analysis.name,
                type: 'platform_recommendation',
                insight: impl.insight,
                featureIdea: impl.featureIdea,
                priority: impl.priority
              })
            }
          }
        }

        // Check key themes
        if (analysis.keyThemes) {
          for (const theme of analysis.keyThemes) {
            if (resourceMatchesTheme(resource, theme)) {
              relatedInsights.push({
                facilitator: analysis.name,
                type: 'theme',
                theme: theme.theme,
                description: theme.description
              })
            }
          }
        }

        // Check facilitator insights
        if (analysis.facilitatorInsights) {
          const insights = analysis.facilitatorInsights
          if (insights.challenges?.some((c: string) => resourceMatchesChallenge(resource, c))) {
            relatedInsights.push({
              facilitator: analysis.name,
              type: 'addresses_challenge',
              challenges: insights.challenges.filter((c: string) => resourceMatchesChallenge(resource, c))
            })
          }
        }
      }

      if (relatedInsights.length > 0) {
        resource.relatedInsights = relatedInsights
      }
    }
  } catch (error) {
    console.error('Error enriching with insights:', error)
  }
}

/**
 * Enrich resources with LearnWorlds content suggestions
 */
async function enrichWithLearningContent(resources: Resource[]) {
  try {
    const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')

    if (!fs.existsSync(analysisPath)) {
      return
    }

    const analysisFiles = fs.readdirSync(analysisPath).filter(f => f.endsWith('.json'))
    const allAnalyses = analysisFiles.map(file => {
      const content = fs.readFileSync(path.join(analysisPath, file), 'utf-8')
      return JSON.parse(content)
    })

    // Aggregate all learning content suggestions
    const allSuggestions = allAnalyses.flatMap(a => a.learnWorldContentSuggestions || [])

    // For each resource, find related learning content
    for (const resource of resources) {
      const relatedSuggestions = allSuggestions.filter(suggestion => {
        return resourceMatchesLearningSuggestion(resource, suggestion)
      })

      if (relatedSuggestions.length > 0) {
        resource.learnWorldsSuggestions = relatedSuggestions.map(s => ({
          courseTitle: s.courseTitle,
          description: s.description,
          targetAudience: s.targetAudience,
          format: s.format,
          keyLearningOutcomes: s.keyLearningOutcomes
        }))
      }
    }
  } catch (error) {
    console.error('Error enriching with learning content:', error)
  }
}

/**
 * Check if a resource matches an insight
 */
function resourceMatchesInsight(resource: Resource, insight: any): boolean {
  const keywords = extractKeywords(insight.featureIdea + ' ' + insight.insight)
  const resourceText = (resource.title + ' ' + (resource.description || '') + ' ' + (resource.category || '')).toLowerCase()

  return keywords.some(keyword => resourceText.includes(keyword.toLowerCase()))
}

/**
 * Check if a resource matches a theme
 */
function resourceMatchesTheme(resource: Resource, theme: any): boolean {
  const themeKeywords = extractKeywords(theme.theme + ' ' + theme.description)
  const resourceText = (resource.title + ' ' + (resource.description || '') + ' ' + (resource.tags?.join(' ') || '')).toLowerCase()

  return themeKeywords.some(keyword => resourceText.includes(keyword.toLowerCase()))
}

/**
 * Check if a resource addresses a challenge
 */
function resourceMatchesChallenge(resource: Resource, challenge: string): boolean {
  const challengeKeywords = extractKeywords(challenge)
  const resourceText = (resource.title + ' ' + (resource.description || '')).toLowerCase()

  return challengeKeywords.some(keyword => resourceText.includes(keyword.toLowerCase()))
}

/**
 * Check if a resource relates to a learning suggestion
 */
function resourceMatchesLearningSuggestion(resource: Resource, suggestion: any): boolean {
  const suggestionKeywords = extractKeywords(suggestion.courseTitle + ' ' + suggestion.description)
  const resourceText = (resource.title + ' ' + (resource.description || '') + ' ' + (resource.category || '')).toLowerCase()

  return suggestionKeywords.some(keyword => resourceText.includes(keyword.toLowerCase()))
}

/**
 * Extract keywords from text (simple version)
 */
function extractKeywords(text: string): string[] {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'being']
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 10) // Top 10 keywords
}

/**
 * Get library statistics
 */
async function getLibraryStats(supabase: any) {
  const [
    { count: totalPages },
    { count: totalPDFs },
    { count: totalTools },
    { count: totalEmbeddings }
  ] = await Promise.all([
    supabase.from('scraped_content').select('*', { count: 'exact', head: true }),
    supabase.from('pdf_documents').select('*', { count: 'exact', head: true }),
    supabase.from('scraped_content').select('*', { count: 'exact', head: true }).eq('content_type', 'tool'),
    supabase.from('content_embeddings').select('*', { count: 'exact', head: true })
  ])

  // Get category breakdown
  const { data: categoryBreakdown } = await supabase
    .from('scraped_content')
    .select('category')

  const categoryCounts = categoryBreakdown?.reduce((acc: any, item: any) => {
    const cat = item.category || 'Uncategorized'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {}) || {}

  return {
    totalPages: totalPages || 0,
    totalPDFs: totalPDFs || 0,
    totalTools: totalTools || 0,
    totalResources: (totalPages || 0) + (totalPDFs || 0),
    totalEmbeddings: totalEmbeddings || 0,
    searchEnabled: (totalEmbeddings || 0) > 0,
    categoryBreakdown: categoryCounts
  }
}

export const config = {
  maxDuration: 60
}
