import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const CONTENT_ANALYSIS_PROMPT = `You are an expert content analyst specializing in addiction recovery, SMART Recovery methodology, and facilitator resources.

Analyze the provided content and return a JSON object with:

{
  "summary": "2-3 sentence summary of what this content covers and its main value",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "relevantForFacilitators": true/false,
  "contentType": "Training Material|Resource Guide|Tool/Worksheet|Evidence/Research|Program Information|General Information",
  "facilitatorApplications": ["How facilitators could use this - specific application 1", "application 2"],
  "participantRelevance": "How this content relates to SMART Recovery participants",
  "keyTakeaways": ["Actionable takeaway 1", "takeaway 2", "takeaway 3"],
  "suggestedAudience": "Who would benefit most from this content",
  "contentQuality": "High|Medium|Basic - with brief justification",
  "learnWorldSuggestions": {
    "courseIdeas": ["Potential course or module that could be created from this content"],
    "learningObjectives": ["What participants would learn"],
    "format": "Video|Text|Interactive|Mixed"
  }
}

Focus on practical insights that would help facilitators understand and use this content effectively.`

export async function POST(req: Request) {
  try {
    const { contentId, content } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    if (!content) {
      return NextResponse.json(
        { error: 'No content provided for analysis' },
        { status: 400 }
      )
    }

    // Analyze with GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: CONTENT_ANALYSIS_PROMPT },
        {
          role: 'user',
          content: `Analyze this content from SMART Recovery Australia website:\n\n${content.substring(0, 15000)}`
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 2000
    })

    const analysis = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json({
      success: true,
      contentId,
      analysis,
      tokensUsed: completion.usage?.total_tokens || 0
    })
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze content', details: error.message },
      { status: 500 }
    )
  }
}
