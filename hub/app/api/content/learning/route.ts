import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Learning API - Automated improvement system
 * Analyzes engagement patterns and updates recommendation weights
 */
export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'analyze_engagement':
        return await analyzeEngagementPatterns();
      case 'update_weights':
        return await updateRecommendationWeights();
      case 'detect_patterns':
        return await detectSuccessPatterns();
      case 'audit_quality':
        return await auditContentQuality();
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Learning API error:', error);
    return NextResponse.json(
      { error: 'Failed to execute learning action', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Analyze engagement patterns across all content
 * Identifies high-performers and common success factors
 */
async function analyzeEngagementPatterns() {
  console.log('📊 Analyzing engagement patterns...');

  // Get content performance data
  const { data: performance, error } = await supabase
    .from('content_performance')
    .select('*')
    .order('engagement_rate', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch performance data: ${error.message}`);
  }

  if (!performance || performance.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No performance data available yet',
      patterns: []
    });
  }

  // Separate high and low performers
  const highPerformers = performance.filter(p => (p.engagement_rate || 0) > 0.3);
  const lowPerformers = performance.filter(p => (p.engagement_rate || 0) < 0.05 && (p.view_count || 0) > 10);

  // Analyze with GPT-4
  const analysis = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{
      role: 'system',
      content: `You are analyzing content engagement patterns for a SMART Recovery facilitator platform.

Your task:
1. Identify common characteristics in high-performing content (topics, format, length, tags)
2. Identify what's missing or wrong in low-performing content
3. Provide 3-5 specific, actionable recommendations for improving recommendations

Return your analysis in JSON format:
{
  "high_performer_patterns": ["pattern 1", "pattern 2", ...],
  "low_performer_issues": ["issue 1", "issue 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "confidence": 0.8
}`
    }, {
      role: 'user',
      content: `High Performers (${highPerformers.length} items):
${JSON.stringify(highPerformers.slice(0, 10).map(p => ({
  title: p.title,
  category: p.category,
  tags: p.tags,
  engagement_rate: p.engagement_rate,
  avg_time_spent: p.avg_time_spent
})), null, 2)}

Low Performers (${lowPerformers.length} items):
${JSON.stringify(lowPerformers.slice(0, 10).map(p => ({
  title: p.title,
  category: p.category,
  tags: p.tags,
  engagement_rate: p.engagement_rate,
  view_count: p.view_count
})), null, 2)}`
    }],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const patterns = JSON.parse(analysis.choices[0].message.content || '{}');

  // Store learned patterns
  const { error: insertError } = await supabase
    .from('learned_patterns')
    .insert({
      pattern_type: 'engagement_analysis',
      analysis: patterns,
      confidence: patterns.confidence || 0.7,
      sample_size: performance.length,
      high_performers_count: highPerformers.length,
      low_performers_count: lowPerformers.length
    });

  if (insertError) {
    console.warn('Failed to store patterns:', insertError);
  }

  return NextResponse.json({
    success: true,
    patterns,
    stats: {
      total_content: performance.length,
      high_performers: highPerformers.length,
      low_performers: lowPerformers.length
    }
  });
}

/**
 * Update recommendation weights based on engagement data
 * Boosts high-performers, reduces low-performers
 */
async function updateRecommendationWeights() {
  console.log('⚖️ Updating recommendation weights...');

  // Execute SQL function to update weights
  const { data, error } = await supabase.rpc('update_recommendation_weights');

  if (error) {
    // Function might not exist yet, do manual update
    console.log('SQL function not found, doing manual update...');

    // Boost high-performing recommendations
    const { data: boosted, error: boostError } = await supabase
      .from('content_recommendations')
      .select('id, view_count, click_count, confidence_score')
      .gt('view_count', 0);

    if (boostError) {
      throw new Error(`Failed to fetch recommendations: ${boostError.message}`);
    }

    let boostedCount = 0;
    let reducedCount = 0;

    for (const rec of boosted || []) {
      const ctr = rec.click_count / rec.view_count;
      let newConfidence = rec.confidence_score;

      if (ctr > 0.2) {
        // High performer - boost confidence
        newConfidence = Math.min(1.0, rec.confidence_score * 1.1);
        boostedCount++;
      } else if (ctr < 0.05 && rec.view_count > 10) {
        // Low performer - reduce confidence
        newConfidence = Math.max(0.1, rec.confidence_score * 0.9);
        reducedCount++;
      } else {
        continue; // No change
      }

      await supabase
        .from('content_recommendations')
        .update({ confidence_score: newConfidence })
        .eq('id', rec.id);
    }

    return NextResponse.json({
      success: true,
      boosted: boostedCount,
      reduced: reducedCount,
      message: `Updated ${boostedCount + reducedCount} recommendation weights`
    });
  }

  return NextResponse.json({
    success: true,
    data,
    message: 'Weights updated via SQL function'
  });
}

/**
 * Detect patterns in successful recommendations
 * Machine learning for what works
 */
async function detectSuccessPatterns() {
  console.log('🎯 Detecting success patterns...');

  // Get successful recommendations (clicked + saved)
  const { data: successful, error } = await supabase
    .from('content_recommendations')
    .select(`
      *,
      scraped_content (
        title,
        description,
        category,
        tags,
        quality_score,
        relevance_score
      )
    `)
    .gt('click_count', 0)
    .gt('save_count', 0)
    .order('click_count', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch successful recommendations: ${error.message}`);
  }

  if (!successful || successful.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Not enough success data yet',
      patterns: []
    });
  }

  // Analyze success patterns
  const analysis = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{
      role: 'system',
      content: `Analyze these successful recommendations and extract patterns.

Focus on:
1. What types of content get clicked AND saved? (highest intent)
2. What recommendation types work best? (facilitator_support, tool_suggestion, etc.)
3. What content characteristics correlate with success? (length, format, topics)
4. What recommendation reasons resonate? (analyze the 'reason' field)

Return JSON:
{
  "content_patterns": ["pattern 1", ...],
  "recommendation_patterns": ["pattern 1", ...],
  "reason_patterns": ["pattern 1", ...],
  "actionable_insights": ["insight 1", ...],
  "confidence": 0.85
}`
    }, {
      role: 'user',
      content: JSON.stringify(successful.slice(0, 50).map(s => ({
        type: s.type,
        reason: s.reason,
        priority: s.priority,
        confidence: s.confidence_score,
        click_count: s.click_count,
        save_count: s.save_count,
        content: {
          title: s.scraped_content?.title,
          category: s.scraped_content?.category,
          tags: s.scraped_content?.tags,
          quality: s.scraped_content?.quality_score
        }
      })), null, 2)
    }],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const patterns = JSON.parse(analysis.choices[0].message.content || '{}');

  // Store patterns
  await supabase.from('learned_patterns').insert({
    pattern_type: 'success_patterns',
    analysis: patterns,
    confidence: patterns.confidence || 0.8,
    sample_size: successful.length
  });

  return NextResponse.json({
    success: true,
    patterns,
    sample_size: successful.length
  });
}

/**
 * Audit content quality and flag issues
 */
async function auditContentQuality() {
  console.log('🔍 Auditing content quality...');

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Find stale content that's still being viewed
  const { data: staleContent, error } = await supabase
    .from('scraped_content')
    .select('id, url, title, last_scraped, view_count, quality_score')
    .lt('last_scraped', sixMonthsAgo.toISOString())
    .gt('view_count', 5)
    .order('view_count', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to audit content: ${error.message}`);
  }

  // Calculate quality metrics
  const { data: recentContent } = await supabase
    .from('scraped_content')
    .select('quality_score')
    .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const avgQuality = recentContent
    ? recentContent.reduce((sum, c) => sum + (c.quality_score || 0), 0) / recentContent.length
    : 0;

  const issues: string[] = [];
  const actions: string[] = [];

  if ((staleContent?.length || 0) > 10) {
    issues.push(`${staleContent?.length} pages haven't been updated in 6+ months but are still being viewed`);
    actions.push('Trigger incremental re-scrape for stale content');
  }

  if (avgQuality < 0.6) {
    issues.push(`Average quality score is ${avgQuality.toFixed(2)} (below 0.6 threshold)`);
    actions.push('Review quality scoring algorithm or improve content sources');
  }

  return NextResponse.json({
    success: true,
    quality_score: avgQuality,
    stale_content_count: staleContent?.length || 0,
    stale_content: staleContent?.slice(0, 10).map(c => ({
      url: c.url,
      title: c.title,
      last_scraped: c.last_scraped,
      view_count: c.view_count
    })),
    issues,
    recommended_actions: actions
  });
}

export async function GET(request: Request) {
  // Health check
  return NextResponse.json({
    status: 'healthy',
    endpoints: {
      analyze_engagement: 'POST /api/content/learning with action=analyze_engagement',
      update_weights: 'POST /api/content/learning with action=update_weights',
      detect_patterns: 'POST /api/content/learning with action=detect_patterns',
      audit_quality: 'POST /api/content/learning with action=audit_quality'
    }
  });
}
