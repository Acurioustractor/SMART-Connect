# Continuous Learning System - Quick Start Guide

Welcome to the **SMART Connect Continuous Learning System**! This system enables your AI-powered content recommendation engine to learn from facilitator engagement and continuously improve over time.

---

## 🎯 What It Does

This system automatically:
- ✅ Analyzes which content recommendations work best
- ✅ Adjusts confidence scores based on engagement (clicks, saves, dismissals)
- ✅ Detects patterns in successful vs. unsuccessful recommendations
- ✅ Monitors content quality and flags stale content
- ✅ Learns from facilitator feedback
- ✅ Provides actionable insights for system improvements

---

## 🚀 Getting Started

### Step 1: Run the Database Migration

First, set up the required database tables:

```bash
cd hub

# Apply the migration to your Supabase database
supabase db push
```

Or manually run the SQL migration:
```bash
psql $DATABASE_URL -f supabase/migrations/20251112_add_learning_tables.sql
```

This creates:
- `learned_patterns` - Stores AI-discovered patterns
- `facilitator_feedback` - Explicit feedback from users
- `system_improvements` - Tracks identified issues
- `content_quality_audits` - Logs quality checks
- Views for system health metrics

### Step 2: Test the Learning System

Run the test script to verify everything works:

```bash
npx tsx scripts/test-learning-system.ts
```

Expected output:
```
🧪 Testing Continuous Learning System

📋 Running: Analyze Engagement Patterns
   ✅ Success (1234ms)

📋 Running: Update Recommendation Weights
   ✅ Success (567ms)

📋 Running: Detect Success Patterns
   ✅ Success (2341ms)

📋 Running: Audit Content Quality
   ✅ Success (891ms)

✅ Passed: 4/4
```

### Step 3: Set Up Automated Learning (Optional)

To enable weekly automated improvements, configure Vercel Cron:

**Option A: Vercel Cron (Recommended for Production)**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/improve-system",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

Set environment variable:
```bash
vercel env add CRON_SECRET
# Enter a secure random string (e.g., output of `openssl rand -hex 32`)
```

**Option B: GitHub Actions (Alternative)**

Create `.github/workflows/weekly-learning.yml`:
```yaml
name: Weekly System Improvement

on:
  schedule:
    - cron: '0 2 * * 0' # Every Sunday at 2 AM UTC

jobs:
  improve:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Learning Cycle
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/improve-system" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Step 4: Access the Dashboard

Visit the learning dashboard to see system performance:

```
https://your-app.vercel.app/dashboard/learning
```

The dashboard shows:
- Content quality metrics (target ≥ 0.7)
- Recommendation CTR (target ≥ 15%)
- Recently learned patterns
- Facilitator feedback
- Open improvement issues

---

## 📊 How to Use the Learning APIs

### 1. Analyze Engagement Patterns

Identifies what content performs well:

```bash
curl -X POST http://localhost:3000/api/content/learning \
  -H "Content-Type: application/json" \
  -d '{"action": "analyze_engagement"}'
```

**Response:**
```json
{
  "success": true,
  "patterns": {
    "high_performer_patterns": [
      "Content with 'facilitator burnout' tag performs well",
      "Tools/worksheets have 2x engagement vs articles"
    ],
    "recommendations": [
      "Prioritize tool-type content in recommendations",
      "Tag more content with burnout-related keywords"
    ]
  },
  "stats": {
    "high_performers": 23,
    "low_performers": 47
  }
}
```

### 2. Update Recommendation Weights

Boosts high-performers, reduces low-performers:

```bash
curl -X POST http://localhost:3000/api/content/learning \
  -H "Content-Type: application/json" \
  -d '{"action": "update_weights"}'
```

**Response:**
```json
{
  "success": true,
  "boosted": 18,
  "reduced": 12,
  "message": "Updated 30 recommendation weights"
}
```

### 3. Detect Success Patterns

Machine learning from successful recommendations:

```bash
curl -X POST http://localhost:3000/api/content/learning \
  -H "Content-Type: application/json" \
  -d '{"action": "detect_patterns"}'
```

**Response:**
```json
{
  "success": true,
  "patterns": {
    "content_patterns": [
      "PDFs with 'worksheet' in title get saved 3x more",
      "Facilitator training content clicked but rarely completed"
    ],
    "recommendation_patterns": [
      "Type 'tool_suggestion' outperforms 'general_resource' by 40%"
    ],
    "actionable_insights": [
      "Create more worksheet-style PDFs",
      "Break long training content into smaller modules"
    ]
  }
}
```

### 4. Audit Content Quality

Finds stale or low-quality content:

```bash
curl -X POST http://localhost:3000/api/content/learning \
  -H "Content-Type: application/json" \
  -d '{"action": "audit_quality"}'
```

**Response:**
```json
{
  "success": true,
  "quality_score": 0.72,
  "stale_content_count": 15,
  "stale_content": [
    {
      "url": "https://smartrecoveryaustralia.com.au/facilitator-training",
      "last_scraped": "2024-05-12",
      "view_count": 47
    }
  ],
  "issues": [
    "15 pages haven't been updated in 6+ months but are still being viewed"
  ],
  "recommended_actions": [
    "Trigger incremental re-scrape for stale content"
  ]
}
```

---

## 🔄 The Learning Cycle

Here's how the system continuously improves:

```
Week 1: Initial Recommendations
   ↓
Facilitators interact (click, save, dismiss)
   ↓
Week 2: Cron job runs
   ├─ Analyze patterns → "Burnout content performs well"
   ├─ Update weights → Boost burnout-related recommendations
   ├─ Detect patterns → "PDFs outperform articles"
   └─ Audit quality → "15 pages need updating"
   ↓
Apply learnings to future recommendations
   ↓
Week 3: Better recommendations
   ↓
More engagement → More learning → Better recommendations
```

---

## 🎛️ Manual Triggers

You can manually trigger learning at any time:

**From the dashboard:**
- Visit `/dashboard/learning`
- Click "Analyze Now" or "Update Weights"

**From the command line:**
```bash
# Analyze engagement
npx tsx scripts/test-learning-system.ts

# Or trigger specific action
curl -X POST http://localhost:3000/api/content/learning \
  -d '{"action": "analyze_engagement"}'
```

**Trigger all jobs at once (simulate weekly cron):**
```bash
curl -X POST http://localhost:3000/api/cron/improve-system \
  -H "Content-Type: application/json" \
  -d '{
    "actions": [
      "update_weights",
      "analyze_engagement",
      "detect_patterns",
      "audit_quality"
    ]
  }'
```

---

## 📈 Monitoring System Health

### Key Metrics to Track

1. **Content Quality Score** (target ≥ 0.7)
   - Average quality across all content
   - Indicates overall content value

2. **Recommendation CTR** (target ≥ 15%)
   - Click-through rate for recommendations
   - Higher = better relevance

3. **Save Rate** (target ≥ 5%)
   - % of recommendations saved for later
   - Indicates high-value content

4. **Stale Content %** (target < 10%)
   - Content not updated in 6+ months
   - Needs re-scraping

### Query System Health

```sql
-- Quick health check
SELECT * FROM system_health_metrics;

-- Recommendation performance by type
SELECT * FROM recommendation_effectiveness_summary
ORDER BY avg_ctr DESC;

-- Recent learned patterns
SELECT pattern_type, confidence, sample_size, created_at
FROM learned_patterns
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🧪 Adding Facilitator Feedback

To collect explicit feedback from facilitators:

```typescript
// In your Next.js app
async function submitFeedback(data: {
  recommendationId: string;
  contentId: string;
  relevanceRating: number; // 1-5
  feedbackText: string;
  context: string; // What were they trying to do?
}) {
  const response = await fetch('/api/feedback/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return response.json();
}
```

The system will automatically:
1. Analyze sentiment (positive/neutral/negative)
2. Extract key themes
3. Generate actionable insights
4. Link negative feedback to system improvements

---

## 🔍 Debugging & Troubleshooting

### Learning system not running?

Check the logs:
```bash
vercel logs --follow
# Look for "🚀 Starting weekly system improvement cycle..."
```

### No patterns detected?

Need more data:
- Minimum 50 content views required
- Minimum 10 recommendation interactions
- Run for at least 2 weeks to gather data

### Low engagement rates?

Check:
1. Are recommendations showing to users?
2. Are they relevant to facilitator needs?
3. Is the content quality score high enough?

Run diagnostics:
```bash
curl http://localhost:3000/api/content/learning
# Returns health check with all endpoints
```

---

## 🎯 Success Criteria

### Short-term (First 3 Months)
- [ ] Recommendation CTR > 15%
- [ ] Average facilitator feedback rating > 4/5
- [ ] Content staleness < 10%
- [ ] At least 20 learned patterns identified

### Long-term (12 Months)
- [ ] Recommendation CTR > 25%
- [ ] Self-improving system (weekly automated tuning)
- [ ] Coverage for 95% of facilitator challenges
- [ ] Proactive content gap detection

---

## 🚨 Alerts & Notifications

The system will automatically detect:

1. **Quality Drop**: Avg quality < 0.6 for 7 days
2. **Engagement Drop**: CTR < 10% for 7 days
3. **High Stale Content**: >20% content not updated in 6 months

To set up alerts, configure monitoring:

```typescript
// Example: Send alert email
if (healthMetrics.avg_ctr < 0.10 && weeksSinceDrop > 1) {
  await sendAlert({
    type: 'engagement_drop',
    message: 'CTR has been below 10% for over a week',
    action: 'Review recent recommendations and feedback'
  });
}
```

---

## 📚 Advanced Topics

### Fine-Tuning the Model

Once you have 500+ labeled examples (facilitator feedback), consider fine-tuning:

```bash
# Export training data
node scripts/export-training-data.js

# Fine-tune with OpenAI
openai api fine_tuning.jobs.create \
  -t training_data.jsonl \
  -m gpt-4-turbo-preview \
  --suffix "smart-recovery-v1"
```

See `CONTINUOUS_IMPROVEMENT_STRATEGY.md` for full details.

### Upgrading to Newer Models

When GPT-4.5 or GPT-5 is released:

1. Update `hub/lib/ai/model-config.ts`
2. Set `experimental.chat = 'gpt-4.5-preview'`
3. A/B test with 10% of users
4. Compare CTR, cost, quality
5. Roll out if >10% improvement

---

## 📖 Related Documentation

- **Full Strategy**: [CONTINUOUS_IMPROVEMENT_STRATEGY.md](./CONTINUOUS_IMPROVEMENT_STRATEGY.md)
- **Scraping System**: [SCRAPING_IMPROVEMENTS.md](./SCRAPING_IMPROVEMENTS.md)
- **API Reference**: [API.md](./API.md)

---

## 🤝 Contributing

To improve the learning system:

1. Run tests: `npx tsx scripts/test-learning-system.ts`
2. Add new pattern detection logic in `/api/content/learning/route.ts`
3. Update dashboard in `/app/dashboard/learning/page.tsx`
4. Document in this guide

---

## ❓ FAQ

**Q: How often should I run the learning cycle?**
A: Weekly is recommended. Daily is overkill (not enough new data), monthly is too slow.

**Q: Can I customize what patterns to detect?**
A: Yes! Edit the GPT-4 prompts in `/api/content/learning/route.ts` to focus on specific metrics.

**Q: What if the system makes bad recommendations?**
A: The confidence scores will automatically drop as users dismiss them. You can also manually adjust weights in the database.

**Q: How much does this cost?**
A: ~$2-5 per week in OpenAI API calls (mostly GPT-4 analysis). Much cheaper than manual analysis.

**Q: Can I use a different model (Claude, Gemini)?**
A: Yes! Replace OpenAI calls with your preferred model API. The logic remains the same.

---

## 🎉 You're Ready!

The continuous learning system is now set up and ready to make your SMART Connect platform smarter every week.

**Next steps:**
1. ✅ Run the test script to verify setup
2. ✅ Visit the dashboard to see initial metrics
3. ✅ Set up weekly cron jobs
4. ✅ Start collecting facilitator feedback
5. ✅ Watch your recommendations get better over time!

Questions? Check the full strategy document or open an issue.

---

**Happy Learning! 🚀**
