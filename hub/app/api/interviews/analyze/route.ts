import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const ANALYSIS_PROMPT = `You are an expert qualitative researcher analyzing facilitator interviews for SMART Recovery Australia.

Your task is to extract key insights focused on:
- Community building and connection
- Facilitator support needs
- Online engagement and accessibility
- Cultural safety
- Peer support and mutual aid

Return a JSON object with:
{
  "summary": "2-3 sentence overview of the interview highlighting community/connection themes",
  "keyThemes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "keyInsights": [
    "Full quote or paraphrased insight about community",
    "Full quote or paraphrased insight about connection",
    "Full quote or paraphrased insight about support"
  ],
  "communityFocus": "1-2 sentences specifically about how this person views/experiences community",
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}

Extract actual quotes when possible. Focus on what would help build an online facilitator community.`

export async function POST(req: Request) {
  try {
    const { content, interviewName } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Use GPT-4 for high-quality analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        {
          role: 'user',
          content: `Analyze this interview with ${interviewName}:\n\n${content.substring(0, 12000)}`
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })

    const analysis = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json({
      success: true,
      analysis,
      tokensUsed: completion.usage?.total_tokens || 0
    })
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze interview', details: error.message },
      { status: 500 }
    )
  }
}
