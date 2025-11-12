# Quick Start: Content Scraping & Recommendations

## 🚀 Get Started in 5 Minutes

### 1. Prerequisites

Make sure you have these API keys in `/hub/.env.local`:

```bash
FIRECRAWL_API_KEY=fc-your-key
OPENAI_API_KEY=sk-your-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Apply Database Schema

**Option A: Automated (Recommended for manual setup)**

Go to Supabase Dashboard:
1. Open your project
2. Click **SQL Editor**
3. Create new query
4. Copy entire contents of `supabase-content-schema.sql`
5. Click **Run**

**Option B: Via Script (If supported)**

```bash
cd hub
npm run apply-content-schema
```

### 3. Start Dev Server

```bash
cd hub
npm run dev
```

Server runs on http://localhost:3080

### 4. Run the Scraper

```bash
npm run scrape-smart-site
```

This will:
- ✅ Crawl smartrecoveryaustralia.com.au
- ✅ Extract all PDFs and content
- ✅ Generate embeddings
- ✅ Create recommendations

**Takes:** 10-30 minutes depending on site size

### 5. Test It Works

```bash
# Check stats
curl http://localhost:3080/api/content/search?action=stats

# Try a search
curl -X POST http://localhost:3080/api/content/search \
  -H "Content-Type: application/json" \
  -d '{"query": "facilitator burnout", "searchType": "semantic"}'

# Get recommendations
curl http://localhost:3080/api/content/recommendations?limit=5
```

## ✨ You're Done!

Your system now has:
- 🔍 Semantic search across all SMART Recovery content
- 💡 AI-powered recommendations
- 📚 All tools and PDFs indexed
- 🧠 Context for the small language model

## 📖 Learn More

- Full documentation: `CONTENT-SCRAPING-SYSTEM.md`
- Firecrawl setup: `FIRECRAWL-SETUP.md`
- Analysis system: `ANALYSIS-SETUP.md`

## 🔄 Keeping Fresh

Run weekly to update content:

```bash
cd hub
npm run scrape-smart-site
```

Or set up a cron job:
```bash
0 2 * * 0 cd /path/to/hub && npm run scrape-smart-site
```

## 🆘 Need Help?

Check the troubleshooting section in `CONTENT-SCRAPING-SYSTEM.md`

Common issues:
- **Firecrawl API errors**: Check your API key at https://firecrawl.dev
- **No search results**: Make sure embeddings were generated (check stats)
- **Schema errors**: Apply schema manually via Supabase dashboard
