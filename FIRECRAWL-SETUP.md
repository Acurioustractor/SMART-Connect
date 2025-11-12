# Firecrawl Integration Setup

## What is Firecrawl?

Firecrawl is a web scraping API that converts websites into clean, LLM-ready markdown. It's perfect for:
- Scraping entire websites (like smartrecoveryaustralia.com.au)
- Downloading PDFs and extracting content
- Converting content to markdown for AI processing
- Building knowledge bases from web content

## Setup Instructions

### 1. Get a Firecrawl API Key

1. Go to https://firecrawl.dev
2. Sign up for an account
3. Navigate to your dashboard
4. Copy your API key

### 2. Add to Environment Variables

Add this line to your `/hub/.env.local` file:

```bash
# Firecrawl API for web scraping
FIRECRAWL_API_KEY=fc-your-api-key-here
```

### 3. Restart Your Dev Server

```bash
cd hub
npm run dev
```

## Usage

### Scrape a Single Page

```bash
curl -X POST http://localhost:3080/api/scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://smartrecoveryaustralia.com.au/about",
    "action": "scrape"
  }'
```

### Crawl an Entire Website

```bash
# Start crawl job
curl -X POST http://localhost:3080/api/scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://smartrecoveryaustralia.com.au",
    "action": "crawl"
  }'

# Response will include a jobId, use it to check status:
curl -X POST http://localhost:3080/api/scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "status",
    "jobId": "your-job-id-here"
  }'
```

### Automated Scraping Script

Create a script to scrape the entire SMART Recovery Australia site:

```javascript
// scripts/scrape-smart-site.js
const BASE_URL = 'http://localhost:3080'

async function scrapeSMARTSite() {
  // Start crawl
  const crawlResponse = await fetch(`${BASE_URL}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://smartrecoveryaustralia.com.au',
      action: 'crawl'
    })
  })

  const { jobId } = await crawlResponse.json()
  console.log('Crawl started:', jobId)

  // Poll for completion
  let completed = false
  while (!completed) {
    await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10s

    const statusResponse = await fetch(`${BASE_URL}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'status',
        jobId
      })
    })

    const status = await statusResponse.json()
    console.log(`Progress: ${status.completed}/${status.total}`)

    if (status.status === 'completed') {
      completed = true
      console.log('✅ All pages scraped and saved to knowledge-base/scraped-content/')
    }
  }
}

scrapeSMARTSite()
```

Run it:
```bash
node scripts/scrape-smart-site.js
```

## What Gets Scraped

When you crawl smartrecoveryaustralia.com.au, Firecrawl will:

1. **Discover all pages** - Follows links to find every accessible page
2. **Extract content** - Converts HTML to clean markdown
3. **Download PDFs** - Can extract text from PDF tools/resources
4. **Save to knowledge base** - Stores in `/knowledge-base/scraped-content/`

## Using Scraped Content

Once scraped, the content is automatically available to:

- **AI Chat** - Can reference scraped content in responses
- **Content Generator** - Uses scraped content as context
- **Interview Analysis** - Cross-references with SMART Recovery materials

## PDFs and Tools

To specifically target PDFs:

```bash
# Scrape a PDF page
curl -X POST http://localhost:3080/api/scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://smartrecoveryaustralia.com.au/resources/toolbox",
    "action": "scrape"
  }'
```

Firecrawl automatically extracts text from PDFs linked on the page.

## Cost Considerations

Firecrawl pricing (as of 2024):
- Free tier: 500 credits/month
- 1 page scrape = 1 credit
- 1 page in a crawl = 1 credit

Crawling smartrecoveryaustralia.com.au might use 100-500 credits depending on site size.

## Troubleshooting

**Error: "Firecrawl API key not configured"**
- Make sure you've added `FIRECRAWL_API_KEY` to `.env.local`
- Restart your dev server after adding the key

**Crawl taking too long**
- Large sites can take 10-30 minutes
- Use the status endpoint to monitor progress
- Consider crawling specific sections instead of entire site

**Rate limits**
- Firecrawl has rate limits on their free tier
- If you hit limits, wait or upgrade your plan

## Next Steps

1. Set up your Firecrawl API key
2. Run a test scrape on a single page
3. Crawl the full SMART Recovery site
4. Use the Content Generator to create content based on scraped materials
5. Set up automated weekly scrapes to keep content fresh
