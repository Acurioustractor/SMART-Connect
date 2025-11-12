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
  keyThemes?: string[]
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

      // Extract structured summary and themes
      let summary = ''
      const keyThemes: string[] = []

      // 1. Try to find the descriptive summary paragraph (after **Summary** or just Summary)
      let summaryBlockMatch = content.match(/\*\*.*?Summary.*?\*\*\s*\n+([\s\S]*?)(?=\n#{1,3}\s|\n\*\*|$)/i)

      // If not found, try without asterisks
      if (!summaryBlockMatch) {
        summaryBlockMatch = content.match(/^Summary\s*\n+([\s\S]*?)(?=\n#{1,3}\s|\n\*\*|$)/im)
      }

      if (summaryBlockMatch) {
        summary = summaryBlockMatch[1].trim()
        // Extract just the key themes or first meaningful paragraph
        const keyThemesMatch = summary.match(/\*\*Key Themes:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i)
        if (keyThemesMatch) {
          summary = keyThemesMatch[1].trim()
        }
        // Clean and format
        summary = summary.replace(/\[[\s\S]*?\]\([\s\S]*?\)/g, '')
        summary = summary.replace(/!\[[\s\S]*?\]/g, '')
        summary = summary.replace(/#{1,6}\s/g, '')
        summary = summary.replace(/\*\*/g, '')
        summary = summary.split('\n').filter(line => line.trim()).join(' ')
        if (summary.length > 450) {
          summary = summary.substring(0, 450) + '...'
        }
      }

      // 2. Extract key themes from quotes section
      const keyQuotesSection = content.match(/\*\*Key Quotes:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i)
      if (keyQuotesSection) {
        const quotes = keyQuotesSection[1].match(/^\d+\.\s+(?:On\s+)?([^:]+):/gm)
        if (quotes) {
          quotes.slice(0, 4).forEach(q => {
            const theme = q.replace(/^\d+\.\s+(?:On\s+)?/, '').replace(/:$/, '').trim()
            keyThemes.push(theme)
          })
        }
      }

      // 3. Extract key sentiments
      const sentimentsSection = content.match(/\*\*Key Sentiments:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i)
      if (sentimentsSection) {
        const sentiments = sentimentsSection[1].match(/^\d+\.\s+(.+?)(?:\.|$)/gm)
        if (sentiments) {
          sentiments.slice(0, 3).forEach(s => {
            const theme = s.replace(/^\d+\.\s+/, '').replace(/\.$/, '').trim()
            if (theme.length > 10 && theme.length < 100) {
              keyThemes.push(theme)
            }
          })
        }
      }

      // 4. Look for community/connection related quotes in the content
      if (keyThemes.length === 0) {
        const connectionKeywords = [
          /connection.*?["']([^"']{20,150})["']/gi,
          /community.*?["']([^"']{20,150})["']/gi,
          /support.*?["']([^"']{20,150})["']/gi,
          /facilitator.*?["']([^"']{20,150})["']/gi
        ]

        connectionKeywords.forEach(regex => {
          const matches = content.matchAll(regex)
          for (const match of matches) {
            if (keyThemes.length < 5 && match[1]) {
              keyThemes.push(match[1].substring(0, 80))
            }
          }
        })
      }

      // 5. If still no summary, create from key themes
      if (!summary && keyThemes.length > 0) {
        summary = `Key themes: ${keyThemes.slice(0, 2).join('; ')}`
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
        keyThemes: keyThemes.slice(0, 5),
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
