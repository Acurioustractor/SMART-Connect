'use client'

import { useState, useEffect } from 'react'
import {
  Search, Download, FileText, Loader2, Globe, Brain, MessageSquare, Send,
  ExternalLink, RefreshCw, BookOpen, ChevronRight, ChevronDown, Home, Menu, X, Tag
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import MarkdownRenderer, { type Heading } from '@/components/MarkdownRenderer'
import TableOfContents from '@/components/TableOfContents'

interface ContentItem {
  id: string
  url: string
  title: string
  type: 'page' | 'pdf' | 'document' | 'article'
  content?: string
  wordCount?: number | null
  category?: string
  tags?: string[]
  pageCount?: number
}

interface NavigationNode {
  id: string
  title: string
  url: string
  path: string
  children: NavigationNode[]
  isExpanded: boolean
  item: ContentItem
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ id: string; title: string; url: string }>
}

export default function SmartSiteWiki() {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState<ContentItem[]>([])
  const [navigationTree, setNavigationTree] = useState<NavigationNode[]>([])
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [headings, setHeadings] = useState<Heading[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // AI Chat
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Related content
  const [relatedContent, setRelatedContent] = useState<ContentItem[]>([])

  useEffect(() => {
    loadFromDatabase()
  }, [])

  useEffect(() => {
    if (selectedItem) {
      loadRelatedContent(selectedItem.id)
    }
  }, [selectedItem])

  const loadFromDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/smart-site/library?includeInsights=false')
      const data = await response.json()

      if (data.success && data.resources) {
        setContent(data.resources)
        const tree = buildNavigationTree(data.resources)
        setNavigationTree(tree)

        // Auto-select first item
        if (data.resources.length > 0) {
          setSelectedItem(data.resources[0])
        }
      }
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRelatedContent = async (contentId: string) => {
    try {
      const response = await fetch(`/api/smart-site/related?contentId=${contentId}&limit=5`)
      const data = await response.json()
      if (data.success && data.related) {
        setRelatedContent(data.related)
      }
    } catch (error) {
      console.error('Failed to load related content:', error)
    }
  }

  const buildNavigationTree = (items: ContentItem[]): NavigationNode[] => {
    const tree: Record<string, NavigationNode[]> = {}

    items.forEach(item => {
      try {
        const url = new URL(item.url)
        const pathParts = url.pathname.split('/').filter(Boolean)
        const section = pathParts[0] || 'home'

        if (!tree[section]) {
          tree[section] = []
        }

        tree[section].push({
          id: item.id,
          title: item.title,
          url: item.url,
          path: url.pathname,
          children: [],
          isExpanded: false,
          item
        })
      } catch (e) {
        // Skip invalid URLs
      }
    })

    // Convert to array and sort
    return Object.entries(tree)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([section, nodes]) => ({
        id: section,
        title: formatSectionName(section),
        url: '',
        path: `/${section}`,
        children: nodes.sort((a, b) => a.title.localeCompare(b.title)),
        isExpanded: true,
        item: {} as ContentItem
      }))
  }

  const formatSectionName = (section: string): string => {
    return section
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const toggleNode = (nodeId: string) => {
    const updateTree = (nodes: NavigationNode[]): NavigationNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded }
        }
        if (node.children.length > 0) {
          return { ...node, children: updateTree(node.children) }
        }
        return node
      })
    }
    setNavigationTree(updateTree(navigationTree))
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

  const renderNavigationNode = (node: NavigationNode, level: number = 0) => {
    const hasChildren = node.children.length > 0
    const isSection = level === 0

    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-lg
            hover:bg-gray-100 transition-colors
            ${selectedItem?.id === node.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
            ${isSection ? 'font-semibold text-sm mt-2' : 'text-sm'}
          `}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id)
            } else if (node.item.content) {
              setSelectedItem(node.item)
              setMobileSidebarOpen(false)
            }
          }}
        >
          {hasChildren && (
            node.isExpanded ?
              <ChevronDown className="h-4 w-4 flex-shrink-0" /> :
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
          {!hasChildren && !isSection && (
            node.item.type === 'pdf' ?
              <FileText className="h-3.5 w-3.5 text-red-500 flex-shrink-0" /> :
              <Globe className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          )}
          <span className="truncate flex-1">{node.title}</span>
          {!hasChildren && node.item.wordCount && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {Math.round(node.item.wordCount / 100) / 10}k
            </span>
          )}
        </div>
        {hasChildren && node.isExpanded && (
          <div>
            {node.children.map(child => renderNavigationNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const filteredTree = searchQuery
    ? navigationTree.map(section => ({
        ...section,
        children: section.children.filter(node =>
          node.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.children.length > 0)
    : navigationTree

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar Navigation */}
      <aside className={`
        ${sidebarOpen ? 'w-80' : 'w-0'}
        hidden lg:block flex-shrink-0 border-r bg-gray-50 overflow-hidden transition-all duration-300
      `}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#003B5C]" />
                <h2 className="font-bold text-gray-900">SMART Wiki</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          </div>

          {/* Navigation Tree */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredTree.map(node => renderNavigationNode(node))}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileSidebarOpen(false)}>
          <aside className="w-80 h-full bg-gray-50 border-r" onClick={(e) => e.stopPropagation()}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#003B5C]" />
                    <h2 className="font-bold text-gray-900">SMART Wiki</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {filteredTree.map(node => renderNavigationNode(node))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="hidden lg:flex"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              {selectedItem && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Home className="h-3 w-3" />
                  <span>/</span>
                  {selectedItem.category && (
                    <>
                      <span className="text-gray-900">{selectedItem.category}</span>
                      <span>/</span>
                    </>
                  )}
                  <span className="text-gray-900 font-medium truncate max-w-md">
                    {selectedItem.title}
                  </span>
                </div>
              )}
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
              <Button onClick={loadFromDatabase} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area with TOC */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto flex gap-6 px-6 py-8">
            {/* Main Article */}
            <article className="flex-1 min-w-0 max-w-4xl">
              {selectedItem ? (
                <>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">{selectedItem.title}</h1>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {selectedItem.type === 'pdf' ? (
                        <FileText className="h-3 w-3 text-red-500" />
                      ) : (
                        <Globe className="h-3 w-3 text-blue-500" />
                      )}
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
                  </div>

                  {selectedItem.tags && selectedItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {selectedItem.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Tag className="h-2.5 w-2.5 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mb-6 flex gap-2">
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

                  {selectedItem.content && (
                    <div className="prose prose-lg max-w-none">
                      <MarkdownRenderer
                        content={selectedItem.content}
                        onHeadingsExtracted={setHeadings}
                      />
                    </div>
                  )}

                  {/* Related Content */}
                  {relatedContent.length > 0 && (
                    <div className="mt-12 pt-6 border-t">
                      <h3 className="text-xl font-bold mb-4">Related Content</h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {relatedContent.map((item) => (
                          <Card
                            key={item.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedItem(item)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {item.type === 'pdf' ? (
                                  <FileText className="h-4 w-4 text-red-500 mt-1" />
                                ) : (
                                  <Globe className="h-4 w-4 text-blue-500 mt-1" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm line-clamp-2">{item.title}</h4>
                                  {item.category && (
                                    <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Select a page from the navigation to get started</p>
                </div>
              )}
            </article>

            {/* Table of Contents */}
            {headings.length > 0 && (
              <aside className="hidden xl:block w-64 flex-shrink-0">
                <TableOfContents headings={headings} />
              </aside>
            )}
          </div>
        </div>
      </main>

      {/* AI Chat Panel */}
      {showChat && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border flex flex-col z-50">
          <div className="p-4 border-b bg-gradient-to-r from-[#00A5E0] to-[#0090C8] text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
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
