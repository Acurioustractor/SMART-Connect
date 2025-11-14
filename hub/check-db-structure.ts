import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkStructure() {
  console.log('\n=== CHECKING DATABASE STRUCTURE ===\n')

  // Get all scraped content
  const { data: pages, error } = await supabase
    .from('scraped_content')
    .select('*')
    .order('url')
    .limit(500)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Total pages: ${pages?.length || 0}`)

  // Analyze URL structure
  const urlTree: any = {}
  pages?.forEach(page => {
    const url = new URL(page.url)
    const path = url.pathname
    const parts = path.split('/').filter(Boolean)

    const section = parts[0] || 'root'
    if (!urlTree[section]) {
      urlTree[section] = []
    }
    urlTree[section].push({
      title: page.title,
      url: page.url,
      path: path,
      wordCount: page.word_count,
      category: page.category
    })
  })

  console.log('\n=== URL STRUCTURE ===\n')
  Object.keys(urlTree).sort().forEach(key => {
    console.log(`\n${key}/ (${urlTree[key].length} pages)`)
    urlTree[key].slice(0, 5).forEach((p: any) => {
      console.log(`  - ${p.title}`)
    })
    if (urlTree[key].length > 5) {
      console.log(`  ... and ${urlTree[key].length - 5} more`)
    }
  })

  // Check for hierarchical data
  const { data: sample } = await supabase
    .from('scraped_content')
    .select('url, title, metadata, internal_links')
    .limit(3)

  console.log('\n=== SAMPLE RECORDS ===\n')
  console.log(JSON.stringify(sample, null, 2))
}

checkStructure()
