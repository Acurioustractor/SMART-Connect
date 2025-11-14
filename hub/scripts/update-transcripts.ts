#!/usr/bin/env ts-node
/**
 * Script to easily add/update transcripts for interviews
 *
 * Usage:
 * 1. Single interview:
 *    npm run update-transcript -- --name "Mitch Robinson" --transcript "path/to/transcript.txt" --status "Interview complete"
 *
 * 2. Bulk from JSON file:
 *    npm run update-transcript -- --bulk transcripts.json
 *
 * JSON format for bulk:
 * [
 *   {
 *     "name": "Mitch Robinson",
 *     "transcript": "Full transcript text here...",
 *     "status": "Interview complete"
 *   },
 *   {
 *     "name": "Vic Manning",
 *     "transcript": "Full transcript text here...",
 *     "status": "Interview complete"
 *   }
 * ]
 */

import fs from 'fs'
import path from 'path'

interface TranscriptUpdate {
  name: string
  transcript: string
  status?: 'Interview complete' | 'Interview locked'
}

function updateSingleTranscript(name: string, transcriptPath: string, status?: string) {
  try {
    const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')

    // Read transcript from file or use as text
    let transcript = transcriptPath
    if (fs.existsSync(transcriptPath)) {
      transcript = fs.readFileSync(transcriptPath, 'utf-8')
      console.log(`✓ Read transcript from file: ${transcriptPath}`)
    }

    // Find the interview file
    const files = fs.readdirSync(interviewsPath)
    const targetFile = files.find(file =>
      file.toLowerCase().includes(name.toLowerCase()) && file.endsWith('.md')
    )

    if (!targetFile) {
      console.error(`✗ Interview file not found for: ${name}`)
      return false
    }

    console.log(`✓ Found interview file: ${targetFile}`)

    const filePath = path.join(interviewsPath, targetFile)
    let content = fs.readFileSync(filePath, 'utf-8')

    // Update status if provided
    if (status) {
      const statusRegex = /Status:\s*.+$/m
      if (statusRegex.test(content)) {
        content = content.replace(statusRegex, `Status: ${status}`)
        console.log(`✓ Updated status to: ${status}`)
      } else {
        // Add status after metadata section
        const lines = content.split('\n')
        const firstSeparator = lines.indexOf('---')
        if (firstSeparator !== -1) {
          lines.splice(firstSeparator, 0, `Status: ${status}`)
          content = lines.join('\n')
          console.log(`✓ Added status: ${status}`)
        }
      }
    }

    // Check if transcript section already exists
    const hasTranscript = content.includes('## Full Transcript') ||
                          content.includes('## Transcript') ||
                          content.includes('# Transcript')

    if (hasTranscript) {
      // Replace existing transcript
      const transcriptRegex = /##?\s*(?:Full\s+)?Transcript[\s\S]*$/i
      content = content.replace(transcriptRegex, `## Full Transcript\n\n${transcript}`)
      console.log('✓ Replaced existing transcript')
    } else {
      // Append new transcript at the end
      content = content.trimEnd() + `\n\n---\n\n## Full Transcript\n\n${transcript}\n`
      console.log('✓ Added new transcript section')
    }

    // Write updated content
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✓ Successfully updated: ${targetFile}\n`)

    return true
  } catch (error: any) {
    console.error(`✗ Error updating transcript for ${name}:`, error.message)
    return false
  }
}

function updateBulk(jsonPath: string) {
  try {
    console.log(`Reading bulk updates from: ${jsonPath}\n`)
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
    const updates: TranscriptUpdate[] = JSON.parse(jsonContent)

    let successful = 0
    let failed = 0

    for (const update of updates) {
      console.log(`Processing: ${update.name}`)
      const success = updateSingleTranscript(update.name, update.transcript, update.status)
      if (success) {
        successful++
      } else {
        failed++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`Bulk update complete!`)
    console.log(`✓ Successful: ${successful}`)
    console.log(`✗ Failed: ${failed}`)
    console.log('='.repeat(50))

  } catch (error: any) {
    console.error('✗ Error processing bulk update:', error.message)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.includes('--bulk')) {
  const bulkIndex = args.indexOf('--bulk')
  const jsonPath = args[bulkIndex + 1]
  if (!jsonPath) {
    console.error('Error: Please provide a JSON file path after --bulk')
    process.exit(1)
  }
  updateBulk(jsonPath)
} else if (args.includes('--name')) {
  const nameIndex = args.indexOf('--name')
  const transcriptIndex = args.indexOf('--transcript')
  const statusIndex = args.indexOf('--status')

  const name = args[nameIndex + 1]
  const transcript = args[transcriptIndex + 1]
  const status = statusIndex !== -1 ? args[statusIndex + 1] : undefined

  if (!name || !transcript) {
    console.error('Error: --name and --transcript are required')
    console.error('\nUsage:')
    console.error('  npm run update-transcript -- --name "Person Name" --transcript "path/to/file.txt" --status "Interview complete"')
    process.exit(1)
  }

  updateSingleTranscript(name, transcript, status)
} else {
  console.log('SMART Connect - Transcript Update Tool')
  console.log('=' .repeat(50))
  console.log('\nUsage:')
  console.log('\n1. Update single interview:')
  console.log('   npm run update-transcript -- --name "Mitch Robinson" --transcript "path/to/transcript.txt" --status "Interview complete"')
  console.log('\n2. Bulk update from JSON:')
  console.log('   npm run update-transcript -- --bulk transcripts.json')
  console.log('\n3. Update with inline text:')
  console.log('   npm run update-transcript -- --name "Mitch Robinson" --transcript "The interview text..." --status "Interview complete"')
  console.log('\nJSON format for bulk updates:')
  console.log(`[
  {
    "name": "Mitch Robinson",
    "transcript": "Full transcript text...",
    "status": "Interview complete"
  }
]`)
  console.log('\n' + '='.repeat(50))
}
