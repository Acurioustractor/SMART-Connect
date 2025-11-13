import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

/**
 * Enhanced Recommendation API
 *
 * Provides intelligent, context-aware recommendations using:
 * - Multi-strategy search (semantic + keyword + graph)
 * - Conversation history analysis
 * - Similar past interactions
 * - Content relationships
 * - Facilitator insights matching
 *
 * POST /api/recommendations/enhanced
 * {
 *   "query": "How do I prevent facilitator burnout?",
 *   "conversationId": "uuid",
 *   "userId": "uuid",
 *   "context": {
 *     "role": "facilitator",
 *     "experience_level": "beginner",
 *     "preferences": ["practical", "quick-read"]
 *   }
 * }
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

interface RecommendationRequest {
  query: string
  conversationId?: string
  userId?: string
  context?: {
    role?: string
    experience_level?: string
    preferences?: string[]
    previous_topics?: string[]
  }
  strategy?: 'semantic' | 'hybrid' | 'graph' | 'all'
  limit?: number
}

interface EnrichedRecommendation {
  id: string
  type: 'page' | 'pdf' | 'insight' | 'learning_path'
  title: string
  description: string
  url?: string
  relevance_score: number
  reasons: string[]
  metadata: {
    category?: string
    tags?: string[]
    reading_time?: number
    difficulty?: string
  }
  relationships?: {
    type: string
    related_content: string[]
  }
  source: 'semantic' | 'graph' | 'past_success' | 'insight' | 'trending'
}

export async function POST(req: Request) {
  try {
    const body: RecommendationRequest = await req.json()
    const {
      query,
      conversationId,
      userId,
      context = {},
      strategy = 'all',
      limit = 10
    } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Enhanced recommendation request: "${query}"`)

    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(query)

    // 2. Multi-strategy search
    const recommendations: EnrichedRecommendation[] = []

    if (strategy === 'semantic' || strategy === 'all') {
      const semanticResults = await semanticSearch(queryEmbedding, query, limit)
      recommendations.push(...semanticResults)
    }

    if (strategy === 'graph' || strategy === 'all') {
      const graphResults = await graphSearch(query, context, limit)
      recommendations.push(...graphResults)
    }

    if (strategy === 'all' && conversationId) {
      // 3. Check similar past conversations
      const pastSuccesses = await findSimilarConversations(queryEmbedding, conversationId, limit)
      recommendations.push(...pastSuccesses)
    }

    if (strategy === 'all') {
      // 4. Match with facilitator insights
      const insightMatches = await matchInsights(query, queryEmbedding, limit)
      recommendations.push(...insightMatches)
    }

    // 5. Deduplicate and rank
    const rankedRecommendations = rankAndDeduplicate(recommendations, context)

    // 6. Enhance with relationships
    const enrichedRecommendations = await enrichWithRelationships(
      rankedRecommendations.slice(0, limit)
    )

    // 7. Track this query for future learning
    if (conversationId) {
      await trackConversationTopic(conversationId, query, queryEmbedding, enrichedRecommendations)
    }

    return NextResponse.json({
      success: true,
      query,
      recommendations: enrichedRecommendations,
      total_found: enrichedRecommendations.length,
      strategies_used: strategy === 'all' ? ['semantic', 'graph', 'past_success', 'insight'] : [strategy]
    })

  } catch (error: any) {
    console.error('Enhanced recommendation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

// ============================================
// STRATEGY 1: SEMANTIC SEARCH
// ============================================

async function semanticSearch(
  queryEmbedding: number[],
  query: string,
  limit: number
): Promise<EnrichedRecommendation[]> {
  console.log('  📊 Running semantic search...')

  // Search across content embeddings
  const { data: results, error } = await supabase.rpc('search_content_by_embedding', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit * 2 // Get more for ranking
  })

  if (error) {
    console.error('Semantic search error:', error)
    return []
  }

  if (!results || results.length === 0) {
    console.log('  ℹ️  No semantic matches found')
    return []
  }

  // Get full content details
  const contentIds = [...new Set(results.map((r: any) => r.id))]

  const { data: contentDetails } = await supabase
    .from('scraped_content')
    .select('id, title, url, category, tags, meta_description, reading_time_minutes, quality_score')
    .in('id', contentIds)

  const contentMap = new Map(contentDetails?.map(c => [c.id, c]))

  return results
    .filter((r: any) => contentMap.has(r.id))
    .map((r: any) => {
      const content = contentMap.get(r.id)!
      return {
        id: content.id,
        type: 'page' as const,
        title: content.title,
        description: content.meta_description || '',
        url: content.url,
        relevance_score: r.similarity,
        reasons: [
          `${Math.round(r.similarity * 100)}% semantic match`,
          'Content directly addresses your query'
        ],
        metadata: {
          category: content.category,
          tags: content.tags,
          reading_time: content.reading_time_minutes,
          difficulty: inferDifficulty(content.quality_score, content.tags)
        },
        source: 'semantic' as const
      }
    })
}

// ============================================
// STRATEGY 2: KNOWLEDGE GRAPH SEARCH
// ============================================

async function graphSearch(
  query: string,
  context: any,
  limit: number
): Promise<EnrichedRecommendation[]> {
  console.log('  🕸️  Running knowledge graph search...')

  // Extract themes/concepts from query
  const themes = await extractThemes(query)

  if (themes.length === 0) {
    return []
  }

  // Find content matching these themes
  const { data: themeContent } = await supabase
    .from('scraped_content')
    .select('id, title, url, category, tags, meta_description, reading_time_minutes, quality_score')
    .overlaps('tags', themes)
    .gte('quality_score', 0.6)
    .limit(limit)

  if (!themeContent || themeContent.length === 0) {
    return []
  }

  // Check if there are relationships
  const contentIds = themeContent.map(c => c.id)

  const { data: relationships } = await supabase
    .from('content_relationships')
    .select('*')
    .in('source_content_id', contentIds)
    .gte('relationship_strength', 0.6)

  return themeContent.map(content => ({
    id: content.id,
    type: 'page' as const,
    title: content.title,
    description: content.meta_description || '',
    url: content.url,
    relevance_score: content.quality_score,
    reasons: [
      `Matches themes: ${themes.filter(t => content.tags?.includes(t)).join(', ')}`,
      relationships?.find(r => r.source_content_id === content.id)
        ? 'Part of connected knowledge graph'
        : 'Relevant content'
    ],
    metadata: {
      category: content.category,
      tags: content.tags,
      reading_time: content.reading_time_minutes,
      difficulty: inferDifficulty(content.quality_score, content.tags)
    },
    source: 'graph' as const
  }))
}

// ============================================
// STRATEGY 3: SIMILAR PAST CONVERSATIONS
// ============================================

async function findSimilarConversations(
  queryEmbedding: number[],
  currentConversationId: string,
  limit: number
): Promise<EnrichedRecommendation[]> {
  console.log('  💬 Checking similar past conversations...')

  // Check if conversation_topics table exists
  const { data: existingTopics } = await supabase
    .from('conversation_topics')
    .select('id')
    .limit(1)

  if (!existingTopics) {
    // Table doesn't exist yet
    return []
  }

  // Find similar topics from past conversations
  const { data: similarTopics } = await supabase.rpc('find_similar_conversation_topics', {
    query_embedding: queryEmbedding,
    current_conversation_id: currentConversationId,
    limit: 5
  }).catch(() => ({ data: null }))

  if (!similarTopics || similarTopics.length === 0) {
    return []
  }

  // Get content that was helpful in those conversations
  const helpfulContentIds = similarTopics
    .filter((t: any) => t.was_helpful)
    .flatMap((t: any) => t.accessed_content_ids || [])

  if (helpfulContentIds.length === 0) {
    return []
  }

  const { data: helpfulContent } = await supabase
    .from('scraped_content')
    .select('id, title, url, category, tags, meta_description, reading_time_minutes, quality_score')
    .in('id', helpfulContentIds)
    .limit(limit)

  if (!helpfulContent) {
    return []
  }

  return helpfulContent.map(content => ({
    id: content.id,
    type: 'page' as const,
    title: content.title,
    description: content.meta_description || '',
    url: content.url,
    relevance_score: 0.9, // High confidence - worked before
    reasons: [
      'This helped others with similar questions',
      'Based on successful past interactions'
    ],
    metadata: {
      category: content.category,
      tags: content.tags,
      reading_time: content.reading_time_minutes,
      difficulty: inferDifficulty(content.quality_score, content.tags)
    },
    source: 'past_success' as const
  }))
}

// ============================================
// STRATEGY 4: FACILITATOR INSIGHTS MATCHING
// ============================================

async function matchInsights(
  query: string,
  queryEmbedding: number[],
  limit: number
): Promise<EnrichedRecommendation[]> {
  console.log('  💡 Matching facilitator insights...')

  // Search for relevant insights
  const { data: insights } = await supabase
    .from('facilitator_insights')
    .select('id, title, description, insight_type, suggested_content, urgency_level')
    .textSearch('title', query, { type: 'websearch' })
    .limit(limit)

  if (!insights || insights.length === 0) {
    return []
  }

  const recommendations: EnrichedRecommendation[] = []

  for (const insight of insights) {
    // Add the insight itself as a recommendation
    recommendations.push({
      id: insight.id,
      type: 'insight' as const,
      title: insight.title,
      description: insight.description,
      relevance_score: 0.85,
      reasons: [
        `${insight.insight_type}: ${insight.urgency_level} priority`,
        'Based on facilitator feedback and needs'
      ],
      metadata: {
        category: insight.insight_type,
        difficulty: insight.urgency_level === 'high' ? 'important' : 'useful'
      },
      source: 'insight' as const
    })

    // Add suggested content from this insight
    if (insight.suggested_content && insight.suggested_content.length > 0) {
      const { data: suggestedContent } = await supabase
        .from('scraped_content')
        .select('id, title, url, category, tags, meta_description, reading_time_minutes, quality_score')
        .in('id', insight.suggested_content)

      if (suggestedContent) {
        recommendations.push(...suggestedContent.map(content => ({
          id: content.id,
          type: 'page' as const,
          title: content.title,
          description: content.meta_description || '',
          url: content.url,
          relevance_score: 0.8,
          reasons: [
            `Addresses: ${insight.title}`,
            'Recommended based on facilitator needs'
          ],
          metadata: {
            category: content.category,
            tags: content.tags,
            reading_time: content.reading_time_minutes,
            difficulty: inferDifficulty(content.quality_score, content.tags)
          },
          source: 'insight' as const
        })))
      }
    }
  }

  return recommendations
}

// ============================================
// RANKING & DEDUPLICATION
// ============================================

function rankAndDeduplicate(
  recommendations: EnrichedRecommendation[],
  context: any
): EnrichedRecommendation[] {
  // Remove duplicates
  const seen = new Set<string>()
  const unique = recommendations.filter(rec => {
    if (seen.has(rec.id)) return false
    seen.add(rec.id)
    return true
  })

  // Score each recommendation
  const scored = unique.map(rec => {
    let score = rec.relevance_score

    // Boost based on source
    if (rec.source === 'past_success') score *= 1.3
    if (rec.source === 'insight') score *= 1.2
    if (rec.source === 'semantic') score *= 1.1

    // Boost based on user context
    if (context.role === 'facilitator') {
      if (rec.metadata.category?.includes('facilitator')) score *= 1.2
    }

    if (context.experience_level === 'beginner') {
      if (rec.metadata.difficulty === 'beginner') score *= 1.15
    }

    if (context.preferences?.includes('quick-read')) {
      if (rec.metadata.reading_time && rec.metadata.reading_time <= 5) score *= 1.1
    }

    return { ...rec, final_score: score }
  })

  // Sort by final score
  return scored.sort((a, b) => b.final_score - a.final_score)
}

// ============================================
// RELATIONSHIP ENRICHMENT
// ============================================

async function enrichWithRelationships(
  recommendations: EnrichedRecommendation[]
): Promise<EnrichedRecommendation[]> {
  const contentIds = recommendations
    .filter(r => r.type === 'page')
    .map(r => r.id)

  if (contentIds.length === 0) {
    return recommendations
  }

  // Get relationships for these content items
  const { data: relationships } = await supabase
    .from('content_relationships')
    .select('source_content_id, target_content_id, relationship_type, target:target_content_id(title)')
    .in('source_content_id', contentIds)
    .gte('relationship_strength', 0.7)
    .limit(50)

  if (!relationships || relationships.length === 0) {
    return recommendations
  }

  // Group by source
  const relationshipMap = new Map<string, any[]>()
  for (const rel of relationships) {
    const existing = relationshipMap.get(rel.source_content_id) || []
    existing.push(rel)
    relationshipMap.set(rel.source_content_id, existing)
  }

  // Add relationships to recommendations
  return recommendations.map(rec => {
    const rels = relationshipMap.get(rec.id) || []
    if (rels.length > 0) {
      return {
        ...rec,
        relationships: {
          type: 'content_graph',
          related_content: rels.map(r => ({
            id: r.target_content_id,
            title: r.target?.title || 'Related content',
            relationship: r.relationship_type
          }))
        }
      }
    }
    return rec
  })
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  })
  return response.data[0].embedding
}

async function extractThemes(query: string): Promise<string[]> {
  // Simple keyword extraction for now
  const keywords = [
    'CBA', 'cost-benefit', 'hierarchy-of-values', 'ABC', 'change-plan',
    'SMART-goals', 'burnout', 'cultural-safety', 'online-meetings',
    'facilitator', 'participant', 'training', 'self-care'
  ]

  const lowerQuery = query.toLowerCase()
  return keywords.filter(k => lowerQuery.includes(k.toLowerCase()))
}

function inferDifficulty(qualityScore: number, tags?: string[]): string {
  if (tags?.includes('training') || tags?.includes('advanced')) {
    return 'advanced'
  }
  if (tags?.includes('beginner') || tags?.includes('introduction')) {
    return 'beginner'
  }
  return qualityScore > 0.8 ? 'intermediate' : 'beginner'
}

async function trackConversationTopic(
  conversationId: string,
  query: string,
  embedding: number[],
  recommendations: EnrichedRecommendation[]
) {
  // Try to insert into conversation_topics if table exists
  await supabase
    .from('conversation_topics')
    .insert({
      conversation_id: conversationId,
      topic_name: query.slice(0, 200),
      topic_category: 'question',
      topic_embedding: embedding,
      suggested_content_ids: recommendations.slice(0, 5).map(r => r.id),
      metadata: {
        timestamp: new Date().toISOString(),
        strategies_used: [...new Set(recommendations.map(r => r.source))]
      }
    })
    .catch(() => {
      // Table might not exist yet, that's okay
    })
}
