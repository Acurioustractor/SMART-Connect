import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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

interface AggregatedInsights {
  overview: {
    totalFacilitators: number
    totalAnalyses: number
    totalQuotes: number
    totalThemes: number
    totalRecommendations: number
    synthesisNarrative: string
  }
  powerfulQuotes: Array<{
    quote: string
    context: string
    significance: string
    facilitator: string
  }>
  themeRollup: Array<{
    theme: string
    count: number
    descriptions: string[]
    evidence: string[]
    facilitators: string[]
  }>
  platformRecommendations: Array<{
    insight: string
    featureIdea: string
    priority: 'Critical' | 'High' | 'Medium'
    rationale: string
    facilitators: string[]
  }>
  culturalGuidance: {
    allInsights: string[]
    allRecommendations: string[]
    relevantCount: number
  }
  learningContentRoadmap: Array<{
    courseTitle: string
    description: string
    targetAudience: string
    format: string
    priority: number
    facilitators: string[]
    keyOutcomes: string[]
  }>
  facilitatorSupport: {
    challenges: Array<{ challenge: string; count: number }>
    strengths: Array<{ strength: string; count: number }>
    supportNeeds: Array<{ need: string; count: number }>
  }
  collectiveWisdom: string[]
}

export async function GET() {
  try {
    const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')

    // Check if directory exists
    if (!fs.existsSync(analysisPath)) {
      return NextResponse.json({
        success: false,
        error: 'No analyses found. Run analysis first.',
        isEmpty: true
      })
    }

    // Read all analysis files
    const files = fs.readdirSync(analysisPath)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    if (jsonFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No analyses found. Run analysis first.',
        isEmpty: true
      })
    }

    const analyses: InterviewAnalysis[] = []
    for (const file of jsonFiles) {
      const content = fs.readFileSync(path.join(analysisPath, file), 'utf-8')
      analyses.push(JSON.parse(content))
    }

    // Aggregate insights
    const aggregated: AggregatedInsights = {
      overview: {
        totalFacilitators: analyses.length,
        totalAnalyses: analyses.length,
        totalQuotes: analyses.reduce((sum, a) => sum + a.powerfulQuotes.length, 0),
        totalThemes: analyses.reduce((sum, a) => sum + a.keyThemes.length, 0),
        totalRecommendations: analyses.reduce((sum, a) => sum + a.platformImplications.length, 0),
        synthesisNarrative: generateSynthesisNarrative(analyses)
      },

      // Collect all powerful quotes
      powerfulQuotes: analyses.flatMap(a =>
        a.powerfulQuotes.map(q => ({
          ...q,
          facilitator: a.name
        }))
      ).sort(() => Math.random() - 0.5), // Shuffle for variety

      // Roll up themes
      themeRollup: rollupThemes(analyses),

      // Aggregate platform recommendations
      platformRecommendations: aggregatePlatformRecommendations(analyses),

      // Cultural guidance
      culturalGuidance: {
        allInsights: analyses
          .filter(a => a.culturalConsiderations.relevant)
          .flatMap(a => a.culturalConsiderations.insights),
        allRecommendations: analyses
          .filter(a => a.culturalConsiderations.relevant)
          .flatMap(a => a.culturalConsiderations.recommendations),
        relevantCount: analyses.filter(a => a.culturalConsiderations.relevant).length
      },

      // Learning content roadmap
      learningContentRoadmap: aggregateLearningContent(analyses),

      // Facilitator support needs
      facilitatorSupport: aggregateSupportNeeds(analyses),

      // Collective wisdom (one-liners)
      collectiveWisdom: analyses.map(a => a.oneLineTakeaway)
    }

    return NextResponse.json({
      success: true,
      data: aggregated,
      analyses: analyses.map(a => ({
        name: a.name,
        filename: a.filename,
        analyzedAt: a.analyzedAt
      }))
    })

  } catch (error: any) {
    console.error('Error aggregating insights:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to aggregate insights',
        details: error.message
      },
      { status: 500 }
    )
  }
}

function generateSynthesisNarrative(analyses: InterviewAnalysis[]): string {
  // Create a compelling narrative from the collective insights
  const facilitatorCount = analyses.length
  const uniqueBackgrounds = new Set(analyses.map(a => {
    // Extract background hints from executive summaries
    const summary = a.executiveSummary.toLowerCase()
    if (summary.includes('rural')) return 'rural'
    if (summary.includes('urban')) return 'urban'
    if (summary.includes('remote')) return 'remote'
    return 'diverse'
  }))

  return `Through conversations with ${facilitatorCount} SMART Recovery facilitators from ${uniqueBackgrounds.size > 1 ? 'diverse contexts' : 'across Australia'}, a powerful narrative emerges about the heart of peer-led recovery support. These facilitators bring decades of combined lived experience, professional expertise, and deep commitment to creating safe, empowering spaces for people in recovery. Their collective wisdom reveals both the profound impact of community-based support and the critical need for resources that honor facilitator expertise while providing practical, accessible tools for growth and connection.`
}

function rollupThemes(analyses: InterviewAnalysis[]) {
  const themeMap = new Map<string, {
    count: number
    descriptions: string[]
    evidence: string[]
    facilitators: string[]
  }>()

  analyses.forEach(analysis => {
    analysis.keyThemes.forEach(theme => {
      const normalized = theme.theme.toLowerCase().trim()

      if (!themeMap.has(normalized)) {
        themeMap.set(normalized, {
          count: 0,
          descriptions: [],
          evidence: [],
          facilitators: []
        })
      }

      const entry = themeMap.get(normalized)!
      entry.count++
      entry.descriptions.push(theme.description)
      entry.evidence.push(...theme.evidence)
      entry.facilitators.push(analysis.name)
    })
  })

  return Array.from(themeMap.entries())
    .map(([theme, data]) => ({ theme, ...data }))
    .sort((a, b) => b.count - a.count) // Sort by frequency
}

function aggregatePlatformRecommendations(analyses: InterviewAnalysis[]) {
  const recMap = new Map<string, {
    insight: string
    featureIdea: string
    priority: 'Critical' | 'High' | 'Medium'
    rationale: string
    facilitators: string[]
  }>()

  analyses.forEach(analysis => {
    analysis.platformImplications.forEach(impl => {
      const key = impl.featureIdea.toLowerCase().trim()

      if (!recMap.has(key)) {
        recMap.set(key, {
          insight: impl.insight,
          featureIdea: impl.featureIdea,
          priority: impl.priority as any,
          rationale: impl.rationale,
          facilitators: []
        })
      }

      recMap.get(key)!.facilitators.push(analysis.name)
    })
  })

  // Sort by priority and frequency
  const priorityOrder = { Critical: 0, High: 1, Medium: 2 }
  return Array.from(recMap.values())
    .sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.facilitators.length - a.facilitators.length
    })
}

function aggregateLearningContent(analyses: InterviewAnalysis[]) {
  const contentMap = new Map<string, {
    courseTitle: string
    description: string
    targetAudience: string
    format: string
    facilitators: string[]
    keyOutcomes: string[]
  }>()

  analyses.forEach(analysis => {
    analysis.learnWorldContentSuggestions.forEach(suggestion => {
      const key = suggestion.courseTitle.toLowerCase().trim()

      if (!contentMap.has(key)) {
        contentMap.set(key, {
          courseTitle: suggestion.courseTitle,
          description: suggestion.description,
          targetAudience: suggestion.targetAudience,
          format: suggestion.format,
          facilitators: [],
          keyOutcomes: [...suggestion.keyLearningOutcomes]
        })
      } else {
        // Merge unique outcomes
        const existing = contentMap.get(key)!
        suggestion.keyLearningOutcomes.forEach(outcome => {
          if (!existing.keyOutcomes.includes(outcome)) {
            existing.keyOutcomes.push(outcome)
          }
        })
      }

      contentMap.get(key)!.facilitators.push(analysis.name)
    })
  })

  return Array.from(contentMap.values())
    .map(item => ({
      ...item,
      priority: item.facilitators.length // Higher count = higher priority
    }))
    .sort((a, b) => b.priority - a.priority)
}

function aggregateSupportNeeds(analyses: InterviewAnalysis[]) {
  const challengeMap = new Map<string, number>()
  const strengthMap = new Map<string, number>()
  const needMap = new Map<string, number>()

  analyses.forEach(analysis => {
    analysis.facilitatorInsights.challenges.forEach(c => {
      challengeMap.set(c, (challengeMap.get(c) || 0) + 1)
    })
    analysis.facilitatorInsights.strengths.forEach(s => {
      strengthMap.set(s, (strengthMap.get(s) || 0) + 1)
    })
    analysis.facilitatorInsights.supportNeeds.forEach(n => {
      needMap.set(n, (needMap.get(n) || 0) + 1)
    })
  })

  return {
    challenges: Array.from(challengeMap.entries())
      .map(([challenge, count]) => ({ challenge, count }))
      .sort((a, b) => b.count - a.count),
    strengths: Array.from(strengthMap.entries())
      .map(([strength, count]) => ({ strength, count }))
      .sort((a, b) => b.count - a.count),
    supportNeeds: Array.from(needMap.entries())
      .map(([need, count]) => ({ need, count }))
      .sort((a, b) => b.count - a.count)
  }
}
