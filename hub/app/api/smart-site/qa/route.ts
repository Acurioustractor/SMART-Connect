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
 * POST /api/smart-site/qa
 * AI-powered Q&A using RAG (Retrieval Augmented Generation)
 */
export async function POST(req: Request) {
  try {
    const { question, contentIds } = await req.json()

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    const openai = getOpenAI()
    const supabase = getSupabase()

    let relevantContent: any[] = []

    if (contentIds && contentIds.length > 0) {
      // Get specific content by IDs
      const { data: specificContent } = await supabase
        .from('scraped_content')
        .select('*')
        .in('id', contentIds)

      relevantContent = specificContent || []
    } else {
      // Use semantic search to find relevant content
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: question,
      })

      const queryEmbedding = embeddingResponse.data[0].embedding

      // Search for relevant content
      const { data: searchResults } = await supabase.rpc('match_scraped_content', {
        query_embedding: queryEmbedding,
        match_threshold: 0.6,
        match_count: 5
      })

      relevantContent = searchResults || []
    }

    if (relevantContent.length === 0) {
      return NextResponse.json({
        success: true,
        answer: "I couldn't find any relevant content to answer your question. Please try rephrasing or ask about something else from the SMART Recovery Australia website.",
        sources: []
      })
    }

    // Build context from relevant content
    const context = relevantContent
      .map((item: any, idx: number) =>
        `[Source ${idx + 1}: ${item.title}]\n${item.content || item.markdown}`
      )
      .join('\n\n---\n\n')

    // Generate answer using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant answering questions about SMART Recovery Australia content.

Use ONLY the provided content to answer questions. If the answer isn't in the provided content, say so.
Be specific and cite which source you're using.
Keep answers clear, concise, and well-structured.
If relevant, mention specific tools, worksheets, or resources that might help.`
        },
        {
          role: 'user',
          content: `Context from SMART Recovery Australia website:\n\n${context}\n\nQuestion: ${question}`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    const answer = completion.choices[0].message.content || 'Unable to generate answer'

    // Format sources
    const sources = relevantContent.map((item: any) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      type: item.content_type,
      excerpt: (item.content || item.markdown || '').substring(0, 200) + '...'
    }))

    return NextResponse.json({
      success: true,
      answer,
      sources,
      question
    })

  } catch (error: any) {
    console.error('Q&A error:', error)
    return NextResponse.json(
      {
        error: 'Q&A failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Next.js 16 route segment config
export const maxDuration = 60
