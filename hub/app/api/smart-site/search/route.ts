import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

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

const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/**
 * POST /api/smart-site/search
 * Semantic search using embeddings
 */
export async function POST(req: Request) {
  try {
    const { query, filters, limit = 20 } = await req.json()

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const openai = getOpenAI()
    const supabase = getSupabase()

    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Search in scraped_content table using embeddings
    let searchQuery = supabase.rpc('match_scraped_content', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: limit
    })

    // Apply filters if provided
    if (filters?.type && filters.type !== 'all') {
      searchQuery = searchQuery.eq('content_type', filters.type)
    }

    if (filters?.category && filters.category !== 'all') {
      searchQuery = searchQuery.eq('category', filters.category)
    }

    if (filters?.hasAnalysis) {
      searchQuery = searchQuery.not('analysis', 'is', null)
    }

    const { data: scrapedResults, error: scrapedError } = await searchQuery

    if (scrapedError) {
      console.error('Scraped content search error:', scrapedError)
    }

    // Also search PDFs
    const { data: pdfResults, error: pdfError } = await supabase.rpc('match_pdf_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: Math.floor(limit / 3) // Get fewer PDFs
    })

    if (pdfError) {
      console.error('PDF search error:', pdfError)
    }

    // Combine and format results
    const results = [
      ...(scrapedResults || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        type: item.content_type,
        content: item.markdown || item.content,
        excerpt: item.content?.substring(0, 300) + '...',
        category: item.category,
        tags: item.tags,
        scrapedAt: item.scraped_at,
        wordCount: item.word_count,
        similarity: item.similarity,
        metadata: {
          description: item.meta_description,
          qualityScore: item.quality_score,
          relevanceScore: item.relevance_score
        }
      })),
      ...(pdfResults || []).map((pdf: any) => ({
        id: pdf.id,
        title: pdf.title,
        url: pdf.url,
        type: 'pdf',
        description: `${pdf.category || 'PDF Document'} - ${pdf.page_count || 0} pages`,
        category: pdf.category,
        pageCount: pdf.page_count,
        similarity: pdf.similarity,
        metadata: {
          toolType: pdf.tool_type,
          smartToolNumber: pdf.smart_tool_number
        }
      }))
    ]

    // Sort by similarity
    results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

    return NextResponse.json({
      success: true,
      query,
      results: results.slice(0, limit),
      count: results.length
    })

  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}

export const config = {
  maxDuration: 30
}
