import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findPDFs() {
  console.log('\n🔍 Looking for PDFs in your database...\n')

  // Check scraped_content for PDF content types
  const { data: pdfPages, count: pdfCount } = await supabase
    .from('scraped_content')
    .select('id, url, title, content_type', { count: 'exact' })
    .or('content_type.eq.pdf,url.ilike.%.pdf')
    .limit(10)

  console.log(`📄 PDFs in scraped_content: ${pdfCount || 0}`)

  if (pdfPages && pdfPages.length > 0) {
    console.log('\nExample PDFs:')
    pdfPages.slice(0, 5).forEach(pdf => {
      console.log(`  - ${pdf.title || 'Untitled'}`)
      console.log(`    URL: ${pdf.url}`)
      console.log(`    Type: ${pdf.content_type}\n`)
    })
  }

  // Check if there's a separate pdf_documents table
  const { count: pdfDocsCount } = await supabase
    .from('pdf_documents')
    .select('*', { count: 'exact', head: true })

  console.log(`📚 PDFs in pdf_documents table: ${pdfDocsCount || 0}`)

  // Check Supabase Storage
  try {
    const { data: buckets } = await supabase.storage.listBuckets()

    console.log(`\n🗄️  Storage buckets:`)
    if (buckets && buckets.length > 0) {
      for (const bucket of buckets) {
        console.log(`  - ${bucket.name}`)

        const { data: files } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 100 })

        const pdfFiles = files?.filter(f => f.name.endsWith('.pdf')) || []
        console.log(`    PDFs: ${pdfFiles.length}`)

        if (pdfFiles.length > 0) {
          pdfFiles.slice(0, 3).forEach(f => {
            console.log(`      • ${f.name}`)
          })
        }
      }
    } else {
      console.log('  (no buckets found)')
    }
  } catch (error: any) {
    console.log(`  ⚠️  Could not list storage: ${error.message}`)
  }

  console.log('\n')
}

findPDFs().catch(console.error)
