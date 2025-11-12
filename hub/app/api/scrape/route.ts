import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Firecrawl API integration
// Docs: https://docs.firecrawl.dev/
export async function POST(req: Request) {
  try {
    const { url, action = 'scrape' } = await req.json()

    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        {
          error: 'Firecrawl API key not configured',
          setup: 'Add FIRECRAWL_API_KEY to your .env.local file. Get your key at https://firecrawl.dev'
        },
        { status: 500 }
      )
    }

    const firecrawlApiUrl = 'https://api.firecrawl.dev/v1'

    if (action === 'scrape') {
      // Scrape a single page
      const response = await fetch(`${firecrawlApiUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          onlyMainContent: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Firecrawl scrape failed')
      }

      return NextResponse.json({
        success: true,
        markdown: data.data?.markdown,
        html: data.data?.html,
        metadata: data.data?.metadata
      })
    }

    if (action === 'crawl') {
      // Crawl entire site (async job)
      const response = await fetch(`${firecrawlApiUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          limit: 1000, // Max pages to crawl
          scrapeOptions: {
            formats: ['markdown'],
            onlyMainContent: true
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Firecrawl crawl failed')
      }

      return NextResponse.json({
        success: true,
        jobId: data.id,
        status: data.status,
        message: 'Crawl job started. Use the job ID to check status.'
      })
    }

    if (action === 'status') {
      // Check crawl job status
      const { jobId } = await req.json()
      const response = await fetch(`${firecrawlApiUrl}/crawl/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get crawl status')
      }

      // If completed, save to knowledge base
      if (data.status === 'completed' && data.data) {
        const knowledgeBasePath = path.join(process.cwd(), '../knowledge-base/scraped-content')
        if (!fs.existsSync(knowledgeBasePath)) {
          fs.mkdirSync(knowledgeBasePath, { recursive: true })
        }

        // Save all pages
        data.data.forEach((page: any, index: number) => {
          const filename = `page_${index}_${Date.now()}.md`
          const filePath = path.join(knowledgeBasePath, filename)
          const content = `# ${page.metadata?.title || 'Untitled'}

URL: ${page.metadata?.sourceURL}
Scraped: ${new Date().toISOString()}

---

${page.markdown}
`
          fs.writeFileSync(filePath, content, 'utf-8')
        })
      }

      return NextResponse.json({
        success: true,
        status: data.status,
        completed: data.completed,
        total: data.total,
        data: data.data
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: scrape, crawl, or status' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: 'Scraping failed', details: error.message },
      { status: 500 }
    )
  }
}
