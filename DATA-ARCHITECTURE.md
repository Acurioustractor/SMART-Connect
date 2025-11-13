# SMART Connect - Comprehensive Data Architecture Overview

## Executive Summary

SMART Connect Hub uses a sophisticated multi-layered data architecture built on Supabase (PostgreSQL with pgvector extension) combined with Firecrawl for web scraping, OpenAI for embeddings, and custom APIs for intelligent content management.

The system implements:
- **Web scraping** via Firecrawl (crawls smartrecoveryaustralia.com.au)
- **Vector embeddings** using OpenAI's text-embedding-ada-002 model
- **Semantic search** via pgvector
- **Interview analysis** using GPT-4 with thematic analysis
- **Content recommendations** engine
- **PDF processing** with storage in Supabase Storage
- **Facilitator insights** aggregation

---

## 1. SUPABASE SCHEMA & TABLES

### A. CORE CONTENT TABLES

#### 1.1 `scraped_content`
**Purpose**: Stores all web pages scraped from SMART Recovery website

**Key Fields:**
```
- id (UUID, Primary Key)
- url (TEXT, UNIQUE) - Source URL
- title, content, markdown - Content in multiple formats
- content_type (page|pdf|resource|tool|article)
- meta_description, meta_keywords[], author
- published_date (TIMESTAMP)
- category (Facilitator Resources, Tools & Worksheets, etc.)
- tags (TEXT[]) - Extracted tags
- word_count, reading_time_minutes - Metrics
- quality_score (0-1 float) - Content quality assessment
- relevance_score (0-1 float) - SMART Recovery relevance
- is_verified (BOOLEAN) - Admin verification flag
- scraped_at, last_updated (TIMESTAMPS)
- scrape_status (success|failed|pending|stale)
- parent_url, external_links[], internal_links[]
- search_vector (tsvector) - Auto-generated for full-text search
```

**Indexes:**
- `idx_scraped_content_url` - Fast URL lookups
- `idx_scraped_content_category` - Filter by category
- `idx_scraped_content_type` - Filter by content type
- `idx_scraped_content_updated` - Latest content
- `idx_scraped_content_search` - Full-text search (GIN)
- `idx_scraped_content_tags` - Tag filtering (GIN)

---

#### 1.2 `pdf_documents`
**Purpose**: Stores PDF metadata and extracted content

**Key Fields:**
```
- id (UUID, Primary Key)
- scraped_content_id (UUID FK) - Link to scraped page
- title, url
- file_path (TEXT) - Path in Supabase Storage
- file_size_bytes, page_count
- extracted_text, markdown_content
- category (facilitator-guide|participant-worksheet|training-manual)
- tool_type (CBA|hierarchy-of-values|abc-urge-log|change-plan|smart-goals)
- target_audience (facilitators|participants|family|trainers)
- smart_tool_number (Tool 1, Tool 2, etc.)
- author, version, published_date, language
- download_count, view_count, last_accessed
- is_verified, quality_score (0-1)
- created_at, updated_at
```

**Indexes:**
- `idx_pdf_documents_category`
- `idx_pdf_documents_tool_type`
- `idx_pdf_documents_audience` (GIN)

---

#### 1.3 `content_embeddings`
**Purpose**: Vector embeddings for semantic search (pgvector)

**Key Fields:**
```
- id (UUID, Primary Key)
- scraped_content_id or pdf_document_id (UUID FK)
- chunk_index (INTEGER) - Order in document
- chunk_text (TEXT) - Actual text snippet
- chunk_size (INTEGER) - Word count
- embedding (vector(1536)) - OpenAI ada-002 embedding
- section_title (TEXT) - Context label
- content_type (TEXT) - Type of content
- created_at (TIMESTAMP)

CONSTRAINT: Must reference either scraped_content OR pdf_document
```

**Indexes:**
- `idx_content_embeddings_scraped` - Query by source page
- `idx_content_embeddings_pdf` - Query by source PDF
- `idx_content_embeddings_vector` (IVFFLAT) - Vector similarity search

**Note**: Uses pgvector extension for efficient cosine similarity search

---

#### 1.4 `content_recommendations`
**Purpose**: AI-generated content recommendations

**Key Fields:**
```
- id (UUID, Primary Key)
- scraped_content_id or pdf_document_id (UUID FK)
- recommendation_type:
  - facilitator_support (helps with challenges)
  - tool_suggestion (suggests SMART tools)
  - training_material (professional development)
  - participant_resource (share with participants)
  - similar_content (related content)
  - trending (popular/frequently accessed)
  - new_content (recently added)
  - missing_tool (identified gap)
- title, description, reason (why recommended)
- confidence_score (0-1)
- target_audience (facilitators|coordinators|all)
- relevant_themes (TEXT[]) - Interview themes
- relevant_challenges (TEXT[]) - Facilitator challenges
- related_interview_ids (UUID[]) - Linked interviews
- based_on_facilitator_feedback (BOOLEAN)
- Engagement: view_count, click_count, save_count, dismissal_count
- is_active, priority, expires_at
- created_at, updated_at
```

**Indexes:**
- `idx_recommendations_type`
- `idx_recommendations_active` - Active recommendations
- `idx_recommendations_audience` (GIN)
- `idx_recommendations_themes` (GIN)

---

### B. INTERVIEW & ANALYSIS TABLES

#### 1.5 `interviews`
**Purpose**: Stores interview content

**Key Fields:**
```
- id (UUID, Primary Key)
- name, email, interview_date
- affiliation, role
- status (scheduled|in_progress|completed)
- raw_content (TEXT) - Full markdown
- metadata (JSONB) - Flexible additional fields
- created_at, updated_at
```

**Indexes:**
- `idx_interviews_name`
- `idx_interviews_date`

---

#### 1.6 `interview_analysis`
**Purpose**: Stores GPT-4 analysis of interviews

**Key Fields:**
```
- id (UUID, Primary Key)
- interview_id (UUID FK)
- executive_summary (TEXT)
- one_line_takeaway (TEXT)
- key_themes (JSONB)
  {
    theme: string,
    description: string,
    evidence: string[],
    significance: string
  }
- powerful_quotes (JSONB)
  {
    quote: string,
    context: string,
    significance: string
  }
- learnworld_content_suggestions (JSONB)
- facilitator_insights (JSONB)
  {
    challenges: [],
    strengths: [],
    supportNeeds: [],
    learningPreferences: []
  }
- platform_implications (JSONB)
- cultural_considerations (JSONB)
- model_used, tokens_used
- analyzed_at, created_at
```

---

#### 1.7 `interview_embeddings`
**Purpose**: Vector embeddings of interview content for semantic search

**Key Fields:**
```
- id (UUID, Primary Key)
- interview_id (UUID FK)
- content_chunk (TEXT)
- chunk_index (INTEGER)
- embedding (vector(1536))
- metadata (JSONB)
  {
    section: 'summary'|'themes'|'quotes',
    speaker: 'interviewer'|'participant'
  }
- created_at
```

**Indexes:**
- `idx_embeddings_interview`
- `idx_embeddings_vector` (IVFFLAT)

---

#### 1.8 `facilitator_insights`
**Purpose**: Aggregated insights from conversations and interviews

**Key Fields:**
```
- id (UUID, Primary Key)
- insight_type:
  - challenge (problem facilitators face)
  - success_story (what's working)
  - tool_gap (missing resource)
  - improvement_idea (suggestion)
  - training_need (learning gap)
  - best_practice (effective approach)
  - concern (issue raised)
  - question (common question)
- title, description, full_content
- source_type (interview|chat|feedback|manual)
- source_ids (UUID[]) - References to interviews/conversations
- quote_excerpts (TEXT[])
- mention_count (INTEGER) - How many times mentioned
- urgency_level (low|medium|high|critical)
- impact_score (0-1)
- themes, regions, meeting_types (TEXT[])
- status (identified|reviewing|planning|in_progress|completed|wont_fix)
- assigned_to, action_items (JSONB)
- generated_recommendations (UUID[]) - IDs of recommendations
- suggested_content (UUID[])
- upvote_count, admin_notes
- created_at, updated_at, resolved_at
```

**Indexes:**
- `idx_insights_type`
- `idx_insights_status`
- `idx_insights_urgency`
- `idx_insights_themes` (GIN)

---

#### 1.9 `learnworld_courses`
**Purpose**: Course/training content generated from interview analysis

**Key Fields:**
```
- id (UUID, Primary Key)
- title, description
- target_audience, format
- estimated_length
- key_learning_outcomes (JSONB)
- source_interviews (UUID[])
- status (suggested|planned|in_development|published)
- priority (low|medium|high|critical)
- created_at, updated_at
```

---

#### 1.10 `platform_features`
**Purpose**: Feature ideas extracted from interviews

**Key Fields:**
```
- id (UUID, Primary Key)
- feature_name, description
- insight, rationale
- priority (low|medium|high|critical)
- source_interviews (UUID[])
- status (suggested|reviewing|planned|in_development|shipped)
- votes (INTEGER) - Community voting
- created_at, updated_at
```

---

### C. ANALYTICS & TRACKING TABLES

#### 1.11 `content_usage`
**Purpose**: Track how content is accessed and engaged

**Key Fields:**
```
- id (UUID, Primary Key)
- user_id (UUID FK)
- scraped_content_id or pdf_document_id (UUID FK)
- recommendation_id (UUID FK)
- action_type (view|download|share|save|dismiss|click|search_result)
- session_id, referrer_url, search_query
- user_agent
- time_spent_seconds, scroll_depth_percent
- created_at
```

**Indexes:**
- `idx_content_usage_user`
- `idx_content_usage_scraped`
- `idx_content_usage_pdf`
- `idx_content_usage_action`

---

#### 1.12 `scraping_jobs`
**Purpose**: Track web crawling and processing jobs

**Key Fields:**
```
- id (UUID, Primary Key)
- firecrawl_job_id (TEXT UNIQUE)
- job_type (full_crawl|partial_crawl|single_page|pdf_extraction)
- target_url
- status (pending|running|completed|failed|cancelled|processing|processed)
- progress_percent
- pages_discovered, pages_scraped, pages_processed, pdfs_found, pdfs_processed
- errors_count
- config (JSONB) - Scraping configuration
- started_at, completed_at
- processing_started_at, processing_completed_at
- duration_seconds
- error_message, retry_count, max_retries
- triggered_by (UUID FK)
- notes
- created_at, updated_at
```

**Indexes:**
- `idx_scraping_jobs_status`
- `idx_scraping_jobs_firecrawl`

---

### D. USER & SYSTEM TABLES

#### 1.13 `user_profiles`
**Purpose**: User account information

**Key Fields:**
```
- id (UUID FK to auth.users)
- email, full_name
- role (facilitator|admin|staff)
- organization, location
- created_at, updated_at, last_active_at
```

---

#### 1.14 `conversations` & `messages`
**Purpose**: Chat history for AI assistance

**Key Fields (conversations):**
```
- id (UUID)
- user_id (UUID FK)
- title, created_at, updated_at
```

**Key Fields (messages):**
```
- id (UUID)
- conversation_id (UUID FK)
- role (user|assistant|system)
- content (TEXT)
- tokens_used
- created_at
```

---

#### 1.15 `content_categories`
**Purpose**: Reference table for content categorization

**Key Fields:**
```
- id (UUID)
- name (UNIQUE)
- description
- parent_category
- icon
- sort_order
- is_active
```

**Default Categories:**
- Facilitator Resources
- Tools & Worksheets
- Training Materials
- Participant Resources
- Research & Evidence
- Family & Friends
- Handbooks & Manuals
- Meeting Resources (subcategory)
- Cultural Safety (subcategory)
- Self-Care (subcategory)

---

## 2. HOW DATA IS CURRENTLY BEING STORED

### A. STORAGE ARCHITECTURE

**Database**: Supabase PostgreSQL
- **Tables**: 15+ tables with RLS (Row Level Security) policies
- **Vector Extension**: pgvector for embeddings
- **Full-text Search**: tsvector for keyword search
- **Triggers**: Auto-update timestamps, handle cascading deletes

**Storage Buckets**: Supabase Storage
- **pdfs** bucket - Stores actual PDF files
  - Path format: `smart-recovery/{timestamp}-{filename}.pdf`
  - Caching: 3600s (1 hour)
  - Content-Type: application/pdf

---

### B. DATA INGESTION FLOW

```
1. SCRAPING PHASE (via Firecrawl)
   - Start full crawl → Creates scraping_job record
   - Firecrawl crawls smartrecoveryaustralia.com.au
   - Returns: ~1000+ pages with markdown & metadata
   - Stores: HTML, markdown, metadata in Firecrawl temporarily

2. PROCESSING PHASE (via /api/content/scrape-full)
   - For each page:
     ├─ Extract metadata (title, description, keywords, author, date)
     ├─ Classify content type (page|pdf|resource|tool|article)
     ├─ Classify category (Facilitator Resources, Tools, etc.)
     ├─ Extract tags (CBA, Hierarchy of Values, Burnout, etc.)
     ├─ Calculate quality_score (0-1 based on content structure)
     ├─ Calculate relevance_score (0-1 based on SMART terms)
     └─ Store in scraped_content table

   - If PDF:
     ├─ Download PDF file
     ├─ Upload to Supabase Storage (pdfs bucket)
     ├─ Extract text content (via Firecrawl markdown)
     ├─ Classify PDF category & tool_type
     ├─ Identify target_audience
     └─ Store in pdf_documents table

3. EMBEDDING PHASE
   - Chunk content into 500-word segments
   - For each chunk:
     ├─ Generate embedding (OpenAI text-embedding-ada-002)
     ├─ Store embedding vector (1536 dimensions)
     ├─ Link to source content
     └─ Rate limit: 50ms between requests

4. RECOMMENDATION PHASE
   - Identify high-quality content (quality_score ≥ 0.6)
   - Determine recommendation_type based on content characteristics
   - Calculate confidence_score = quality_score
   - Determine target_audience & relevant_themes
   - Store in content_recommendations table
```

---

### C. QUALITY METRICS

**Quality Score** (0-1):
- Content length > 100 words: +0.1
- Content length > 500 words: +0.1
- Content length > 1000 words: +0.1
- Has title (>10 chars): +0.2
- Has description (>20 chars): +0.2
- Has paragraphs: +0.1
- Has headers: +0.1
- Has formatting: +0.1

**Relevance Score** (0-1):
- Checks for SMART-specific terms:
  - Recovery, facilitator, participant, meeting
  - Tool, worksheet, CBA, cost benefit
  - Change plan, ABC, urge, hierarchy, values
  - Self-empowerment, addiction, 4-point program
- 5% per matching term (max 100%)

**Page Filtering** - Pages are skipped if:
- Asset files (jpg, png, css, js, etc.)
- Asset pages (hubfs, untitled)
- 404 pages
- < 50 words of content
- Address pages (meeting locations)
- Long query parameters (duplicates)

---

## 3. PDF STORAGE & LINKING

### A. PDF DOWNLOAD & STORAGE FLOW

**Step 1: Download from Firecrawl**
```typescript
// When processing PDF page from Firecrawl:
- url = page.metadata.sourceURL (e.g., .../document.pdf)
- markdown = page.markdown (extracted text)
```

**Step 2: Download to Supabase Storage**
```typescript
async function downloadAndStorePDF(
  supabase, pdfUrl, title
): Promise<string> {
  // 1. Fetch PDF file from URL
  const response = await fetch(pdfUrl)
  const buffer = await response.arrayBuffer()
  
  // 2. Generate safe filename
  const timestamp = Date.now()
  const safeFilename = `${timestamp}-${originalFilename}`
  const storagePath = `smart-recovery/${safeFilename}`
  
  // 3. Upload to Supabase Storage
  await supabase.storage
    .from('pdfs')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: false
    })
  
  // 4. Return storage path
  return storagePath
}
```

**Step 3: Store Metadata in Database**
```sql
INSERT INTO pdf_documents (
  scraped_content_id,  -- Link to parent scraped_content record
  title,               -- PDF title
  url,                 -- Original source URL
  file_path,           -- Supabase storage path
  extracted_text,      -- Text from Firecrawl markdown
  markdown_content,    -- Markdown version
  category,            -- facilitator-guide, participant-worksheet, etc.
  tool_type,           -- CBA, hierarchy-of-values, etc.
  target_audience,     -- ['facilitators'], ['participants'], etc.
  file_size_bytes,     -- From metadata
  page_count,          -- From metadata
  quality_score        -- Calculated
)
```

---

### B. PDF LINKING STRUCTURE

```
scraped_content (HTML page containing PDF link)
    ↓ (1-1 relationship)
pdf_documents
    ├── file_path → Supabase Storage (actual PDF file)
    ├── url → Original source URL
    ├── extracted_text → Content from Firecrawl
    └── content_embeddings (chunks of text)
        └── embedding (vector for semantic search)
```

---

### C. PDF RETRIEVAL

**Get PDF metadata:**
```sql
SELECT * FROM pdf_documents WHERE id = ?
-- Returns: title, category, file_path, target_audience, etc.
```

**Access PDF file:**
```typescript
// Via Supabase Storage URL:
const publicUrl = supabase.storage
  .from('pdfs')
  .getPublicUrl(file_path)
```

---

## 4. SCRAPING LOGIC & DATA COLLECTION

### A. SCRAPING SYSTEM OVERVIEW

**Tool**: Firecrawl (https://firecrawl.dev)
- Web scraping and crawling service
- Handles JS-rendered content
- Extracts metadata automatically
- Returns: HTML, Markdown, PDFs

**Integration Points**:
1. `/api/content/scrape-full` - Main scraping endpoint
2. `/scripts/scrape-smart-site.ts` - CLI script for full crawls

---

### B. FULL CRAWL PROCESS

**Target Site**: https://smartrecoveryaustralia.com.au

**Configuration**:
```typescript
const crawlConfig = {
  limit: 1000,              // Max pages to crawl
  scrapeOptions: {
    formats: ['markdown', 'html'],
    onlyMainContent: true,
    includeTags: ['article', 'main', 'content', 'div'],
    excludeTags: ['nav', 'footer', 'header', 'aside', 'script', 'style']
  }
}
```

**Job Lifecycle**:
```
1. START_CRAWL (POST /api/content/scrape-full)
   Input:  { action: 'start_crawl', url: 'https://smartrecoveryaustralia.com.au' }
   Output: { success: true, jobId: UUID, firecrawlJobId: string }
   ↓
2. MONITOR CRAWL (check_status action, polls every 10s)
   Tracks: pages_discovered, pages_scraped, progress_percent
   Timeout: 20 minutes, then fails
   ↓
3. CRAWL COMPLETES
   Status moves to 'completed'
   Triggers automatic processing phase
   ↓
4. PROCESS_RESULTS (POST with action: 'process_results')
   Starts background processing (no wait)
   Returns immediately with processing started message
   ↓
5. MONITOR PROCESSING (check_processing action, polls every 10s)
   Tracks: pages_processed, pdfs_processed, errors_count
   Timeout: 60 minutes
   ↓
6. PROCESSING COMPLETE
   All pages embedded and recommendations generated
   Status moves to 'processed'
```

---

### C. DATA COLLECTED PER PAGE

**From Firecrawl:**
```
page.metadata:
  - title (HTML <title>)
  - description (meta description)
  - keywords (meta keywords, split into array)
  - sourceURL (original URL)
  - links (external & internal)
  - fileSize (for PDFs)
  - pageCount (for PDFs)

page.markdown: Full content as markdown
page.html: Raw HTML content
```

**Extracted by Processing:**
```
- URL classification (PDF vs page vs resource)
- Content type determination
- Category classification (Facilitator Resources, Tools, etc.)
- Tag extraction (CBA, Burnout, Cultural Safety, etc.)
- Word count & reading time
- Quality score (0-1)
- Relevance score (0-1)
- Title & description validation
- Target audience inference
```

---

### D. ERROR HANDLING & RETRIES

**Timeout Configuration**:
```
- startCrawl: 90 seconds
- getCrawlStatus: 120 seconds (with client 150s timeout)
- API client timeout: 5 minutes for requests
```

**Retry Logic**:
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
  // Max retries: 3
  // Applies to Supabase inserts/updates
}
```

**Error Tracking**:
```
- errors_count in scraping_jobs
- error_message field
- Continues processing even with individual page errors
- Reports summary at end
```

---

### E. CONTENT CLASSIFICATION LOGIC

**Content Type Detection**:
```typescript
function classifyContentType(url, title) {
  if (url.endsWith('.pdf')) return 'pdf'
  if (url.includes('/tool')) return 'tool'
  if (url.includes('/worksheet')) return 'tool'
  if (url.includes('/resource')) return 'resource'
  if (url.includes('/article') || url.includes('/blog')) return 'article'
  return 'page'
}
```

**Category Classification**:
```
Facilitator Resources     → contains 'facilitator'
Tools & Worksheets       → contains 'tool' or 'worksheet'
Training Materials       → contains 'training'
Participant Resources    → contains 'participant' or 'member'
Research & Evidence      → contains 'research' or 'evidence'
Family & Friends         → contains 'family' or 'friend'
Handbooks & Manuals      → contains 'handbook' or 'manual'
Meeting Resources        → contains 'meeting'
Cultural Safety          → contains 'cultural', 'aboriginal', 'torres strait'
```

**Tag Extraction**:
```
Pattern Matching for:
- CBA (cost benefit analysis)
- Hierarchy of Values
- ABC Urge Log
- Change Plan
- SMART Goals
- Self-Care
- Burnout
- Cultural Safety
- Facilitator-related
- Online/Face-to-Face meetings
- Training
```

**Tool Type Detection** (for PDFs):
```
CBA                  → pattern: /\bcba\b|cost.?benefit/
Hierarchy of Values  → pattern: /hierarchy.?of.?values/
ABC Urge Log        → pattern: /\babc\b|urge.?log/
Change Plan         → pattern: /change.?plan/
SMART Goals         → pattern: /\bsmart\b|specific.?measurable/
Problem Solving     → pattern: /problem.?solving/
Brainstorming       → pattern: /brainstorm/
```

---

## 5. EMBEDDING & AI ANALYSIS IMPLEMENTATION

### A. VECTOR EMBEDDINGS

**Embedding Model**: OpenAI `text-embedding-ada-002`
- Dimension: 1536
- Cost: Very low (~$0.02 per 1M tokens)
- Quality: High for semantic search

**Chunking Strategy**:
```
- Words per chunk: 500 (conservative)
- Token estimate: 500 words ≈ 666 tokens (under 8192 limit)
- Chunk size check: Skip if > 8000 estimated tokens
- Fallback splitting: Recursively chunk to 250 words if needed
- Rate limiting: 50ms wait between API calls
```

**Storage Structure**:
```
For each scraped page:
1. Split content into 500-word chunks
2. Generate embedding for each chunk
3. Store:
   {
     scraped_content_id,
     chunk_index: 0,
     chunk_text: "actual text...",
     chunk_size: 500,
     embedding: [0.123, -0.456, ...] (1536 values),
     section_title: "Title (Part 1)",
     content_type: "page"
   }

For PDFs: Same structure, but pdf_document_id instead of scraped_content_id
```

**Search Capability**:
```
SELECT * FROM content_embeddings
WHERE 1 - (embedding <=> query_embedding) > 0.7  -- Cosine similarity
ORDER BY embedding <=> query_embedding
LIMIT 10
```

---

### B. SEMANTIC SEARCH IMPLEMENTATION

**Location**: `/api/content/search/route.ts`

**Search Types**:

1. **Semantic Search**:
   ```typescript
   POST /api/content/search
   {
     "query": "How do I handle burnout?",
     "searchType": "semantic",
     "limit": 20,
     "minSimilarity": 0.7
   }
   
   Process:
   1. Generate embedding for query
   2. Call Supabase RPC: search_content_by_embedding()
   3. Return top 20 results sorted by cosine similarity
   ```

2. **Keyword Search**:
   ```typescript
   Uses PostgreSQL full-text search (tsvector)
   Searches: title (weight A) > content (weight B) > description (weight C)
   ```

3. **Hybrid Search**:
   ```typescript
   Combines semantic + keyword results
   Boosts results that match both
   ```

---

### C. INTERVIEW ANALYSIS

**Location**: `/api/interviews/analyze/route.ts`

**Model**: GPT-4 Turbo Preview
- Temperature: 0.3 (consistent analysis)
- Max tokens: 4000
- Response format: JSON object

**Analysis Prompt Structure**:
```
System Prompt: "You are a world-class qualitative researcher and thematic analyst..."

Analyzed Dimensions:
- Community & Connection
- Learning & Development
- Platform Needs
- Cultural Safety
- Time & Capacity
- Support Ecosystem
```

**Output Structure**:
```json
{
  "executiveSummary": "3-4 sentence synthesis",
  "keyThemes": [
    {
      "theme": "Theme name",
      "description": "2-3 sentences",
      "evidence": ["Supporting quotes"],
      "implications": "What this means for design"
    }
  ],
  "platformPriorities": [
    {
      "feature": "Feature name",
      "priority": "Critical|High|Medium",
      "rationale": "Why it matters",
      "designConsiderations": "Implementation guidance"
    }
  ],
  "learnWorldContent": [
    {
      "courseTitle": "Proposed course title",
      "description": "Course coverage",
      "targetAudience": "Who needs this",
      "format": "Video series|Podcast|Micro-learning|Workshop|Resource Library",
      "rationale": "Why this content is needed",
      "keyLearningOutcomes": ["Outcome 1", "Outcome 2"]
    }
  ],
  "culturalSafetyInsights": {
    "keyNeeds": ["Need 1"],
    "protocolConsiderations": ["Consideration 1"],
    "governanceImplications": "What this means"
  },
  "mostPowerfulQuote": {
    "quote": "Exact quote",
    "significance": "Why it matters"
  },
  "strategicRecommendations": [
    {
      "recommendation": "Specific action",
      "priority": "Immediate|Short-term|Long-term",
      "impact": "Expected impact",
      "implementationGuidance": "How to do it"
    }
  ],
  "crossCuttingPatterns": "Broader patterns noted"
}
```

**Storage**:
```sql
INSERT INTO interview_analysis (
  interview_id,
  executive_summary,
  key_themes,
  powerful_quotes,
  learnworld_content_suggestions,
  platform_implications,
  cultural_considerations,
  model_used,
  tokens_used,
  analyzed_at
) VALUES (...)
```

---

### D. FACILITATOR INSIGHTS EXTRACTION

**Sources**:
- Interview analysis (key_themes, challenges, insights)
- Chat conversations
- User feedback
- Manual entries

**Processing**:
```
From Interview Analysis:
1. Extract insight_type (challenge, tool_gap, training_need, etc.)
2. Extract evidence (supporting quotes)
3. Calculate urgency_level & impact_score
4. Link to interview as source_id
5. Store in facilitator_insights table

Aggregation:
- mention_count = how many times insight appeared
- related_insights = group similar insights
- generated_recommendations = create content recommendations
```

**Example Insight**:
```json
{
  "insight_type": "challenge",
  "title": "Facilitator Burnout from Meeting Coordination",
  "description": "Multiple facilitators report burnout from...",
  "source_type": "interview",
  "source_ids": ["interview-123", "interview-456"],
  "mention_count": 4,
  "urgency_level": "high",
  "impact_score": 0.85,
  "status": "planning",
  "suggested_content": ["resource-xyz"],
  "generated_recommendations": ["recommendation-123"]
}
```

---

### E. RECOMMENDATION GENERATION

**Automated Recommendations**:
```typescript
// Triggered after crawl completion

For each high-quality content (quality_score ≥ 0.6):
1. Determine recommendation_type:
   - If has 'facilitator' tag → facilitator_support
   - If has 'tool' tag → tool_suggestion
   - If has 'training' tag → training_material
   - If for 'participant' → participant_resource
   - If quality_score > 0.8 → similar_content

2. Calculate fields:
   - confidence_score = quality_score
   - target_audience = extracted from content
   - relevant_themes = from tags
   - reason = auto-generated explanation

3. Store in content_recommendations table
```

---

### F. AI-POWERED CONTENT GENERATION

**Location**: `/api/content-generator/route.ts`

**Purpose**: Generate facilitator-specific responses

**Process**:
1. Receive user query
2. Perform semantic search on content embeddings
3. Get top 5-10 relevant content chunks
4. Pass to GPT-4 with context
5. Generate response grounded in actual content
6. Track in content_usage analytics

---

## 6. API ENDPOINTS SUMMARY

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/content/scrape-full` | POST | Start/monitor/process crawls |
| `/api/content/search` | POST | Semantic/keyword/hybrid search |
| `/api/content/recommendations` | GET | Get recommendations for user |
| `/api/interviews/analyze` | POST | Analyze single interview |
| `/api/interviews/analyze-all` | POST | Batch analyze interviews |
| `/api/interviews/upload` | POST | Upload interview files |
| `/api/chat` | POST | Chat with AI (context-aware) |
| `/api/content-generator` | POST | Generate facilitator responses |

---

## 7. KEY METRICS & MONITORING

**Tracked in scraping_jobs**:
- pages_discovered, pages_scraped, pages_processed
- pdfs_found, pdfs_processed
- errors_count
- progress_percent
- duration_seconds

**Tracked in content_embeddings**:
- Total embeddings generated
- Dimensions: 1536
- Coverage: % of content with embeddings

**Tracked in content_usage**:
- action_type distribution (view, download, share, save, dismiss)
- time_spent_seconds (engagement metric)
- scroll_depth_percent
- search_query analysis

**Tracked in content_recommendations**:
- Engagement rates (view_count, click_count, save_count)
- CTR = click_count / view_count
- Save rate = save_count / view_count

---

## 8. CURRENT DATA STATUS

### Supabase Tables Created
✅ scraped_content
✅ pdf_documents
✅ content_embeddings
✅ content_recommendations
✅ facilitator_insights
✅ content_usage
✅ scraping_jobs
✅ interviews
✅ interview_analysis
✅ interview_embeddings
✅ learnworld_courses
✅ platform_features
✅ conversations
✅ messages
✅ user_profiles

### Storage Buckets
✅ pdfs bucket (for PDF file storage)

### Features Implemented
✅ Full web crawling via Firecrawl
✅ PDF download and storage
✅ Vector embeddings (OpenAI)
✅ Semantic search
✅ Interview analysis (GPT-4)
✅ Content recommendations
✅ Facilitator insights
✅ Error handling & retry logic
✅ Full-text search
✅ RLS policies

---

## 9. DEPLOYMENT NOTES

**Environment Variables Required**:
```
FIRECRAWL_API_KEY=...
OPENAI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Database Extensions**:
- uuid-ossp
- vector (pgvector)

**Rate Limits**:
- Embedding generation: 50ms between requests
- Firecrawl: Subject to API limits (check docs)
- OpenAI: Standard rate limits

**Storage**:
- Supabase Storage (pdfs bucket)
- Supabase PostgreSQL (all data tables)

