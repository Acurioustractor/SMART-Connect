import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// Load master SLM prompt from parent directory
const promptPath = path.join(process.cwd(), '../MASTER-SLM-PROMPT.md')

let SYSTEM_PROMPT = ''

try {
  SYSTEM_PROMPT = fs.readFileSync(promptPath, 'utf-8')
} catch (error) {
  console.error('Failed to load MASTER-SLM-PROMPT.md:', error)
  SYSTEM_PROMPT = `You are the SMART Connect AI assistant, an expert on SMART Recovery facilitator community development.

You have access to comprehensive research including:
- 24 facilitator interviews covering diverse perspectives
- 219 survey responses from facilitators
- Strategic documents and implementation plans
- Community best practices and cultural safety protocols

Your role is to:
1. Answer questions about facilitator needs, challenges, and insights
2. Generate evidence-based content for community engagement
3. Provide strategic recommendations grounded in research
4. Support cultural safety, especially for Aboriginal and Torres Strait Islander facilitators

Always cite specific interviews or data points when possible.`
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.' },
        { status: 500 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    return NextResponse.json({
      message: {
        role: 'assistant',
        content: completion.choices[0].message.content,
      },
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to process chat',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
