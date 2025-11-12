#!/usr/bin/env tsx

/**
 * Apply Content Scraping Schema to Supabase
 *
 * This script applies the content scraping schema to your Supabase database.
 * It creates all necessary tables, indexes, functions, and policies.
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

async function main() {
  console.log('🗄️  Applying Content Scraping Schema to Supabase')
  console.log('=' .repeat(60))
  console.log()

  // Check environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: Supabase credentials not found in .env.local')
    console.error('   Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }

  console.log('✅ Supabase credentials found')
  console.log(`📍 Project: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log()

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // Read schema file
    console.log('📖 Reading schema file...')
    const schemaPath = resolve(__dirname, '../../supabase-content-schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')

    console.log(`   Schema file: ${schemaPath}`)
    console.log(`   Size: ${(schema.length / 1024).toFixed(2)} KB`)
    console.log()

    // Apply schema
    console.log('⚙️  Applying schema to database...')
    console.log('   This may take a minute...')
    console.log()

    const { error } = await supabase.rpc('exec_sql', { sql: schema })

    if (error) {
      // If rpc doesn't exist, we need to use the REST API directly
      console.log('   Using direct SQL execution...')

      // Split schema into individual statements
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      let executed = 0
      let failed = 0

      for (const statement of statements) {
        try {
          await supabase.rpc('exec', { sql: statement })
          executed++
        } catch (err: any) {
          // Some errors are expected (e.g., table already exists)
          if (!err.message.includes('already exists')) {
            console.warn(`   ⚠️  Warning: ${err.message}`)
            failed++
          } else {
            executed++
          }
        }
      }

      console.log(`   ✅ Executed ${executed} statements`)
      if (failed > 0) {
        console.log(`   ⚠️  ${failed} statements had warnings`)
      }
    } else {
      console.log('   ✅ Schema applied successfully')
    }

    console.log()

    // Verify tables were created
    console.log('🔍 Verifying tables...')

    const tables = [
      'scraped_content',
      'pdf_documents',
      'content_embeddings',
      'content_recommendations',
      'facilitator_insights',
      'content_usage',
      'scraping_jobs',
      'content_categories'
    ]

    let allTablesExist = true

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`   ❌ ${table} - NOT FOUND`)
        allTablesExist = false
      } else {
        console.log(`   ✅ ${table} - OK`)
      }
    }

    console.log()

    if (allTablesExist) {
      console.log('=' .repeat(60))
      console.log('🎉 SCHEMA APPLIED SUCCESSFULLY!')
      console.log('=' .repeat(60))
      console.log()
      console.log('Your database now has:')
      console.log('  ✓ Content scraping tables')
      console.log('  ✓ Vector embedding support')
      console.log('  ✓ Recommendation system')
      console.log('  ✓ Facilitator insights tracking')
      console.log('  ✓ Analytics and usage tracking')
      console.log()
      console.log('Next steps:')
      console.log('  1. Run: npm run scrape-smart-site')
      console.log('  2. Wait for scraping to complete')
      console.log('  3. Test search and recommendations')
      console.log()
    } else {
      console.log('⚠️  SCHEMA PARTIALLY APPLIED')
      console.log()
      console.log('Some tables could not be created.')
      console.log('This might be due to:')
      console.log('  1. Missing pgvector extension')
      console.log('  2. Insufficient permissions')
      console.log('  3. Existing schema conflicts')
      console.log()
      console.log('Manual steps:')
      console.log('  1. Go to Supabase Dashboard → SQL Editor')
      console.log('  2. Copy contents of supabase-content-schema.sql')
      console.log('  3. Run the SQL directly in the editor')
      console.log()
    }

  } catch (error: any) {
    console.error()
    console.error('❌ SCHEMA APPLICATION FAILED')
    console.error('=' .repeat(60))
    console.error('Error:', error.message)
    console.error()
    console.error('Manual application recommended:')
    console.error('  1. Go to Supabase Dashboard')
    console.error('  2. Navigate to SQL Editor')
    console.error('  3. Open supabase-content-schema.sql')
    console.error('  4. Copy and paste the entire contents')
    console.error('  5. Click Run')
    console.error()
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}

export { main as applyContentSchema }
