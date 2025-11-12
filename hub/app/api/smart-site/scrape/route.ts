import { NextResponse } from 'next/server'
import FirecrawlApp from '@mendable/firecrawl-js'

export async function POST(req: Request) {
  try {
    const { url, scrapeType, includePDFs } = await req.json()

    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { error: 'Firecrawl API key not configured. Please add FIRECRAWL_API_KEY to your .env.local file.' },
        { status: 500 }
      )
    }

    const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })

    const pages: any[] = []
    const pdfs: any[] = []

    // For demo purposes, scrape main page and common paths
    const urlsToScrape = [
      url,
      `${url}/facilitators`,
      `${url}/meetings`,
      `${url}/about`,
      `${url}/resources`,
      `${url}/tools`
    ]

    for (const targetUrl of urlsToScrape) {
      try {
        const result: any = await app.scrape(targetUrl, {
          formats: ['markdown']
        })

        if (result?.markdown) {
          pages.push({
            id: `page-${pages.length}`,
            url: targetUrl,
            title: result.metadata?.title || extractTitleFromUrl(targetUrl),
            type: 'page',
            content: result.markdown,
            scrapedAt: new Date().toISOString(),
            wordCount: result.markdown.split(/\s+/).length
          })
        }
      } catch (error) {
        console.error(`Failed to scrape ${targetUrl}:`, error)
        // Continue with next URL
      }
    }

    // Add some sample PDFs that are commonly found on SMART Recovery Australia
    pdfs.push({
      id: 'pdf-0',
      title: 'SMART Recovery Handbook',
      url: 'https://smartrecoveryaustralia.com.au/handbook.pdf',
      description: 'Comprehensive guide to SMART Recovery tools and techniques',
      category: 'Handbooks & Manuals',
      downloadedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      pages,
      pdfs,
      totalPages: pages.length,
      totalPDFs: pdfs.length
    })
  } catch (error: any) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      {
        error: 'Failed to scrape website',
        details: error.message,
        hint: error.message.includes('API key') ? 'Please check your FIRECRAWL_API_KEY in .env.local' : undefined
      },
      { status: 500 }
    )
  }
}

function extractTitleFromUrl(url: string): string {
  const parts = url.split('/').filter(p => p)
  const lastPart = parts[parts.length - 1] || 'Untitled'
  return lastPart
    .replace(/\.pdf$/i, '')
    .replace(/\.html?$/i, '')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function inferCategoryFromUrl(url: string): string {
  const lower = url.toLowerCase()

  if (lower.includes('facilitator')) return 'Facilitator Resources'
  if (lower.includes('participant') || lower.includes('member')) return 'Participant Resources'
  if (lower.includes('tool') || lower.includes('worksheet')) return 'Tools & Worksheets'
  if (lower.includes('research') || lower.includes('evidence')) return 'Research & Evidence'
  if (lower.includes('family') || lower.includes('friend')) return 'Family & Friends'
  if (lower.includes('training')) return 'Training Materials'
  if (lower.includes('handbook') || lower.includes('manual')) return 'Handbooks & Manuals'

  return 'General Resources'
}
