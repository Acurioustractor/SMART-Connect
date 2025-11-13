# SMART Connect - Data Enhancement & AI Analysis Framework Plan

## Executive Summary

This document outlines a comprehensive plan to:
1. **Clean and enrich** existing Supabase data
2. **Enhance PDF linking** with better relationships and metadata
3. **Build advanced AI analysis** frameworks with embeddings
4. **Create strong linkages** between content (knowledge graph)
5. **Implement intelligent suggestions** as new information is added

---

## 1. CURRENT STATE REVIEW

### What's Already in Supabase

Based on recent git commits and schema:
- ✅ **~1000+ scraped pages** from smartrecoveryaustralia.com.au
- ✅ **PDF documents** with storage in Supabase Storage
- ✅ **Basic embeddings** (1536-dimensional, OpenAI ada-002)
- ✅ **Content recommendations** system
- ✅ **Interview analysis** with GPT-4
- ✅ **Facilitator insights** tracking

### Data Quality Issues to Address

1. **Inconsistent Metadata**
   - Missing `published_date` on many pages
   - Incomplete `author` information
   - Empty or generic `meta_description` fields
   - Unstructured `tags` arrays

2. **PDF Linking Gaps**
   - PDFs not consistently linked to parent pages
   - Missing `tool_type` classification
   - Incomplete `target_audience` arrays
   - No version tracking for updated PDFs

3. **Embedding Limitations**
   - Only content-based embeddings (no metadata)
   - No cross-document relationship embeddings
   - Missing conversation-to-content embeddings
   - No temporal embeddings (time-aware context)

4. **Weak Content Linkages**
   - No explicit knowledge graph
   - Manual `internal_links` arrays (not queryable)
   - Missing concept/theme linkages
   - No tool-to-resource mappings

---

## 2. DATA CLEANING & ENRICHMENT STRATEGY

### Phase 1: Metadata Enhancement

**Goal**: Fill gaps and standardize metadata across all content

#### Actions:

**A. Enrich Scraped Content**
```sql
-- Identify content with missing metadata
SELECT id, url, title,
  CASE
    WHEN published_date IS NULL THEN 'missing_date'
    WHEN author IS NULL THEN 'missing_author'
    WHEN meta_description IS NULL OR meta_description = '' THEN 'missing_description'
    WHEN array_length(tags, 1) IS NULL THEN 'missing_tags'
  END as issue
FROM scraped_content
WHERE published_date IS NULL
   OR author IS NULL
   OR meta_description IS NULL
   OR array_length(tags, 1) IS NULL;
```

**Enrichment API Endpoint**: `/api/content/enrich`
```typescript
POST /api/content/enrich
{
  "contentId": "uuid",
  "enrichmentType": "metadata" | "tags" | "classification"
}

// Uses GPT-4 to:
// 1. Extract/infer publication date from content
// 2. Identify author/source from page structure
// 3. Generate quality meta descriptions
// 4. Extract comprehensive tags based on content analysis
// 5. Improve category classification
```

**B. Standardize Tags**

Create a **controlled vocabulary** for tags:

```sql
-- Create tag taxonomy table
CREATE TABLE content_tag_taxonomy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_name TEXT NOT NULL UNIQUE,
  category TEXT, -- 'tool', 'theme', 'audience', 'format'
  parent_tag TEXT,
  description TEXT,
  synonyms TEXT[], -- Alternative spellings/terms
  usage_count INTEGER DEFAULT 0
);

-- Populate with SMART Recovery concepts
INSERT INTO content_tag_taxonomy (tag_name, category, description) VALUES
  ('CBA', 'tool', 'Cost-Benefit Analysis'),
  ('Hierarchy of Values', 'tool', 'Values ranking exercise'),
  ('ABC', 'tool', 'Antecedent-Behavior-Consequence'),
  ('SMART Goals', 'tool', 'Specific, Measurable, Achievable, Relevant, Time-bound'),
  ('Burnout', 'theme', 'Facilitator burnout and fatigue'),
  ('Cultural Safety', 'theme', 'Culturally safe practice'),
  ('Online Meetings', 'format', 'Virtual meeting resources'),
  ('Face-to-Face', 'format', 'In-person meeting resources');
```

**C. Calculate Enhanced Quality Scores**

Add new quality dimensions:

```typescript
interface EnhancedQualityMetrics {
  content_quality: number    // Existing (0-1)
  metadata_completeness: number  // 0-1 based on filled fields
  link_richness: number      // 0-1 based on internal/external links
  engagement_score: number   // 0-1 based on usage analytics
  freshness_score: number    // 0-1 based on last_updated
  composite_score: number    // Weighted average
}
```

### Phase 2: PDF Enhancement

**Goal**: Complete PDF metadata and create stronger linkages

#### Actions:

**A. Extract Missing PDF Metadata**

Use `pdf-parse` library to extract metadata from stored PDFs:

```typescript
import pdf from 'pdf-parse'

async function enrichPdfMetadata(pdfId: string) {
  // 1. Download PDF from Supabase Storage
  const { data } = await supabase.storage
    .from('pdfs')
    .download(file_path)

  // 2. Extract metadata
  const pdfData = await pdf(data)

  // 3. Update record
  await supabase
    .from('pdf_documents')
    .update({
      page_count: pdfData.numpages,
      metadata: {
        producer: pdfData.info?.Producer,
        creator: pdfData.info?.Creator,
        creationDate: pdfData.info?.CreationDate,
        modDate: pdfData.info?.ModDate,
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        subject: pdfData.info?.Subject,
        keywords: pdfData.info?.Keywords
      }
    })
    .eq('id', pdfId)
}
```

**B. Classify PDFs with GPT-4**

Use vision model to analyze PDF structure:

```typescript
// For each PDF, send first page + extracted text to GPT-4
const classification = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [{
    role: "system",
    content: `Analyze this SMART Recovery document and extract:
    1. Tool type (CBA, Hierarchy of Values, ABC, Change Plan, etc.)
    2. Target audience (facilitators, participants, family, trainers)
    3. Smart Tool Number (Tool 1, Tool 2, etc.)
    4. Category (facilitator-guide, participant-worksheet, training-manual)
    5. Version number (if any)
    6. Language
    7. Cultural adaptations (if any)`
  }, {
    role: "user",
    content: `Title: ${pdf.title}\n\nContent:\n${pdf.extracted_text.slice(0, 3000)}`
  }],
  response_format: { type: "json_object" }
})
```

**C. Link PDFs to Related Content**

Create explicit relationships:

```sql
-- New table for content relationships
CREATE TABLE content_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_content_id UUID, -- Can be scraped_content or pdf_document
  source_type TEXT CHECK (source_type IN ('page', 'pdf', 'interview')),
  target_content_id UUID,
  target_type TEXT CHECK (target_type IN ('page', 'pdf', 'interview')),
  relationship_type TEXT CHECK (relationship_type IN (
    'references',      -- Source cites target
    'prerequisite',    -- Target should be read before source
    'related_tool',    -- Both are related SMART tools
    'same_topic',      -- Cover same theme/topic
    'updated_version', -- Target is newer version of source
    'translation',     -- Different language version
    'adaptation',      -- Cultural/regional adaptation
    'example_of',      -- Source is example of target concept
    'supports',        -- Source supports understanding target
    'contradicts'      -- Source contradicts target (edge case)
  )),
  relationship_strength FLOAT DEFAULT 0.5, -- 0-1 confidence
  metadata JSONB, -- Additional context
  created_at TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT false
);

CREATE INDEX idx_content_rel_source ON content_relationships(source_content_id, source_type);
CREATE INDEX idx_content_rel_target ON content_relationships(target_content_id, target_type);
CREATE INDEX idx_content_rel_type ON content_relationships(relationship_type);
```

### Phase 3: Conversation Linkage

**Goal**: Connect chat conversations to relevant content

```sql
-- Enhance messages table to track content references
ALTER TABLE messages
ADD COLUMN referenced_content_ids UUID[],
ADD COLUMN referenced_pdf_ids UUID[],
ADD COLUMN referenced_insights UUID[],
ADD COLUMN topic_tags TEXT[];

-- When AI responds with content suggestions, store the connections
-- This builds a graph of: User Question → Content → Related Questions
```

---

## 3. ADVANCED EMBEDDINGS & AI FRAMEWORK

### Multi-Modal Embedding Strategy

Move beyond simple content embeddings to a **multi-dimensional semantic space**:

#### A. Hybrid Embedding Types

```typescript
interface EmbeddingStrategy {
  content_semantic: vector(1536)      // Existing: What it says
  structural: vector(384)             // NEW: How it's organized
  intent: vector(384)                 // NEW: What problem it solves
  audience: vector(256)               // NEW: Who it's for
  temporal: vector(128)               // NEW: Time/version context
  cross_lingual?: vector(768)         // NEW: For translations
}
```

**Implementation**:

```sql
-- Expand content_embeddings table
ALTER TABLE content_embeddings
ADD COLUMN embedding_type TEXT DEFAULT 'content_semantic',
ADD COLUMN embedding_model TEXT DEFAULT 'text-embedding-ada-002',
ADD COLUMN embedding_dimensions INTEGER DEFAULT 1536;

-- Allow different embedding sizes
ALTER TABLE content_embeddings
ALTER COLUMN embedding TYPE vector; -- Variable dimensions

-- Add metadata for embedding context
ALTER TABLE content_embeddings
ADD COLUMN embedding_metadata JSONB;
```

#### B. Intent-Based Embeddings

Capture **why** someone would use this content:

```typescript
// Generate intent embeddings for each piece of content
async function generateIntentEmbedding(content: Content) {
  // 1. Extract intent with GPT-4
  const intent = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "system",
      content: "Extract the primary use cases and problems this content solves. Return as a structured list."
    }, {
      role: "user",
      content: `Title: ${content.title}\n\nContent: ${content.content.slice(0, 2000)}`
    }]
  })

  // 2. Generate embedding from intent description
  const embedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: intent.choices[0].message.content
  })

  // 3. Store with type 'intent'
  await supabase.from('content_embeddings').insert({
    scraped_content_id: content.id,
    embedding_type: 'intent',
    chunk_text: intent.choices[0].message.content,
    embedding: embedding.data[0].embedding
  })
}
```

#### C. Cross-Content Relationship Embeddings

**Concept**: Embed the *relationship* between two pieces of content

```typescript
// For each content pair with a relationship:
async function generateRelationshipEmbedding(
  sourceContent: Content,
  targetContent: Content,
  relationshipType: string
) {
  // Create a description of the relationship
  const relationshipDesc = `${sourceContent.title} ${relationshipType} ${targetContent.title}.
    Source: ${sourceContent.content.slice(0, 500)}
    Target: ${targetContent.content.slice(0, 500)}`

  // Embed the relationship
  const embedding = await openai.embeddings.create({
    input: relationshipDesc
  })

  // Store in new table
  await supabase.from('relationship_embeddings').insert({
    source_id: sourceContent.id,
    target_id: targetContent.id,
    relationship_type: relationshipType,
    embedding: embedding.data[0].embedding
  })
}
```

**New Table**:
```sql
CREATE TABLE relationship_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_content_id UUID,
  target_content_id UUID,
  relationship_type TEXT,
  embedding vector(1536),
  strength FLOAT, -- 0-1
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Advanced AI Analysis Frameworks

#### Framework 1: Thematic Knowledge Graph

**Goal**: Automatically build a concept map of SMART Recovery content

```typescript
interface ThemeNode {
  id: string
  name: string          // e.g., "Facilitator Burnout"
  category: string      // e.g., "challenge", "tool", "concept"
  description: string
  embedding: number[]   // Semantic representation
  confidence: number

  // Graph connections
  relatedThemes: string[]
  supportingContent: string[]  // Content IDs
  commonQuestions: string[]    // From conversations
  facilitatorInsights: string[] // From interviews
}
```

**Implementation**:

```sql
CREATE TABLE theme_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  embedding vector(1536),
  confidence_score FLOAT,

  -- Connections
  related_themes UUID[], -- Other theme_nodes
  supporting_content_ids UUID[], -- From scraped_content/pdfs
  common_questions TEXT[], -- Extracted from conversations

  -- Analytics
  mention_count INTEGER DEFAULT 0,
  last_mentioned TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE theme_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_theme_id UUID REFERENCES theme_nodes(id),
  target_theme_id UUID REFERENCES theme_nodes(id),
  relationship_type TEXT, -- 'prerequisite', 'related', 'contradicts', 'example'
  strength FLOAT, -- 0-1
  evidence TEXT[], -- Supporting quotes/references
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_theme_embedding ON theme_nodes USING ivfflat (embedding vector_cosine_ops);
```

**Auto-generate themes** from content:

```typescript
async function extractThemes(content: Content[]) {
  // Use GPT-4 to analyze content and extract themes
  const themes = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "system",
      content: `Analyze this collection of SMART Recovery content and extract:
      1. Major themes and concepts
      2. Relationships between themes
      3. Common questions/challenges
      4. Tool categories

      Return as structured JSON with confidence scores.`
    }, {
      role: "user",
      content: JSON.stringify(content.map(c => ({
        title: c.title,
        excerpt: c.content.slice(0, 1000),
        tags: c.tags
      })))
    }],
    response_format: { type: "json_object" }
  })

  // Store themes and relationships
  // Generate embeddings for each theme
  // Link to supporting content
}
```

#### Framework 2: Conversational Context System

**Goal**: Track what users ask about and connect to content

```sql
CREATE TABLE conversation_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id),

  -- Extracted topic
  topic_name TEXT NOT NULL,
  topic_category TEXT, -- 'question', 'problem', 'request', 'feedback'

  -- Semantic representation
  topic_embedding vector(1536),

  -- Connected content
  suggested_content_ids UUID[], -- What was recommended
  accessed_content_ids UUID[],  -- What user actually viewed
  was_helpful BOOLEAN,

  -- Context
  user_role TEXT, -- 'facilitator', 'coordinator', etc.
  urgency TEXT,   -- 'low', 'medium', 'high'

  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable finding similar past conversations
CREATE INDEX idx_conversation_topics_embedding
ON conversation_topics USING ivfflat (topic_embedding vector_cosine_ops);
```

**Usage**:
```typescript
// When user asks a question:
async function handleUserQuery(query: string, conversationId: string) {
  // 1. Generate query embedding
  const queryEmbedding = await getEmbedding(query)

  // 2. Find similar past topics
  const similarTopics = await supabase.rpc('find_similar_topics', {
    query_embedding: queryEmbedding,
    limit: 5
  })

  // 3. Get what content was helpful in those cases
  const helpfulContent = await supabase
    .from('conversation_topics')
    .select('accessed_content_ids, was_helpful')
    .in('id', similarTopics.map(t => t.id))
    .eq('was_helpful', true)

  // 4. Recommend that content first
  // 5. Also do semantic search on content
  // 6. Combine and rank results

  return rankedRecommendations
}
```

#### Framework 3: Progressive Content Discovery

**Goal**: As users engage with content, suggest related material in a learning path

```sql
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  target_audience TEXT[],

  -- Ordered sequence of content
  content_sequence JSONB, -- [{content_id, order, type, is_required, estimated_time}]

  -- Prerequisites
  prerequisite_paths UUID[], -- Other learning_paths

  -- Metadata
  difficulty_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  estimated_duration_minutes INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE user_learning_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id),
  learning_path_id UUID REFERENCES learning_paths(id),

  -- Progress
  completed_content_ids UUID[],
  current_position INTEGER, -- Index in content_sequence
  completion_percentage FLOAT,

  -- Analytics
  started_at TIMESTAMP,
  last_accessed TIMESTAMP,
  completed_at TIMESTAMP,
  time_spent_seconds INTEGER,

  UNIQUE(user_id, learning_path_id)
);
```

**Auto-generate paths** from content relationships:

```typescript
async function generateLearningPath(startingContentId: string, goalDescription: string) {
  // 1. Get starting content
  const startContent = await getContent(startingContentId)

  // 2. Use GPT-4 to plan learning sequence
  const plan = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "system",
      content: `You are a learning path designer. Create a progressive sequence of content
      that takes someone from their current knowledge to the goal.`
    }, {
      role: "user",
      content: `Starting point: ${startContent.title}
      Goal: ${goalDescription}

      Available content: ${JSON.stringify(availableContent)}

      Create an ordered learning path with rationale for each step.`
    }]
  })

  // 3. Store as learning_path
  // 4. Link content in sequence
}
```

---

## 4. BUILDING STRONG CONTENT LINKAGES

### Knowledge Graph Architecture

Create a **unified knowledge graph** connecting all entities:

```
Themes ←→ Content ←→ Tools ←→ Questions ←→ Insights ←→ Interviews
   ↓         ↓         ↓          ↓           ↓
   └─────────────── Embeddings ─────────────┘
```

#### Graph Nodes:

```sql
CREATE TYPE node_type AS ENUM (
  'theme',
  'content_page',
  'pdf_tool',
  'interview',
  'insight',
  'question',
  'facilitator',
  'concept',
  'challenge'
);

CREATE TABLE knowledge_graph_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_type node_type NOT NULL,

  -- Reference to actual entity
  entity_id UUID NOT NULL,
  entity_table TEXT NOT NULL, -- 'scraped_content', 'pdf_documents', etc.

  -- Graph metadata
  label TEXT NOT NULL,
  description TEXT,
  properties JSONB,

  -- Semantic representation
  embedding vector(1536),

  -- Graph metrics
  centrality_score FLOAT, -- How connected/important
  page_rank FLOAT,
  community_id UUID, -- Cluster/group membership

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kg_nodes_type ON knowledge_graph_nodes(node_type);
CREATE INDEX idx_kg_nodes_entity ON knowledge_graph_nodes(entity_id, entity_table);
CREATE INDEX idx_kg_nodes_embedding ON knowledge_graph_nodes USING ivfflat (embedding vector_cosine_ops);
```

#### Graph Edges:

```sql
CREATE TYPE edge_type AS ENUM (
  'references',
  'supports',
  'addresses',      -- Content addresses challenge/question
  'prerequisite_of',
  'similar_to',
  'part_of',        -- Tool is part of program
  'used_in',        -- Tool used in interview context
  'mentioned_in',
  'solves',         -- Content solves problem
  'exemplifies'     -- Content is example of concept
);

CREATE TABLE knowledge_graph_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  source_node_id UUID REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,

  edge_type edge_type NOT NULL,
  weight FLOAT DEFAULT 1.0, -- Strength of connection (0-1)

  -- Evidence
  evidence_text TEXT[],
  confidence FLOAT, -- 0-1

  -- Provenance
  created_by TEXT, -- 'system', 'user', 'gpt-4'
  is_verified BOOLEAN DEFAULT false,

  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(source_node_id, target_node_id, edge_type)
);

CREATE INDEX idx_kg_edges_source ON knowledge_graph_edges(source_node_id);
CREATE INDEX idx_kg_edges_target ON knowledge_graph_edges(target_node_id);
CREATE INDEX idx_kg_edges_type ON knowledge_graph_edges(edge_type);
```

#### Build Graph from Existing Data:

```typescript
async function buildKnowledgeGraph() {
  // 1. Create nodes for all entities
  await createNodesFromContent()
  await createNodesFromThemes()
  await createNodesFromInsights()
  await createNodesFromInterviews()

  // 2. Extract relationships using GPT-4
  await extractRelationshipsWithAI()

  // 3. Add embedding-based connections
  await findSemanticConnections()

  // 4. Calculate graph metrics
  await calculateGraphMetrics()
}

async function extractRelationshipsWithAI() {
  // For each pair of related content:
  const contentPairs = await findPotentiallyRelatedContent()

  for (const [contentA, contentB] of contentPairs) {
    const relationship = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{
        role: "system",
        content: `Analyze if and how these two pieces of content are related.
        Return relationship type and evidence.`
      }, {
        role: "user",
        content: `Content A: ${contentA.title}\n${contentA.content.slice(0, 1000)}

        Content B: ${contentB.title}\n${contentB.content.slice(0, 1000)}`
      }],
      response_format: { type: "json_object" }
    })

    if (relationship.is_related) {
      await createGraphEdge(contentA.id, contentB.id, relationship)
    }
  }
}
```

### Query the Knowledge Graph

```sql
-- Find all content addressing a specific challenge
WITH RECURSIVE challenge_solutions AS (
  SELECT
    kg.id,
    kg.entity_id,
    kg.label,
    0 as depth
  FROM knowledge_graph_nodes kg
  WHERE kg.node_type = 'challenge'
    AND kg.label ILIKE '%burnout%'

  UNION

  SELECT
    target_node.id,
    target_node.entity_id,
    target_node.label,
    cs.depth + 1
  FROM challenge_solutions cs
  JOIN knowledge_graph_edges e ON e.source_node_id = cs.id
  JOIN knowledge_graph_nodes target_node ON target_node.id = e.target_node_id
  WHERE e.edge_type IN ('addresses', 'solves', 'supports')
    AND cs.depth < 3 -- Max 3 hops
)
SELECT * FROM challenge_solutions;
```

---

## 5. INTELLIGENT SUGGESTION SYSTEM

### Real-Time Recommendation Engine

As new information is added, automatically suggest related content:

#### A. Event-Driven Suggestions

```typescript
// Supabase trigger: When new content is added
supabase
  .channel('content_changes')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'scraped_content' },
    async (payload) => {
      const newContent = payload.new

      // 1. Generate embedding
      await generateEmbeddings(newContent)

      // 2. Find similar existing content
      const similar = await findSimilarContent(newContent)

      // 3. Extract themes and add to knowledge graph
      await extractAndLinkThemes(newContent)

      // 4. Check which facilitator insights this addresses
      const addressedInsights = await findRelevantInsights(newContent)

      // 5. Create recommendations
      for (const insight of addressedInsights) {
        await createRecommendation({
          type: 'facilitator_support',
          content_id: newContent.id,
          reason: `This new content addresses: ${insight.title}`,
          relevant_challenges: [insight.title],
          confidence_score: calculateConfidence(newContent, insight)
        })
      }

      // 6. Notify relevant users
      await notifyInterestedUsers(newContent, addressedInsights)
    }
  )
  .subscribe()
```

#### B. Contextual Suggestions During Conversations

```typescript
// As conversation progresses, suggest relevant content
async function generateContextualSuggestions(
  conversationId: string,
  latestMessage: string
) {
  // 1. Analyze conversation history
  const context = await analyzeConversationContext(conversationId)

  // 2. Extract current intent/need
  const intent = await extractIntent(latestMessage, context)

  // 3. Multi-strategy search:
  const suggestions = await Promise.all([
    // 3a. Semantic search on content
    semanticContentSearch(intent.embedding),

    // 3b. Find similar past conversations
    findSimilarConversations(intent.embedding),

    // 3c. Query knowledge graph for related content
    queryKnowledgeGraph(intent.themes),

    // 3d. Check learning paths
    findRelevantLearningPaths(intent.topics),

    // 3e. Look for facilitator insights
    findMatchingInsights(intent.challenges)
  ])

  // 4. Rank and combine
  const ranked = rankSuggestions(suggestions, context)

  // 5. Explain why each is suggested
  return ranked.map(s => ({
    ...s,
    reason: generateExplanation(s, intent, context)
  }))
}
```

#### C. Proactive Insight Discovery

```typescript
// Daily job: Find emerging patterns and suggest new insights
async function discoverEmergingInsights() {
  // 1. Analyze recent conversations
  const recentConversations = await getRecentConversations(7) // Last 7 days

  // 2. Extract topics and cluster
  const topics = await extractTopics(recentConversations)
  const clusters = await clusterTopics(topics)

  // 3. For each cluster, check if we have existing insight
  for (const cluster of clusters) {
    const existingInsight = await findMatchingInsight(cluster)

    if (!existingInsight && cluster.mention_count > 3) {
      // 4. Create new insight
      const insight = await generateInsight(cluster)

      // 5. Find relevant content
      const supportingContent = await findRelevantContent(insight)

      // 6. Create recommendation if we have good content
      if (supportingContent.length > 0) {
        await createRecommendation({
          type: 'facilitator_support',
          content_ids: supportingContent.map(c => c.id),
          reason: `We noticed ${cluster.mention_count} facilitators asking about "${cluster.theme}"`,
          relevant_themes: [cluster.theme],
          based_on_facilitator_feedback: true,
          confidence_score: cluster.confidence
        })
      } else {
        // 7. Flag as content gap
        await createContentGapInsight(cluster)
      }
    }
  }
}
```

#### D. Version & Update Tracking

```sql
-- Track content versions
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID, -- scraped_content or pdf_document
  content_type TEXT,
  version_number TEXT, -- '1.0', '1.1', '2.0'

  -- What changed
  change_summary TEXT,
  change_type TEXT, -- 'minor_update', 'major_revision', 'correction', 'translation'

  -- Snapshots
  content_snapshot JSONB, -- Full content at this version

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_current BOOLEAN DEFAULT true
);

-- When content is updated, suggest who should be notified
CREATE TABLE content_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id),
  content_id UUID,
  content_type TEXT,

  -- Subscription preferences
  notify_on_update BOOLEAN DEFAULT true,
  notify_on_related BOOLEAN DEFAULT false,

  -- Context
  subscribed_reason TEXT, -- 'viewed', 'saved', 'discussed', 'requested'
  subscribed_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- ✅ Data audit: Run queries to identify gaps
- ✅ Enrich existing metadata with GPT-4
- ✅ Standardize tags using taxonomy
- ✅ Complete PDF classification
- ✅ Create content_relationships table
- ✅ Build initial relationship links

### Phase 2: Knowledge Graph (Week 3-4)
- ✅ Create knowledge graph schema (nodes + edges)
- ✅ Build nodes from existing data
- ✅ Extract relationships with GPT-4
- ✅ Add embedding-based connections
- ✅ Calculate graph metrics
- ✅ Create graph query API

### Phase 3: Advanced Embeddings (Week 5-6)
- ✅ Implement intent-based embeddings
- ✅ Create relationship embeddings
- ✅ Build theme extraction system
- ✅ Generate conversation topic embeddings
- ✅ Create multi-strategy search API

### Phase 4: Suggestion Engine (Week 7-8)
- ✅ Event-driven content suggestions
- ✅ Contextual conversation recommendations
- ✅ Proactive insight discovery
- ✅ Version tracking and notifications
- ✅ Learning path generation

### Phase 5: Refinement (Week 9-10)
- ✅ User testing and feedback
- ✅ Optimize query performance
- ✅ Refine recommendation algorithms
- ✅ Build analytics dashboard
- ✅ Documentation and training

---

## 7. API ENDPOINTS TO BUILD

```typescript
// Data Enrichment
POST /api/content/enrich
POST /api/content/classify-pdfs
POST /api/content/extract-relationships

// Knowledge Graph
GET  /api/knowledge-graph/explore
GET  /api/knowledge-graph/node/:id
POST /api/knowledge-graph/query
GET  /api/knowledge-graph/path/:sourceId/:targetId

// Embeddings
POST /api/embeddings/generate-intent
POST /api/embeddings/generate-relationship
GET  /api/embeddings/similar/:id

// Suggestions
GET  /api/suggestions/for-conversation/:conversationId
GET  /api/suggestions/for-content/:contentId
GET  /api/suggestions/emerging-insights
POST /api/suggestions/subscribe

// Learning Paths
GET  /api/learning-paths
POST /api/learning-paths/generate
GET  /api/learning-paths/:id/progress
POST /api/learning-paths/:id/track

// Analytics
GET  /api/analytics/content-performance
GET  /api/analytics/knowledge-graph-metrics
GET  /api/analytics/suggestion-effectiveness
GET  /api/analytics/conversation-trends
```

---

## 8. SUCCESS METRICS

Track effectiveness of enhancements:

1. **Data Quality**
   - % content with complete metadata
   - Average quality score improvement
   - Reduction in null fields

2. **Knowledge Graph**
   - Number of nodes and edges
   - Graph density
   - Average path length between concepts
   - Cluster coherence

3. **Embeddings**
   - Search relevance scores
   - User satisfaction with results
   - Time to find content

4. **Suggestions**
   - Click-through rate on recommendations
   - Content usage after suggestions
   - User feedback (helpful/not helpful)
   - Time saved vs. manual search

5. **Engagement**
   - User session duration
   - Content discovery rate
   - Return visitor rate
   - Learning path completion

---

## 9. NEXT STEPS

**Immediate Actions:**

1. **Run data audit** - Execute SQL queries to identify current gaps
2. **Start metadata enrichment** - Begin with high-traffic content
3. **Create relationship tables** - Set up graph infrastructure
4. **Generate initial embeddings** - Start with intent embeddings for top content
5. **Build first API** - Start with `/api/content/enrich`

**Tools Needed:**
- OpenAI API access (GPT-4 + Embeddings)
- Supabase access (already have)
- pdf-parse library (for PDF metadata)
- Graph visualization tool (optional, for exploring knowledge graph)

**Let's start implementing!** 🚀
