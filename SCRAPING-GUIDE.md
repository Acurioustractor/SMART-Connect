# SMART Connect - Scraping & Content Management Guide

## How It Works: No Duplicates! ✅

Your scraping system already **handles duplicates automatically** using `upsert`:

```typescript
.upsert({ url, title, content, ... }, {
  onConflict: 'url',
  ignoreDuplicates: false
})
```

**What this means:**
- If URL exists → **UPDATE** the content with new data
- If URL is new → **INSERT** new record
- No duplicates ever created! 🎉

---

## Finding Missing Content & New Pages

### Option 1: Incremental Discovery (Recommended)

Find what's new or stale without re-scraping everything:

```bash
# Discover what's new/changed (doesn't scrape, just analyzes)
npx tsx scripts/incremental-scrape.ts discover
```

**Output:**
```
📊 Total URLs found: 850
   🆕 New URLs: 117
   ✅ Existing URLs: 733
   ⏰ Stale URLs (>30 days): 45
   📄 PDF URLs: 23

🆕 Sample New URLs:
   - https://smartrecoveryaustralia.com.au/new-page-1
   - https://smartrecoveryaustralia.com.au/new-page-2
   ...
```

**What it does:**
1. Queries your database for existing URLs
2. Runs a discovery crawl to find all current URLs
3. Compares to identify:
   - **New URLs** - not in database yet
   - **Stale URLs** - older than 30 days
   - **PDF URLs** - for linking

**Cost:** Free! (Just discovery, no processing)

---

### Option 2: Full Rescrape (Updates Everything)

If you want to update all content, just run your normal scrape:

```bash
npx tsx scripts/scrape-smart-site.ts
```

**What happens:**
- ✅ New pages are **added**
- ✅ Existing pages are **updated**
- ✅ No duplicates created
- ✅ PDFs are **re-downloaded** and **re-linked**

**When to use:**
- Major website updates
- Want to refresh all content quality scores
- Need to regenerate all embeddings with new settings

**Cost:** ~$40-60 for full site (1000+ pages with embeddings)

---

## Managing PDFs

### Audit Your PDFs

See what PDFs exist and what's missing:

```bash
npx tsx scripts/manage-pdfs.ts audit
```

**Output:**
```
📄 Total PDFs: 23

📋 Linking Status:
   ✅ Linked to pdf_documents: 18
   ⚠️  Unlinked: 5

💾 File Storage:
   ✅ Files in storage: 15
   ⚠️  Missing files: 3

🔍 Embeddings:
   ✅ With embeddings: 12
   ⚠️  Without embeddings: 11
```

### Link Missing PDFs

If PDFs are in `scraped_content` but not `pdf_documents`:

```bash
# Link all unlinked PDFs
npx tsx scripts/manage-pdfs.ts link

# Or link just 10
npx tsx scripts/manage-pdfs.ts link 10
```

**What it does:**
- Finds PDFs in `scraped_content`
- Creates matching records in `pdf_documents`
- Classifies by category and tool type
- Identifies target audience

### Generate Embeddings for PDFs

Make PDFs searchable:

```bash
# Use the general embedding generator
npx tsx scripts/generate-embeddings.ts 50
```

This works for both regular pages AND PDFs.

---

## Complete Workflow: Finding & Adding Missing Content

### Step 1: Discover What's Missing (5 min)

```bash
npx tsx scripts/incremental-scrape.ts discover
```

**Decision tree:**
- **0-10 new URLs** → Great! Database is current
- **10-50 new URLs** → Run a full scrape to capture them
- **50+ new URLs** → Major site changes, definitely run full scrape

### Step 2: Audit Current Data (2 min)

```bash
npx tsx scripts/audit-and-enrich.ts audit
npx tsx scripts/manage-pdfs.ts audit
```

**Check:**
- Embedding coverage (should be >90%)
- PDF linking status
- Content quality scores

### Step 3: Take Action

#### If Many New URLs Found:

```bash
# Full scrape (updates existing + adds new)
npx tsx scripts/scrape-smart-site.ts
```

**What gets fixed:**
- ✅ New pages added
- ✅ Existing pages updated
- ✅ PDFs downloaded and linked
- ✅ Embeddings generated
- ✅ Recommendations created

**Time:** 30-60 minutes for full site
**Cost:** ~$40-60

#### If Just Need to Fix Gaps:

```bash
# Fix PDF linking
npx tsx scripts/manage-pdfs.ts link

# Generate missing embeddings
npx tsx scripts/generate-embeddings.ts 100

# Enrich metadata
npx tsx scripts/audit-and-enrich.ts enrich 50
```

**Time:** 10-20 minutes
**Cost:** ~$5-10

### Step 4: Verify

```bash
# Check improvements
npx tsx scripts/audit-and-enrich.ts audit
```

**Look for:**
- Embedding coverage should be higher
- Fewer missing metadata fields
- More PDFs linked

---

## Common Scenarios

### "I think the website added new pages"

```bash
# 1. Check what's new
npx tsx scripts/incremental-scrape.ts discover

# 2. If >10 new URLs, run full scrape
npx tsx scripts/scrape-smart-site.ts
```

### "Some PDFs aren't showing up in search"

```bash
# 1. Audit PDFs
npx tsx scripts/manage-pdfs.ts audit

# 2. Link any unlinked PDFs
npx tsx scripts/manage-pdfs.ts link

# 3. Generate embeddings
npx tsx scripts/generate-embeddings.ts 50

# 4. Verify
npx tsx scripts/manage-pdfs.ts audit
```

### "I want to update old content"

```bash
# 1. Find stale content
npx tsx scripts/incremental-scrape.ts discover

# 2. Run full scrape (updates based on URL)
npx tsx scripts/scrape-smart-site.ts
```

### "Embedding coverage is low (35%)"

```bash
# Generate embeddings for all missing content
npx tsx scripts/generate-embeddings.ts 477
```

**Why it's low:**
- Your audit shows 477 pages without embeddings
- This means only 35% of content is searchable
- **Priority fix!** Generate these embeddings

---

## Understanding Your Data Flow

```
Website (smartrecoveryaustralia.com.au)
    ↓
Firecrawl Discovery (finds all URLs)
    ↓
Firecrawl Scraping (extracts content + PDFs)
    ↓
Processing Pipeline:
    ├─→ scraped_content (upsert by URL)
    │   ├─→ pdf_documents (if PDF)
    │   │   └─→ Supabase Storage (actual file)
    │   └─→ content_embeddings (semantic search)
    └─→ content_recommendations (AI suggestions)
```

**Key Points:**
1. **URL is the unique key** - no duplicates possible
2. **Upsert = update or insert** - always safe to re-scrape
3. **PDFs have dual storage**:
   - `scraped_content` → metadata & text
   - `pdf_documents` → classification & details
   - `Supabase Storage` → actual file
4. **Embeddings are chunked** - long content = multiple embeddings

---

## Maintenance Schedule

### Weekly (Quick Check - 5 min)
```bash
npx tsx scripts/audit-and-enrich.ts audit
npx tsx scripts/incremental-scrape.ts discover
```

**Action if:**
- >10 new URLs found → Schedule full scrape
- Embedding coverage <90% → Generate missing embeddings

### Monthly (Comprehensive Update - 1 hour)
```bash
# 1. Full rescrape to update all content
npx tsx scripts/scrape-smart-site.ts

# 2. Audit results
npx tsx scripts/audit-and-enrich.ts audit

# 3. Fix any gaps
npx tsx scripts/manage-pdfs.ts fix-all

# 4. Enrich metadata for new content
npx tsx scripts/audit-and-enrich.ts enrich 50
```

### Quarterly (Deep Clean - 2-3 hours)
```bash
# 1. Full rescrape
npx tsx scripts/scrape-smart-site.ts

# 2. Enrich ALL metadata
npx tsx scripts/audit-and-enrich.ts enrich 100  # Run multiple times

# 3. Build content relationships
npx tsx scripts/audit-and-enrich.ts relationships 100

# 4. Verify everything
npx tsx scripts/audit-and-enrich.ts audit
npx tsx scripts/manage-pdfs.ts audit
```

---

## Troubleshooting

### "Scrape found duplicates!"

**This shouldn't happen** because of upsert, but if it does:

```sql
-- Find duplicate URLs
SELECT url, COUNT(*) as count
FROM scraped_content
GROUP BY url
HAVING COUNT(*) > 1;

-- Delete duplicates (keeps most recent)
DELETE FROM scraped_content a
USING scraped_content b
WHERE a.id < b.id
  AND a.url = b.url;
```

### "PDF links are broken"

```bash
# Re-link all PDFs
npx tsx scripts/manage-pdfs.ts link

# Then check storage
npx tsx scripts/find-pdfs.ts
```

### "Embeddings failed to generate"

**Common causes:**
- Content too long (>8000 tokens)
- OpenAI API rate limit
- Network timeout

**Solution:**
```bash
# Try smaller batches
npx tsx scripts/generate-embeddings.ts 10

# Check rate limits in output
# Wait a few minutes and continue
```

---

## Cost Estimates

**Full Scrape (1000 pages):**
- Firecrawl: ~$10-15 (depending on plan)
- OpenAI Embeddings: ~$13 (1000 pages × 2000 tokens × $0.00013/1k tokens)
- OpenAI Classification: ~$15-20 (GPT-4 Turbo)
- **Total: ~$40-50**

**Incremental Discovery:**
- Firecrawl: ~$1-2
- No OpenAI costs
- **Total: ~$1-2**

**Embedding Generation (100 pages):**
- OpenAI: ~$1.30
- **Total: ~$1-2**

**Metadata Enrichment (100 pages):**
- GPT-4 Turbo: ~$3-5
- **Total: ~$3-5**

---

## Quick Reference

```bash
# Discovery & Audit
npx tsx scripts/incremental-scrape.ts discover    # Find new/stale content
npx tsx scripts/audit-and-enrich.ts audit         # Check data quality
npx tsx scripts/manage-pdfs.ts audit              # Check PDF status
npx tsx scripts/find-pdfs.ts                      # Locate PDFs

# Scraping
npx tsx scripts/scrape-smart-site.ts              # Full scrape (updates all)

# Improvements
npx tsx scripts/generate-embeddings.ts 100        # Add embeddings
npx tsx scripts/audit-and-enrich.ts enrich 20     # Improve metadata
npx tsx scripts/manage-pdfs.ts link               # Link PDFs
npx tsx scripts/audit-and-enrich.ts relationships 30  # Build graph

# Check Tables
npx tsx scripts/check-tables.ts                   # See all table counts
```

---

## Summary

✅ **Your system already prevents duplicates** via upsert
✅ **Re-scraping is safe** - updates existing content
✅ **PDFs are automatically linked** during scraping
✅ **Use incremental discovery** to find new content efficiently
✅ **Run full scrape monthly** to keep everything fresh

**Priority for you right now:**
1. Generate missing embeddings (477 pages at 35% coverage)
2. Link any unlinked PDFs
3. Set up monthly scraping schedule

Let's get that embedding coverage to 100%! 🚀
