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

/**
 * Timeout wrapper for Firecrawl API calls
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutHandle!)
    return result
  } catch (error) {
    clearTimeout(timeoutHandle!)
    throw error
  }
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  errorContext: string = 'Operation'
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt)
        console.log(`${errorContext} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError || new Error(`${errorContext} failed after ${maxRetries + 1} attempts`)
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
        return await startProcessing(jobId)

      case 'check_processing':
        return await checkProcessingStatus(jobId)

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
    // Start Firecrawl crawl (with 90 second timeout for initial request)
    const crawlResult: any = await withTimeout(
      firecrawl.startCrawl(targetUrl, {
        limit: 1000,
        scrapeOptions: {
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          includeTags: ['article', 'main', 'content', 'div'],
          excludeTags: ['nav', 'footer', 'header', 'aside', 'script', 'style'],
        }
      }),
      90000,
      'Firecrawl startCrawl timed out after 90 seconds'
    )

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
    // Check status with Firecrawl (with 120 second timeout)
    const status: any = await withTimeout(
      firecrawl.getCrawlStatus(job.firecrawl_job_id),
      120000,
      'Firecrawl getCrawlStatus timed out after 120 seconds'
    )

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
 * Start processing crawl results asynchronously
 */
async function startProcessing(jobId: string) {
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

  if (job.status !== 'completed') {
    return NextResponse.json({
      error: 'Crawl job not completed yet',
      currentStatus: job.status
    }, { status: 400 })
  }

  // Update job status to processing
  await supabase
    .from('scraping_jobs')
    .update({
      status: 'processing',
      processing_started_at: new Date().toISOString()
    })
    .eq('id', jobId)

  // Start background processing (don't await)
  processAndStoreCrawlResults(jobId).catch(error => {
    console.error('Background processing error:', error)
  })

  return NextResponse.json({
    success: true,
    jobId,
    message: 'Processing started. Use check_processing action to monitor progress.'
  })
}

/**
 * Check processing status
 */
async function checkProcessingStatus(jobId: string) {
  const supabase = getSupabase()

  const { data: job, error: jobError } = await supabase
    .from('scraping_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const isProcessing = job.status === 'processing'
  const isComplete = job.status === 'processed' || job.processing_completed_at !== null

  return NextResponse.json({
    success: true,
    jobId,
    status: job.status,
    isProcessing,
    isComplete,
    pagesScraped: job.pages_scraped || 0,
    pagesProcessed: job.pages_processed || 0,
    pdfsProcessed: job.pdfs_processed || 0,
    errorsCount: job.errors_count || 0,
    processingStartedAt: job.processing_started_at,
    processingCompletedAt: job.processing_completed_at
  })
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
    console.error('Job not found:', jobId)
    return
  }

  try {
    // Get crawl results from Firecrawl (with 120 second timeout)
    const status: any = await withTimeout(
      firecrawl.getCrawlStatus(job.firecrawl_job_id!),
      120000,
      'Firecrawl getCrawlStatus timed out after 120 seconds'
    )
    const pages = status.data || []

    console.log(`Processing ${pages.length} pages...`)

    let processedCount = 0
    let skippedCount = 0
    let pdfCount = 0
    let embeddingCount = 0
    const errors: string[] = []

    for (const page of pages) {
      try {
        // Determine content type
        const url = page.metadata?.sourceURL || page.url
        const isPdf = url.toLowerCase().endsWith('.pdf')
        const contentType = classifyContentType(url, page.metadata?.title || '')

        // Filter out low-value pages
        if (shouldSkipPage(url, page.metadata?.title || '', page.markdown || page.html || '')) {
          skippedCount++
          continue
        }

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

        // Store scraped content with retry
        const scrapedContent = await withRetry(async () => {
          const { data, error } = await supabase
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

          if (error) throw error
          return data
        }, 3, 1000, `Storing content for ${url}`)

        if (!scrapedContent) {
          errors.push(`Failed to store ${url} after retries`)
          continue
        }

        processedCount++

        // Handle PDFs separately with retry
        if (isPdf) {
          try {
            await withRetry(
              async () => processPDF(supabase, scrapedContent.id, page, url, title),
              2,
              1000,
              `Processing PDF ${url}`
            )
            pdfCount++
          } catch (pdfError: any) {
            errors.push(`Failed to process PDF ${url}: ${pdfError.message}`)
            console.error(`Failed to process PDF ${url}:`, pdfError)
          }
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

        // Update progress every 10 pages
        if (processedCount % 10 === 0) {
          await supabase
            .from('scraping_jobs')
            .update({
              pages_processed: processedCount,
              pdfs_processed: pdfCount,
              errors_count: errors.length,
              progress_percent: Math.round((processedCount / pages.length) * 100)
            })
            .eq('id', jobId)
        }

      } catch (error: any) {
        const url = page?.metadata?.sourceURL || page?.url || 'unknown'
        const title = page?.metadata?.title || 'untitled'
        errors.push(`Error processing ${title} (${url}): ${error.message}`)
        console.error(`Error processing page ${url}:`, error.message)
      }
    }

    // Update job with final stats and mark as complete
    await supabase
      .from('scraping_jobs')
      .update({
        status: 'processed',
        pages_processed: processedCount,
        pdfs_processed: pdfCount,
        errors_count: errors.length,
        progress_percent: 100,
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Generate initial recommendations based on content
    await generateInitialRecommendations(supabase, job.id)

    console.log(`✅ Processing complete!`)
    console.log(`   Total pages: ${pages.length}`)
    console.log(`   ✓ Processed: ${processedCount}`)
    console.log(`   ⊘ Skipped (low-value): ${skippedCount}`)
    console.log(`   ✗ Errors: ${errors.length}`)
    console.log(`   📄 PDFs: ${pdfCount}`)
    console.log(`   🔍 Embeddings: ${embeddingCount}`)

  } catch (error: any) {
    console.error('Failed to process results:', error)

    await supabase
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', jobId)
  }
}

/**
 * Download a PDF from a URL and store it in Supabase Storage
 *
 * SETUP REQUIRED: Before using this function, you must create a 'pdfs' bucket in Supabase Storage:
 * 1. Go to Supabase Dashboard → Storage → Create bucket
 * 2. Name: 'pdfs'
 * 3. Make it public for easy access
 * 4. Set appropriate size limits (e.g., 50MB per file)
 *
 * See SUPABASE-SETUP-GUIDE.md for detailed instructions.
 */
async function downloadAndStorePDF(
  supabase: any,
  pdfUrl: string,
  title: string
): Promise<string> {
  // Download the PDF
  const response = await fetch(pdfUrl)

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Generate a safe filename from the URL or title
  const urlPath = new URL(pdfUrl).pathname
  const originalFilename = urlPath.split('/').pop() || 'document.pdf'

  // Create a unique filename with timestamp to avoid conflicts
  const timestamp = Date.now()
  const safeFilename = `${timestamp}-${originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const storagePath = `smart-recovery/${safeFilename}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('pdfs')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Failed to upload PDF to storage: ${error.message}`)
  }

  // Return the storage path
  return storagePath
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

  // Download and store the actual PDF file
  let filePath: string | null = null
  try {
    filePath = await downloadAndStorePDF(supabase, url, title)
  } catch (error: any) {
    console.error(`Failed to download PDF from ${url}:`, error.message)
    // Continue even if PDF download fails - we still have extracted text
  }

  const { error } = await supabase
    .from('pdf_documents')
    .upsert({
      scraped_content_id: scrapedContentId,
      title,
      url,
      file_path: filePath,
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
    throw new Error(`Failed to store PDF metadata: ${error.message} (${error.code})`)
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
  // Chunk content into smaller pieces (500 words each to stay under 8192 token limit)
  // Conservative estimate: 500 words ≈ 666 tokens (well under 8192 limit)
  const chunks = chunkContent(content, 500)
  let embeddingCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    try {
      // Estimate token count (rough estimate: 1 word ≈ 1.33 tokens)
      const estimatedTokens = estimateTokenCount(chunk)

      // Skip if chunk is too large (safety check)
      if (estimatedTokens > 8000) {
        console.warn(`Chunk ${i} estimated at ${estimatedTokens} tokens, splitting further...`)

        // Recursively split this chunk
        const subChunks = chunkContent(chunk, 250)
        for (const subChunk of subChunks) {
          try {
            await createEmbedding(supabase, openai, scrapedContentId, subChunk, i, title, contentType)
            embeddingCount++
          } catch (subError: any) {
            console.error(`Failed to generate sub-chunk embedding:`, subError.message)
          }
        }
        continue
      }

      // Generate embedding
      await createEmbedding(supabase, openai, scrapedContentId, chunk, i, title, contentType)
      embeddingCount++

      // Rate limiting: wait 50ms between requests
      await new Promise(resolve => setTimeout(resolve, 50))

    } catch (error: any) {
      // Handle token limit errors specifically
      if (error.message?.includes('maximum context length')) {
        console.warn(`Chunk ${i} exceeded token limit, splitting into smaller chunks...`)

        // Try splitting this chunk in half
        const words = chunk.split(/\s+/)
        const midpoint = Math.floor(words.length / 2)
        const subChunks = [
          words.slice(0, midpoint).join(' '),
          words.slice(midpoint).join(' ')
        ]

        for (const subChunk of subChunks) {
          try {
            await createEmbedding(supabase, openai, scrapedContentId, subChunk, i, title, contentType)
            embeddingCount++
          } catch (subError: any) {
            console.error(`Failed to generate sub-chunk embedding after split:`, subError.message)
          }
        }
      } else {
        console.error(`Failed to generate embedding for chunk ${i}:`, error.message)
      }
    }
  }

  return embeddingCount
}

/**
 * Helper function to create a single embedding
 */
async function createEmbedding(
  supabase: any,
  openai: OpenAI,
  scrapedContentId: string,
  chunkText: string,
  chunkIndex: number,
  title: string,
  contentType: string
) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: chunkText
  })

  const embedding = response.data[0].embedding

  // Store embedding
  const { error } = await supabase
    .from('content_embeddings')
    .insert({
      scraped_content_id: scrapedContentId,
      chunk_index: chunkIndex,
      chunk_text: chunkText,
      chunk_size: chunkText.split(/\s+/).length,
      embedding,
      section_title: chunkIndex === 0 ? title : `${title} (Part ${chunkIndex + 1})`,
      content_type: contentType
    })

  if (error) {
    console.error('Failed to store embedding:', error)
    throw error
  }
}

/**
 * Estimate token count (rough estimate: 1 word ≈ 1.33 tokens for English text)
 */
function estimateTokenCount(text: string): number {
  const wordCount = text.split(/\s+/).length
  return Math.ceil(wordCount * 1.33)
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

/**
 * Determine if a page should be skipped based on quality signals
 */
function shouldSkipPage(url: string, title: string, content: string): boolean {
  const urlLower = url.toLowerCase()
  const titleLower = title.toLowerCase()

  // Skip image and asset files
  const assetExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.css', '.js']
  if (assetExtensions.some(ext => urlLower.endsWith(ext))) {
    return true
  }

  // Skip asset pages (Hubfs, etc.)
  if (urlLower.includes('/hubfs/') || titleLower === 'hubfs' || titleLower === 'untitled') {
    return true
  }

  // Skip 404 pages
  if (titleLower.includes('page not found') || titleLower.includes('404') || titleLower === 'not found') {
    return true
  }

  // Skip pages with very little content (less than 50 words)
  const wordCount = content.trim().split(/\s+/).length
  if (wordCount < 50 && !urlLower.endsWith('.pdf')) {
    return true
  }

  // Skip pages that are just addresses (meeting locations)
  // These typically have short titles with street numbers and few words
  const hasStreetNumber = /^\d+\s/.test(title)
  const isShortTitle = title.split(/\s+/).length < 8
  const hasAddressKeywords = /\b(st|street|rd|road|ave|avenue|dr|drive|nsw|vic|qld|sa|wa|tas|act|nt)\b/i.test(title)

  if (hasStreetNumber && isShortTitle && hasAddressKeywords && wordCount < 100) {
    return true
  }

  // Skip query parameter URLs (usually duplicates)
  const urlObj = new URL(url)
  if (urlObj.search && urlObj.search.length > 50) {
    return true
  }

  return false
}

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

// Route segment config for Next.js App Router
export const maxDuration = 300 // 5 minutes timeout
export const dynamic = 'force-dynamic' // Disable static optimization
// Note: Body size limits in App Router are configured via next.config.js or middleware
// The default limit is 1MB, but this can be increased in next.config.js with:
// experimental: { serverActions: { bodySizeLimit: '10mb' } }
