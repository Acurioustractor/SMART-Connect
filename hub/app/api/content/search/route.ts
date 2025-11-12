import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Initialize clients
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
    throw new Error('OPENAI_API_KEY not configured')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function POST(req: Request) {
  try {
    const {
      query,
      searchType = 'semantic', // 'semantic', 'keyword', 'hybrid'
      filters = {},
      limit = 20,
      minSimilarity = 0.7
    } = await req.json()

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    switch (searchType) {
      case 'semantic':
        return await semanticSearch(query, filters, limit, minSimilarity)

      case 'keyword':
        return await keywordSearch(query, filters, limit)

      case 'hybrid':
        return await hybridSearch(query, filters, limit, minSimilarity)

      default:
        return NextResponse.json({ error: 'Invalid search type' }, { status: 400 })
    }
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

/**
 * Semantic search using vector embeddings
 */
async function semanticSearch(
  query: string,
  filters: any,
  limit: number,
  minSimilarity: number
) {
  const supabase = getSupabase()
  const openai = getOpenAI()

  console.log('Performing semantic search:', query)

  // Generate embedding for the search query
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query
  })

  const queryEmbedding = response.data[0].embedding

  // Search using the Supabase function
  const { data, error } = await supabase.rpc('search_content_by_embedding', {
    query_embedding: queryEmbedding,
    match_threshold: minSimilarity,
    match_count: limit
  })

  if (error) {
    console.error('Semantic search error:', error)
    throw error
  }

  // Enrich results with full content details
  const enrichedResults = await enrichSearchResults(supabase, data)

  // Apply additional filters
  const filteredResults = applyFilters(enrichedResults, filters)

  return NextResponse.json({
    success: true,
    query,
    searchType: 'semantic',
    results: filteredResults,
    count: filteredResults.length
  })
}

/**
 * Keyword search using full-text search
 */
async function keywordSearch(query: string, filters: any, limit: number) {
  const supabase = getSupabase()

  console.log('Performing keyword search:', query)

  // Use PostgreSQL full-text search
  let queryBuilder = supabase
    .from('scraped_content')
    .select('*')
    .textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english'
    })
    .limit(limit)

  // Apply filters
  if (filters.category) {
    queryBuilder = queryBuilder.eq('category', filters.category)
  }
  if (filters.contentType) {
    queryBuilder = queryBuilder.eq('content_type', filters.contentType)
  }
  if (filters.tags && filters.tags.length > 0) {
    queryBuilder = queryBuilder.contains('tags', filters.tags)
  }

  const { data, error } = await queryBuilder

  if (error) {
    console.error('Keyword search error:', error)
    throw error
  }

  return NextResponse.json({
    success: true,
    query,
    searchType: 'keyword',
    results: data || [],
    count: data?.length || 0
  })
}

/**
 * Hybrid search combining semantic and keyword search
 */
async function hybridSearch(
  query: string,
  filters: any,
  limit: number,
  minSimilarity: number
) {
  console.log('Performing hybrid search:', query)

  // Run both searches in parallel
  const [semanticResponse, keywordResponse] = await Promise.all([
    semanticSearch(query, filters, Math.ceil(limit * 0.7), minSimilarity),
    keywordSearch(query, filters, Math.ceil(limit * 0.3))
  ])

  const semanticResults = await semanticResponse.json()
  const keywordResults = await keywordResponse.json()

  // Merge and deduplicate results
  const mergedResults = mergeSearchResults(
    semanticResults.results || [],
    keywordResults.results || []
  )

  // Sort by combined score
  const sortedResults = mergedResults
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit)

  return NextResponse.json({
    success: true,
    query,
    searchType: 'hybrid',
    results: sortedResults,
    count: sortedResults.length,
    breakdown: {
      semantic: semanticResults.count,
      keyword: keywordResults.count,
      merged: sortedResults.length
    }
  })
}

/**
 * Enrich search results with full content details
 */
async function enrichSearchResults(supabase: any, results: any[]) {
  const enriched = []

  for (const result of results) {
    // Get full content based on whether it's a scraped page or PDF
    let fullContent = null

    if (result.content_type === 'pdf') {
      const { data: pdf } = await supabase
        .from('pdf_documents')
        .select('*')
        .eq('scraped_content_id', result.id)
        .single()

      if (pdf) {
        fullContent = {
          ...result,
          pdf: pdf,
          type: 'pdf'
        }
      }
    } else {
      const { data: content } = await supabase
        .from('scraped_content')
        .select('*')
        .eq('id', result.id)
        .single()

      if (content) {
        fullContent = {
          ...result,
          content: content,
          type: 'page'
        }
      }
    }

    if (fullContent) {
      enriched.push(fullContent)
    }
  }

  return enriched
}

/**
 * Apply additional filters to search results
 */
function applyFilters(results: any[], filters: any) {
  let filtered = results

  if (filters.category) {
    filtered = filtered.filter(r =>
      r.content?.category === filters.category ||
      r.pdf?.category === filters.category
    )
  }

  if (filters.contentType) {
    filtered = filtered.filter(r =>
      r.content?.content_type === filters.contentType ||
      r.type === filters.contentType
    )
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(r => {
      const contentTags = r.content?.tags || []
      return filters.tags.some((tag: string) => contentTags.includes(tag))
    })
  }

  if (filters.minQuality) {
    filtered = filtered.filter(r =>
      (r.content?.quality_score || 0) >= filters.minQuality ||
      (r.pdf?.quality_score || 0) >= filters.minQuality
    )
  }

  return filtered
}

/**
 * Merge results from semantic and keyword searches
 */
function mergeSearchResults(semanticResults: any[], keywordResults: any[]) {
  const merged = new Map()

  // Add semantic results with higher weight
  for (const result of semanticResults) {
    const id = result.id || result.content?.id
    if (id) {
      merged.set(id, {
        ...result,
        score: (result.similarity || 0) * 0.7,
        matchType: 'semantic'
      })
    }
  }

  // Add keyword results or boost existing ones
  for (const result of keywordResults) {
    const id = result.id || result.content?.id
    if (id) {
      if (merged.has(id)) {
        const existing = merged.get(id)
        merged.set(id, {
          ...existing,
          score: existing.score + 0.3,
          matchType: 'hybrid'
        })
      } else {
        merged.set(id, {
          ...result,
          score: 0.3,
          matchType: 'keyword'
        })
      }
    }
  }

  return Array.from(merged.values())
}

/**
 * GET endpoint for popular content and stats
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'stats'

    const supabase = getSupabase()

    switch (action) {
      case 'stats':
        return await getSearchStats(supabase)

      case 'popular':
        return await getPopularContent(supabase)

      case 'recent':
        return await getRecentContent(supabase)

      case 'categories':
        return await getCategories(supabase)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('GET error:', error)
    return NextResponse.json(
      {
        error: 'Request failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}

async function getSearchStats(supabase: any) {
  const [
    { count: totalPages },
    { count: totalPDFs },
    { count: totalEmbeddings }
  ] = await Promise.all([
    supabase.from('scraped_content').select('*', { count: 'exact', head: true }),
    supabase.from('pdf_documents').select('*', { count: 'exact', head: true }),
    supabase.from('content_embeddings').select('*', { count: 'exact', head: true })
  ])

  return NextResponse.json({
    success: true,
    stats: {
      totalPages: totalPages || 0,
      totalPDFs: totalPDFs || 0,
      totalEmbeddings: totalEmbeddings || 0,
      searchReady: (totalEmbeddings || 0) > 0
    }
  })
}

async function getPopularContent(supabase: any) {
  const { data, error } = await supabase.rpc('get_popular_content', {
    days_back: 30,
    limit_count: 10
  })

  if (error) {
    console.error('Failed to get popular content:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    popular: data || []
  })
}

async function getRecentContent(supabase: any) {
  const { data, error } = await supabase
    .from('scraped_content')
    .select('id, title, url, category, content_type, scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Failed to get recent content:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    recent: data || []
  })
}

async function getCategories(supabase: any) {
  const { data, error } = await supabase
    .from('content_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('Failed to get categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get count for each category
  const categoriesWithCounts = await Promise.all(
    (data || []).map(async (category: any) => {
      const { count } = await supabase
        .from('scraped_content')
        .select('*', { count: 'exact', head: true })
        .eq('category', category.name)

      return {
        ...category,
        contentCount: count || 0
      }
    })
  )

  return NextResponse.json({
    success: true,
    categories: categoriesWithCounts
  })
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  },
  maxDuration: 60 // 1 minute
}
