'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  Users,
  Quote,
  TrendingUp,
  Lightbulb,
  Heart,
  BookOpen,
  Target,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Star
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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

export default function CommunityInsightsPage() {
  const [insights, setInsights] = useState<AggregatedInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'quotes']))

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/insights/community')
      const data = await res.json()

      if (!data.success) {
        if (data.isEmpty) {
          setError('No analysis data found. Please run the interview analysis first.')
        } else {
          setError(data.error || 'Failed to load insights')
        }
        return
      }

      setInsights(data.data)
    } catch (err: any) {
      setError('Failed to load community insights')
      console.error('Error loading insights:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  if (loading) {
    return (
      <Container className="py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading community insights...</p>
          </div>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-12">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Unable to Load Insights</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Link href="/interviews">
                  <Button variant="outline">Go to Interviews</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    )
  }

  if (!insights) return null

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <Container className="py-12">
      {/* Hero Section */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Community Insights</h1>
        </div>
        <p className="text-lg text-muted-foreground mb-8">
          Collective wisdom from the SMART Recovery facilitator community
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold">{insights.overview.totalFacilitators}</div>
                <div className="text-sm text-muted-foreground">Facilitators</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Quote className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold">{insights.overview.totalQuotes}</div>
                <div className="text-sm text-muted-foreground">Key Quotes</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold">{insights.overview.totalThemes}</div>
                <div className="text-sm text-muted-foreground">Themes</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Lightbulb className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold">{insights.overview.totalRecommendations}</div>
                <div className="text-sm text-muted-foreground">Ideas</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold">{insights.learningContentRoadmap.length}</div>
                <div className="text-sm text-muted-foreground">Courses</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Synthesis Narrative */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-lg leading-relaxed">
              {insights.overview.synthesisNarrative}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Community Voice - Powerful Quotes */}
      <Card className="mb-8">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('quotes')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Quote className="h-5 w-5 text-primary" />
              <CardTitle>Community Voice</CardTitle>
            </div>
            {expandedSections.has('quotes') ?
              <ChevronDown className="h-5 w-5" /> :
              <ChevronRight className="h-5 w-5" />
            }
          </div>
          <CardDescription>
            Powerful reflections from facilitators across the community
          </CardDescription>
        </CardHeader>
        {expandedSections.has('quotes') && (
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {insights.powerfulQuotes.slice(0, 12).map((item, idx) => (
                <Card key={idx} className="bg-muted/30">
                  <CardContent className="pt-6">
                    <Quote className="h-4 w-4 text-primary mb-3" />
                    <p className="italic mb-3">"{item.quote}"</p>
                    <div className="text-sm text-muted-foreground border-t pt-3">
                      <p className="font-medium mb-1">{item.facilitator}</p>
                      <p className="text-xs mb-2">{item.context}</p>
                      <p className="text-xs italic">{item.significance}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {insights.powerfulQuotes.length > 12 && (
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing 12 of {insights.powerfulQuotes.length} powerful quotes
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Key Themes Across Community */}
      <Card className="mb-8">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('themes')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Key Themes Across Community</CardTitle>
            </div>
            {expandedSections.has('themes') ?
              <ChevronDown className="h-5 w-5" /> :
              <ChevronRight className="h-5 w-5" />
            }
          </div>
          <CardDescription>
            Recurring patterns and insights from facilitator conversations
          </CardDescription>
        </CardHeader>
        {expandedSections.has('themes') && (
          <CardContent>
            <div className="space-y-4">
              {insights.themeRollup.slice(0, 10).map((theme, idx) => (
                <Card key={idx} className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg capitalize">{theme.theme}</h3>
                      <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {theme.count} facilitator{theme.count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {theme.descriptions[0]}
                    </p>
                    {theme.evidence.length > 0 && (
                      <div className="border-l-2 border-primary/30 pl-4 mt-3">
                        <p className="text-sm italic">
                          "{theme.evidence[0]}"
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {theme.facilitators.slice(0, 5).map((name, i) => (
                        <span key={i} className="text-xs bg-background px-2 py-1 rounded border">
                          {name}
                        </span>
                      ))}
                      {theme.facilitators.length > 5 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          +{theme.facilitators.length - 5} more
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Building the Facilitation Space */}
      <Card className="mb-8 border-primary/30">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('platform')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Building the Facilitation Space</CardTitle>
            </div>
            {expandedSections.has('platform') ?
              <ChevronDown className="h-5 w-5" /> :
              <ChevronRight className="h-5 w-5" />
            }
          </div>
          <CardDescription>
            Strategic guidance from the community on how to build this platform
          </CardDescription>
        </CardHeader>
        {expandedSections.has('platform') && (
          <CardContent>
            <div className="space-y-4">
              {insights.platformRecommendations.map((rec, idx) => (
                <Card key={idx} className="border-l-4" style={{
                  borderLeftColor: rec.priority === 'Critical' ? '#dc2626' :
                                   rec.priority === 'High' ? '#ea580c' : '#3b82f6'
                }}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(rec.priority)}`}>
                            {rec.priority}
                          </span>
                          {rec.facilitators.length > 1 && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {rec.facilitators.length} facilitators
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{rec.featureIdea}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{rec.insight}</p>
                        <p className="text-sm italic">{rec.rationale}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                      {rec.facilitators.map((name, i) => (
                        <span key={i} className="text-xs bg-background px-2 py-1 rounded border">
                          {name}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cultural Guidance */}
      {insights.culturalGuidance.relevantCount > 0 && (
        <Card className="mb-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection('cultural')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-primary" />
                <CardTitle>Cultural Safety & Inclusion</CardTitle>
              </div>
              {expandedSections.has('cultural') ?
                <ChevronDown className="h-5 w-5" /> :
                <ChevronRight className="h-5 w-5" />
              }
            </div>
            <CardDescription>
              Guidance from {insights.culturalGuidance.relevantCount} facilitators on creating safe, inclusive spaces
            </CardDescription>
          </CardHeader>
          {expandedSections.has('cultural') && (
            <CardContent>
              <div className="space-y-6">
                {insights.culturalGuidance.allInsights.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Key Insights</h3>
                    <ul className="space-y-2">
                      {insights.culturalGuidance.allInsights.map((insight, idx) => (
                        <li key={idx} className="text-sm pl-4 border-l-2 border-purple-300 py-1">
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.culturalGuidance.allRecommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Recommendations</h3>
                    <ul className="space-y-2">
                      {insights.culturalGuidance.allRecommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm pl-4 border-l-2 border-pink-300 py-1">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Learning Content Roadmap */}
      <Card className="mb-8">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('learning')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle>Learning Content Roadmap</CardTitle>
            </div>
            {expandedSections.has('learning') ?
              <ChevronDown className="h-5 w-5" /> :
              <ChevronRight className="h-5 w-5" />
            }
          </div>
          <CardDescription>
            Course and content suggestions based on facilitator needs
          </CardDescription>
        </CardHeader>
        {expandedSections.has('learning') && (
          <CardContent>
            <div className="space-y-4">
              {insights.learningContentRoadmap.slice(0, 10).map((course, idx) => (
                <Card key={idx} className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg flex-1">{course.courseTitle}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {course.priority} {course.priority === 1 ? 'facilitator' : 'facilitators'}
                        </span>
                        <span className="text-xs bg-muted px-2 py-1 rounded border">
                          {course.format}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{course.description}</p>
                    <p className="text-sm mb-3">
                      <span className="font-medium">Target: </span>
                      {course.targetAudience}
                    </p>
                    {course.keyOutcomes.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Learning Outcomes:</p>
                        <ul className="space-y-1">
                          {course.keyOutcomes.slice(0, 3).map((outcome, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <Star className="h-3 w-3 mt-1 flex-shrink-0 text-primary" />
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Facilitator Support Needs */}
      <Card className="mb-8">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('support')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Facilitator Support Landscape</CardTitle>
            </div>
            {expandedSections.has('support') ?
              <ChevronDown className="h-5 w-5" /> :
              <ChevronRight className="h-5 w-5" />
            }
          </div>
          <CardDescription>
            Understanding challenges, strengths, and support needs
          </CardDescription>
        </CardHeader>
        {expandedSections.has('support') && (
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Challenges */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Common Challenges
                </h3>
                <ul className="space-y-2">
                  {insights.facilitatorSupport.challenges.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex-1">{item.challenge}</span>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded ml-2">
                          {item.count}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Strengths */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-green-500" />
                  Key Strengths
                </h3>
                <ul className="space-y-2">
                  {insights.facilitatorSupport.strengths.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex-1">{item.strength}</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded ml-2">
                          {item.count}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support Needs */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  Support Needs
                </h3>
                <ul className="space-y-2">
                  {insights.facilitatorSupport.supportNeeds.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex-1">{item.need}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2">
                          {item.count}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Collective Wisdom */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('wisdom')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Collective Wisdom</CardTitle>
            </div>
            {expandedSections.has('wisdom') ?
              <ChevronDown className="h-5 w-5" /> :
              <ChevronRight className="h-5 w-5" />
            }
          </div>
          <CardDescription>
            One powerful takeaway from each facilitator
          </CardDescription>
        </CardHeader>
        {expandedSections.has('wisdom') && (
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {insights.collectiveWisdom.map((wisdom, idx) => (
                <div key={idx} className="p-4 bg-background/50 rounded-lg border">
                  <p className="text-sm italic">"{wisdom}"</p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </Container>
  )
}
