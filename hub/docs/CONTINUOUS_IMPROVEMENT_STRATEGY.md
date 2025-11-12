# Continuous Improvement Strategy for SMART Connect AI System

**Last Updated**: 2025-11-12
**Purpose**: Ensure the AI-powered content analysis and recommendation system continuously learns and improves

---

## 1. AUTOMATED FEEDBACK LOOPS (Currently Partial)

### A. User Engagement Feedback Loop
**Status**: ✅ Database schema exists, ⚠️ Needs automation

#### Current State
- Tracks: views, clicks, saves, dismissals in `content_usage` table
- Tracks: recommendation engagement in `content_recommendations`
- Views exist: `content_performance`, `recommendation_effectiveness`

#### Needed Improvements
1. **Automated Retraining Pipeline**
   ```sql
   -- Weekly job to update recommendation weights
   CREATE OR REPLACE FUNCTION update_recommendation_weights()
   RETURNS void AS $$
   BEGIN
     -- Boost confidence for high-performing recommendations
     UPDATE content_recommendations r
     SET confidence_score = LEAST(1.0, confidence_score * 1.1)
     WHERE (r.click_count::float / NULLIF(r.view_count, 0)) > 0.2
       AND r.updated_at > NOW() - INTERVAL '7 days';

     -- Reduce confidence for poor performers
     UPDATE content_recommendations r
     SET confidence_score = GREATEST(0.1, confidence_score * 0.9)
     WHERE (r.click_count::float / NULLIF(r.view_count, 0)) < 0.05
       AND r.view_count > 10
       AND r.updated_at > NOW() - INTERVAL '7 days';
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Learning from Dismissals**
   - If a recommendation is dismissed >3 times, mark it as "low_quality"
   - Analyze common tags/topics in dismissed content
   - Reduce similarity threshold for those topics

3. **Success Pattern Detection**
   - Identify content that gets saved/shared frequently
   - Extract common features (length, format, topics)
   - Prioritize similar content in future recommendations

#### Implementation
```typescript
// hub/app/api/content/learning/route.ts
export async function POST(request: Request) {
  const { action } = await request.json();

  switch (action) {
    case 'analyze_engagement':
      return await analyzeEngagementPatterns();
    case 'update_weights':
      return await updateRecommendationWeights();
    case 'detect_patterns':
      return await detectSuccessPatterns();
  }
}

async function analyzeEngagementPatterns() {
  // Query content_performance view
  const highPerformers = await supabase
    .from('content_performance')
    .select('*')
    .gt('engagement_rate', 0.3)
    .order('engagement_rate', { ascending: false })
    .limit(20);

  // Extract common features
  const patterns = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{
      role: 'system',
      content: 'Analyze these high-performing content items and identify common patterns in topics, format, length, and structure.'
    }, {
      role: 'user',
      content: JSON.stringify(highPerformers.data)
    }],
    temperature: 0.3
  });

  // Store patterns for future recommendations
  await supabase.from('learned_patterns').insert({
    pattern_type: 'high_engagement',
    analysis: patterns.choices[0].message.content,
    confidence: 0.8,
    sample_size: highPerformers.data?.length
  });

  return { success: true, patterns: patterns.choices[0].message.content };
}
```

---

## 2. MODEL UPGRADING STRATEGY

### A. Stay Current with OpenAI Models
**Current**: GPT-4 Turbo (gpt-4-turbo-preview)
**Strategy**: Automatic version upgrades with A/B testing

#### Upgrade Process
1. **Monitor OpenAI Releases**
   - Subscribe to: https://platform.openai.com/docs/changelog
   - Check monthly for new models (GPT-4.5, GPT-5, improved embeddings)

2. **A/B Testing Framework**
   ```typescript
   // hub/lib/ai/model-config.ts
   export const AI_MODELS = {
     production: {
       chat: 'gpt-4-turbo-preview',
       analysis: 'gpt-4-turbo-preview',
       embeddings: 'text-embedding-ada-002'
     },
     experimental: {
       chat: 'gpt-4.5-preview', // When available
       analysis: 'gpt-4.5-preview',
       embeddings: 'text-embedding-3-large' // Higher dimensions
     }
   };

   export function getModel(purpose: 'chat' | 'analysis' | 'embeddings', experimentalUser = false) {
     return experimentalUser ? AI_MODELS.experimental[purpose] : AI_MODELS.production[purpose];
   }
   ```

3. **Performance Comparison**
   - Run same analysis with both models
   - Compare: quality, speed, cost, facilitator satisfaction
   - Switch if new model shows >10% improvement

#### Embedding Model Upgrades
**Consider**: `text-embedding-3-large` (3072 dimensions, better accuracy)

**Migration Path**:
```sql
-- Add column for new embeddings
ALTER TABLE content_embeddings
ADD COLUMN embedding_v2 vector(3072);

-- Gradually re-embed content
-- Keep v1 for comparison during transition
```

---

## 3. CONTENT QUALITY IMPROVEMENT

### A. Automated Quality Monitoring
**Goal**: Detect stale, low-quality, or outdated content

#### Weekly Quality Audit
```typescript
// hub/scripts/audit-content-quality.ts
async function auditContentQuality() {
  // 1. Find stale content (not updated in 6+ months)
  const staleContent = await supabase
    .from('scraped_content')
    .select('*')
    .lt('last_scraped', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000))
    .gt('view_count', 10); // Still being viewed

  // 2. Trigger re-scrape for important pages
  for (const content of staleContent.data || []) {
    await fetch('/api/content/scrape-full', {
      method: 'POST',
      body: JSON.stringify({ url: content.url, priority: 'high' })
    });
  }

  // 3. Detect quality drift
  const recentContent = await supabase
    .from('scraped_content')
    .select('quality_score')
    .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const avgQuality = recentContent.data?.reduce((sum, c) => sum + c.quality_score, 0) / recentContent.data?.length;

  if (avgQuality < 0.6) {
    // Alert: Quality declining
    console.warn(`⚠️ Average quality dropped to ${avgQuality}`);
  }
}
```

### B. Incremental Content Updates
**Current Problem**: Re-scrapes entire site (expensive)
**Solution**: Change detection and incremental updates

```typescript
// hub/app/api/content/incremental-update/route.ts
export async function POST(request: Request) {
  // 1. Fetch sitemap
  const sitemap = await fetchSitemap('https://smartrecoveryaustralia.com.au/sitemap.xml');

  // 2. Compare with existing content
  const existingUrls = await supabase
    .from('scraped_content')
    .select('url, last_scraped, content_hash');

  // 3. Identify changes
  const toUpdate = [];
  for (const sitemapUrl of sitemap) {
    const existing = existingUrls.data?.find(e => e.url === sitemapUrl.loc);

    if (!existing) {
      toUpdate.push({ url: sitemapUrl.loc, reason: 'new' });
    } else if (new Date(sitemapUrl.lastmod) > new Date(existing.last_scraped)) {
      toUpdate.push({ url: sitemapUrl.loc, reason: 'modified' });
    }
  }

  // 4. Scrape only changed pages (90% cost reduction)
  const results = await scrapeUrls(toUpdate.map(u => u.url));

  // 5. Detect removed pages
  const removedUrls = existingUrls.data?.filter(
    e => !sitemap.find(s => s.loc === e.url)
  );

  return {
    updated: toUpdate.length,
    removed: removedUrls?.length,
    cost_savings: `${((1 - toUpdate.length / existingUrls.data?.length) * 100).toFixed(0)}%`
  };
}
```

---

## 4. FACILITATOR FEEDBACK INTEGRATION

### A. Explicit Feedback Collection
**Goal**: Let facilitators rate recommendations and suggest improvements

#### Database Schema Addition
```sql
CREATE TABLE facilitator_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  recommendation_id UUID REFERENCES content_recommendations(id),
  content_id UUID REFERENCES scraped_content(id),

  -- Ratings (1-5)
  relevance_rating INT CHECK (relevance_rating BETWEEN 1 AND 5),
  usefulness_rating INT CHECK (usefulness_rating BETWEEN 1 AND 5),

  -- Text feedback
  feedback_text TEXT,
  suggested_improvements TEXT,

  -- What was the facilitator trying to do?
  context TEXT, -- e.g., "Preparing for a new facilitator training"
  challenge_category VARCHAR(100), -- e.g., "burnout", "cultural_safety"

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sentiment VARCHAR(20) -- positive, neutral, negative (from GPT analysis)
);
```

#### Feedback Analysis Loop
```typescript
// hub/app/api/feedback/analyze/route.ts
export async function POST(request: Request) {
  // Get all recent feedback
  const feedback = await supabase
    .from('facilitator_feedback')
    .select('*')
    .is('sentiment', null)
    .limit(50);

  // Analyze with GPT-4
  for (const item of feedback.data || []) {
    const analysis = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{
        role: 'system',
        content: 'Analyze this facilitator feedback. Extract: sentiment (positive/neutral/negative), key themes, actionable insights.'
      }, {
        role: 'user',
        content: `Rating: ${item.relevance_rating}/5\nFeedback: ${item.feedback_text}\nContext: ${item.context}`
      }],
      temperature: 0.3
    });

    // Update feedback with insights
    await supabase.from('facilitator_feedback').update({
      sentiment: extractSentiment(analysis),
      analyzed_at: new Date()
    }).eq('id', item.id);

    // If negative feedback, investigate
    if (extractSentiment(analysis) === 'negative') {
      await investigateNegativeFeedback(item);
    }
  }
}

async function investigateNegativeFeedback(feedback) {
  // Find what content was recommended
  const recommendation = await supabase
    .from('content_recommendations')
    .select('*, scraped_content(*)')
    .eq('id', feedback.recommendation_id)
    .single();

  // Analyze why it failed
  const diagnosis = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{
      role: 'system',
      content: 'Diagnose why this recommendation was poorly received. Suggest fixes.'
    }, {
      role: 'user',
      content: `
        Facilitator needed: ${feedback.context}
        Recommended: ${recommendation.data.scraped_content.title}
        Feedback: ${feedback.feedback_text} (rated ${feedback.relevance_rating}/5)
      `
    }],
    temperature: 0.4
  });

  // Store for system improvements
  await supabase.from('system_improvements').insert({
    improvement_type: 'recommendation_failure',
    diagnosis: diagnosis.choices[0].message.content,
    priority: feedback.relevance_rating <= 2 ? 'high' : 'medium',
    status: 'identified'
  });
}
```

---

## 5. SCHEDULED IMPROVEMENT JOBS

### A. Cron Jobs Setup
```typescript
// hub/app/api/cron/improve-system/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Run improvement jobs
  const jobs = [
    { name: 'Update Recommendation Weights', fn: updateRecommendationWeights },
    { name: 'Analyze Engagement Patterns', fn: analyzeEngagementPatterns },
    { name: 'Audit Content Quality', fn: auditContentQuality },
    { name: 'Process Facilitator Feedback', fn: processFeedback },
    { name: 'Detect Success Patterns', fn: detectSuccessPatterns },
    { name: 'Incremental Content Update', fn: incrementalContentUpdate }
  ];

  const results = [];
  for (const job of jobs) {
    try {
      const result = await job.fn();
      results.push({ job: job.name, status: 'success', data: result });
    } catch (error) {
      results.push({ job: job.name, status: 'error', error: error.message });
    }
  }

  return Response.json({
    timestamp: new Date().toISOString(),
    jobs: results
  });
}
```

### B. Vercel Cron Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/improve-system",
      "schedule": "0 2 * * 0"
    }
  ]
}
```
**Schedule**: Every Sunday at 2 AM UTC (weekly improvement cycle)

---

## 6. METRICS & MONITORING DASHBOARD

### A. Key Performance Indicators (KPIs)

#### Content Quality Metrics
- **Average Quality Score**: Target ≥ 0.7
- **Stale Content %**: Target < 10%
- **Coverage**: % of facilitator challenges with relevant content (Target ≥ 90%)

#### Recommendation Effectiveness
- **Click-Through Rate (CTR)**: Target ≥ 15%
- **Save Rate**: Target ≥ 5%
- **Dismissal Rate**: Target < 20%

#### System Health
- **Average Response Time**: Target < 2s
- **Embedding Generation Cost**: $ per 1000 pages
- **Model Accuracy**: % of recommendations rated 4-5 stars

### B. Dashboard Implementation
```typescript
// hub/app/dashboard/insights/page.tsx
export default async function InsightsDashboard() {
  const metrics = await fetchSystemMetrics();

  return (
    <div>
      <h1>AI System Performance</h1>

      <MetricCard
        title="Recommendation CTR"
        value={metrics.ctr}
        target={0.15}
        trend={metrics.ctrTrend}
      />

      <MetricCard
        title="Content Quality"
        value={metrics.avgQuality}
        target={0.7}
        trend={metrics.qualityTrend}
      />

      <Chart
        type="line"
        data={metrics.engagementOverTime}
        title="Engagement Trend (30 days)"
      />

      <Alert type={metrics.alerts.length > 0 ? 'warning' : 'success'}>
        {metrics.alerts.length > 0
          ? `${metrics.alerts.length} issues detected`
          : 'All systems healthy'}
      </Alert>
    </div>
  );
}

async function fetchSystemMetrics() {
  const [effectiveness, quality, alerts] = await Promise.all([
    supabase.from('recommendation_effectiveness').select('*'),
    supabase.from('content_performance').select('*'),
    supabase.from('system_improvements').select('*').eq('status', 'identified')
  ]);

  return {
    ctr: calculateCTR(effectiveness.data),
    avgQuality: calculateAvgQuality(quality.data),
    alerts: alerts.data
  };
}
```

---

## 7. ADVANCED: CUSTOM MODEL FINE-TUNING

### A. When to Consider Fine-Tuning
**Trigger Conditions**:
- 500+ labeled examples (facilitator feedback)
- Consistent patterns in what works/doesn't work
- Generic GPT-4 responses not specific enough to SMART Recovery

### B. Fine-Tuning Process
1. **Collect Training Data**
   ```typescript
   // Export successful interactions
   const trainingData = await supabase
     .from('content_recommendations')
     .select(`
       *,
       scraped_content(*),
       facilitator_feedback(*)
     `)
     .gte('click_count', 1)
     .gte('facilitator_feedback.relevance_rating', 4)
     .limit(1000);

   // Format for OpenAI fine-tuning
   const formatted = trainingData.data?.map(item => ({
     messages: [
       { role: 'system', content: 'You are a SMART Recovery content recommender.' },
       { role: 'user', content: `Facilitator challenge: ${item.context}` },
       { role: 'assistant', content: `Recommended: ${item.scraped_content.title}\nReason: ${item.reason}` }
     ]
   }));
   ```

2. **Fine-Tune Model**
   ```bash
   openai api fine_tuning.jobs.create \
     -t training_data.jsonl \
     -m gpt-4-turbo-preview \
     --suffix "smart-recovery-v1"
   ```

3. **A/B Test Fine-Tuned Model**
   - 10% of users get fine-tuned model
   - Compare CTR, satisfaction, cost
   - Roll out if >15% improvement

---

## 8. IMPLEMENTATION TIMELINE

### Phase 1: Quick Wins (Week 1-2)
- ✅ Set up automated weight updates (SQL function)
- ✅ Create facilitator feedback form
- ✅ Add metrics dashboard

### Phase 2: Learning Loops (Week 3-4)
- ✅ Implement engagement pattern detection
- ✅ Set up weekly cron jobs
- ✅ Build incremental update system

### Phase 3: Advanced Features (Month 2)
- ✅ A/B testing framework
- ✅ Quality monitoring alerts
- ✅ Success pattern analysis

### Phase 4: Optimization (Month 3+)
- ✅ Consider fine-tuning if data supports it
- ✅ Upgrade to newer embedding models
- ✅ Multi-language support (if needed)

---

## 9. SUCCESS CRITERIA

### Short-Term (3 months)
- [ ] Recommendation CTR > 15%
- [ ] Average facilitator feedback rating > 4/5
- [ ] Content staleness < 10%
- [ ] 90% cost reduction via incremental updates

### Long-Term (12 months)
- [ ] Recommendation CTR > 25%
- [ ] Self-improving system (weekly automated tuning)
- [ ] Coverage for 95% of facilitator challenges
- [ ] Proactive content gap detection

---

## 10. MONITORING & ALERTS

### Critical Alerts
1. **Quality Drop**: Avg quality score < 0.6 for 7 days
2. **Engagement Drop**: CTR < 10% for 7 days
3. **System Errors**: >5% of API calls failing
4. **Stale Content**: >20% of content not updated in 6 months

### Weekly Report
Email to admin with:
- Engagement trends
- Top-performing content
- Low-performing recommendations
- Facilitator feedback summary
- Suggested actions

---

## SUMMARY

This strategy creates a **self-improving AI system** that:
1. ✅ Learns from facilitator engagement (clicks, saves, dismissals)
2. ✅ Adapts recommendation weights based on performance
3. ✅ Monitors content quality and triggers updates
4. ✅ Collects explicit feedback for targeted improvements
5. ✅ Detects success patterns and replicates them
6. ✅ Stays current with latest AI models
7. ✅ Provides visibility through dashboards and alerts

**Next Steps**: Implement Phase 1 (Quick Wins) this week.
