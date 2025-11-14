import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface TranscriptUpdate {
  name: string  // Exact name of the interview file or person's name
  transcript: string
  status?: 'Interview complete' | 'Interview locked'  // Optional: update status when adding transcript
}

export async function POST(req: Request) {
  try {
    const data: TranscriptUpdate = await req.json()

    if (!data.name || !data.transcript) {
      return NextResponse.json(
        { error: 'Name and transcript are required' },
        { status: 400 }
      )
    }

    const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')

    // Find the interview file
    const files = fs.readdirSync(interviewsPath)
    const targetFile = files.find(file =>
      file.toLowerCase().includes(data.name.toLowerCase()) && file.endsWith('.md')
    )

    if (!targetFile) {
      return NextResponse.json(
        { error: `Interview file not found for: ${data.name}` },
        { status: 404 }
      )
    }

    const filePath = path.join(interviewsPath, targetFile)
    let content = fs.readFileSync(filePath, 'utf-8')

    // Update status if provided
    if (data.status) {
      const statusRegex = /Status:\s*.+$/m
      if (statusRegex.test(content)) {
        content = content.replace(statusRegex, `Status: ${data.status}`)
      } else {
        // Add status after metadata section
        const afterMetadata = content.indexOf('---')
        if (afterMetadata !== -1) {
          content = content.slice(0, afterMetadata) + `Status: ${data.status}\n\n${content.slice(afterMetadata)}`
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
      content = content.replace(transcriptRegex, `## Full Transcript\n\n${data.transcript}`)
    } else {
      // Append new transcript at the end
      content = content.trimEnd() + `\n\n---\n\n## Full Transcript\n\n${data.transcript}\n`
    }

    // Write updated content
    fs.writeFileSync(filePath, content, 'utf-8')

    return NextResponse.json({
      success: true,
      filename: targetFile,
      message: `Transcript updated successfully for ${data.name}`,
      status: data.status || 'unchanged'
    })
  } catch (error: any) {
    console.error('Update error:', error)
    return NextResponse.json(
      { error: 'Failed to update transcript', details: error.message },
      { status: 500 }
    )
  }
}
