# SMART Recovery Content Scraping & Recommendation System

## 🎯 Overview

This is a **world-class content intelligence system** that:
- Scrapes all content from smartrecoveryaustralia.com.au
- Extracts and processes PDF tools and resources
- Generates vector embeddings for semantic search
- Provides intelligent content recommendations
- Builds facilitator insights from conversations
- Powers the Small Language Model with fresh, relevant content

## 🏗️ Architecture

### Components

1. **Firecrawl Integration** - Web scraping and PDF extraction
2. **Supabase Database** - Content storage with pgvector
3. **OpenAI Embeddings** - Semantic search capabilities
4. **Recommendation Engine** - AI-powered content suggestions
5. **Insights Tracker** - Facilitator feedback aggregation

### Data Flow

```
SMART Recovery Website
          ↓
    Firecrawl API (scrape & crawl)
          ↓
   Content Processing
   ├── Text extraction
   ├── PDF parsing
   ├── Metadata extraction
   └── Quality scoring
          ↓
   OpenAI Embeddings (1536d vectors)
          ↓
   Supabase Storage
   ├── scraped_content
   ├── pdf_documents
   ├── content_embeddings
   └── content_recommendations
          ↓
   Search & Recommendations
   ├── Semantic search
   ├── Keyword search
   ├── Hybrid search
   └── Personalized recommendations
          ↓
   Small Language Model
   (Context-aware suggestions)
```

## 📊 Database Schema

### Core Tables

#### `scraped_content`
Stores all scraped web pages with full-text search.

**Key fields:**
- `url`, `title`, `content`, `markdown`
- `category`, `tags`, `content_type`
- `quality_score`, `relevance_score`
- `word_count`, `reading_time_minutes`
- `search_vector` (auto-generated tsvector)

#### `pdf_documents`
Stores PDF metadata and extracted content.

**Key fields:**
- `title`, `url`, `extracted_text`
- `category`, `tool_type`, `target_audience`
- `page_count`, `file_size_bytes`
- `quality_score`

#### `content_embeddings`
Vector embeddings for semantic search (pgvector).

**Key fields:**
- `scraped_content_id` or `pdf_document_id`
- `chunk_index`, `chunk_text`
- `embedding` (vector(1536))
- `content_type`, `section_title`

#### `content_recommendations`
AI-generated content recommendations.

**Key fields:**
- Content reference (page or PDF)
- `recommendation_type` - facilitator_support, tool_suggestion, training_material, etc.
- `title`, `description`, `reason`
- `confidence_score`, `priority`
- `target_audience`, `relevant_themes`
- Engagement metrics: `view_count`, `click_count`, `save_count`

#### `facilitator_insights`
Aggregated insights from facilitator conversations.

**Key fields:**
- `insight_type` - challenge, tool_gap, training_need, best_practice, etc.
- `title`, `description`, `full_content`
- `source_type`, `source_ids`, `quote_excerpts`
- `urgency_level`, `impact_score`, `status`
- `generated_recommendations`, `suggested_content`

#### `content_usage`
Tracks how content is accessed and used.

**Key fields:**
- `user_id`, content reference, `recommendation_id`
- `action_type` - view, download, share, save, dismiss
- `search_query`, `time_spent_seconds`

#### `scraping_jobs`
Tracks crawling jobs and their progress.

**Key fields:**
- `firecrawl_job_id`, `job_type`, `target_url`
- `status`, `progress_percent`
- `pages_discovered`, `pages_scraped`
- `pdfs_found`, `pdfs_processed`

## 🚀 Getting Started

### Prerequisites

1. **Firecrawl API Key**
   - Sign up at https://firecrawl.dev
   - Get your API key from the dashboard

2. **OpenAI API Key**
   - Required for generating embeddings
   - Get from https://platform.openai.com

3. **Supabase Project**
   - Create project at https://supabase.com
   - Note your project URL and service role key

### Setup Instructions

#### 1. Apply Database Schema

```bash
# Go to Supabase SQL Editor
# Run the schema file:
supabase-content-schema.sql
```

Or via Supabase dashboard:
1. Open your project
2. Go to SQL Editor
3. Create new query
4. Copy contents of `supabase-content-schema.sql`
5. Run query

#### 2. Configure Environment Variables

Add to `/hub/.env.local`:

```bash
# Firecrawl API (required)
FIRECRAWL_API_KEY=fc-your-api-key-here

# OpenAI API (required)
OPENAI_API_KEY=sk-your-api-key-here

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL (optional, defaults to localhost:3080)
NEXT_PUBLIC_APP_URL=http://localhost:3080
```

#### 3. Install Dependencies

```bash
cd hub
npm install
```

#### 4. Start Dev Server

```bash
npm run dev
```

Server will start on http://localhost:3080

## 📥 Scraping Content

### Option 1: Automated Script (Recommended)

```bash
cd hub
npm run scrape-smart-site
```

This will:
1. ✅ Crawl the entire smartrecoveryaustralia.com.au website
2. ✅ Extract all pages and PDFs
3. ✅ Generate embeddings for semantic search
4. ✅ Store everything in Supabase
5. ✅ Create initial recommendations

**Duration:** 10-30 minutes depending on site size

### Option 2: Manual API Calls

#### Start a crawl:
```bash
curl -X POST http://localhost:3080/api/content/scrape-full \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start_crawl",
    "url": "https://smartrecoveryaustralia.com.au"
  }'
```

Returns: `{ "jobId": "..." }`

#### Check status:
```bash
curl -X POST http://localhost:3080/api/content/scrape-full \
  -H "Content-Type: application/json" \
  -d '{
    "action": "check_status",
    "jobId": "your-job-id"
  }'
```

#### Process results:
```bash
curl -X POST http://localhost:3080/api/content/scrape-full \
  -H "Content-Type: application/json" \
  -d '{
    "action": "process_results",
    "jobId": "your-job-id"
  }'
```

## 🔍 Searching Content

### Semantic Search (AI-powered)

```bash
curl -X POST http://localhost:3080/api/content/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "tools for managing urges and cravings",
    "searchType": "semantic",
    "limit": 10,
    "minSimilarity": 0.7
  }'
```

**Best for:**
- Natural language queries
- Finding conceptually similar content
- Understanding user intent

### Keyword Search (Traditional)

```bash
curl -X POST http://localhost:3080/api/content/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CBA cost benefit analysis",
    "searchType": "keyword",
    "limit": 10,
    "filters": {
      "category": "Tools & Worksheets"
    }
  }'
```

**Best for:**
- Exact phrase matching
- Specific tool names
- Filtered searches

### Hybrid Search (Best of Both)

```bash
curl -X POST http://localhost:3080/api/content/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "facilitator burnout prevention",
    "searchType": "hybrid",
    "limit": 20,
    "filters": {
      "category": "Facilitator Resources",
      "minQuality": 0.7
    }
  }'
```

**Best for:**
- Comprehensive results
- High precision needs
- Production use

### Search Statistics

```bash
curl http://localhost:3080/api/content/search?action=stats
```

Returns:
```json
{
  "success": true,
  "stats": {
    "totalPages": 247,
    "totalPDFs": 52,
    "totalEmbeddings": 1843,
    "searchReady": true
  }
}
```

### Popular Content

```bash
curl http://localhost:3080/api/content/search?action=popular
```

### Recent Content

```bash
curl http://localhost:3080/api/content/search?action=recent
```

### Categories

```bash
curl http://localhost:3080/api/content/search?action=categories
```

## 💡 Recommendations

### Get Recommendations

```bash
# Get all active recommendations
curl http://localhost:3080/api/content/recommendations

# Filter by type
curl "http://localhost:3080/api/content/recommendations?type=facilitator_support&limit=5"

# With user ID for tracking
curl "http://localhost:3080/api/content/recommendations?userId=abc123&limit=10"
```

**Recommendation Types:**
- `facilitator_support` - Helps with facilitator challenges
- `tool_suggestion` - Suggests relevant SMART tools
- `training_material` - Professional development
- `participant_resource` - For sharing with participants
- `similar_content` - Related/recommended reading
- `trending` - Popular content
- `new_content` - Recently added
- `missing_tool` - Identified gaps

### Generate from Interview Analysis

```bash
curl -X POST http://localhost:3080/api/content/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_from_interview",
    "interviewId": "interview-uuid",
    "analysisId": "analysis-uuid"
  }'
```

This will:
1. Analyze facilitator challenges from the interview
2. Search for relevant content that addresses each challenge
3. Create recommendations linking back to the interview
4. Assign appropriate priority based on urgency

### Generate from Insights

```bash
curl -X POST http://localhost:3080/api/content/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_from_insights",
    "insightIds": ["insight-uuid-1", "insight-uuid-2"]
  }'
```

Generates recommendations based on:
- Challenges → Support resources
- Tool gaps → Similar tools
- Training needs → Training materials
- Best practices → Related content

### Generate Personalized

```bash
curl -X POST http://localhost:3080/api/content/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_personalized",
    "userId": "user-uuid",
    "role": "facilitator",
    "interests": ["cultural-safety", "online-meetings"],
    "limit": 10
  }'
```

Uses:
- User's viewing history
- Saved content
- Common tags from viewed content
- Role-specific filtering

### Track Interactions

```bash
curl -X POST http://localhost:3080/api/content/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "track_interaction",
    "recommendationId": "rec-uuid",
    "userId": "user-uuid",
    "interactionType": "click"
  }'
```

**Interaction types:** `click`, `save`, `view`, `dismiss`

This data helps improve future recommendations.

## 🎓 Use Cases

### 1. Small Language Model Context

The SLM can now reference scraped content:

```javascript
// In your SLM prompt system
const context = await searchContent(userQuery)
const prompt = `
Based on SMART Recovery Australia resources:
${context.map(c => c.title + ': ' + c.content).join('\n\n')}

User question: ${userQuery}
`
```

### 2. Facilitator Support Dashboard

```javascript
// Get recommendations for a specific facilitator
const recommendations = await fetch('/api/content/recommendations?type=facilitator_support')

// Show based on their recent interview
const interviewRecs = await fetch('/api/content/recommendations', {
  method: 'POST',
  body: JSON.stringify({
    action: 'generate_from_interview',
    interviewId: currentInterview.id,
    analysisId: analysis.id
  })
})
```

### 3. Tool Discovery

```javascript
// Find tools related to a challenge
const tools = await fetch('/api/content/search', {
  method: 'POST',
  body: JSON.stringify({
    query: "managing participant resistance",
    searchType: "semantic",
    filters: {
      contentType: "tool",
      category: "Tools & Worksheets"
    }
  })
})
```

### 4. Training Resource Library

```javascript
// Get all training materials
const training = await fetch('/api/content/search', {
  method: 'POST',
  body: JSON.stringify({
    query: "facilitator training",
    searchType: "keyword",
    filters: {
      category: "Training Materials",
      minQuality: 0.7
    },
    limit: 50
  })
})
```

### 5. Insight-Driven Recommendations

```javascript
// After analyzing interviews, generate recommendations
const insights = await extractInsights(interviews)

// Store insights
await supabase.from('facilitator_insights').insert(insights)

// Generate recommendations from insights
const recs = await fetch('/api/content/recommendations', {
  method: 'POST',
  body: JSON.stringify({
    action: 'generate_from_insights',
    insightIds: insights.map(i => i.id)
  })
})
```

## 🔄 Keeping Content Fresh

### Automated Updates

Set up a cron job or scheduled task:

```bash
# Weekly update (recommended)
0 2 * * 0 cd /path/to/SMART-Connect/hub && npm run scrape-smart-site

# Monthly full refresh
0 3 1 * * cd /path/to/SMART-Connect/hub && npm run scrape-smart-site
```

### Manual Refresh

```bash
cd hub
npm run scrape-smart-site
```

### Incremental Updates

```javascript
// Scrape specific sections
await fetch('/api/content/scrape-full', {
  method: 'POST',
  body: JSON.stringify({
    action: 'start_crawl',
    url: 'https://smartrecoveryaustralia.com.au/facilitators'
  })
})
```

## 📈 Analytics & Monitoring

### Content Performance

```sql
-- View content performance
SELECT * FROM content_performance
ORDER BY views DESC
LIMIT 20;
```

### Recommendation Effectiveness

```sql
-- Check recommendation CTR
SELECT * FROM recommendation_effectiveness
WHERE recommendation_type = 'facilitator_support'
ORDER BY click_through_rate DESC;
```

### Facilitator Insights Summary

```sql
-- See insights by type and urgency
SELECT * FROM insights_summary
WHERE status = 'identified'
ORDER BY avg_impact_score DESC;
```

### Search Analytics

```sql
-- Most searched terms
SELECT
  search_query,
  COUNT(*) as searches,
  AVG(time_spent_seconds) as avg_engagement
FROM content_usage
WHERE action_type = 'search_result'
  AND search_query IS NOT NULL
GROUP BY search_query
ORDER BY searches DESC
LIMIT 20;
```

## 🎯 Integration with Small Language Model

### Context Loading

```javascript
// Load relevant content for SLM context
async function getRelevantContext(query, limit = 5) {
  const response = await fetch('/api/content/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      searchType: 'semantic',
      limit,
      minSimilarity: 0.75
    })
  })

  const { results } = await response.json()

  return results.map(r => ({
    title: r.title,
    content: r.chunk_text,
    url: r.content?.url,
    similarity: r.similarity
  }))
}
```

### Recommendation Integration

```javascript
// Get recommendations based on conversation context
async function getContextualRecommendations(conversationThemes) {
  const response = await fetch('/api/content/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_personalized',
      interests: conversationThemes,
      role: 'facilitator',
      limit: 5
    })
  })

  return await response.json()
}
```

### Real-time Insights

```javascript
// As conversations happen, extract and store insights
async function processConversationForInsights(conversation) {
  // Extract themes and challenges from conversation
  const analysis = await analyzeConversation(conversation)

  // Store as facilitator insights
  const { data: insights } = await supabase
    .from('facilitator_insights')
    .insert(analysis.insights)

  // Generate recommendations based on insights
  await fetch('/api/content/recommendations', {
    method: 'POST',
    body: JSON.stringify({
      action: 'generate_from_insights',
      insightIds: insights.map(i => i.id)
    })
  })
}
```

## 🛠️ Troubleshooting

### Scraping Issues

**Problem:** Firecrawl API key error
```
Solution: Check .env.local has valid FIRECRAWL_API_KEY
Verify key at https://firecrawl.dev/dashboard
```

**Problem:** Crawl timeout
```
Solution: Large sites may take 20+ minutes
Increase timeout in scrape-smart-site.ts
Or crawl specific sections instead of full site
```

**Problem:** Rate limit errors
```
Solution: Firecrawl free tier has limits
Upgrade plan or wait for rate limit reset
Add delays between requests
```

### Search Issues

**Problem:** No search results
```
Solution: Ensure embeddings were generated
Check: GET /api/content/search?action=stats
If embeddings = 0, run process_results again
```

**Problem:** Low quality results
```
Solution: Adjust minSimilarity threshold (try 0.6-0.8)
Use hybrid search for better coverage
Filter by category for precision
```

### Database Issues

**Problem:** Schema errors
```
Solution: Ensure supabase-content-schema.sql was run
Check Supabase logs for specific errors
Verify pgvector extension is enabled
```

**Problem:** Slow queries
```
Solution: Indexes should be created automatically
Check query performance in Supabase dashboard
Consider increasing database resources
```

## 📚 API Reference

### Scraping API

- `POST /api/content/scrape-full`
  - `action: "start_crawl"` - Start new crawl
  - `action: "check_status"` - Check job status
  - `action: "process_results"` - Process and store results

### Search API

- `POST /api/content/search` - Search content
  - `searchType`: semantic, keyword, hybrid
  - `filters`: category, contentType, tags, minQuality
  - `limit`, `minSimilarity`

- `GET /api/content/search` - Get metadata
  - `action=stats` - Content statistics
  - `action=popular` - Popular content
  - `action=recent` - Recent content
  - `action=categories` - All categories

### Recommendations API

- `GET /api/content/recommendations` - Get recommendations
  - `type` - Filter by recommendation type
  - `userId` - Track views for user
  - `limit` - Number of results

- `POST /api/content/recommendations` - Generate/manage
  - `action: "generate_from_interview"`
  - `action: "generate_from_insights"`
  - `action: "generate_personalized"`
  - `action: "track_interaction"`

## 🎉 Next Steps

1. **Run the scraper** to populate your database
   ```bash
   npm run scrape-smart-site
   ```

2. **Test search** to verify embeddings work
   ```bash
   curl -X POST http://localhost:3080/api/content/search \
     -H "Content-Type: application/json" \
     -d '{"query": "facilitator burnout", "searchType": "semantic"}'
   ```

3. **Generate recommendations** from existing interviews
   ```javascript
   // Use your interview IDs
   await generateRecommendationsFromInterview(interviewId, analysisId)
   ```

4. **Integrate with SLM** for context-aware responses

5. **Set up automated scraping** for fresh content weekly

## 🤝 Contributing

To add new features:

1. **New recommendation types**: Update `recommendation_type` enum in schema
2. **New insight types**: Update `insight_type` enum in schema
3. **Custom search filters**: Add to `applyFilters()` function
4. **New content sources**: Extend scraping logic

## 📄 License

Part of SMART Connect Hub project.

---

Built with ❤️ for SMART Recovery Australia facilitators
