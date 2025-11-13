import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkTables() {
  console.log('\n🔍 Checking Supabase tables...\n')

  const tables = [
    'scraped_content',
    'pdf_documents',
    'content_embeddings',
    'content_recommendations',
    'facilitator_insights',
    'scraping_jobs',
    'interviews',
    'interview_analysis',
    'user_profiles',
    'conversations',
    'messages'
  ]

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`❌ ${table}: ${error.message}`)
    } else {
      console.log(`✅ ${table}: ${count} rows`)
    }
  }

  console.log('\n')
}

checkTables().catch(console.error)
