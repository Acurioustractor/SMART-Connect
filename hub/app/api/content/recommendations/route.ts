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

/**
 * GET recommendations based on context
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const recommendationType = searchParams.get('type')
    const userId = searchParams.get('userId')
    const context = searchParams.get('context') // 'interview_analysis', 'facilitator_challenge', etc.
    const limit = parseInt(searchParams.get('limit') || '10')

    const supabase = getSupabase()

    // Get active recommendations
    let query = supabase
      .from('content_recommendations')
      .select(`
        *,
        scraped_content:scraped_content_id(*),
        pdf_document:pdf_document_id(*)
      `)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by type if specified
    if (recommendationType) {
      query = query.eq('recommendation_type', recommendationType)
    }

    const { data: recommendations, error } = await query

    if (error) {
      console.error('Failed to fetch recommendations:', error)
      throw error
    }

    // Track view if userId provided
    if (userId && recommendations) {
      await trackRecommendationViews(supabase, recommendations.map(r => r.id), userId)
    }

    return NextResponse.json({
      success: true,
      recommendations: recommendations || [],
      count: recommendations?.length || 0
    })
  } catch (error: any) {
    console.error('Recommendations GET error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get recommendations',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Generate personalized recommendations or create new ones
 */
export async function POST(req: Request) {
  try {
    const { action, ...params } = await req.json()

    switch (action) {
      case 'generate_from_interview':
        return await generateRecommendationsFromInterview(params)

      case 'generate_from_insights':
        return await generateRecommendationsFromInsights(params)

      case 'generate_personalized':
        return await generatePersonalizedRecommendations(params)

      case 'create_manual':
        return await createManualRecommendation(params)

      case 'track_interaction':
        return await trackRecommendationInteraction(params)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Recommendations POST error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process recommendation request',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * Generate recommendations based on interview analysis
 */
async function generateRecommendationsFromInterview(params: any) {
  const { interviewId, analysisId } = params
  const supabase = getSupabase()
  const openai = getOpenAI()

  // Get interview analysis
  const { data: analysis, error: analysisError } = await supabase
    .from('interview_analysis')
    .select('*')
    .eq('id', analysisId)
    .single()

  if (analysisError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  }

  const themes = analysis.themes || []
  const facilitatorInsights = analysis.facilitator_insights || {}
  const challenges = facilitatorInsights.challenges || []

  // Find relevant content for each challenge and theme
  const recommendations = []

  for (const challenge of challenges) {
    // Search for content that addresses this challenge
    const relevantContent = await findContentForChallenge(supabase, openai, challenge)

    for (const content of relevantContent) {
      recommendations.push({
        scraped_content_id: content.id,
        recommendation_type: 'facilitator_support',
        title: content.title,
        description: `This resource addresses: ${challenge}`,
        reason: `Based on challenges identified in facilitator interview analysis`,
        confidence_score: content.similarity || 0.8,
        target_audience: ['facilitators'],
        relevant_themes: [challenge],
        related_interview_ids: [interviewId],
        based_on_facilitator_feedback: true,
        is_active: true,
        priority: 8
      })
    }
  }

  // Store recommendations
  if (recommendations.length > 0) {
    const { data, error } = await supabase
      .from('content_recommendations')
      .insert(recommendations)
      .select()

    if (error) {
      console.error('Failed to store recommendations:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      generated: data.length,
      recommendations: data
    })
  }

  return NextResponse.json({
    success: true,
    generated: 0,
    message: 'No relevant content found for challenges'
  })
}

/**
 * Generate recommendations based on facilitator insights
 */
async function generateRecommendationsFromInsights(params: any) {
  const { insightIds } = params
  const supabase = getSupabase()
  const openai = getOpenAI()

  // Get insights
  const { data: insights, error: insightsError } = await supabase
    .from('facilitator_insights')
    .select('*')
    .in('id', insightIds)

  if (insightsError || !insights) {
    return NextResponse.json({ error: 'Insights not found' }, { status: 404 })
  }

  const recommendations = []

  for (const insight of insights) {
    let relevantContent = []

    switch (insight.insight_type) {
      case 'challenge':
        relevantContent = await findContentForChallenge(
          supabase,
          openai,
          insight.description
        )
        break

      case 'tool_gap':
        relevantContent = await findSimilarTools(
          supabase,
          openai,
          insight.description
        )
        break

      case 'training_need':
        relevantContent = await findTrainingMaterials(
          supabase,
          insight.description
        )
        break

      case 'best_practice':
        relevantContent = await findRelatedBestPractices(
          supabase,
          openai,
          insight.description
        )
        break
    }

    for (const content of relevantContent.slice(0, 3)) {
      const recType = determineRecommendationType(insight.insight_type, content)

      recommendations.push({
        scraped_content_id: content.id,
        recommendation_type: recType,
        title: content.title,
        description: `Addresses insight: ${insight.title}`,
        reason: `Based on ${insight.insight_type} identified from facilitator feedback`,
        confidence_score: content.similarity || 0.75,
        target_audience: determineAudience(insight),
        relevant_themes: insight.themes || [],
        based_on_facilitator_feedback: true,
        is_active: true,
        priority: insight.urgency_level === 'high' ? 9 : 7
      })
    }

    // Update insight with generated recommendations
    if (recommendations.length > 0) {
      const recIds = recommendations.map(r => r.scraped_content_id)
      await supabase
        .from('facilitator_insights')
        .update({
          generated_recommendations: recIds,
          suggested_content: recIds
        })
        .eq('id', insight.id)
    }
  }

  // Store recommendations
  if (recommendations.length > 0) {
    const { data, error } = await supabase
      .from('content_recommendations')
      .insert(recommendations)
      .select()

    if (error) {
      console.error('Failed to store recommendations:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      generated: data.length,
      recommendations: data
    })
  }

  return NextResponse.json({
    success: true,
    generated: 0,
    message: 'No relevant content found'
  })
}

/**
 * Generate personalized recommendations for a user
 */
async function generatePersonalizedRecommendations(params: any) {
  const { userId, interests, role = 'facilitator', limit = 10 } = params
  const supabase = getSupabase()
  const openai = getOpenAI()

  // Get user's content usage history
  const { data: usageHistory } = await supabase
    .from('content_usage')
    .select('scraped_content_id, pdf_document_id, action_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Build user profile
  const viewedContentIds = usageHistory
    ?.filter(u => u.action_type === 'view')
    .map(u => u.scraped_content_id || u.pdf_document_id)
    .filter(Boolean) || []

  const savedContentIds = usageHistory
    ?.filter(u => u.action_type === 'save')
    .map(u => u.scraped_content_id || u.pdf_document_id)
    .filter(Boolean) || []

  // Get content user has engaged with
  let userInterests = interests || []

  if (viewedContentIds.length > 0) {
    const { data: viewedContent } = await supabase
      .from('scraped_content')
      .select('tags, category')
      .in('id', viewedContentIds)

    // Extract common themes
    const allTags = viewedContent?.flatMap(c => c.tags || []) || []
    const tagFrequency = allTags.reduce((acc: any, tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1
      return acc
    }, {})

    const topTags = Object.entries(tagFrequency)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([tag]) => tag)

    userInterests = [...new Set([...userInterests, ...topTags])]
  }

  // Find recommendations based on interests
  let query = supabase
    .from('scraped_content')
    .select('*')
    .gte('quality_score', 0.6)

  // Exclude already viewed content
  if (viewedContentIds.length > 0) {
    query = query.not('id', 'in', `(${viewedContentIds.join(',')})`)
  }

  // Filter by role
  if (role === 'facilitator') {
    query = query.in('category', [
      'Facilitator Resources',
      'Tools & Worksheets',
      'Training Materials',
      'Meeting Resources',
      'Cultural Safety',
      'Self-Care'
    ])
  }

  const { data: candidates } = await query.limit(100)

  // Score and rank candidates
  const scoredCandidates = (candidates || []).map(content => {
    let score = content.quality_score || 0

    // Boost based on matching interests
    const matchingTags = (content.tags || []).filter((tag: string) =>
      userInterests.includes(tag)
    ).length
    score += matchingTags * 0.1

    // Boost based on relevance
    score += content.relevance_score || 0

    return { ...content, personalization_score: score }
  })

  // Sort by score and take top N
  const topRecommendations = scoredCandidates
    .sort((a, b) => b.personalization_score - a.personalization_score)
    .slice(0, limit)

  // Create recommendation records
  const recommendations = topRecommendations.map(content => ({
    scraped_content_id: content.id,
    recommendation_type: 'similar_content',
    title: content.title,
    description: content.meta_description || `Personalized recommendation for ${role}`,
    reason: `Based on your interests: ${userInterests.slice(0, 3).join(', ')}`,
    confidence_score: content.personalization_score,
    target_audience: [role],
    relevant_themes: userInterests,
    is_active: true,
    priority: 6
  }))

  // Store recommendations
  if (recommendations.length > 0) {
    const { data, error } = await supabase
      .from('content_recommendations')
      .insert(recommendations)
      .select()

    if (error) {
      console.error('Failed to store personalized recommendations:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      generated: data.length,
      recommendations: data,
      userProfile: {
        interests: userInterests,
        viewedCount: viewedContentIds.length,
        savedCount: savedContentIds.length
      }
    })
  }

  return NextResponse.json({
    success: true,
    generated: 0,
    message: 'No personalized recommendations available'
  })
}

/**
 * Create a manual recommendation
 */
async function createManualRecommendation(params: any) {
  const supabase = getSupabase()

  const {
    contentId,
    contentType = 'page',
    recommendationType,
    title,
    description,
    reason,
    targetAudience = ['all'],
    relevantThemes = [],
    priority = 5
  } = params

  const recommendation = {
    [contentType === 'page' ? 'scraped_content_id' : 'pdf_document_id']: contentId,
    recommendation_type: recommendationType,
    title,
    description,
    reason,
    confidence_score: 1.0,
    target_audience: targetAudience,
    relevant_themes: relevantThemes,
    is_active: true,
    priority
  }

  const { data, error } = await supabase
    .from('content_recommendations')
    .insert(recommendation)
    .select()
    .single()

  if (error) {
    console.error('Failed to create recommendation:', error)
    throw error
  }

  return NextResponse.json({
    success: true,
    recommendation: data
  })
}

/**
 * Track recommendation interaction (click, save, dismiss)
 */
async function trackRecommendationInteraction(params: any) {
  const { recommendationId, userId, interactionType } = params
  const supabase = getSupabase()

  // Update recommendation counters
  const updateField = `${interactionType}_count`

  await supabase.rpc('increment', {
    table_name: 'content_recommendations',
    row_id: recommendationId,
    field_name: updateField
  })

  // Track in content_usage if it's a click
  if (interactionType === 'click') {
    const { data: recommendation } = await supabase
      .from('content_recommendations')
      .select('scraped_content_id, pdf_document_id')
      .eq('id', recommendationId)
      .single()

    if (recommendation) {
      await supabase.from('content_usage').insert({
        user_id: userId,
        scraped_content_id: recommendation.scraped_content_id,
        pdf_document_id: recommendation.pdf_document_id,
        recommendation_id: recommendationId,
        action_type: 'click'
      })
    }
  }

  return NextResponse.json({
    success: true,
    message: `Tracked ${interactionType} interaction`
  })
}

// ======================
// HELPER FUNCTIONS
// ======================

async function trackRecommendationViews(
  supabase: any,
  recommendationIds: string[],
  userId: string
) {
  for (const recId of recommendationIds) {
    await supabase
      .from('content_recommendations')
      .update({
        view_count: supabase.raw('view_count + 1')
      })
      .eq('id', recId)
  }
}

async function findContentForChallenge(
  supabase: any,
  openai: OpenAI,
  challenge: string
) {
  // Generate embedding for the challenge
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: challenge
  })

  const embedding = response.data[0].embedding

  // Search for relevant content
  const { data } = await supabase.rpc('search_content_by_embedding', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5
  })

  return data || []
}

async function findSimilarTools(supabase: any, openai: OpenAI, description: string) {
  // Search for tools that might fill the gap
  const { data } = await supabase
    .from('scraped_content')
    .select('*')
    .eq('content_type', 'tool')
    .gte('quality_score', 0.6)
    .limit(5)

  return data || []
}

async function findTrainingMaterials(supabase: any, topic: string) {
  const { data } = await supabase
    .from('scraped_content')
    .select('*')
    .eq('category', 'Training Materials')
    .gte('quality_score', 0.6)
    .limit(5)

  return data || []
}

async function findRelatedBestPractices(
  supabase: any,
  openai: OpenAI,
  practice: string
) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: practice
  })

  const embedding = response.data[0].embedding

  const { data } = await supabase.rpc('search_content_by_embedding', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5
  })

  return data || []
}

function determineRecommendationType(insightType: string, content: any): string {
  const typeMap: Record<string, string> = {
    challenge: 'facilitator_support',
    tool_gap: 'missing_tool',
    training_need: 'training_material',
    best_practice: 'similar_content'
  }

  return typeMap[insightType] || 'similar_content'
}

function determineAudience(insight: any): string[] {
  const text = (insight.title + ' ' + insight.description).toLowerCase()

  if (text.includes('facilitator')) return ['facilitators']
  if (text.includes('coordinator')) return ['coordinators']
  if (text.includes('participant')) return ['participants']

  return ['all']
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  },
  maxDuration: 60 // 1 minute
}
