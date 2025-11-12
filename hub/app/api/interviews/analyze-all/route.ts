import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const DEEP_ANALYSIS_PROMPT = `You are a world-class qualitative researcher and thematic analyst specializing in community health, recovery support systems, and digital platform design. You're analyzing facilitator interviews for SMART Recovery Australia to extract deep, nuanced insights.

# Your Mission
Create a comprehensive, thoughtful analysis that:
- Identifies unique perspectives and lived experiences
- Extracts meaningful themes with supporting evidence
- Highlights powerful quotes that reveal deeper truths
- Suggests specific, actionable LearnWorld course content
- Provides strategic insights for platform development

# Analysis Framework

Return a JSON object with:
{
  "executiveSummary": "3-4 compelling sentences that capture what makes this person's perspective unique and valuable. What's their story? What insights do they bring?",

  "keyThemes": [
    {
      "theme": "Short, evocative theme title",
      "description": "2-3 sentences explaining this theme with nuance and depth",
      "evidence": ["Actual quote from interview", "Another supporting quote"],
      "significance": "Why this matters for facilitators/platform"
    }
  ],

  "powerfulQuotes": [
    {
      "quote": "Exact quote from interview",
      "context": "What was being discussed",
      "significance": "Why this quote is powerful - what it reveals about facilitator experience, needs, or insights"
    }
  ],

  "learnWorldContentSuggestions": [
    {
      "courseTitle": "Specific, engaging course title",
      "description": "What this course would cover in 2-3 sentences",
      "targetAudience": "Who needs this and why",
      "format": "Podcast series|Video modules|Interactive workshop|Micro-learning|Resource library",
      "rationale": "Why this interview reveals the need for this content",
      "keyLearningOutcomes": [
        "Specific skill or knowledge participants will gain",
        "Another concrete outcome",
        "A third practical outcome"
      ],
      "estimatedLength": "e.g., 6 x 15-minute episodes, 4-week course, 20-minute module"
    }
  ],

  "facilitatorInsights": {
    "challenges": ["Specific challenge mentioned", "Another challenge"],
    "strengths": ["What this facilitator does well", "Another strength"],
    "supportNeeds": ["Specific support they need", "Another need"],
    "learningPreferences": "How they prefer to learn and why"
  },

  "platformImplications": [
    {
      "insight": "Specific insight about what facilitators need",
      "featureIdea": "Concrete feature or capability this suggests",
      "priority": "Critical|High|Medium",
      "rationale": "Why this matters"
    }
  ],

  "culturalConsiderations": {
    "relevant": true|false,
    "insights": ["Any cultural safety, diversity, or inclusion considerations"],
    "recommendations": ["Specific recommendations if applicable"]
  },

  "oneLineTakeaway": "The single most important insight from this interview in one compelling sentence"
}

# Quality Standards
- Extract ACTUAL verbatim quotes
- Be specific, not generic
- Focus on what's UNIQUE about this person's experience
- Think deeply about implications
- Suggest practical, implementable content ideas
- Consider the whole facilitator journey
- Identify patterns that might apply broadly

Analyze with depth, nuance, and genuine insight. This isn't just data extraction - it's understanding a human being's experience and translating it into actionable knowledge.`

interface InterviewAnalysis {
  filename: string
  name: string
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

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')
    const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')

    // Create analysis directory if it doesn't exist
    if (!fs.existsSync(analysisPath)) {
      fs.mkdirSync(analysisPath, { recursive: true })
    }

    // Get all interview files
    const files = fs.readdirSync(interviewsPath)
    const mdFiles = files.filter(file =>
      file.endsWith('.md') &&
      !file.includes('template') &&
      !file.includes('Final email')
    )

    const results = {
      total: mdFiles.length,
      analyzed: 0,
      skipped: 0,
      failed: 0,
      analyses: [] as any[]
    }

    for (const filename of mdFiles) {
      try {
        // Check if already analyzed
        const analysisFile = path.join(analysisPath, filename.replace('.md', '.json'))
        if (fs.existsSync(analysisFile)) {
          results.skipped++
          continue
        }

        // Read interview content
        const filePath = path.join(interviewsPath, filename)
        const content = fs.readFileSync(filePath, 'utf-8')

        // Extract name
        const nameMatch = content.match(/^#\s+(.+)$/m)
        const name = nameMatch ? nameMatch[1].trim() : filename.replace('.md', '')

        console.log(`Analyzing interview: ${name}`)

        // Analyze with GPT-4
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: DEEP_ANALYSIS_PROMPT },
            {
              role: 'user',
              content: `Analyze this interview with ${name}:\n\n${content.substring(0, 25000)}`
            },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
          max_tokens: 4000
        })

        const analysisData = JSON.parse(completion.choices[0].message.content || '{}')

        // Create full analysis object
        const analysis: InterviewAnalysis = {
          filename,
          name,
          ...analysisData,
          analyzedAt: new Date().toISOString()
        }

        // Save analysis
        fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2))

        results.analyzed++
        results.analyses.push({
          name,
          filename,
          status: 'success'
        })

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: any) {
        console.error(`Failed to analyze ${filename}:`, error)
        results.failed++
        results.analyses.push({
          name: filename,
          filename,
          status: 'failed',
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze interviews', details: error.message },
      { status: 500 }
    )
  }
}
