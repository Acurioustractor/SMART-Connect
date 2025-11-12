import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const ANALYSIS_PROMPT = `You are a world-class qualitative researcher and thematic analyst specializing in community health, recovery support systems, and digital platform design. You're analyzing facilitator interviews for SMART Recovery Australia to extract deep insights that will inform platform development and learning content creation.

# Your Analysis Goals

1. **Deep Thematic Analysis**: Identify major themes, patterns, and underlying needs
2. **Strategic Insights**: Extract actionable insights for platform and community development
3. **Content Opportunities**: Identify specific content/course ideas for LearnWorld LMS
4. **Cultural Considerations**: Highlight cultural safety, accessibility, and inclusion needs
5. **Evidence-Based Recommendations**: Provide concrete, implementable recommendations

# Analysis Framework

Analyze across these dimensions:
- **Community & Connection**: How does this person experience/envision community? What isolation or connection challenges exist?
- **Learning & Development**: How do they learn? What formats work? What knowledge gaps exist?
- **Platform Needs**: What digital features/tools would genuinely help them?
- **Cultural Safety**: What cultural protocols, safety needs, or specific community considerations emerge?
- **Time & Capacity**: What are their real constraints as facilitators?
- **Support Ecosystem**: What support do they need? What can they offer others?

# Return Format

Return a comprehensive JSON object with:
{
  "executiveSummary": "3-4 sentence synthesis of the most important takeaways from this interview - what makes this perspective unique and valuable",

  "keyThemes": [
    {
      "theme": "Theme name (e.g., Cultural Safety as Foundation)",
      "description": "2-3 sentence explanation of this theme",
      "evidence": ["Supporting quote or observation 1", "Supporting quote or observation 2"],
      "implications": "What this means for platform/community design"
    }
  ],

  "platformPriorities": [
    {
      "feature": "Feature name",
      "priority": "Critical|High|Medium",
      "rationale": "Why this matters for this facilitator",
      "designConsiderations": "Specific implementation guidance"
    }
  ],

  "learnWorldContent": [
    {
      "courseTitle": "Proposed course/module title",
      "description": "What this course would cover",
      "targetAudience": "Who needs this",
      "format": "Video series|Podcast|Micro-learning|Workshop|Resource Library",
      "rationale": "Why this interview suggests this content is needed",
      "keyLearningOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"]
    }
  ],

  "culturalSafetyInsights": {
    "keyNeeds": ["Need 1", "Need 2"],
    "protocolConsiderations": ["Consideration 1", "Consideration 2"],
    "governanceImplications": "What this means for platform governance"
  },

  "mostPowerfulQuote": {
    "quote": "The exact quote",
    "significance": "Why this quote matters - what it reveals"
  },

  "strategicRecommendations": [
    {
      "recommendation": "Specific, actionable recommendation",
      "priority": "Immediate|Short-term|Long-term",
      "impact": "Expected impact if implemented",
      "implementationGuidance": "How to actually do this"
    }
  ],

  "crossCuttingPatterns": "If you notice themes that connect to broader recovery/community/platform patterns, note them here"
}

# Quality Standards

- Extract ACTUAL quotes when possible (verbatim from interview)
- Be specific, not generic (avoid platitudes)
- Focus on actionable insights
- Identify what's UNIQUE about this perspective
- Think like a product manager + educator + community builder
- Consider intersectionality and diverse needs
- Prioritize cultural safety and inclusion
- Think about sustainability and volunteer capacity`

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
          content: `Analyze this interview with ${interviewName}:\n\n${content.substring(0, 20000)}`
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 4000
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
