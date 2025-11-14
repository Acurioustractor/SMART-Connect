import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get all scraped content
    const { data: pages, error } = await supabase
      .from('scraped_content')
      .select('*')
      .order('url')

    if (error) throw error

    // Build URL tree structure
    const urlTree: any = {}
    const allPages: any[] = []

    pages?.forEach(page => {
      try {
        const url = new URL(page.url)
        const path = url.pathname
        const parts = path.split('/').filter(Boolean)

        const section = parts[0] || 'root'
        if (!urlTree[section]) {
          urlTree[section] = {
            name: section,
            pages: []
          }
        }

        urlTree[section].pages.push({
          id: page.id,
          title: page.title,
          url: page.url,
          path: path,
          wordCount: page.word_count,
          category: page.category,
          contentType: page.content_type,
          tags: page.tags
        })

        allPages.push({
          id: page.id,
          title: page.title,
          url: page.url,
          section: section,
          fullPath: path
        })
      } catch (e) {
        // Skip invalid URLs
      }
    })

    return NextResponse.json({
      success: true,
      totalPages: pages?.length || 0,
      sections: Object.keys(urlTree).length,
      structure: urlTree,
      allPages: allPages,
      sectionSummary: Object.keys(urlTree).map(key => ({
        section: key,
        pageCount: urlTree[key].pages.length
      })).sort((a, b) => b.pageCount - a.pageCount)
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
