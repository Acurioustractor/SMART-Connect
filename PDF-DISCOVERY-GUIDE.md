# PDF Discovery & Management Guide

Complete guide for finding, downloading, tagging, and managing all PDFs on the SMART Recovery Australia website.

## Overview

The SMART Connect system has comprehensive tools for discovering and managing PDFs:

1. **Discover PDFs** - Find all PDFs on the site (from links and crawls)
2. **Download PDFs** - Process PDFs with Firecrawl and store them
3. **Link PDFs** - Connect PDFs to the `pdf_documents` table with metadata
4. **Tag & Classify** - Automatically categorize and tag PDFs
5. **Generate Embeddings** - Create vector embeddings for semantic search

## 📁 PDF Data Structure

PDFs are stored in two database tables:

### 1. `scraped_content` Table
- Stores the URL, extracted text, and markdown for ALL content (pages and PDFs)
- Fields: `url`, `title`, `content`, `markdown`, `content_type: 'pdf'`
- Links to source pages via `parent_url` field

### 2. `pdf_documents` Table
- Stores detailed PDF-specific metadata
- Fields: `category`, `tool_type`, `target_audience`, `file_path`, `page_count`
- References `scraped_content_id` to link back to the content table
- Classifies PDFs by type (facilitator-guide, worksheet, manual, etc.)

## 🔍 Discovery Tools

### Tool 1: Comprehensive PDF Discovery (`discover-all-pdfs.ts`)

**Purpose:** Find ALL PDFs on the site using multiple methods

**Location:** `hub/scripts/discover-all-pdfs.ts`

#### Commands:

```bash
# Scan existing scraped pages for PDF links
npx tsx scripts/discover-all-pdfs.ts scan

# Run a full crawl to discover PDFs in navigation
npx tsx scripts/discover-all-pdfs.ts crawl

# Download and process discovered PDFs (limit to N PDFs)
npx tsx scripts/discover-all-pdfs.ts download 10

# Complete workflow: scan + crawl + download
npx tsx scripts/discover-all-pdfs.ts all 20
```

#### How It Works:

1. **Scan Mode:** Extracts PDF links from existing page content using regex patterns:
   - HTML href attributes: `href="...pdf"`
   - Markdown links: `[text](url.pdf)`
   - Direct URLs in text: `https://...pdf`

2. **Crawl Mode:** Uses Firecrawl to discover all URLs on the site, including PDFs

3. **Download Mode:** Processes each PDF:
   - Scrapes content with Firecrawl (extracts text from PDF)
   - Stores in `scraped_content` table
   - Downloads actual PDF file to Supabase Storage
   - Tracks source pages (which pages link to this PDF)

#### Output:

```
╔═══════════════════════════════════════════════════════════╗
║  PDF Discovery Results                                     ║
╚═══════════════════════════════════════════════════════════╝

📊 Total PDFs found: 47
   🆕 New PDFs to download: 12
   ✅ Already in database: 35

🆕 Sample New PDFs:
   - facilitator-guide-tool-1.pdf
     URL: https://smartrecoveryaustralia.com.au/files/...
     Found on: 3 page(s)
```

### Tool 2: Incremental Scraper (`incremental-scrape.ts`)

**Purpose:** Discover new/updated content and PDFs incrementally

**Location:** `hub/scripts/incremental-scrape.ts`

#### Commands:

```bash
# Discover what's new/changed (no scraping)
npx tsx scripts/incremental-scrape.ts discover

# Scrape only new URLs (including PDFs)
npx tsx scripts/incremental-scrape.ts new

# Update stale content (>30 days old)
npx tsx scripts/incremental-scrape.ts stale

# Scrape both new and stale URLs
npx tsx scripts/incremental-scrape.ts all
```

#### Features:

- Tracks which URLs are already in database
- Identifies new URLs and stale content (>30 days)
- Specifically identifies PDF URLs
- Actually scrapes URLs (now implemented!)

## 🔗 PDF Linking & Classification

### Tool 3: PDF Management (`manage-pdfs.ts`)

**Purpose:** Link PDFs to metadata table and generate classifications

**Location:** `hub/scripts/manage-pdfs.ts`

#### Commands:

```bash
# Audit PDF status (what's linked, what needs work)
npx tsx scripts/manage-pdfs.ts audit

# Link PDFs from scraped_content to pdf_documents table
npx tsx scripts/manage-pdfs.ts link

# Check file download status
npx tsx scripts/manage-pdfs.ts download

# Generate embeddings for PDFs
npx tsx scripts/manage-pdfs.ts embed

# Run all fixes
npx tsx scripts/manage-pdfs.ts fix-all
```

#### Auto-Classification:

The system automatically classifies PDFs based on URL and title:

**Categories:**
- `facilitator-guide` - Guides for meeting facilitators
- `participant-worksheet` - Worksheets for participants
- `training-manual` - Training materials
- `handbook` - Handbooks and manuals
- `reference` - General reference materials

**Tool Types:**
- `CBA` - Cost-Benefit Analysis
- `hierarchy-of-values` - Hierarchy of Values tool
- `abc-urge-log` - ABC & Urge Log
- `change-plan` - Change Plan Worksheet
- `smart-goals` - SMART Goals tool
- `problem-solving` - Problem Solving tools
- `brainstorming` - Brainstorming tools

**Target Audiences:**
- `facilitators` - For meeting facilitators
- `participants` - For meeting participants
- `family` - For family and friends
- `trainers` - For trainer training

#### Output:

```
╔═══════════════════════════════════════════════════════════╗
║  PDF Audit Results                                         ║
╚═══════════════════════════════════════════════════════════╝

📄 Total PDFs: 47

📋 Linking Status:
   ✅ Linked to pdf_documents: 35
   ⚠️  Unlinked: 12

💾 File Storage:
   ✅ Files in storage: 28
   ⚠️  Missing files: 7

🔍 Embeddings:
   ✅ With embeddings: 40
   ⚠️  Without embeddings: 7
```

### Tool 4: Simple PDF Finder (`find-pdfs.ts`)

**Purpose:** Quick overview of PDFs in database and storage

**Location:** `hub/scripts/find-pdfs.ts`

```bash
npx tsx scripts/find-pdfs.ts
```

Shows:
- Count of PDFs in `scraped_content` table
- Count of PDFs in `pdf_documents` table
- PDFs in Supabase Storage buckets

## 🚀 Complete PDF Workflow

Here's the recommended workflow to find and process ALL PDFs on the site:

### Step 1: Discover All PDFs

```bash
cd hub
npx tsx scripts/discover-all-pdfs.ts scan
```

This scans existing content for PDF links. You should see something like:

```
📄 Scanning existing content for PDF links...
   Scanning 733 pages for PDF links...
✅ Found 45 unique PDF links in content
```

### Step 2: Download New PDFs

If you found new PDFs in Step 1:

```bash
# Download all new PDFs (recommended to start with a small batch)
npx tsx scripts/discover-all-pdfs.ts download 10
```

This will:
- Use Firecrawl to extract text from each PDF
- Store content in `scraped_content` table
- Download PDF file to Supabase Storage
- Track which pages link to each PDF

### Step 3: Link PDFs to Metadata Table

```bash
npx tsx scripts/manage-pdfs.ts link
```

This creates entries in the `pdf_documents` table with:
- Auto-detected category (facilitator-guide, worksheet, etc.)
- Auto-detected tool type (CBA, Change Plan, etc.)
- Auto-detected target audience (facilitators, participants, etc.)

### Step 4: Generate Embeddings

```bash
npx tsx scripts/generate-embeddings.ts 50
```

Generates vector embeddings for semantic search.

### Step 5: Verify Everything

```bash
# Check PDF status
npx tsx scripts/manage-pdfs.ts audit

# Quick overview
npx tsx scripts/find-pdfs.ts
```

## 🔄 Ongoing Maintenance

### Weekly: Check for New PDFs

```bash
# Discover new content
cd hub
npx tsx scripts/incremental-scrape.ts discover

# If new PDFs found, scrape them
npx tsx scripts/incremental-scrape.ts new

# Link and process
npx tsx scripts/manage-pdfs.ts link
```

### Monthly: Update Stale PDFs

```bash
# Update old content
npx tsx scripts/incremental-scrape.ts stale

# Re-link any new PDFs
npx tsx scripts/manage-pdfs.ts link
```

### As Needed: Full Rediscovery

If you suspect PDFs are missing:

```bash
# Complete discovery and processing
npx tsx scripts/discover-all-pdfs.ts all 50
npx tsx scripts/manage-pdfs.ts link
npx tsx scripts/generate-embeddings.ts 100
```

## 📊 Database Schema

### scraped_content Table

```sql
- id: UUID (primary key)
- url: TEXT (unique) - PDF URL
- title: TEXT - PDF title
- content: TEXT - Extracted text from PDF
- markdown: TEXT - Markdown version
- content_type: TEXT - Set to 'pdf' for PDFs
- parent_url: TEXT - Page that links to this PDF
- internal_links: TEXT[] - Links found in PDF
- external_links: TEXT[] - External links
- category: TEXT - Content category
- tags: TEXT[] - Auto-generated tags
- quality_score: FLOAT - 0-1 quality score
- relevance_score: FLOAT - 0-1 relevance score
- scraped_at: TIMESTAMP
- last_updated: TIMESTAMP
```

### pdf_documents Table

```sql
- id: UUID (primary key)
- scraped_content_id: UUID (foreign key)
- title: TEXT
- url: TEXT (unique)
- file_path: TEXT - Path in Supabase Storage
- file_size_bytes: BIGINT
- page_count: INTEGER
- extracted_text: TEXT
- markdown_content: TEXT
- category: TEXT - facilitator-guide, worksheet, etc.
- tool_type: TEXT - CBA, change-plan, etc.
- target_audience: TEXT[] - [facilitators, participants, etc.]
- smart_tool_number: TEXT - Tool 1, Tool 2, etc.
- quality_score: FLOAT
```

## 🎯 Key Features

### 1. Source Page Tracking

Every PDF tracks which pages link to it via the `parent_url` field. This enables:
- Understanding PDF context
- Showing related pages when displaying PDFs
- Building navigation between PDFs and pages

### 2. Automatic Classification

PDFs are automatically tagged based on:
- URL patterns (`/facilitator/`, `/tool/`, etc.)
- Title keywords (`Facilitator Guide`, `Worksheet`, etc.)
- Content analysis (SMART Recovery terms)

### 3. Deduplication

The system uses `url` as the unique identifier, so:
- Re-running discovery won't create duplicates
- Updates existing PDFs instead of creating new ones
- Safe to run multiple times

### 4. Error Handling

All scripts include:
- Retry logic with exponential backoff
- Error tracking and reporting
- Partial success (continues if one PDF fails)
- Failed URLs tracked in database

## 🛠️ API Endpoints

### Scrape Single URL

```typescript
POST /api/content/scrape-full
{
  "action": "scrape_single",
  "url": "https://smartrecoveryaustralia.com.au/document.pdf",
  "parentUrl": "https://smartrecoveryaustralia.com.au/resources"
}

// Response
{
  "success": true,
  "url": "...",
  "title": "Facilitator Guide",
  "contentType": "pdf",
  "isPdf": true,
  "wordCount": 5000,
  "embeddingCount": 10,
  "scrapedContentId": "..."
}
```

### Start Full Crawl

```typescript
POST /api/content/scrape-full
{
  "action": "start_crawl",
  "url": "https://smartrecoveryaustralia.com.au"
}

// Response
{
  "success": true,
  "jobId": "...",
  "firecrawlJobId": "...",
  "message": "Crawl started. Use check_status to monitor."
}
```

## 🧪 Testing

Before running on production:

```bash
# Test with a single PDF
npx tsx scripts/discover-all-pdfs.ts download 1

# Check audit status
npx tsx scripts/manage-pdfs.ts audit

# Verify in database
psql $DATABASE_URL -c "SELECT url, title FROM scraped_content WHERE content_type = 'pdf' LIMIT 5;"
```

## 📝 Troubleshooting

### Problem: PDFs not being found

**Solution:** Run a full crawl to ensure all PDFs are discovered:
```bash
npx tsx scripts/discover-all-pdfs.ts crawl
```

### Problem: PDFs found but not downloading

**Check:**
1. Firecrawl API key is set: `echo $FIRECRAWL_API_KEY`
2. Dev server is running: `npm run dev`
3. Database connection works: Check `.env.local`

### Problem: PDFs downloading but not linking

**Solution:** Run the link command:
```bash
npx tsx scripts/manage-pdfs.ts link
```

### Problem: PDF storage failing

**Check:**
1. Supabase Storage bucket `pdfs` exists
2. Bucket has proper permissions (public or authenticated)
3. Service role key has storage permissions

### Problem: Embeddings not generating

**Solution:** Run embedding generation:
```bash
npx tsx scripts/generate-embeddings.ts 50
```

**Check:**
1. OpenAI API key is set: `echo $OPENAI_API_KEY`
2. Database has pgvector extension enabled

## 📚 Related Documentation

- [Content Scraping System](./CONTENT-SCRAPING-SYSTEM.md) - Overall scraping architecture
- [Scraping Guide](./SCRAPING-GUIDE.md) - General scraping usage
- [Supabase Setup](./SUPABASE-SETUP-GUIDE.md) - Database configuration
- [Data Architecture](./DATA-ARCHITECTURE.md) - Database schema details

## 🎉 Summary

With these tools, you can:

1. ✅ **Find ALL PDFs** - Scan pages and crawl site
2. ✅ **Download PDFs** - Extract text and store files
3. ✅ **Auto-classify** - Tag by category, tool type, audience
4. ✅ **Track sources** - Know which pages link to each PDF
5. ✅ **Search PDFs** - Generate embeddings for semantic search
6. ✅ **Maintain** - Incremental updates and stale content refresh

All PDFs are properly discovered, tagged, linked, and ready for use in the SMART Connect application!
