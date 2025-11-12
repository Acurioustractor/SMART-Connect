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
      keyQuotes: [] as string[],
      keySentiments: [] as string[],
      transcript: ''
    }

    // Extract summary
    const summaryMatch = content.match(/\*\*.*?Summary.*?\*\*\s*\n+([\s\S]*?)(?=\n\*\*|$)/i)
    if (summaryMatch) {
      sections.summary = summaryMatch[1].trim()
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

    // If there's a transcript section, get a preview
    const transcriptMatch = content.match(/\*\*.*?Transcript.*?\*\*\s*([\s\S]{200,1000})/i)
    if (transcriptMatch) {
      sections.transcript = transcriptMatch[1].trim().substring(0, 800) + '...'
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Facilitator Interviews</h1>
          <p className="text-xl text-gray-600">
            Browse through {interviews.length} interviews with SMART Recovery facilitators
          </p>
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
                          {/* Summary */}
                          {sections.summary && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                              <h3 className="text-base font-semibold text-gray-900 mb-3">Interview Summary</h3>
                              <p className="text-sm text-gray-800 leading-relaxed">{sections.summary}</p>
                            </div>
                          )}

                          {/* Key Quotes */}
                          {sections.keyQuotes.length > 0 && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
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
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                              <h3 className="text-base font-semibold text-gray-900 mb-4">Key Themes</h3>
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

                          {/* Transcript Preview */}
                          {sections.transcript && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                              <h3 className="text-base font-semibold text-gray-900 mb-3">Interview Excerpt</h3>
                              <p className="text-sm text-gray-700 leading-relaxed italic">{sections.transcript}</p>
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
