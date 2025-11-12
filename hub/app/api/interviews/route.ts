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

      // Extract summary (first paragraph after "Summary" heading)
      const summaryMatch = content.match(/Summary\s*\n+([\s\S]*?)(?=\n#|$)/)
      const summary = summaryMatch ? summaryMatch[1].trim().substring(0, 300) + '...' : ''

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
