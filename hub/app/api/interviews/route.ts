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
  analyzed: boolean
  analysis?: {
    executiveSummary: string
    keyThemes: Array<{
      theme: string
      description: string
      evidence: string[]
      significance: string
    }>
    powerfulQuotes: Array<{
      quote: string
      context: string
      significance: string
    }>
    learnWorldContentSuggestions: Array<{
      courseTitle: string
      description: string
      targetAudience: string
      format: string
      rationale: string
      keyLearningOutcomes: string[]
      estimatedLength: string
    }>
    facilitatorInsights: {
      challenges: string[]
      strengths: string[]
      supportNeeds: string[]
      learningPreferences: string
    }
    platformImplications: Array<{
      insight: string
      featureIdea: string
      priority: string
      rationale: string
    }>
    culturalConsiderations: {
      relevant: boolean
      insights: string[]
      recommendations: string[]
    }
    oneLineTakeaway: string
    analyzedAt: string
  }
}

export async function GET() {
  try {
    const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')
    const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')

    // Check if directory exists
    if (!fs.existsSync(interviewsPath)) {
      return NextResponse.json({ interviews: [] })
    }

    const files = fs.readdirSync(interviewsPath)
    const mdFiles = files.filter(file =>
      file.endsWith('.md') &&
      !file.includes('template') &&
      !file.includes('Final email')
    )

    const interviews: Interview[] = mdFiles.map((filename, index) => {
      const filePath = path.join(interviewsPath, filename)
      const content = fs.readFileSync(filePath, 'utf-8')

      // Extract name from first line (# Name)
      const nameMatch = content.match(/^#\s+(.+)$/m)
      const name = nameMatch ? nameMatch[1].trim() : filename.replace('.md', '')

      // Extract basic metadata
      const dateMatch = content.match(/Date:\s*(.+)$/m)
      const emailMatch = content.match(/Email:\s*(.+)$/m)
      const interviewDateMatch = content.match(/Interview date:\s*(.+)$/m)
      const notesMatch = content.match(/Notes\s*:\s*(.+)$/m)
      const affiliationMatch = content.match(/SRAU Affiliation:\s*(.+)$/m)
      const statusMatch = content.match(/Status:\s*(.+)$/m)

      // Try to load AI analysis
      let summary = ''
      let keyThemes: string[] = []
      let analyzed = false
      let analysis = undefined

      try {
        const analysisFile = path.join(analysisPath, filename.replace('.md', '.json'))
        if (fs.existsSync(analysisFile)) {
          const analysisData = JSON.parse(fs.readFileSync(analysisFile, 'utf-8'))
          analyzed = true
          analysis = analysisData

          // Use the one-line takeaway as summary
          summary = analysisData.oneLineTakeaway || analysisData.executiveSummary || ''

          // Extract theme titles from keyThemes
          if (analysisData.keyThemes && Array.isArray(analysisData.keyThemes)) {
            keyThemes = analysisData.keyThemes.map((t: any) => t.theme).slice(0, 5)
          }
        }
      } catch (error) {
        console.error(`Failed to load analysis for ${filename}:`, error)
      }

      // Fallback: if no analysis exists, create a basic summary
      if (!summary) {
        summary = `Interview with ${name} - Analysis pending`
        keyThemes = ['Not yet analyzed']
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
        keyThemes,
        filename,
        analyzed,
        analysis
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
