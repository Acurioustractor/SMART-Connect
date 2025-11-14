import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
 * GET /api/smart-site/related?contentId=xxx
 * Find related content using embeddings
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const contentId = searchParams.get('contentId')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!contentId) {
      return NextResponse.json(
        { error: 'contentId is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Get the content's embedding
    const { data: content } = await supabase
      .from('scraped_content')
      .select('embedding')
      .eq('id', contentId)
      .single()

    if (!content || !content.embedding) {
      return NextResponse.json({
        success: true,
        related: []
      })
    }

    // Find similar content
    const { data: relatedContent } = await supabase.rpc('match_scraped_content', {
      query_embedding: content.embedding,
      match_threshold: 0.7,
      match_count: limit + 1 // +1 because the content itself will be included
    })

    // Filter out the original content
    const filtered = (relatedContent || [])
      .filter((item: any) => item.id !== contentId)
      .slice(0, limit)

    const results = filtered.map((item: any) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      type: item.content_type,
      category: item.category,
      excerpt: (item.content || item.markdown || '').substring(0, 200) + '...',
      similarity: item.similarity
    }))

    return NextResponse.json({
      success: true,
      related: results
    })

  } catch (error: any) {
    console.error('Related content error:', error)
    return NextResponse.json(
      {
        error: 'Failed to find related content',
        details: error.message
      },
      { status: 500 }
    )
  }
}

export const config = {
  maxDuration: 30
}
