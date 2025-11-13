import { OpenAI } from 'openai'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

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

async function analyzeAllInterviews() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured')
      process.exit(1)
    }

    const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')
    const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')

    console.log(`📂 Working directory: ${process.cwd()}`)
    console.log(`📂 Interviews path: ${interviewsPath}`)
    console.log(`📂 Analysis path: ${analysisPath}\n`)

    // Create analysis directory if it doesn't exist
    if (!fs.existsSync(analysisPath)) {
      console.log('📁 Creating analysis directory...')
      fs.mkdirSync(analysisPath, { recursive: true })
      console.log(`✅ Created: ${analysisPath}\n`)
    } else {
      console.log(`✅ Analysis directory exists: ${analysisPath}\n`)
    }

    // Get all interview files
    const files = fs.readdirSync(interviewsPath)
    const mdFiles = files.filter(file =>
      file.endsWith('.md') &&
      !file.includes('template') &&
      !file.includes('Final email')
    )

    console.log(`📊 Found ${mdFiles.length} interview files to analyze\n`)

    const results = {
      total: mdFiles.length,
      analyzed: 0,
      skipped: 0,
      failed: 0,
    }

    for (const filename of mdFiles) {
      try {
        // Check if already analyzed
        const analysisFile = path.join(analysisPath, filename.replace('.md', '.json'))
        if (fs.existsSync(analysisFile)) {
          console.log(`⏭️  Skipping ${filename} (already analyzed)`)
          results.skipped++
          continue
        }

        // Read interview content
        const filePath = path.join(interviewsPath, filename)
        const content = fs.readFileSync(filePath, 'utf-8')

        // Extract name
        const nameMatch = content.match(/^#\s+(.+)$/m)
        const name = nameMatch ? nameMatch[1].trim() : filename.replace('.md', '')

        console.log(`🔍 Analyzing interview: ${name}`)

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
        const analysis = {
          filename,
          name,
          ...analysisData,
          analyzedAt: new Date().toISOString()
        }

        // Save analysis
        console.log(`💾 Saving to: ${analysisFile}`)
        fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2))

        // Verify file was written
        if (fs.existsSync(analysisFile)) {
          const fileSize = fs.statSync(analysisFile).size
          console.log(`✅ Completed analysis for ${name} (${fileSize} bytes)`)
          results.analyzed++
        } else {
          throw new Error('File was not saved successfully')
        }

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: any) {
        console.error(`❌ Failed to analyze ${filename}:`, error.message)
        results.failed++
      }
    }

    console.log('\n📈 Analysis Complete!')
    console.log(`   Total: ${results.total}`)
    console.log(`   ✅ Analyzed: ${results.analyzed}`)
    console.log(`   ⏭️  Skipped: ${results.skipped}`)
    console.log(`   ❌ Failed: ${results.failed}`)

    // Verify and list all saved files
    console.log('\n📋 Verifying saved files...')
    const savedFiles = fs.readdirSync(analysisPath).filter(f => f.endsWith('.json'))
    console.log(`📁 Found ${savedFiles.length} analysis files in: ${analysisPath}`)
    if (savedFiles.length > 0) {
      console.log('\nSaved files:')
      savedFiles.forEach(file => {
        const size = fs.statSync(path.join(analysisPath, file)).size
        console.log(`  ✓ ${file} (${size} bytes)`)
      })
    }

  } catch (error: any) {
    console.error('❌ Analysis error:', error.message)
    process.exit(1)
  }
}

analyzeAllInterviews()
