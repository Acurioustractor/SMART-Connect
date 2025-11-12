import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export interface Interview {
  id: string
  name: string
  date?: string
  email?: string
  interviewDate?: string
  notes?: string
  affiliation?: string
  status?: string
  summary?: string
  filename: string
}

export async function GET() {
  try {
    const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')

    // Check if directory exists
    if (!fs.existsSync(interviewsPath)) {
      return NextResponse.json({ interviews: [] })
    }

    const files = fs.readdirSync(interviewsPath)
    const mdFiles = files.filter(file => file.endsWith('.md'))

    const interviews: Interview[] = mdFiles.map((filename, index) => {
      const filePath = path.join(interviewsPath, filename)
      const content = fs.readFileSync(filePath, 'utf-8')

      // Extract name from first line (# Name)
      const nameMatch = content.match(/^#\s+(.+)$/m)
      const name = nameMatch ? nameMatch[1].trim() : filename.replace('.md', '')

      // Extract metadata
      const dateMatch = content.match(/Date:\s*(.+)$/m)
      const emailMatch = content.match(/Email:\s*(.+)$/m)
      const interviewDateMatch = content.match(/Interview date:\s*(.+)$/m)
      const notesMatch = content.match(/Notes\s*:\s*(.+)$/m)
      const affiliationMatch = content.match(/SRAU Affiliation:\s*(.+)$/m)
      const statusMatch = content.match(/Status:\s*(.+)$/m)

      // Extract summary - try multiple patterns
      let summary = ''

      // Try to find "Summary of interview" or just "Summary" heading
      const summaryHeadingMatch = content.match(/#+\s*Summary[^\n]*\n+([\s\S]*?)(?=\n#+|$)/)
      if (summaryHeadingMatch) {
        summary = summaryHeadingMatch[1].trim().substring(0, 400)
      } else {
        // Try to find key quotes or sentiments section
        const keyQuotesMatch = content.match(/\*\*Key (Quotes|Sentiments):\*\*\s*([\s\S]*?)(?=\n\*\*|$)/)
        if (keyQuotesMatch) {
          summary = keyQuotesMatch[2].trim().substring(0, 400)
        } else {
          // Fall back to content after the metadata section
          const contentAfterMeta = content.split('---').slice(2).join('---').trim()
          if (contentAfterMeta && contentAfterMeta.length > 50) {
            summary = contentAfterMeta.substring(0, 400)
          }
        }
      }

      // Clean up summary
      if (summary) {
        summary = summary.replace(/\[[\s\S]*?\]\([\s\S]*?\)/g, '') // Remove markdown links
        summary = summary.replace(/!\[[\s\S]*?\]/g, '') // Remove images
        summary = summary.replace(/#{1,6}\s/g, '') // Remove heading markers
        summary = summary.trim()
        if (summary.length > 300) {
          summary = summary.substring(0, 300) + '...'
        }
      }

      return {
        id: `interview-${index}`,
        name,
        date: dateMatch ? dateMatch[1].trim() : undefined,
        email: emailMatch ? emailMatch[1].trim() : undefined,
        interviewDate: interviewDateMatch ? interviewDateMatch[1].trim() : undefined,
        notes: notesMatch ? notesMatch[1].trim() : undefined,
        affiliation: affiliationMatch ? affiliationMatch[1].trim() : undefined,
        status: statusMatch ? statusMatch[1].trim() : undefined,
        summary,
        filename
      }
    })

    // Sort by name
    interviews.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ interviews })
  } catch (error: any) {
    console.error('Error fetching interviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch interviews', details: error.message },
      { status: 500 }
    )
  }
}
