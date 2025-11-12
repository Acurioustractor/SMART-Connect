'use client'

import { useState, useEffect } from 'react'
import { Search, User, Calendar, Mail, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Interview {
  id: string
  name: string
  date?: string
  email?: string
  interviewDate?: string
  notes?: string
  affiliation?: string
  status?: string
  summary?: string
  keyThemes?: string[]
  filename: string
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedContent, setExpandedContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    fetchInterviews()
  }, [])

  useEffect(() => {
    // Filter interviews based on search query
    const filtered = interviews.filter(interview =>
      interview.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.affiliation?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredInterviews(filtered)
  }, [searchQuery, interviews])

  const fetchInterviews = async () => {
    try {
      const response = await fetch('/api/interviews')
      const data = await response.json()
      setInterviews(data.interviews || [])
      setFilteredInterviews(data.interviews || [])
    } catch (error) {
      console.error('Error fetching interviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const parseInterviewContent = (content: string) => {
    // Extract key sections from the interview
    const sections = {
      summary: '',
      keyThemes: [] as string[],
      keyQuotes: [] as string[],
      keySentiments: [] as string[],
      platformPriorities: [] as string[],
      designPrinciples: [] as string[],
      nextSteps: [] as string[],
      mostImportantQuote: '',
      transcript: ''
    }

    // Extract main summary section (handles both **Summary** and just Summary)
    let summaryMatch = content.match(/\*\*.*?Summary.*?\*\*\s*\n+([\s\S]*?)(?=\n#{1,3}\s|$)/i)
    if (!summaryMatch) {
      summaryMatch = content.match(/^Summary\s*\n+([\s\S]*?)(?=\n#{1,3}\s|$)/im)
    }
    if (summaryMatch) {
      sections.summary = summaryMatch[1].trim()
    }

    // Extract key themes from summary
    const keyThemesMatch = content.match(/\*\*Key Themes:\*\*\s*([\s\S]*?)(?=\n\*\*[A-Z])/i)
    if (keyThemesMatch) {
      const themes = keyThemesMatch[1].match(/\*\*([^*]+)\*\*:/g)
      if (themes) {
        sections.keyThemes = themes.map(t => t.replace(/\*\*/g, '').replace(/:$/, '').trim())
      }
    }

    // Extract platform feature priorities
    const prioritiesMatch = content.match(/\*\*Platform Feature Priorities:\*\*\s*([\s\S]*?)(?=\n\*\*[A-Z])/i)
    if (prioritiesMatch) {
      const priorities = prioritiesMatch[1].match(/^\s*-\s+\*\*([^*]+)\*\*:/gm)
      if (priorities) {
        sections.platformPriorities = priorities.map(p => p.replace(/^\s*-\s+\*\*/, '').replace(/\*\*:/, '').trim())
      }
    }

    // Extract design principles
    const principlesMatch = content.match(/\*\*Key Platform Design Principles[^*]*\*\*\s*([\s\S]*?)(?=\n#{2,3}\s|$)/i)
    if (principlesMatch) {
      const principles = principlesMatch[1].match(/^\d+\.\s+\*\*([^*]+)\*\*/gm)
      if (principles) {
        sections.designPrinciples = principles.map(p => p.replace(/^\d+\.\s+\*\*/, '').replace(/\*\*/, '').trim())
      }
    }

    // Extract most important quote
    const importantQuoteMatch = content.match(/\*\*Most Important Quote:\*\*\s*\n+\*([^*]+)\*/i)
    if (importantQuoteMatch) {
      sections.mostImportantQuote = importantQuoteMatch[1].trim()
    }

    // Extract next steps
    const nextStepsMatch = content.match(/\*\*Next Steps\*\*\s*([\s\S]*?)(?=\n#{2,3}\s|\n\*\*Most|$)/i)
    if (nextStepsMatch) {
      const steps = nextStepsMatch[1].match(/^-\s+(.+)$/gm)
      if (steps) {
        sections.nextSteps = steps.map(s => s.replace(/^-\s+/, '').trim())
      }
    }

    // Extract key quotes
    const quotesMatch = content.match(/\*\*Key Quotes:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i)
    if (quotesMatch) {
      const quotes = quotesMatch[1].match(/^\d+\.\s+.+$/gm) || []
      sections.keyQuotes = quotes.map(q => q.replace(/^\d+\.\s+/, '').trim())
    }

    // Extract key sentiments
    const sentimentsMatch = content.match(/\*\*Key Sentiments:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i)
    if (sentimentsMatch) {
      const sentiments = sentimentsMatch[1].match(/^\d+\.\s+.+$/gm) || []
      sections.keySentiments = sentiments.map(s => s.replace(/^\d+\.\s+/, '').trim())
    }

    return sections
  }

  const toggleExpand = async (id: string, filename: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setExpandedContent('')
    } else {
      setExpandedId(id)
      setLoadingContent(true)
      try {
        const response = await fetch(`/api/interviews/${encodeURIComponent(filename)}`)
        const data = await response.json()
        setExpandedContent(data.content || '')
      } catch (error) {
        console.error('Error fetching interview content:', error)
        setExpandedContent('Error loading interview content')
      } finally {
        setLoadingContent(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Container size="xl" className="py-12">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Facilitator Interviews</h1>
            <p className="text-xl text-gray-600">
              Browse through {interviews.length} interviews with SMART Recovery facilitators
            </p>
          </div>
          <Button
            onClick={() => window.location.href = '/interviews/upload'}
            className="flex items-center gap-2"
            size="lg"
          >
            <FileText className="h-5 w-5" />
            Add Interview
          </Button>
        </div>

        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Search by name, role, or affiliation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 text-base"
              />
            </div>
            {searchQuery && (
              <p className="mt-3 text-sm text-gray-600">
                Showing {filteredInterviews.length} of {interviews.length} interviews
              </p>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#003B5C]" aria-hidden="true" />
            <span className="ml-3 text-gray-600">Loading interviews...</span>
          </div>
        )}

        {/* Interviews List */}
        {!loading && filteredInterviews.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
              <p className="text-gray-600">
                {searchQuery ? 'No interviews match your search' : 'No interviews found'}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && filteredInterviews.length > 0 && (
          <div className="space-y-4">
            {filteredInterviews.map((interview) => (
              <Card
                key={interview.id}
                className="overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                <CardHeader className="cursor-pointer" onClick={() => toggleExpand(interview.id, interview.filename)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-gray-900 mb-2 flex items-center gap-2">
                        <User className="h-5 w-5 text-[#003B5C]" aria-hidden="true" />
                        {interview.name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {interview.interviewDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" aria-hidden="true" />
                            <span>{interview.interviewDate}</span>
                          </div>
                        )}
                        {interview.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-4 w-4" aria-hidden="true" />
                            <span className="truncate max-w-xs">{interview.email}</span>
                          </div>
                        )}
                      </div>
                      {interview.notes && (
                        <div className="mt-2">
                          <span className="inline-block bg-[#003B5C]/10 text-[#003B5C] text-xs font-medium px-3 py-1 rounded-full">
                            {interview.notes}
                          </span>
                        </div>
                      )}
                      {interview.affiliation && (
                        <div className="mt-2">
                          <span className="inline-block bg-[#00A5E0]/10 text-[#00A5E0] text-xs font-medium px-3 py-1 rounded-full">
                            {interview.affiliation}
                          </span>
                        </div>
                      )}
                      {interview.summary && (
                        <div className="mt-3 text-sm text-gray-800 leading-relaxed">
                          <p className="line-clamp-2">{interview.summary}</p>
                        </div>
                      )}
                      {interview.keyThemes && interview.keyThemes.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {interview.keyThemes.slice(0, 3).map((theme, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                      {expandedId === interview.id ? (
                        <ChevronUp className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-5 w-5" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {/* Expanded Content */}
                {expandedId === interview.id && (
                  <CardContent className="border-t border-gray-200 bg-gray-50">
                    {loadingContent ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-[#003B5C]" aria-hidden="true" />
                        <span className="ml-2 text-gray-600">Loading interview...</span>
                      </div>
                    ) : (() => {
                      const sections = parseInterviewContent(expandedContent)
                      const hasStructuredContent = sections.summary || sections.keyQuotes.length > 0 || sections.keySentiments.length > 0

                      if (!hasStructuredContent) {
                        // Fallback to showing raw content
                        return (
                          <div className="py-4">
                            <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans bg-white p-6 rounded-lg border border-gray-200">
                              {expandedContent}
                            </pre>
                          </div>
                        )
                      }

                      return (
                        <div className="py-6 space-y-6">
                          {/* Most Important Quote - Featured at top */}
                          {sections.mostImportantQuote && (
                            <div className="bg-gradient-to-br from-[#003B5C] to-[#00527A] p-6 rounded-lg border-2 border-[#00A5E0]">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">💬</span>
                                <div>
                                  <h3 className="text-sm font-semibold text-[#00A5E0] mb-2">Most Important Quote</h3>
                                  <p className="text-base text-white leading-relaxed italic">&ldquo;{sections.mostImportantQuote}&rdquo;</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Summary */}
                          {sections.summary && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-2xl">📋</span>
                                Executive Summary
                              </h3>
                              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{sections.summary}</div>
                            </div>
                          )}

                          {/* Key Themes */}
                          {sections.keyThemes.length > 0 && (
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-2xl">🎯</span>
                                Key Themes
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sections.keyThemes.map((theme, idx) => (
                                  <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
                                    <p className="text-sm font-semibold text-[#003B5C]">{theme}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Platform Priorities */}
                          {sections.platformPriorities.length > 0 && (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-2xl">⭐</span>
                                Platform Feature Priorities
                              </h3>
                              <ul className="space-y-2">
                                {sections.platformPriorities.map((priority, idx) => (
                                  <li key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                                    <span className="text-green-600 font-bold mt-0.5">{idx + 1}.</span>
                                    <span className="text-sm text-gray-800 font-medium">{priority}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Design Principles */}
                          {sections.designPrinciples.length > 0 && (
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-2xl">🏗️</span>
                                Platform Design Principles
                              </h3>
                              <ul className="space-y-2">
                                {sections.designPrinciples.map((principle, idx) => (
                                  <li key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                                    <span className="text-purple-600 font-bold">{idx + 1}.</span>
                                    <span className="text-sm text-gray-800">{principle}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Next Steps */}
                          {sections.nextSteps.length > 0 && (
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-200">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-2xl">🚀</span>
                                Recommended Next Steps
                              </h3>
                              <ul className="space-y-2">
                                {sections.nextSteps.map((step, idx) => (
                                  <li key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                                    <span className="text-amber-600">✓</span>
                                    <span className="text-sm text-gray-800">{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Key Quotes */}
                          {sections.keyQuotes.length > 0 && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-[#003B5C]">💬</span>
                                Key Insights on Community & Connection
                              </h3>
                              <ul className="space-y-3">
                                {sections.keyQuotes.map((quote, idx) => (
                                  <li key={idx} className="text-sm text-gray-800 leading-relaxed pl-4 border-l-2 border-[#00A5E0]">
                                    {quote}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Key Sentiments */}
                          {sections.keySentiments.length > 0 && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                              <h3 className="text-base font-semibold text-gray-900 mb-4">Key Sentiments</h3>
                              <ul className="space-y-2">
                                {sections.keySentiments.map((sentiment, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-800">
                                    <span className="text-[#00A5E0] mt-1">•</span>
                                    <span>{sentiment}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}
