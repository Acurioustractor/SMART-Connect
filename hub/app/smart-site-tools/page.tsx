'use client'

import { useState, useEffect } from 'react'
import {
  Search, Download, FileText, Loader2, Globe, Brain, Sparkles,
  CheckCircle2, AlertCircle, Filter, X, MessageSquare, Send,
  LayoutGrid, List, Eye, ChevronRight, ExternalLink, RefreshCw
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'

interface ContentItem {
  id: string
  url: string
  title: string
  type: 'page' | 'pdf' | 'document'
  content?: string
  excerpt?: string
  scrapedAt?: string
  wordCount?: number | null
  category?: string
  tags?: string[]
  pageCount?: number
  similarity?: number
  metadata?: any
  analysis?: {
    summary: string
    keyTopics: string[]
    relevantForFacilitators: boolean
    contentType: string
  }
  interviewInsights?: Array<{
    facilitator: string
    type: 'addresses_challenge' | 'theme' | 'platform_need'
    challenge?: string
    theme?: string
    featureIdea?: string
    priority?: string
  }>
}

interface Filters {
  type: 'all' | 'page' | 'pdf' | 'document'
  category: string
  hasAnalysis: boolean
  dateRange: 'all' | 'week' | 'month' | 'year'
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ id: string; title: string; url: string }>
}

export default function SmartSiteToolsPage() {
  const [loading, setLoading] = useState(true)
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'scraping' | 'completed' | 'error'>('idle')
  const [content, setContent] = useState<ContentItem[]>([])
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState<string>('')

  // View mode
  const [viewMode, setViewMode] = useState<'gallery' | 'table' | 'detail'>('gallery')

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    category: 'all',
    hasAnalysis: false,
    dateRange: 'all'
  })

  // AI Chat
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Content detail modal
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [relatedContent, setRelatedContent] = useState<ContentItem[]>([])
  const [loadingRelated, setLoadingRelated] = useState(false)

  // Stats
  const stats = {
    totalPages: content.filter(c => c.type !== 'pdf').length,
    totalPDFs: content.filter(c => c.type === 'pdf').length,
    analyzed: content.filter(c => c.analysis).length
  }

  // Categories
  const categories = ['all', ...new Set(content.map(c => c.category).filter(Boolean))]

  // Load content from database
  useEffect(() => {
    loadFromDatabase()
  }, [])

  // Apply filters
  useEffect(() => {
    applyFilters()
  }, [content, filters, searchQuery])

  const loadFromDatabase = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/smart-site/library?includeInsights=true')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load from database')
      }

      setContent(data.resources || [])
      setScrapeStatus('completed')
    } catch (err: any) {
      setError(err.message || 'Failed to load from database')
      setScrapeStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...content]

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(item => item.type === filters.type)
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category)
    }

    // Analysis filter
    if (filters.hasAnalysis) {
      filtered = filtered.filter(item => item.analysis)
    }

    // Text search (simple)
    if (searchQuery && searchMode === 'text') {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      )
    }

    setFilteredContent(filtered)
  }

  const performSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      applyFilters()
      return
    }

    setSearching(true)
    try {
      const response = await fetch('/api/smart-site/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          filters,
          limit: 50
        })
      })

      const data = await response.json()

      if (data.success) {
        setFilteredContent(data.results)
      }
    } catch (err: any) {
      setError('Search failed: ' + err.message)
    } finally {
      setSearching(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchMode === 'semantic') {
      performSemanticSearch()
    } else {
      applyFilters()
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      const response = await fetch('/api/smart-site/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chatInput })
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.answer,
          sources: data.sources
        }
        setChatMessages(prev => [...prev, assistantMessage])
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error: ' + err.message
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  const viewContentDetail = async (item: ContentItem) => {
    setSelectedContent(item)
    setLoadingRelated(true)
    setRelatedContent([])

    try {
      const response = await fetch(`/api/smart-site/related?contentId=${item.id}&limit=5`)
      const data = await response.json()

      if (data.success) {
        setRelatedContent(data.related)
      }
    } catch (err: any) {
      console.error('Failed to load related content:', err)
    } finally {
      setLoadingRelated(false)
    }
  }

  const startFullSiteScrape = async () => {
    setLoading(true)
    setScrapeStatus('scraping')
    setError(null)

    try {
      const startResponse = await fetch('/api/content/scrape-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_crawl',
          url: 'https://smartrecoveryaustralia.com.au'
        })
      })

      if (!startResponse.ok) {
        const errorData = await startResponse.json()
        throw new Error(errorData.details || errorData.error || 'Failed to start crawl')
      }

      const startData = await startResponse.json()
      const jobId = startData.jobId

      if (!jobId) {
        throw new Error('No job ID returned from crawl')
      }

      let isComplete = false
      let attempts = 0
      const maxAttempts = 120

      while (!isComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000))

        const statusResponse = await fetch('/api/content/scrape-full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_status', jobId })
        })

        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          isComplete = statusData.isComplete

          if (statusData.completed && statusData.total) {
            setProgressMessage(`Crawling: ${statusData.completed}/${statusData.total} pages`)
          }
        }

        attempts++
      }

      if (!isComplete) {
        throw new Error('Crawl timed out')
      }

      const processResponse = await fetch('/api/content/scrape-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_results', jobId })
      })

      if (!processResponse.ok) {
        throw new Error('Failed to start processing')
      }

      let isProcessed = false
      attempts = 0

      while (!isProcessed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000))

        const procStatusResponse = await fetch('/api/content/scrape-full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_processing', jobId })
        })

        if (procStatusResponse.ok) {
          const procStatusData = await procStatusResponse.json()
          isProcessed = procStatusData.isComplete

          if (procStatusData.pagesProcessed && procStatusData.pagesScraped) {
            setProgressMessage(`Processing: ${procStatusData.pagesProcessed}/${procStatusData.pagesScraped} pages`)
          }
        }

        attempts++
      }

      setProgressMessage('Loading results...')
      await loadFromDatabase()
      setScrapeStatus('completed')
      setError(null)
      setProgressMessage('')

    } catch (err: any) {
      setError(err.message || 'Failed to scrape site')
      setScrapeStatus('error')
      setProgressMessage('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Container size="xl" className="py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-[#003B5C]" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">SMART Content Hub</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Explore, analyze, and interact with all SMART Recovery Australia content
                </p>
              </div>
            </div>
            <Button
              onClick={startFullSiteScrape}
              disabled={loading && scrapeStatus === 'scraping'}
              variant="outline"
              size="sm"
            >
              {loading && scrapeStatus === 'scraping' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Scraping...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Content
                </>
              )}
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Web Pages</p>
                    <p className="text-2xl font-bold text-[#003B5C]">{stats.totalPages}</p>
                  </div>
                  <Globe className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">PDF Resources</p>
                    <p className="text-2xl font-bold text-[#003B5C]">{stats.totalPDFs}</p>
                  </div>
                  <FileText className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">AI Analyzed</p>
                    <p className="text-2xl font-bold text-[#003B5C]">{stats.analyzed}</p>
                  </div>
                  <Brain className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Banner */}
        {(loading && scrapeStatus === 'scraping') || error ? (
          <Card className={`mb-6 ${
            error ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
          }`}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                {error ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">
                    {error || 'Scraping SMART Recovery Australia website...'}
                  </p>
                  {progressMessage && (
                    <p className="text-sm text-blue-700 mt-1 font-medium">{progressMessage}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Search and Filters Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder={searchMode === 'semantic' ? 'Ask a question or search semantically...' : 'Search content...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12"
                    />
                  </div>
                  <Select
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value as 'text' | 'semantic')}
                    options={[
                      { value: 'text', label: 'Text Search' },
                      { value: 'semantic', label: 'AI Search' }
                    ]}
                    className="w-40"
                  />
                  {searchMode === 'semantic' && (
                    <Button type="submit" disabled={searching}>
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                    </Button>
                  )}
                </form>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-blue-50' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowChat(!showChat)}
                className={showChat ? 'bg-green-50' : ''}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask AI
              </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Content Type</label>
                  <Select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'page', label: 'Web Pages' },
                      { value: 'pdf', label: 'PDFs' },
                      { value: 'document', label: 'Documents' }
                    ]}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                  <Select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    options={categories.map(cat => ({ value: cat, label: cat === 'all' ? 'All Categories' : cat }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Analysis Status</label>
                  <Select
                    value={filters.hasAnalysis ? 'analyzed' : 'all'}
                    onChange={(e) => setFilters({ ...filters, hasAnalysis: e.target.value === 'analyzed' })}
                    options={[
                      { value: 'all', label: 'All Content' },
                      { value: 'analyzed', label: 'Analyzed Only' }
                    ]}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ type: 'all', category: 'all', hasAnalysis: false, dateRange: 'all' })}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Results count and view mode */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredContent.length}</span> of{' '}
                <span className="font-semibold">{content.length}</span> items
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">View:</span>
                <Button
                  variant={viewMode === 'gallery' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('gallery')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Display */}
        {viewMode === 'gallery' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContent.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => viewContentDetail(item)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {item.type === 'pdf' ? (
                      <FileText className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                    ) : (
                      <Globe className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
                      {item.category && (
                        <Badge variant="secondary" className="mt-2">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.excerpt && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">{item.excerpt}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{item.wordCount ? `${item.wordCount.toLocaleString()} words` : `${item.pageCount || 0} pages`}</span>
                    {item.similarity && (
                      <Badge variant="success" className="text-xs">
                        {Math.round(item.similarity * 100)}% match
                      </Badge>
                    )}
                  </div>
                  {item.analysis && (
                    <div className="mt-3 pt-3 border-t">
                      <Badge variant="success" className="text-xs">
                        <Brain className="h-3 w-3 mr-1" />
                        AI Analyzed
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {viewMode === 'table' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContent.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.type === 'pdf' ? (
                            <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <Globe className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900 line-clamp-1">
                            {item.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{item.category || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.wordCount ? `${item.wordCount.toLocaleString()} words` : `${item.pageCount || 0} pages`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.analysis ? (
                          <Badge variant="success" className="text-xs">
                            Analyzed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Not analyzed
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewContentDetail(item)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {filteredContent.length === 0 && !loading && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No content found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or filters
              </p>
              <Button variant="outline" onClick={() => {
                setSearchQuery('')
                setFilters({ type: 'all', category: 'all', hasAnalysis: false, dateRange: 'all' })
              }}>
                Clear All
              </Button>
            </CardContent>
          </Card>
        )}
      </Container>

      {/* AI Chat Panel */}
      {showChat && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border flex flex-col z-50">
          <div className="p-4 border-b bg-gradient-to-r from-[#00A5E0] to-[#0090C8] text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-semibold">Ask AI About Content</h3>
              </div>
              <button onClick={() => setShowChat(false)} className="hover:bg-white/20 rounded p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                <Brain className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Ask me anything about the SMART Recovery content!</p>
                <p className="mt-2 text-xs">I'll search through all pages and PDFs to answer.</p>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300 space-y-1">
                      <p className="text-xs font-semibold mb-2">Sources:</p>
                      {msg.sources.map((source, sidx) => (
                        <a
                          key={sidx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {source.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t">
            <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} className="flex gap-2">
              <Input
                type="text"
                placeholder="Ask a question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={chatLoading || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Content Detail Modal */}
      <Dialog open={!!selectedContent} onOpenChange={(open) => !open && setSelectedContent(null)}>
        <DialogHeader>
          <div className="flex items-start gap-3 flex-1">
            {selectedContent?.type === 'pdf' ? (
              <FileText className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
            ) : (
              <Globe className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle>{selectedContent?.title}</DialogTitle>
              <a
                href={selectedContent?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                {selectedContent?.url}
              </a>
            </div>
          </div>
          <DialogClose onClose={() => setSelectedContent(null)} />
        </DialogHeader>
        <DialogContent className="p-6">
          {selectedContent && (
            <div className="space-y-6">
              {/* Metadata */}
              <div className="flex flex-wrap gap-2">
                {selectedContent.category && (
                  <Badge variant="default">{selectedContent.category}</Badge>
                )}
                {selectedContent.type && (
                  <Badge variant="outline">{selectedContent.type}</Badge>
                )}
                {selectedContent.wordCount && (
                  <Badge variant="secondary">{selectedContent.wordCount.toLocaleString()} words</Badge>
                )}
                {selectedContent.pageCount && (
                  <Badge variant="secondary">{selectedContent.pageCount} pages</Badge>
                )}
              </div>

              {/* Analysis */}
              {selectedContent.analysis && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-green-600" />
                    AI Analysis
                  </h4>
                  <p className="text-sm text-gray-700 mb-3">{selectedContent.analysis.summary}</p>
                  {selectedContent.analysis.keyTopics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedContent.analysis.keyTopics.map((topic, idx) => (
                        <Badge key={idx} variant="success">{topic}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Content Preview */}
              {selectedContent.content && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Content Preview</h4>
                  <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedContent.content.substring(0, 2000)}
                      {selectedContent.content.length > 2000 && '...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Related Content */}
              {relatedContent.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Related Content
                  </h4>
                  <div className="space-y-2">
                    {relatedContent.map((related) => (
                      <div
                        key={related.id}
                        onClick={() => viewContentDetail(related)}
                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors flex items-start justify-between"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {related.type === 'pdf' ? (
                            <FileText className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Globe className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">{related.title}</p>
                            <p className="text-xs text-gray-600 line-clamp-2 mt-1">{related.excerpt}</p>
                          </div>
                        </div>
                        {related.similarity && (
                          <Badge variant="success" className="text-xs ml-2 flex-shrink-0">
                            {Math.round(related.similarity * 100)}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingRelated && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-600">Loading related content...</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => window.open(selectedContent.url, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Original
                </Button>
                {selectedContent.type === 'pdf' && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedContent.url, '_blank')}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
