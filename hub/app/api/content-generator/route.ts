import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// Load all available context
function loadKnowledgeBase() {
  const knowledgeBase: any = {
    interviews: [],
    tools: [],
    scrapedContent: []
  }

  try {
    // Load interviews
    const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')
    if (fs.existsSync(interviewsPath)) {
      const files = fs.readdirSync(interviewsPath).filter(f => f.endsWith('.md'))
      knowledgeBase.interviews = files.map(f => {
        const content = fs.readFileSync(path.join(interviewsPath, f), 'utf-8')
        return { filename: f, content: content.substring(0, 3000) } // Preview
      })
    }

    // Load scraped content
    const scrapedPath = path.join(process.cwd(), '../knowledge-base/scraped-content')
    if (fs.existsSync(scrapedPath)) {
      const files = fs.readdirSync(scrapedPath).filter(f => f.endsWith('.md'))
      knowledgeBase.scrapedContent = files.map(f => {
        const content = fs.readFileSync(path.join(scrapedPath, f), 'utf-8')
        return { filename: f, content: content.substring(0, 2000) }
      })
    }

    // Load tools/resources
    const toolsPath = path.join(process.cwd(), '../knowledge-base/tools')
    if (fs.existsSync(toolsPath)) {
      const files = fs.readdirSync(toolsPath).filter(f => f.endsWith('.md') || f.endsWith('.pdf'))
      knowledgeBase.tools = files.map(f => ({ filename: f }))
    }
  } catch (error) {
    console.error('Error loading knowledge base:', error)
  }

  return knowledgeBase
}

const GENERATION_PROMPTS = {
  'forum-post': `You are an expert community manager for SMART Recovery Australia's facilitator community.

Generate an engaging forum post that:
- Addresses a real facilitator need or interest
- Encourages discussion and peer support
- References actual insights from interviews
- Promotes connection and community building
- Is warm, professional, and culturally safe
- Includes 2-3 discussion questions at the end

Use the provided context to ground your post in real facilitator experiences.`,

  'tool-summary': `You are a facilitator trainer creating accessible summaries of SMART Recovery tools and resources.

Generate a clear, practical summary that:
- Explains what the tool is and when to use it
- Highlights key benefits for facilitators
- Provides concrete examples
- Suggests how it connects to community/peer support
- Is written in plain language
- Includes practical tips for implementation

Make it actionable and relevant to online/hybrid facilitation.`,

  'content-ideas': `You are a content strategist for SMART Recovery's online facilitator community.

Based on the interviews, tools, and scraped content, generate 10 content ideas for the LearnWorlds forum that:
- Address real facilitator pain points
- Encourage engagement and discussion
- Cover diverse topics (training, support, cultural safety, tools, etc.)
- Are specific and actionable
- Would work well as forum discussions, articles, or micro-learning

For each idea, provide:
1. Title
2. One-sentence description
3. Why it matters (based on interview insights)
4. Suggested format (discussion, guide, video, etc.)`,

  'community-insight': `You are a qualitative researcher synthesizing insights from SMART Recovery facilitator interviews.

Analyze the available interviews and generate:
1. A 200-word overview of key community needs
2. Top 5 themes about connection and support
3. 3 specific recommendations for building the online community
4. Quotes that illustrate the importance of peer support

Focus on what would make facilitators feel connected, supported, and engaged online.`
}

export async function POST(req: Request) {
  try {
    const { type, customPrompt, context } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const knowledgeBase = loadKnowledgeBase()

    // Build context from knowledge base
    let contextText = `Available Context:
- ${knowledgeBase.interviews.length} facilitator interviews
- ${knowledgeBase.scrapedContent.length} scraped website pages
- ${knowledgeBase.tools.length} tools/resources

Interview Excerpts:
${knowledgeBase.interviews.slice(0, 5).map((i: any) => i.content).join('\n\n---\n\n')}

${context ? `\nAdditional Context:\n${context}` : ''}`

    const systemPrompt = customPrompt || GENERATION_PROMPTS[type as keyof typeof GENERATION_PROMPTS] || GENERATION_PROMPTS['forum-post']

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextText }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const generatedContent = completion.choices[0].message.content

    return NextResponse.json({
      success: true,
      content: generatedContent,
      tokensUsed: completion.usage?.total_tokens || 0,
      knowledgeBase: {
        interviewsLoaded: knowledgeBase.interviews.length,
        scrapedPagesLoaded: knowledgeBase.scrapedContent.length,
        toolsLoaded: knowledgeBase.tools.length
      }
    })
  } catch (error: any) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Generation failed', details: error.message },
      { status: 500 }
    )
  }
}
