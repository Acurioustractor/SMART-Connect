import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface InterviewUpload {
  name: string
  email?: string
  date?: string
  interviewDate?: string
  affiliation?: string
  notes?: string
  transcript: string
}

export async function POST(req: Request) {
  try {
    const data: InterviewUpload = await req.json()

    if (!data.name || !data.transcript) {
      return NextResponse.json(
        { error: 'Name and transcript are required' },
        { status: 400 }
      )
    }

    // Generate AI analysis
    let aiAnalysis: any = null
    if (process.env.OPENAI_API_KEY) {
      try {
        const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3080'}/api/interviews/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: data.transcript,
            interviewName: data.name
          })
        })
        const analysisData = await analysisResponse.json()
        aiAnalysis = analysisData.analysis
      } catch (error) {
        console.error('AI analysis failed, continuing without it:', error)
      }
    }

    // Create markdown file
    const filename = `${data.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.md`
    const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')

    // Ensure directory exists
    if (!fs.existsSync(interviewsPath)) {
      fs.mkdirSync(interviewsPath, { recursive: true })
    }

    const fileContent = `# ${data.name}

${data.date ? `Date: ${data.date}` : ''}
${data.email ? `Email: ${data.email}` : ''}
${data.interviewDate ? `Interview date: ${data.interviewDate}` : ''}
${data.notes ? `Notes: ${data.notes}` : ''}
${data.affiliation ? `SRAU Affiliation: ${data.affiliation}` : ''}
Status: Interview complete

---

${aiAnalysis ? `## AI-Generated Summary

**Summary**

${aiAnalysis.summary}

**Key Quotes:**

${aiAnalysis.keyInsights?.map((insight: string, idx: number) => `${idx + 1}. ${insight}`).join('\n') || ''}

**Key Sentiments:**

${aiAnalysis.keyThemes?.map((theme: string, idx: number) => `${idx + 1}. ${theme}`).join('\n') || ''}

**Community Focus:**

${aiAnalysis.communityFocus || ''}

**Recommendations:**

${aiAnalysis.recommendations?.map((rec: string, idx: number) => `${idx + 1}. ${rec}`).join('\n') || ''}

---

` : ''}## Full Transcript

${data.transcript}
`

    const filePath = path.join(interviewsPath, filename)
    fs.writeFileSync(filePath, fileContent, 'utf-8')

    return NextResponse.json({
      success: true,
      filename,
      message: 'Interview uploaded and analyzed successfully',
      aiAnalysis
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload interview', details: error.message },
      { status: 500 }
    )
  }
}
