'use client'

import { useState, useEffect } from 'react'
import { Search, User, Calendar, Mail, FileText, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, BarChart3, BookOpen, Lightbulb, Users, Target, Heart } from 'lucide-react'
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
  interviewType?: 'smart_platform_review' | 'general'
  notes?: string
  affiliation?: string
  status?: string
  summary?: string
  keyThemes?: string[]
  filename: string
  analyzed: boolean
  analysis?: {
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
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [interviewTypeFilter, setInterviewTypeFilter] = useState<'all' | 'smart_platform_review' | 'general'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'locked' | 'contacted'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedContent, setExpandedContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    fetchInterviews()
  }, [])

  useEffect(() => {
    // Filter interviews based on search query, interview type, and status
    const filtered = interviews.filter(interview => {
      // Text search filter
      const matchesSearch = searchQuery === '' ||
        interview.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.affiliation?.toLowerCase().includes(searchQuery.toLowerCase())

      // Interview type filter
      const matchesType = interviewTypeFilter === 'all' ||
        interview.interviewType === interviewTypeFilter

      // Status filter
      let matchesStatus = true
      if (statusFilter !== 'all' && interview.status) {
        const status = interview.status.toLowerCase()
        if (statusFilter === 'complete') {
          matchesStatus = status.includes('complete')
        } else if (statusFilter === 'locked') {
          matchesStatus = status.includes('locked')
        } else if (statusFilter === 'contacted') {
          matchesStatus = status.includes('contacted')
        }
      } else if (statusFilter !== 'all' && !interview.status) {
        matchesStatus = false
      }

      return matchesSearch && matchesType && matchesStatus
    })
    setFilteredInterviews(filtered)
  }, [searchQuery, interviewTypeFilter, statusFilter, interviews])

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

  const analyzedCount = interviews.filter(i => i.analyzed).length
  const pendingCount = interviews.length - analyzedCount
  const completionPercentage = interviews.length > 0 ? Math.round((analyzedCount / interviews.length) * 100) : 0
  const platformReviewCount = interviews.filter(i => i.interviewType === 'smart_platform_review').length
  const generalCount = interviews.filter(i => i.interviewType === 'general').length

  // Break down by status
  const interviewCompleteCount = interviews.filter(i =>
    i.status && i.status.toLowerCase().includes('complete')
  ).length
  const interviewLockedCount = interviews.filter(i =>
    i.status && i.status.toLowerCase().includes('locked')
  ).length
  const contactedCount = interviews.filter(i =>
    i.status && i.status.toLowerCase().includes('contacted')
  ).length
  const transcriptCompleteCount = interviewCompleteCount + interviewLockedCount
  const noTranscriptCount = contactedCount

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      <Container size="xl" className="py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Facilitator Interviews</h1>
              <p className="text-xl text-gray-600">
                Browse through {interviews.length} interviews with SMART Recovery facilitators
              </p>
            </div>
          </div>

          {/* Stats Cards - Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{interviews.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Platform Reviews</p>
                    <p className="text-3xl font-bold text-[#00A5E0] mt-1">{platformReviewCount}</p>
                  </div>
                  <div className="p-3 bg-[#00A5E0]/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-[#00A5E0]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">General</p>
                    <p className="text-3xl font-bold text-[#FFD23F] mt-1">{generalCount}</p>
                  </div>
                  <div className="p-3 bg-[#FFD23F]/10 rounded-lg">
                    <User className="h-6 w-6 text-[#FFD23F]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Analysis</p>
                    <p className="text-3xl font-bold text-[#06D6A0] mt-1">{analyzedCount}</p>
                  </div>
                  <div className="p-3 bg-[#06D6A0]/10 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-[#06D6A0]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards - Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Interview Complete</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{interviewCompleteCount}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Interview Locked</p>
                    <p className="text-3xl font-bold text-purple-700 mt-1">{interviewLockedCount}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Contacted</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{contactedCount}</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Analysis Rate</p>
                    <p className="text-3xl font-bold text-[#003B5C] mt-1">{completionPercentage}%</p>
                  </div>
                  <div className="p-3 bg-[#003B5C]/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-[#003B5C]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Buttons */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Type Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-shrink-0">
                    <p className="text-sm font-medium text-gray-700">Filter by Type:</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={interviewTypeFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInterviewTypeFilter('all')}
                      className={interviewTypeFilter === 'all' ? 'bg-[#003B5C] hover:bg-[#00527A]' : ''}
                    >
                      All Interviews ({interviews.length})
                    </Button>
                    <Button
                      variant={interviewTypeFilter === 'smart_platform_review' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInterviewTypeFilter('smart_platform_review')}
                      className={interviewTypeFilter === 'smart_platform_review' ? 'bg-[#00A5E0] hover:bg-[#0088B8]' : ''}
                    >
                      Platform Reviews ({platformReviewCount})
                    </Button>
                    <Button
                      variant={interviewTypeFilter === 'general' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInterviewTypeFilter('general')}
                      className={interviewTypeFilter === 'general' ? 'bg-[#FFD23F] hover:bg-[#E5BD38] text-gray-900' : ''}
                    >
                      General Interviews ({generalCount})
                    </Button>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-gray-200">
                  <div className="flex-shrink-0">
                    <p className="text-sm font-medium text-gray-700">Filter by Status:</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('all')}
                      className={statusFilter === 'all' ? 'bg-[#003B5C] hover:bg-[#00527A]' : ''}
                    >
                      All Statuses
                    </Button>
                    <Button
                      variant={statusFilter === 'complete' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('complete')}
                      className={statusFilter === 'complete' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      Interview Complete ({interviewCompleteCount})
                    </Button>
                    <Button
                      variant={statusFilter === 'locked' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('locked')}
                      className={statusFilter === 'locked' ? 'bg-purple-700 hover:bg-purple-800' : ''}
                    >
                      Interview Locked ({interviewLockedCount})
                    </Button>
                    <Button
                      variant={statusFilter === 'contacted' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('contacted')}
                      className={statusFilter === 'contacted' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                    >
                      Contacted ({contactedCount})
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                className={`overflow-hidden hover:shadow-lg transition-all duration-200 ${
                  interview.analyzed
                    ? 'border-l-4 border-l-[#06D6A0]'
                    : 'border-l-4 border-l-[#FFD23F]'
                }`}
              >
                <CardHeader className="cursor-pointer" onClick={() => toggleExpand(interview.id, interview.filename)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                          <User className="h-5 w-5 text-[#003B5C]" aria-hidden="true" />
                          {interview.name}
                        </CardTitle>
                        {interview.interviewType && (
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            interview.interviewType === 'smart_platform_review'
                              ? 'bg-[#00A5E0]/10 text-[#00A5E0]'
                              : 'bg-[#FFD23F]/10 text-[#FFD23F]'
                          }`}>
                            {interview.interviewType === 'smart_platform_review' ? 'Platform Review' : 'General'}
                          </span>
                        )}
                        {interview.status && (
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            interview.status.toLowerCase().includes('complete')
                              ? 'bg-green-100 text-green-700'
                              : interview.status.toLowerCase().includes('locked')
                              ? 'bg-purple-100 text-purple-700'
                              : interview.status.toLowerCase().includes('contacted')
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {interview.status}
                          </span>
                        )}
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          interview.analyzed
                            ? 'bg-[#06D6A0]/10 text-[#06D6A0]'
                            : 'bg-orange-100 text-orange-600'
                        }`}>
                          {interview.analyzed ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Analyzed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                        </span>
                      </div>
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
                    ) : interview.analyzed && interview.analysis ? (
                      // Show rich GPT-4 analysis
                      <div className="py-6 space-y-6">
                        {/* One-Line Takeaway - Featured at top */}
                        <div className="bg-gradient-to-br from-[#003B5C] to-[#0066A1] p-6 rounded-lg shadow-lg">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                              <FileText className="h-6 w-6 text-white flex-shrink-0" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-[#00A5E0] mb-2">Key Takeaway</h3>
                              <p className="text-lg text-white leading-relaxed font-medium">{interview.analysis.oneLineTakeaway}</p>
                            </div>
                          </div>
                        </div>

                        {/* Executive Summary */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-[#003B5C]" />
                            Executive Summary
                          </h3>
                          <p className="text-sm text-gray-800 leading-relaxed">{interview.analysis.executiveSummary}</p>
                        </div>

                        {/* Key Themes */}
                        {interview.analysis.keyThemes && interview.analysis.keyThemes.length > 0 && (
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Target className="h-5 w-5 text-blue-600" />
                              Key Themes
                            </h3>
                            <div className="space-y-4">
                              {interview.analysis.keyThemes.map((theme, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-lg shadow-sm border border-blue-200">
                                  <h4 className="font-bold text-[#003B5C] mb-2">{theme.theme}</h4>
                                  <p className="text-sm text-gray-700 mb-3">{theme.description}</p>
                                  {theme.evidence && theme.evidence.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                      {theme.evidence.map((quote, qIdx) => (
                                        <div key={qIdx} className="pl-4 border-l-2 border-blue-400">
                                          <p className="text-sm italic text-gray-600">&ldquo;{quote}&rdquo;</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="pt-3 border-t border-blue-100">
                                    <p className="text-xs font-medium text-blue-700">
                                      <span className="font-semibold">Why it matters:</span> {theme.significance}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Powerful Quotes */}
                        {interview.analysis.powerfulQuotes && interview.analysis.powerfulQuotes.length > 0 && (
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <span className="text-2xl">💬</span>
                              Powerful Quotes
                            </h3>
                            <div className="space-y-4">
                              {interview.analysis.powerfulQuotes.map((item, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-lg shadow-sm">
                                  <p className="text-base italic text-gray-800 mb-3 leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
                                  <div className="space-y-2 text-xs">
                                    <p className="text-gray-600">
                                      <span className="font-semibold text-purple-700">Context:</span> {item.context}
                                    </p>
                                    <p className="text-gray-600">
                                      <span className="font-semibold text-purple-700">Significance:</span> {item.significance}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* LearnWorld Course Suggestions */}
                        {interview.analysis.learnWorldContentSuggestions && interview.analysis.learnWorldContentSuggestions.length > 0 && (
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <BookOpen className="h-5 w-5 text-green-600" />
                              LearnWorld Course Suggestions
                            </h3>
                            <div className="space-y-4">
                              {interview.analysis.learnWorldContentSuggestions.map((course, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-lg shadow-sm border border-green-200">
                                  <div className="flex items-start justify-between mb-3">
                                    <h4 className="font-bold text-[#06D6A0] text-base">{course.courseTitle}</h4>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                                      {course.format}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-3">{course.description}</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-xs">
                                    <div>
                                      <span className="font-semibold text-gray-700">Target:</span>{' '}
                                      <span className="text-gray-600">{course.targetAudience}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-700">Length:</span>{' '}
                                      <span className="text-gray-600">{course.estimatedLength}</span>
                                    </div>
                                  </div>
                                  {course.keyLearningOutcomes && course.keyLearningOutcomes.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-xs font-semibold text-gray-700 mb-2">Learning Outcomes:</p>
                                      <ul className="space-y-1">
                                        {course.keyLearningOutcomes.map((outcome, oIdx) => (
                                          <li key={oIdx} className="flex items-start gap-2 text-xs text-gray-600">
                                            <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>{outcome}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <div className="pt-3 border-t border-green-100">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-semibold text-green-700">Rationale:</span> {course.rationale}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Facilitator Insights */}
                        {interview.analysis.facilitatorInsights && (
                          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-lg border border-amber-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Users className="h-5 w-5 text-amber-600" />
                              Facilitator Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {interview.analysis.facilitatorInsights.challenges && interview.analysis.facilitatorInsights.challenges.length > 0 && (
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                  <h4 className="font-semibold text-red-700 text-sm mb-2 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" />
                                    Challenges
                                  </h4>
                                  <ul className="space-y-1">
                                    {interview.analysis.facilitatorInsights.challenges.map((item, idx) => (
                                      <li key={idx} className="text-xs text-gray-700 pl-4 border-l-2 border-red-300">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {interview.analysis.facilitatorInsights.strengths && interview.analysis.facilitatorInsights.strengths.length > 0 && (
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                  <h4 className="font-semibold text-green-700 text-sm mb-2 flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Strengths
                                  </h4>
                                  <ul className="space-y-1">
                                    {interview.analysis.facilitatorInsights.strengths.map((item, idx) => (
                                      <li key={idx} className="text-xs text-gray-700 pl-4 border-l-2 border-green-300">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {interview.analysis.facilitatorInsights.supportNeeds && interview.analysis.facilitatorInsights.supportNeeds.length > 0 && (
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                  <h4 className="font-semibold text-blue-700 text-sm mb-2 flex items-center gap-1">
                                    <Heart className="h-4 w-4" />
                                    Support Needs
                                  </h4>
                                  <ul className="space-y-1">
                                    {interview.analysis.facilitatorInsights.supportNeeds.map((item, idx) => (
                                      <li key={idx} className="text-xs text-gray-700 pl-4 border-l-2 border-blue-300">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {interview.analysis.facilitatorInsights.learningPreferences && (
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                  <h4 className="font-semibold text-purple-700 text-sm mb-2 flex items-center gap-1">
                                    <Lightbulb className="h-4 w-4" />
                                    Learning Preferences
                                  </h4>
                                  <p className="text-xs text-gray-700">{interview.analysis.facilitatorInsights.learningPreferences}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Platform Implications */}
                        {interview.analysis.platformImplications && interview.analysis.platformImplications.length > 0 && (
                          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-lg border border-indigo-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Lightbulb className="h-5 w-5 text-indigo-600" />
                              Platform Implications
                            </h3>
                            <div className="space-y-3">
                              {interview.analysis.platformImplications.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-l-indigo-400">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-semibold text-gray-900 text-sm">{item.insight}</h4>
                                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                                      item.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                      item.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {item.priority}
                                    </span>
                                  </div>
                                  <p className="text-sm text-indigo-700 mb-2">
                                    <span className="font-semibold">Feature:</span> {item.featureIdea}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-semibold">Rationale:</span> {item.rationale}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cultural Considerations */}
                        {interview.analysis.culturalConsiderations && interview.analysis.culturalConsiderations.relevant && (
                          <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-lg border border-pink-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Heart className="h-5 w-5 text-pink-600" />
                              Cultural Considerations
                            </h3>
                            {interview.analysis.culturalConsiderations.insights && interview.analysis.culturalConsiderations.insights.length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Insights:</h4>
                                <ul className="space-y-2">
                                  {interview.analysis.culturalConsiderations.insights.map((item, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 pl-4 border-l-2 border-pink-300">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {interview.analysis.culturalConsiderations.recommendations && interview.analysis.culturalConsiderations.recommendations.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Recommendations:</h4>
                                <ul className="space-y-2">
                                  {interview.analysis.culturalConsiderations.recommendations.map((item, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 pl-4 border-l-2 border-pink-400 flex items-start gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-pink-600 mt-0.5 flex-shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Analysis Timestamp */}
                        <div className="text-center pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            Analyzed on {new Date(interview.analysis.analyzedAt).toLocaleDateString('en-AU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ) : (() => {
                      // Fallback for unanalyzed interviews - parse markdown
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
