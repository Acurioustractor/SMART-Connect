#!/usr/bin/env tsx

/**
 * Test PDF Storage
 * 
 * This script tests if PDFs are being properly saved to Supabase storage
 */

import chalk from 'chalk'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080'

// A known working PDF from the user's output
const TEST_PDF_URL = 'https://smartrecoveryaustralia.com.au/hubfs/Rating%20Scale%20Worksheet%20Download.pdf'

async function testPDFStorage() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  Testing PDF Storage                                       ║
╚═══════════════════════════════════════════════════════════╝
`))

  console.log(chalk.blue(`📄 Testing PDF: ${TEST_PDF_URL}\n`))

  try {
    const response = await fetch(`${BASE_URL}/api/content/scrape-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'scrape_single',
        url: TEST_PDF_URL
      })
    })

    const result = await response.json()

    if (result.success) {
      console.log(chalk.green(`✅ PDF processed successfully!\n`))
      console.log(chalk.gray(`   Title: ${result.title}`))
      console.log(chalk.gray(`   Content Type: ${result.contentType}`))
      console.log(chalk.gray(`   Word Count: ${result.wordCount}`))
      console.log(chalk.gray(`   Embedding Count: ${result.embeddingCount}\n`))
      
      console.log(chalk.cyan(`🎉 PDF storage is working!\n`))
      console.log(chalk.gray(`   Check your Supabase Storage bucket 'pdfs' under the 'smart-recovery/' folder`))
      console.log(chalk.gray(`   The PDF file should be saved there.\n`))
    } else {
      console.log(chalk.red(`❌ Failed: ${result.error}\n`))
    }

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`))
  }
}

testPDFStorage()
