'use client'

import { useState, useEffect } from 'react'
import {
  Search, Download, FileText, Loader2, Globe, Brain, MessageSquare, Send,
  ChevronRight, ChevronDown, ExternalLink, RefreshCw, Folder, File,
  AlertCircle, X, Filter, BookOpen, Layout
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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

interface PageNode {
  path: string
  name: string
  url: string
  content?: ContentItem
  pdfs: ContentItem[]
  children: Map<string, PageNode>
  isExpanded?: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ id: string; title: string; url: string }>
}

export default function SmartSiteToolsPage() {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState<ContentItem[]>([])
  const [siteTree, setSiteTree] = useState<PageNode | null>(null)
  const [selectedPage, setSelectedPage] = useState<PageNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // AI Chat
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Stats
  const stats = {
    totalPages: content.filter(c => c.type !== 'pdf').length,
    totalPDFs: content.filter(c => c.type === 'pdf').length,
    categories: new Set(content.map(c => c.category).filter(Boolean)).size
  }

  useEffect(() => {
    loadFromDatabase()
  }, [])

  useEffect(() => {
    if (content.length > 0) {
      const tree = buildSiteTree(content)
      setSiteTree(tree)
      // Auto-select first page with actual content
      const firstPage = findFirstPageWithContent(tree)
      if (firstPage) {
        setSelectedPage(firstPage)
      }
    }
  }, [content])

  const loadFromDatabase = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/smart-site/library?includeInsights=false')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load from database')
      }

      // Clean up and deduplicate content
      const cleanedContent = cleanupContent(data.resources || [])
      setContent(cleanedContent)
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
      // Skip items with terrible names or no content
      if (!item.url || item.url.includes('undefined') || item.url.includes('null')) {
        continue
      }

      // Deduplicate by URL
      if (seen.has(item.url)) {
        continue
      }
      seen.add(item.url)

      // Fix titles
      let betterTitle = item.title
      if (!betterTitle || betterTitle === 'Hubfs' || betterTitle.match(/^\d+$/)) {
        betterTitle = extractTitleFromUrl(item.url)
      }

      cleaned.push({
        ...item,
        title: betterTitle
      })
    }

    return cleaned
  }

  const extractTitleFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      // Get last segment
      const segments = pathname.split('/').filter(Boolean)
      if (segments.length === 0) return 'Home'

      const lastSegment = segments[segments.length - 1]

      // Remove file extensions
      const withoutExt = lastSegment.replace(/\.(html|php|pdf|aspx?)$/i, '')

      // Decode and format
      const decoded = decodeURIComponent(withoutExt)
      const formatted = decoded
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())

      return formatted || 'Page'
    } catch {
      return 'Page'
    }
  }

  const buildSiteTree = (items: ContentItem[]): PageNode => {
    const root: PageNode = {
      path: '',
      name: 'SMART Recovery Australia',
      url: 'https://smartrecoveryaustralia.com.au',
      pdfs: [],
      children: new Map(),
      isExpanded: true
    }

    for (const item of items) {
      try {
        const urlObj = new URL(item.url)
        const pathname = urlObj.pathname
        const segments = pathname.split('/').filter(Boolean)

        let currentNode = root

        // Build path through tree
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i]
          const isLast = i === segments.length - 1

          if (!currentNode.children.has(segment)) {
            const newNode: PageNode = {
              path: '/' + segments.slice(0, i + 1).join('/'),
              name: extractTitleFromUrl('/' + segment),
              url: urlObj.origin + '/' + segments.slice(0, i + 1).join('/'),
              pdfs: [],
              children: new Map(),
              isExpanded: false
            }
            currentNode.children.set(segment, newNode)
          }

          currentNode = currentNode.children.get(segment)!

          // If this is the last segment, add content
          if (isLast) {
            if (item.type === 'pdf') {
              currentNode.pdfs.push(item)
            } else {
              currentNode.content = item
            }
          }
        }
      } catch (err) {
        console.error('Error processing item:', item.url, err)
      }
    }

    return root
  }

  const findFirstPageWithContent = (node: PageNode): PageNode | null => {
    if (node.content || node.pdfs.length > 0) {
      return node
    }

    for (const child of node.children.values()) {
      const found = findFirstPageWithContent(child)
      if (found) return found
    }

    return null
  }

  const toggleNode = (node: PageNode) => {
    node.isExpanded = !node.isExpanded
    setSiteTree({ ...siteTree! })
  }

  const renderTreeNode = (node: PageNode, depth: number = 0): JSX.Element => {
    const hasChildren = node.children.size > 0
    const hasContent = !!node.content || node.pdfs.length > 0
    const isSelected = selectedPage?.path === node.path

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node)
            }
            if (hasContent) {
              setSelectedPage(node)
            }
          }}
        >
          {hasChildren && (
            <span onClick={(e) => { e.stopPropagation(); toggleNode(node); }}>
              {node.isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </span>
          )}
          {!hasChildren && <div className="w-4" />}

          {hasChildren ? (
            <Folder className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
          ) : (
            <File className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
          )}

          <span className={`text-sm truncate flex-1 ${isSelected ? 'font-semibold' : ''}`}>
            {node.name}
          </span>

          {node.pdfs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {node.pdfs.length} PDF{node.pdfs.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {hasChildren && node.isExpanded && (
          <div>
            {Array.from(node.children.values()).map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
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

  const filteredTree = (node: PageNode): PageNode | null => {
    if (!searchQuery) return node

    const query = searchQuery.toLowerCase()
    const matches = node.name.toLowerCase().includes(query) ||
                   node.content?.title.toLowerCase().includes(query) ||
                   node.pdfs.some(pdf => pdf.title.toLowerCase().includes(query))

    if (matches) {
      return { ...node, isExpanded: true }
    }

    // Check children
    const filteredChildren = new Map<string, PageNode>()
    for (const [key, child] of node.children.entries()) {
      const filteredChild = filteredTree(child)
      if (filteredChild) {
        filteredChildren.set(key, filteredChild)
      }
    }

    if (filteredChildren.size > 0) {
      return {
        ...node,
        children: filteredChildren,
        isExpanded: true
      }
    }

    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-[#003B5C]" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SMART Content Library</h1>
                <p className="text-sm text-gray-600">Browse the complete SMART Recovery Australia website</p>
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
              <Button
                onClick={loadFromDatabase}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Pages</p>
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

            <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Categories</p>
                  <p className="text-xl font-bold text-[#003B5C]">{stats.categories}</p>
                </div>
                <Layout className="h-6 w-6 text-purple-500 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              </div>
            ) : siteTree ? (
              renderTreeNode(searchQuery ? filteredTree(siteTree) || siteTree : siteTree)
            ) : (
              <div className="p-4 text-sm text-gray-500 text-center">
                No content available
              </div>
            )}
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {selectedPage ? (
            <div className="max-w-4xl mx-auto p-6">
              {/* Breadcrumb */}
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                <Globe className="h-4 w-4" />
                {selectedPage.path.split('/').filter(Boolean).map((segment, idx, arr) => (
                  <span key={idx} className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3" />
                    <span className={idx === arr.length - 1 ? 'text-gray-900 font-medium' : ''}>
                      {extractTitleFromUrl('/' + segment)}
                    </span>
                  </span>
                ))}
              </div>

              {/* Page Title */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedPage.name}</h2>
                <a
                  href={selectedPage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {selectedPage.url}
                </a>
              </div>

              {/* Page Content */}
              {selectedPage.content && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-500" />
                      Page Content
                    </CardTitle>
                    <CardDescription>
                      {selectedPage.content.wordCount ? `${selectedPage.content.wordCount.toLocaleString()} words` : 'Content preview'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedPage.content.content ? (
                      <div className="prose prose-sm max-w-none">
                        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {selectedPage.content.content.substring(0, 2000)}
                            {selectedPage.content.content.length > 2000 && '...'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No content available</p>
                    )}

                    {selectedPage.content.category && (
                      <div className="mt-4">
                        <Badge variant="default">{selectedPage.content.category}</Badge>
                      </div>
                    )}

                    {selectedPage.content.analysis && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                          <Brain className="h-4 w-4 text-green-600" />
                          AI Analysis
                        </h4>
                        <p className="text-sm text-gray-700">{selectedPage.content.analysis.summary}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Related PDFs */}
              {selectedPage.pdfs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-red-500" />
                      PDF Resources on this Page ({selectedPage.pdfs.length})
                    </CardTitle>
                    <CardDescription>
                      Documents and resources found on this page
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedPage.pdfs.map((pdf) => (
                        <div
                          key={pdf.id}
                          className="flex items-start justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 line-clamp-2">{pdf.title}</h4>
                              {pdf.category && (
                                <Badge variant="secondary" className="mt-2">
                                  {pdf.category}
                                </Badge>
                              )}
                              {pdf.wordCount && pdf.wordCount > 0 && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {pdf.wordCount.toLocaleString()} words
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-3 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(pdf.url, '_blank')}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => window.open(pdf.url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!selectedPage.content && selectedPage.pdfs.length === 0 && (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">This page has no content or PDFs</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600">Select a page from the sidebar to view its content</p>
              </div>
            </div>
          )}
        </div>
      </div>

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
                <p>Ask me anything about SMART Recovery!</p>
                <p className="mt-2 text-xs">I'll search through all pages and PDFs.</p>
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
