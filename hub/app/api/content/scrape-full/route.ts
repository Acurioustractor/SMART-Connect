import { NextResponse } from 'next/server'
import FirecrawlApp from '@mendable/firecrawl-js'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Initialize clients
const getFirecrawl = () => {
  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error('FIRECRAWL_API_KEY not configured')
  }
  return new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
}

const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function POST(req: Request) {
  try {
    const { action, url, jobId } = await req.json()

    switch (action) {
      case 'start_crawl':
        return await startFullCrawl(url || 'https://smartrecoveryaustralia.com.au')

      case 'check_status':
        return await checkCrawlStatus(jobId)

      case 'process_results':
        return await processAndStoreCrawlResults(jobId)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      {
        error: 'Scraping failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * Start a full crawl of the SMART Recovery Australia website
 */
async function startFullCrawl(targetUrl: string) {
  const firecrawl = getFirecrawl()
  const supabase = getSupabase()

  console.log(`Starting full crawl of ${targetUrl}`)

  // Create job record in database
  const { data: job, error: jobError } = await supabase
    .from('scraping_jobs')
    .insert({
      job_type: 'full_crawl',
      target_url: targetUrl,
      status: 'pending',
      config: {
        include_pdfs: true,
        max_pages: 1000,
        formats: ['markdown', 'html']
      }
    })
    .select()
    .single()

  if (jobError) {
    console.error('Failed to create job record:', jobError)
    throw jobError
  }

  try {
    // Start Firecrawl crawl
    const crawlResult: any = await firecrawl.startCrawl(targetUrl, {
      limit: 1000,
      scrapeOptions: {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        includeTags: ['article', 'main', 'content', 'div'],
        excludeTags: ['nav', 'footer', 'header', 'aside', 'script', 'style'],
      }
    })

    console.log('Crawl started:', crawlResult)

    // Update job with Firecrawl job ID
    const firecrawlJobId = crawlResult.id || crawlResult.jobId

    await supabase
      .from('scraping_jobs')
      .update({
        firecrawl_job_id: firecrawlJobId,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return NextResponse.json({
      success: true,
      jobId: job.id,
      firecrawlJobId,
      message: 'Crawl started. Use check_status action to monitor progress.'
    })
  } catch (error: any) {
    // Update job status to failed
    await supabase
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', job.id)

    throw error
  }
}

/**
 * Check the status of a crawl job
 */
async function checkCrawlStatus(jobId: string) {
  const firecrawl = getFirecrawl()
  const supabase = getSupabase()

  // Get job from database
  const { data: job, error: jobError } = await supabase
    .from('scraping_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (!job.firecrawl_job_id) {
    return NextResponse.json({ error: 'No Firecrawl job ID found' }, { status: 400 })
  }

  try {
    // Check status with Firecrawl
    const status: any = await firecrawl.getCrawlStatus(job.firecrawl_job_id)

    console.log('Crawl status:', status)

    // Calculate progress
    const total = status.total || 0
    const completed = status.completed || 0
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    // Update job in database
    const updateData: any = {
      progress_percent: progress,
      pages_discovered: total,
      pages_scraped: completed
    }

    if (status.status === 'completed') {
      updateData.status = 'completed'
      updateData.completed_at = new Date().toISOString()

      if (job.started_at) {
        const startTime = new Date(job.started_at).getTime()
        const endTime = new Date().getTime()
        updateData.duration_seconds = Math.round((endTime - startTime) / 1000)
      }
    }

    await supabase
      .from('scraping_jobs')
      .update(updateData)
      .eq('id', jobId)

    return NextResponse.json({
      success: true,
      jobId,
      status: status.status,
      progress,
      completed,
      total,
      isComplete: status.status === 'completed',
      data: status.data || []
    })
  } catch (error: any) {
    console.error('Failed to check status:', error)
    return NextResponse.json({
      error: 'Failed to check status',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Process crawl results and store in Supabase with embeddings
 */
async function processAndStoreCrawlResults(jobId: string) {
  const firecrawl = getFirecrawl()
  const supabase = getSupabase()
  const openai = getOpenAI()

  // Get job from database
  const { data: job, error: jobError } = await supabase
    .from('scraping_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.status !== 'completed') {
    return NextResponse.json({
      error: 'Job not completed yet',
      currentStatus: job.status
    }, { status: 400 })
  }

  try {
    // Get crawl results from Firecrawl
    const status: any = await firecrawl.getCrawlStatus(job.firecrawl_job_id!)
    const pages = status.data || []

    console.log(`Processing ${pages.length} pages...`)

    let processedCount = 0
    let pdfCount = 0
    let embeddingCount = 0
    const errors: string[] = []

    for (const page of pages) {
      try {
        // Determine content type
        const url = page.metadata?.sourceURL || page.url
        const isPdf = url.toLowerCase().endsWith('.pdf')
        const contentType = classifyContentType(url, page.metadata?.title || '')

        // Extract metadata
        const title = page.metadata?.title || extractTitleFromUrl(url)
        const description = page.metadata?.description || ''
        const keywords = page.metadata?.keywords?.split(',').map((k: string) => k.trim()) || []

        // Calculate metrics
        const content = page.markdown || page.html || ''
        const wordCount = content.split(/\s+/).length
        const readingTime = Math.ceil(wordCount / 200) // Assume 200 words per minute

        // Classify and tag
        const category = classifyCategory(url, title, content)
        const tags = extractTags(url, title, content)

        // Store scraped content
        const { data: scrapedContent, error: contentError } = await supabase
          .from('scraped_content')
          .upsert({
            url,
            title,
            content,
            markdown: page.markdown || '',
            content_type: contentType,
            meta_description: description,
            meta_keywords: keywords,
            category,
            tags,
            word_count: wordCount,
            reading_time_minutes: readingTime,
            quality_score: calculateQualityScore(content, title, description),
            relevance_score: calculateRelevanceScore(url, title, content),
            scraped_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            scrape_status: 'success',
            external_links: page.metadata?.links || [],
            parent_url: job.target_url
          }, {
            onConflict: 'url',
            ignoreDuplicates: false
          })
          .select()
          .single()

        if (contentError) {
          errors.push(`Failed to store ${url}: ${contentError.message}`)
          continue
        }

        processedCount++

        // Handle PDFs separately
        if (isPdf) {
          await processPDF(supabase, scrapedContent.id, page, url, title)
          pdfCount++
        }

        // Generate and store embeddings
        const embeddingsCreated = await generateAndStoreEmbeddings(
          supabase,
          openai,
          scrapedContent.id,
          content,
          title,
          contentType
        )
        embeddingCount += embeddingsCreated

        console.log(`Processed ${processedCount}/${pages.length}: ${title}`)

      } catch (error: any) {
        errors.push(`Error processing page: ${error.message}`)
        console.error('Error processing page:', error)
      }
    }

    // Update job with final stats
    await supabase
      .from('scraping_jobs')
      .update({
        pages_scraped: processedCount,
        pdfs_processed: pdfCount,
        errors_count: errors.length
      })
      .eq('id', jobId)

    // Generate initial recommendations based on content
    await generateInitialRecommendations(supabase, job.id)

    return NextResponse.json({
      success: true,
      processed: processedCount,
      pdfs: pdfCount,
      embeddings: embeddingCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully processed ${processedCount} pages with ${embeddingCount} embeddings`
    })

  } catch (error: any) {
    console.error('Failed to process results:', error)

    await supabase
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', jobId)

    return NextResponse.json({
      error: 'Failed to process results',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Process a PDF document
 */
async function processPDF(
  supabase: any,
  scrapedContentId: string,
  page: any,
  url: string,
  title: string
) {
  const content = page.markdown || page.html || ''

  const { error } = await supabase
    .from('pdf_documents')
    .upsert({
      scraped_content_id: scrapedContentId,
      title,
      url,
      extracted_text: content,
      markdown_content: page.markdown,
      category: classifyPDFCategory(url, title),
      tool_type: extractToolType(url, title, content),
      target_audience: extractTargetAudience(url, title, content),
      file_size_bytes: page.metadata?.fileSize || null,
      page_count: page.metadata?.pageCount || null,
      quality_score: calculateQualityScore(content, title, '')
    }, {
      onConflict: 'url',
      ignoreDuplicates: false
    })

  if (error) {
    console.error('Failed to store PDF:', error)
  }
}

/**
 * Generate embeddings for content and store them
 */
async function generateAndStoreEmbeddings(
  supabase: any,
  openai: OpenAI,
  scrapedContentId: string,
  content: string,
  title: string,
  contentType: string
): Promise<number> {
  // Chunk content into smaller pieces (1000 words each)
  const chunks = chunkContent(content, 1000)
  let embeddingCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    try {
      // Generate embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chunk
      })

      const embedding = response.data[0].embedding

      // Store embedding
      const { error } = await supabase
        .from('content_embeddings')
        .insert({
          scraped_content_id: scrapedContentId,
          chunk_index: i,
          chunk_text: chunk,
          chunk_size: chunk.split(/\s+/).length,
          embedding,
          section_title: i === 0 ? title : `${title} (Part ${i + 1})`,
          content_type: contentType
        })

      if (error) {
        console.error('Failed to store embedding:', error)
      } else {
        embeddingCount++
      }

      // Rate limiting: wait 50ms between requests
      await new Promise(resolve => setTimeout(resolve, 50))

    } catch (error: any) {
      console.error('Failed to generate embedding:', error)
    }
  }

  return embeddingCount
}

/**
 * Generate initial content recommendations based on scraped content
 */
async function generateInitialRecommendations(supabase: any, jobId: string) {
  // Get all high-quality content from this job
  const { data: contents } = await supabase
    .from('scraped_content')
    .select('*')
    .gte('quality_score', 0.6)
    .order('quality_score', { ascending: false })
    .limit(50)

  if (!contents || contents.length === 0) return

  const recommendations = []

  for (const content of contents) {
    // Determine recommendation type based on content characteristics
    const recType = determineRecommendationType(content)

    if (recType) {
      recommendations.push({
        scraped_content_id: content.id,
        recommendation_type: recType,
        title: content.title,
        description: content.meta_description || `${content.title} - ${content.category}`,
        reason: generateRecommendationReason(content, recType),
        confidence_score: content.quality_score,
        target_audience: determineTargetAudience(content),
        relevant_themes: content.tags || [],
        is_active: true,
        priority: Math.round(content.quality_score * 10)
      })
    }
  }

  // Store recommendations
  if (recommendations.length > 0) {
    await supabase
      .from('content_recommendations')
      .insert(recommendations)
  }

  console.log(`Generated ${recommendations.length} initial recommendations`)
}

// ======================
// HELPER FUNCTIONS
// ======================

function classifyContentType(url: string, title: string): string {
  const lower = url.toLowerCase()

  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.includes('/tool') || lower.includes('/worksheet')) return 'tool'
  if (lower.includes('/resource')) return 'resource'
  if (lower.includes('/article') || lower.includes('/blog')) return 'article'

  return 'page'
}

function classifyCategory(url: string, title: string, content: string): string {
  const lower = url.toLowerCase() + ' ' + title.toLowerCase()

  if (lower.includes('facilitator')) return 'Facilitator Resources'
  if (lower.includes('tool') || lower.includes('worksheet')) return 'Tools & Worksheets'
  if (lower.includes('training')) return 'Training Materials'
  if (lower.includes('participant') || lower.includes('member')) return 'Participant Resources'
  if (lower.includes('research') || lower.includes('evidence')) return 'Research & Evidence'
  if (lower.includes('family') || lower.includes('friend')) return 'Family & Friends'
  if (lower.includes('handbook') || lower.includes('manual')) return 'Handbooks & Manuals'
  if (lower.includes('meeting')) return 'Meeting Resources'
  if (lower.includes('cultural') || lower.includes('aboriginal') || lower.includes('torres strait')) {
    return 'Cultural Safety'
  }

  return 'General Resources'
}

function classifyPDFCategory(url: string, title: string): string {
  return classifyCategory(url, title, '')
}

function extractTags(url: string, title: string, content: string): string[] {
  const tags: string[] = []
  const text = (url + ' ' + title + ' ' + content).toLowerCase()

  const tagPatterns = [
    { pattern: /\b(cba|cost.?benefit)\b/, tag: 'CBA' },
    { pattern: /\bhierarchy.?of.?values\b/, tag: 'Hierarchy of Values' },
    { pattern: /\b(abc|urge.?log)\b/, tag: 'ABC Urge Log' },
    { pattern: /\bchange.?plan\b/, tag: 'Change Plan' },
    { pattern: /\b(smart|specific.?measurable)\b/, tag: 'SMART Goals' },
    { pattern: /\bself.?care\b/, tag: 'Self-Care' },
    { pattern: /\bburnout\b/, tag: 'Burnout' },
    { pattern: /\bcultural.?safety\b/, tag: 'Cultural Safety' },
    { pattern: /\bfacilitator\b/, tag: 'Facilitators' },
    { pattern: /\bonline.?meeting\b/, tag: 'Online Meetings' },
    { pattern: /\bface.?to.?face\b/, tag: 'Face-to-Face' },
    { pattern: /\btraining\b/, tag: 'Training' }
  ]

  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(text)) {
      tags.push(tag)
    }
  }

  return [...new Set(tags)]
}

function extractToolType(url: string, title: string, content: string): string | null {
  const text = (url + ' ' + title + ' ' + content).toLowerCase()

  const toolPatterns = [
    { pattern: /\bcba\b|cost.?benefit/, type: 'CBA' },
    { pattern: /hierarchy.?of.?values/, type: 'hierarchy-of-values' },
    { pattern: /\babc\b|urge.?log/, type: 'abc-urge-log' },
    { pattern: /change.?plan/, type: 'change-plan' },
    { pattern: /\bsmart\b|specific.?measurable/, type: 'smart-goals' },
    { pattern: /problem.?solving/, type: 'problem-solving' },
    { pattern: /brainstorm/, type: 'brainstorming' }
  ]

  for (const { pattern, type } of toolPatterns) {
    if (pattern.test(text)) {
      return type
    }
  }

  return null
}

function extractTargetAudience(url: string, title: string, content: string): string[] {
  const audience: string[] = []
  const text = (url + ' ' + title + ' ' + content).toLowerCase()

  if (/facilitator|coordinator/.test(text)) audience.push('facilitators')
  if (/participant|member|attendee/.test(text)) audience.push('participants')
  if (/family|friend|loved.?one/.test(text)) audience.push('family')
  if (/trainer|training/.test(text)) audience.push('trainers')

  return audience.length > 0 ? [...new Set(audience)] : ['all']
}

function calculateQualityScore(content: string, title: string, description: string): number {
  let score = 0

  // Content length (max 0.3)
  const wordCount = content.split(/\s+/).length
  if (wordCount > 100) score += 0.1
  if (wordCount > 500) score += 0.1
  if (wordCount > 1000) score += 0.1

  // Has title (0.2)
  if (title && title.length > 10) score += 0.2

  // Has description (0.2)
  if (description && description.length > 20) score += 0.2

  // Has structure (0.3)
  if (content.includes('\n\n')) score += 0.1 // Paragraphs
  if (/^#{1,6}\s/m.test(content)) score += 0.1 // Headers
  if (/\*\*|\*|_/.test(content)) score += 0.1 // Formatting

  return Math.min(1, score)
}

function calculateRelevanceScore(url: string, title: string, content: string): number {
  let score = 0
  const text = (url + ' ' + title + ' ' + content).toLowerCase()

  // SMART Recovery specific terms
  const smartTerms = [
    'smart recovery', 'facilitator', 'participant', 'meeting',
    'tool', 'worksheet', 'cba', 'cost benefit', 'change plan',
    'abc', 'urge', 'hierarchy', 'values', 'self-empowerment',
    'addiction', 'recovery', '4-point program'
  ]

  for (const term of smartTerms) {
    if (text.includes(term)) {
      score += 0.05
    }
  }

  return Math.min(1, score)
}

function chunkContent(content: string, wordsPerChunk: number): string[] {
  const words = content.split(/\s+/)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ')
    chunks.push(chunk)
  }

  return chunks
}

function extractTitleFromUrl(url: string): string {
  const parts = url.split('/').filter(p => p && !p.includes('.') && p !== 'https:' && p !== 'http:')
  if (parts.length === 0) return 'Untitled'

  const lastPart = parts[parts.length - 1]
  return lastPart
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function determineRecommendationType(content: any): string | null {
  const { category, tags, url } = content
  const lower = (category + ' ' + (tags || []).join(' ') + ' ' + url).toLowerCase()

  if (lower.includes('facilitator') && !lower.includes('training')) return 'facilitator_support'
  if (lower.includes('tool') || lower.includes('worksheet')) return 'tool_suggestion'
  if (lower.includes('training')) return 'training_material'
  if (lower.includes('participant') || lower.includes('member')) return 'participant_resource'
  if (content.quality_score > 0.8) return 'similar_content'

  return null
}

function generateRecommendationReason(content: any, recType: string): string {
  const reasons: Record<string, string> = {
    facilitator_support: `This resource provides valuable support for facilitators running SMART Recovery meetings.`,
    tool_suggestion: `A practical tool that can be used in meetings or shared with participants.`,
    training_material: `Professional development resource to enhance your facilitation skills.`,
    participant_resource: `High-quality resource suitable for sharing with participants.`,
    similar_content: `Highly relevant content based on SMART Recovery principles.`
  }

  return reasons[recType] || 'Recommended content based on quality and relevance.'
}

function determineTargetAudience(content: any): string[] {
  const { category, tags } = content
  const text = (category + ' ' + (tags || []).join(' ')).toLowerCase()

  const audience: string[] = []

  if (text.includes('facilitator')) audience.push('facilitators')
  if (text.includes('coordinator')) audience.push('coordinators')
  if (text.includes('all') || audience.length === 0) audience.push('all')

  return audience
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  },
  maxDuration: 300 // 5 minutes
}
