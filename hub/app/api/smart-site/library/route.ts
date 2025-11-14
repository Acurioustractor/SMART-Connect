import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

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
 * Workaround for DNS resolution issues - use curl instead of fetch
 */
const querySupabaseCurl = (table: string, select = '*', orderBy?: string, limit?: number): any[] => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let apiUrl = `${url}/rest/v1/${table}?select=${select}`
  if (orderBy) apiUrl += `&order=${orderBy}`
  if (limit) apiUrl += `&limit=${limit}`

  const cmd = `curl -s "${apiUrl}" \\
    -H "apikey: ${key}" \\
    -H "Authorization: Bearer ${key}"`

  try {
    const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
    return JSON.parse(output)
  } catch (error: any) {
    console.error(`Curl error for ${table}:`, error.message)
    return []
  }
}

/**
 * GET /api/smart-site/library
 * Returns all scraped content and PDFs with optional interview insights
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const includeInsights = searchParams.get('includeInsights') === 'true'

    // Use curl workaround due to DNS issues in this environment
    const scrapedContent = querySupabaseCurl('scraped_content', '*', 'last_updated.desc', 100)
    const pdfs = querySupabaseCurl('pdf_documents', '*', 'updated_at.desc')

    // Format resources
    const resources = [
      ...(scrapedContent || []).map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        type: item.content_type as 'page' | 'pdf' | 'document',
        content: item.markdown || item.content,
        category: item.category,
        tags: item.tags,
        scrapedAt: item.scraped_at,
        wordCount: item.word_count,
        metadata: {
          description: item.meta_description,
          qualityScore: item.quality_score,
          relevanceScore: item.relevance_score
        }
      })),
      ...(pdfs || []).map(pdf => ({
        id: pdf.id,
        title: pdf.title,
        url: pdf.url,
        type: 'pdf' as const,
        description: `${pdf.category || 'PDF Document'} - ${pdf.page_count || 0} pages`,
        category: pdf.category,
        downloadedAt: pdf.created_at,
        pageCount: pdf.page_count,
        metadata: {
          toolType: pdf.tool_type,
          smartToolNumber: pdf.smart_tool_number
        }
      }))
    ]

    // Add interview insights if requested
    if (includeInsights && resources.length > 0) {
      await enrichWithInterviewInsights(resources)
    }

    return NextResponse.json({
      success: true,
      resources,
      stats: {
        totalPages: scrapedContent?.length || 0,
        totalPDFs: pdfs?.length || 0,
        total: resources.length
      }
    })

  } catch (error: any) {
    console.error('Library fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch library',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * Enrich resources with interview insights
 */
async function enrichWithInterviewInsights(resources: any[]) {
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

    // For each resource, find related insights
    for (const resource of resources) {
      const relatedInsights: any[] = []
      const resourceText = (resource.title + ' ' + (resource.description || '') + ' ' + (resource.category || '')).toLowerCase()

      for (const analysis of allAnalyses) {
        // Check facilitator challenges
        if (analysis.facilitatorInsights?.challenges) {
          for (const challenge of analysis.facilitatorInsights.challenges) {
            if (textMatches(resourceText, challenge)) {
              relatedInsights.push({
                facilitator: analysis.name,
                type: 'addresses_challenge',
                challenge
              })
            }
          }
        }

        // Check key themes
        if (analysis.keyThemes) {
          for (const theme of analysis.keyThemes) {
            if (textMatches(resourceText, theme.theme + ' ' + theme.description)) {
              relatedInsights.push({
                facilitator: analysis.name,
                type: 'theme',
                theme: theme.theme,
                description: theme.description
              })
            }
          }
        }

        // Check platform implications
        if (analysis.platformImplications) {
          for (const impl of analysis.platformImplications) {
            if (textMatches(resourceText, impl.featureIdea + ' ' + impl.insight)) {
              relatedInsights.push({
                facilitator: analysis.name,
                type: 'platform_need',
                featureIdea: impl.featureIdea,
                priority: impl.priority
              })
            }
          }
        }
      }

      if (relatedInsights.length > 0) {
        resource.interviewInsights = relatedInsights
      }
    }
  } catch (error) {
    console.error('Error enriching with insights:', error)
  }
}

/**
 * Check if resource text matches insight keywords
 */
function textMatches(resourceText: string, insightText: string): boolean {
  const getKeywords = (text: string) => {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with']
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
  }

  const resourceKeywords = getKeywords(resourceText)
  const insightKeywords = getKeywords(insightText)

  const overlap = resourceKeywords.filter(k => insightKeywords.includes(k))
  return overlap.length >= 2 // At least 2 matching keywords
}

// Next.js 16 route segment config
export const maxDuration = 60
