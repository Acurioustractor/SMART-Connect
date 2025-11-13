#!/usr/bin/env tsx

/**
 * Setup PDF Storage Bucket
 *
 * This script creates and configures the Supabase Storage bucket for PDFs.
 *
 * The bucket will be:
 * - Named 'pdfs'
 * - Public (so PDFs can be downloaded)
 * - With appropriate file size limits
 *
 * Usage:
 *   npx tsx scripts/setup-pdf-storage.ts
 */

import { createClient } from '@supabase/supabase-js'
import chalk from 'chalk'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupPDFBucket() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  SMART Connect - PDF Storage Setup                        ║
╚═══════════════════════════════════════════════════════════╝
`))

  try {
    // Check if bucket already exists
    console.log(chalk.blue('📋 Checking existing buckets...\n'))

    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`)
    }

    const pdfBucketExists = existingBuckets?.some(b => b.name === 'pdfs')

    if (pdfBucketExists) {
      console.log(chalk.green('✅ PDF bucket already exists!'))

      // Get bucket details
      const bucket = existingBuckets?.find(b => b.name === 'pdfs')
      console.log(chalk.gray(`   ID: ${bucket?.id}`))
      console.log(chalk.gray(`   Public: ${bucket?.public ? 'Yes' : 'No'}`))
      console.log(chalk.gray(`   Created: ${bucket?.created_at}\n`))

      console.log(chalk.yellow('⚠️  Bucket already exists. No changes made.'))
      console.log(chalk.gray('   To reconfigure, delete the bucket in Supabase dashboard and re-run this script.\n'))

      await testBucket()
      return
    }

    // Create the bucket
    console.log(chalk.blue('🆕 Creating PDF storage bucket...\n'))

    const { data: newBucket, error: createError } = await supabase.storage.createBucket('pdfs', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/pdf']
    })

    if (createError) {
      // Check if error is about API version
      if (createError.message.includes('fileSizeLimit') || createError.message.includes('allowedMimeTypes')) {
        console.log(chalk.yellow('⚠️  Advanced options not supported in this Supabase version'))
        console.log(chalk.yellow('   Creating bucket with basic settings...\n'))

        // Try again with just public setting
        const { data: basicBucket, error: basicError } = await supabase.storage.createBucket('pdfs', {
          public: true
        })

        if (basicError) {
          throw new Error(`Failed to create bucket: ${basicError.message}`)
        }

        console.log(chalk.green('✅ PDF bucket created successfully (basic settings)!'))
        console.log(chalk.gray('   Configure file size limits and MIME types in Supabase dashboard\n'))
      } else {
        throw new Error(`Failed to create bucket: ${createError.message}`)
      }
    } else {
      console.log(chalk.green('✅ PDF bucket created successfully!'))
      console.log(chalk.gray(`   ID: ${newBucket}\n`))
    }

    // Set bucket to public (in case it wasn't set during creation)
    console.log(chalk.blue('🔓 Ensuring bucket is public...\n'))

    // Note: updateBucket might not be available in all versions
    // If it fails, we'll provide manual instructions
    try {
      const { error: updateError } = await supabase.storage.updateBucket('pdfs', {
        public: true
      })

      if (updateError && !updateError.message.includes('not found')) {
        console.log(chalk.yellow(`   Note: ${updateError.message}`))
      } else if (!updateError) {
        console.log(chalk.green('✅ Bucket is public'))
      }
    } catch (e: any) {
      console.log(chalk.yellow(`   Note: Could not update bucket settings automatically`))
      console.log(chalk.gray(`   ${e.message}\n`))
    }

    console.log()
    await testBucket()
    printNextSteps()

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`))
    console.log(chalk.yellow('💡 Manual Setup Instructions:\n'))
    printManualInstructions()
    process.exit(1)
  }
}

async function testBucket() {
  console.log(chalk.blue('🧪 Testing bucket access...\n'))

  try {
    // Try to list files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from('pdfs')
      .list('', { limit: 1 })

    if (listError) {
      throw new Error(`Cannot access bucket: ${listError.message}`)
    }

    console.log(chalk.green('✅ Bucket is accessible'))
    console.log(chalk.gray(`   Current files: ${files?.length || 0}\n`))

    // Test public URL generation
    const testUrl = supabase.storage
      .from('pdfs')
      .getPublicUrl('test.pdf')

    console.log(chalk.green('✅ Public URL generation works'))
    console.log(chalk.gray(`   URL format: ${testUrl.data.publicUrl.split('/test.pdf')[0]}/*\n`))

  } catch (error: any) {
    console.log(chalk.yellow(`⚠️  Could not test bucket: ${error.message}`))
    console.log(chalk.gray('   This is normal if the bucket is newly created\n'))
  }
}

function printManualInstructions() {
  console.log(chalk.cyan('Manual Setup Steps:'))
  console.log(chalk.gray(`
1. Go to your Supabase Dashboard
   ${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/project/_/storage/buckets

2. Click "Create a new bucket"

3. Configure the bucket:
   - Name: pdfs
   - Public bucket: ✅ Yes (checked)
   - File size limit: 50MB (52428800 bytes)
   - Allowed MIME types: application/pdf

4. Click "Create bucket"

5. Set up Storage Policies (optional but recommended):
   - Allow public SELECT for read access
   - Allow authenticated INSERT for uploads
   - Allow authenticated UPDATE for updates
   - Allow authenticated DELETE for deletions
`))
}

function printNextSteps() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  Setup Complete!                                           ║
╚═══════════════════════════════════════════════════════════╝
`))

  console.log(chalk.green('✅ PDF storage bucket is ready!\n'))

  console.log(chalk.magenta('📋 Next Steps:\n'))

  console.log(chalk.gray('1. Start processing PDFs with file storage:'))
  console.log(chalk.white('   npx tsx scripts/discover-all-pdfs.ts download 10\n'))

  console.log(chalk.gray('2. PDFs will now be:'))
  console.log(chalk.white('   ✓ Downloaded from their original URLs'))
  console.log(chalk.white('   ✓ Stored in Supabase Storage'))
  console.log(chalk.white('   ✓ Text extracted for search'))
  console.log(chalk.white('   ✓ Made available for download\n'))

  console.log(chalk.gray('3. Access PDFs programmatically:'))
  console.log(chalk.white(`   const url = supabase.storage.from('pdfs').getPublicUrl('filename.pdf')`))
  console.log(chalk.white(`   // Returns: { publicUrl: 'https://...' }\n`))

  console.log(chalk.gray('4. View stored PDFs:'))
  console.log(chalk.white(`   ${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/project/_/storage/buckets/pdfs\n`))

  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '/storage/v1/object/public/pdfs')
  console.log(chalk.gray('5. Public URL pattern:'))
  console.log(chalk.white(`   ${publicUrl}/[path-to-file.pdf]\n`))
}

// Run the setup
setupPDFBucket()
