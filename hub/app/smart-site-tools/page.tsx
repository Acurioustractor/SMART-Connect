'use client'

import { useState, useEffect } from 'react'
import {
  Search, Download, FileText, Loader2, Globe, Brain, MessageSquare, Send,
  ExternalLink, RefreshCw, Filter, BookOpen, List, Grid, ChevronDown,
  X, Tag, Calendar, FileType, ArrowLeft, Home
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import MarkdownRenderer, { type Heading } from '@/components/MarkdownRenderer'
import TableOfContents from '@/components/TableOfContents'

interface ContentItem {
  id: string
  url: string
  title: string
  type: 'page' | 'pdf' | 'document' | 'article'
  content?: string
  scrapedAt?: string
  wordCount?: number | null
  category?: string
  tags?: string[]
  pageCount?: number
  metadata?: any
  analysis?: {
    summary: string
    keyTopics: string[]
    relevantForFacilitators: boolean
    contentType: string
  }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ id: string; title: string; url: string }>
}

export default function SmartSiteToolsPage() {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState<ContentItem[]>([])
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [headings, setHeadings] = useState<Heading[]>([])
  const [showFullContent, setShowFullContent] = useState(false)

  // AI Chat
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Categories and types
  const categories = ['all', ...Array.from(new Set(content.map(c => c.category).filter(Boolean)))].sort()
  const types = ['all', 'page', 'pdf', 'article']

  // Stats
  const stats = {
    totalPages: content.filter(c => c.type !== 'pdf').length,
    totalPDFs: content.filter(c => c.type === 'pdf').length,
    totalWords: content.reduce((sum, c) => sum + (c.wordCount || 0), 0)
  }

  useEffect(() => {
    loadFromDatabase()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [content, searchQuery, selectedCategory, selectedType])

  const loadFromDatabase = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/smart-site/library?includeInsights=false')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load from database')
      }

      // Clean and enhance content
      const cleaned = cleanupContent(data.resources || [])
      setContent(cleaned)

      // Auto-select first item with content
      if (cleaned.length > 0) {
        const firstWithContent = cleaned.find(c => c.content || c.wordCount)
        if (firstWithContent) {
          setSelectedItem(firstWithContent)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load from database')
    } finally {
      setLoading(false)
    }
  }

  const cleanupContent = (items: ContentItem[]): ContentItem[] => {
    const seen = new Set<string>()
    const cleaned: ContentItem[] = []

    for (const item of items) {
      // Skip invalid URLs
      if (!item.url || item.url.includes('undefined') || item.url.includes('null')) {
        continue
      }

      // Deduplicate by URL
      if (seen.has(item.url)) {
        continue
      }
      seen.add(item.url)

      // Fix title
      let betterTitle = item.title

      // If title is bad, extract from URL
      if (!betterTitle || betterTitle === 'Hubfs' || betterTitle.match(/^\d+$/) || betterTitle.length < 3) {
        betterTitle = extractTitleFromUrl(item.url)
      }

      // Clean up title
      betterTitle = betterTitle
        .replace(/\|.*$/, '') // Remove site suffix
        .replace(/SMART Recovery Australia/gi, '')
        .trim()

      if (!betterTitle) {
        betterTitle = 'Untitled'
      }

      cleaned.push({
        ...item,
        title: betterTitle
      })
    }

    // Sort by title
    return cleaned.sort((a, b) => a.title.localeCompare(b.title))
  }

  const extractTitleFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      // Get path segments
      const segments = pathname.split('/').filter(Boolean)
      if (segments.length === 0) return 'Home'

      // Get last meaningful segment
      const lastSegment = segments[segments.length - 1]

      // Remove file extensions
      const withoutExt = lastSegment.replace(/\.(html|php|pdf|aspx?)$/i, '')

      // Decode URL encoding
      const decoded = decodeURIComponent(withoutExt)

      // Format: replace dashes/underscores with spaces, title case
      const formatted = decoded
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/\s+/g, ' ')
        .trim()

      return formatted || 'Page'
    } catch {
      return 'Page'
    }
  }

  const applyFilters = () => {
    let filtered = [...content]

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      )
    }

    setFilteredContent(filtered)
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
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.answer,
          sources: data.sources
        }])
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error: ' + err.message
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-4 w-4 text-red-500" />
      case 'article': return <FileType className="h-4 w-4 text-purple-500" />
      default: return <Globe className="h-4 w-4 text-blue-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-red-50 border-red-200 text-red-700'
      case 'article': return 'bg-purple-50 border-purple-200 text-purple-700'
      default: return 'bg-blue-50 border-blue-200 text-blue-700'
    }
  }

  // If an item is selected and we want to show full content, render GitBook-style view
  if (selectedItem && showFullContent) {
    return (
      <div className="min-h-screen bg-white">
        {/* GitBook-style Header */}
        <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowFullContent(false); setSelectedItem(null) }}
                  className="hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Library
                </Button>
                <div className="h-6 w-px bg-gray-300" />
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Home className="h-3 w-3" />
                  <span>/</span>
                  {selectedItem.category && (
                    <>
                      <span className="text-gray-900">{selectedItem.category}</span>
                      <span>/</span>
                    </>
                  )}
                  <span className="text-gray-900 font-medium truncate max-w-md">{selectedItem.title}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedItem.url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  View Original
                </Button>
                {selectedItem.type === 'pdf' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedItem.url, '_blank')}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* GitBook-style Two-Column Layout */}
        <div className="max-w-7xl mx-auto flex gap-6 px-6 py-8">
          {/* Table of Contents Sidebar */}
          {headings.length > 0 && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <TableOfContents headings={headings} />
            </aside>
          )}

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 max-w-4xl">
            {/* Title and Metadata */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{selectedItem.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getTypeIcon(selectedItem.type)}
                  {selectedItem.type.toUpperCase()}
                </Badge>
                {selectedItem.category && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {selectedItem.category}
                  </Badge>
                )}
                {selectedItem.wordCount && selectedItem.wordCount > 0 && (
                  <Badge variant="secondary">
                    {selectedItem.wordCount.toLocaleString()} words
                  </Badge>
                )}
                {selectedItem.pageCount && (
                  <Badge variant="secondary">
                    {selectedItem.pageCount} pages
                  </Badge>
                )}
              </div>
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedItem.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Rendered Content */}
            {selectedItem.content && (
              <div className="prose prose-lg max-w-none">
                <MarkdownRenderer
                  content={selectedItem.content}
                  onHeadingsExtracted={setHeadings}
                  className="leading-relaxed"
                />
              </div>
            )}

            {/* AI Analysis if available */}
            {selectedItem.analysis && (
              <div className="mt-8 bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-green-600" />
                  AI Analysis
                </h3>
                <p className="text-gray-700 mb-4">{selectedItem.analysis.summary}</p>
                {selectedItem.analysis.keyTopics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.analysis.keyTopics.map((topic, idx) => (
                      <Badge key={idx} className="bg-green-100 text-green-800 border-green-300">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer actions */}
            <div className="mt-12 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => { setShowFullContent(false); setSelectedItem(null) }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Library
                </Button>
                <Button onClick={() => window.open(selectedItem.url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original Source
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Default library view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-[#003B5C]" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SMART Content Library</h1>
                <p className="text-sm text-gray-600">
                  {filteredContent.length} of {content.length} resources
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className={showChat ? 'bg-green-50' : ''}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask AI
              </Button>
              <Button onClick={loadFromDatabase} disabled={loading} variant="outline" size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Web Pages</p>
                  <p className="text-xl font-bold text-[#003B5C]">{stats.totalPages}</p>
                </div>
                <Globe className="h-6 w-6 text-blue-500 opacity-50" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">PDF Resources</p>
                  <p className="text-xl font-bold text-[#003B5C]">{stats.totalPDFs}</p>
                </div>
                <FileText className="h-6 w-6 text-red-500 opacity-50" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Words</p>
                  <p className="text-xl font-bold text-[#003B5C]">{Math.round(stats.totalWords / 1000)}K</p>
                </div>
                <BookOpen className="h-6 w-6 text-green-500 opacity-50" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              options={types.map(t => ({ value: t, label: t === 'all' ? 'All Types' : t.toUpperCase() }))}
              className="w-36"
            />
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={categories.map(c => ({ value: c, label: c === 'all' ? 'All Categories' : c }))}
              className="w-48"
            />
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        ) : filteredContent.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No content found</p>
              <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedType('all') }} className="mt-4">
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContent.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => { setSelectedItem(item); setShowFullContent(true) }}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {getTypeIcon(item.type)}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.wordCount ? `${item.wordCount.toLocaleString()} words` : item.type}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {item.category && (
                  <CardContent>
                    <Badge variant="secondary">{item.category}</Badge>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContent.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedItem(item); setShowFullContent(true) }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg border ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{item.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        {item.category && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {item.category}
                          </span>
                        )}
                        {item.wordCount && item.wordCount > 0 && (
                          <span>{item.wordCount.toLocaleString()} words</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank') }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Chat Panel */}
      {showChat && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border flex flex-col z-50">
          <div className="p-4 border-b bg-gradient-to-r from-[#00A5E0] to-[#0090C8] text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-semibold">Ask AI</h3>
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
                <p>Ask me anything about SMART Recovery!</p>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
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
    </div>
  )
}
