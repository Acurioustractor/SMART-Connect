'use client'

import { useState, useEffect } from 'react'
import {
  Search, Download, FileText, Loader2, Globe, Brain, MessageSquare, Send,
  ExternalLink, RefreshCw, BookOpen, ChevronRight, ChevronDown, Home, Menu, X, Tag, Folder
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

  // Filters
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

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
        updateNavigationTree(data.resources)

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

  // Rebuild navigation tree when filters change
  useEffect(() => {
    if (content.length > 0) {
      updateNavigationTree(content)
    }
  }, [filterType, filterCategory])

  const updateNavigationTree = (items: ContentItem[]) => {
    let filtered = items

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType)
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory)
    }

    const tree = buildNavigationTree(filtered)
    setNavigationTree(tree)
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

  /**
   * Clean and normalize page titles for better display
   */
  const cleanTitle = (title: string, url: string): string => {
    // Extract meaningful title from URL if no title provided
    if (!title || title.trim() === '') {
      return extractTitleFromUrl(url)
    }

    // Only remove obvious branding - keep the actual page title
    let cleaned = title
      .replace(/\s*[-|–]\s*SMART Recovery.*$/i, '')
      .replace(/^SMART Recovery\s*[-|–:]\s*/i, '')
      .trim()

    // If title is now empty, extract from URL
    if (!cleaned) {
      return extractTitleFromUrl(url)
    }

    return cleaned
  }

  /**
   * Extract a meaningful title from URL
   */
  const extractTitleFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)

      // Homepage
      if (pathParts.length === 0) {
        return 'Home'
      }

      // Use the last meaningful part of the path
      const lastPart = pathParts[pathParts.length - 1]

      // Handle common patterns
      if (lastPart.match(/^\d+$/)) {
        // If last part is just a number, use second-to-last + number
        if (pathParts.length > 1) {
          return formatSectionName(pathParts[pathParts.length - 2]) + ' #' + lastPart
        }
        return 'Page ' + lastPart
      }

      // Handle file extensions
      const cleanedPart = lastPart.replace(/\.(html?|php|aspx?)$/i, '')

      return formatSectionName(cleanedPart)
    } catch (e) {
      return 'Untitled Page'
    }
  }

  /**
   * Filter out irrelevant/junk pages
   */
  const isRelevantPage = (item: ContentItem): boolean => {
    const url = item.url.toLowerCase()
    const title = (item.title || '').toLowerCase()

    // Exclude patterns
    const excludePatterns = [
      '/search',
      '/404',
      '/privacy',
      '/terms',
      '/sitemap',
      '/feed',
      '/rss',
      '/login',
      '/register',
      '/cart',
      '/checkout',
      '/account',
      '/wp-admin',
      '/wp-content',
      '/wp-includes',
      '?',  // Query parameters
      '#',  // Anchors
    ]

    // Check if URL matches exclude patterns
    if (excludePatterns.some(pattern => url.includes(pattern))) {
      return false
    }

    // Exclude if title looks like navigation/junk
    const junkTitles = ['navigation', 'menu', 'header', 'footer', 'sidebar']
    if (junkTitles.some(junk => title.includes(junk))) {
      return false
    }

    // Exclude if very short content (likely a nav page)
    if (item.wordCount && item.wordCount < 50) {
      return false
    }

    // Keep everything else
    return true
  }

  const buildNavigationTree = (items: ContentItem[]): NavigationNode[] => {
    // Filter and process items
    const relevantItems = items.filter(isRelevantPage)

    // Remove duplicates (same URL)
    const uniqueItems = Array.from(
      new Map(relevantItems.map(item => [item.url, item])).values()
    )

    // Build hierarchical tree
    const rootNodes: Record<string, NavigationNode> = {}

    uniqueItems.forEach(item => {
      try {
        const url = new URL(item.url)
        const pathParts = url.pathname.split('/').filter(Boolean)

        // Get top-level section
        const section = pathParts[0] || 'home'
        const cleanedTitle = cleanTitle(item.title, item.url)

        // Create section node if it doesn't exist
        if (!rootNodes[section]) {
          rootNodes[section] = {
            id: section,
            title: formatSectionName(section),
            url: '',
            path: `/${section}`,
            children: [],
            isExpanded: true,
            item: {} as ContentItem
          }
        }

        // For multi-level paths, create hierarchy
        if (pathParts.length > 1) {
          // Create parent nodes for nested paths
          let currentLevel = rootNodes[section].children
          for (let i = 1; i < pathParts.length - 1; i++) {
            const parentPath = '/' + pathParts.slice(0, i + 1).join('/')
            let parentNode = currentLevel.find(n => n.path === parentPath)

            if (!parentNode) {
              parentNode = {
                id: parentPath,
                title: formatSectionName(pathParts[i]),
                url: '',
                path: parentPath,
                children: [],
                isExpanded: false,
                item: {} as ContentItem
              }
              currentLevel.push(parentNode)
            }
            currentLevel = parentNode.children
          }

          // Add the actual page node
          currentLevel.push({
            id: item.id,
            title: cleanedTitle,
            url: item.url,
            path: url.pathname,
            children: [],
            isExpanded: false,
            item: {
              ...item,
              title: cleanedTitle
            }
          })
        } else {
          // Top-level page in this section
          rootNodes[section].children.push({
            id: item.id,
            title: cleanedTitle,
            url: item.url,
            path: url.pathname,
            children: [],
            isExpanded: false,
            item: {
              ...item,
              title: cleanedTitle
            }
          })
        }
      } catch (e) {
        console.error('Error processing item:', item.url, e)
      }
    })

    // Convert to array, sort, and clean up
    const sortedTree = Object.values(rootNodes)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(section => ({
        ...section,
        children: sortChildren(section.children)
      }))

    return sortedTree
  }

  /**
   * Recursively sort children and remove empty parent nodes
   */
  const sortChildren = (nodes: NavigationNode[]): NavigationNode[] => {
    return nodes
      .map(node => ({
        ...node,
        children: node.children.length > 0 ? sortChildren(node.children) : []
      }))
      .sort((a, b) => {
        // Folders (nodes with children) first, then alphabetically
        if (a.children.length > 0 && b.children.length === 0) return -1
        if (a.children.length === 0 && b.children.length > 0) return 1
        return a.title.localeCompare(b.title)
      })
  }

  const formatSectionName = (section: string): string => {
    // Handle common abbreviations and acronyms
    const acronyms: Record<string, string> = {
      'faq': 'FAQ',
      'faqs': 'FAQs',
      'pdf': 'PDF',
      'pdfs': 'PDFs',
      'api': 'API',
      'url': 'URL',
      'html': 'HTML',
      'css': 'CSS',
      'js': 'JavaScript',
      'ts': 'TypeScript',
    }

    // Special case handling
    if (acronyms[section.toLowerCase()]) {
      return acronyms[section.toLowerCase()]
    }

    // Handle snake_case and kebab-case
    return section
      .replace(/_/g, '-')  // Convert underscores to hyphens
      .split('-')
      .map(word => {
        // Check if whole word is an acronym
        if (acronyms[word.toLowerCase()]) {
          return acronyms[word.toLowerCase()]
        }
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
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
    const isFolder = hasChildren && !isSection

    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-lg
            hover:bg-gray-100 transition-colors
            ${selectedItem?.id === node.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
            ${isSection ? 'font-semibold text-sm mt-2' : 'text-sm'}
            ${isFolder ? 'font-medium' : ''}
          `}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id)
            } else if (node.url && node.item?.id) {
              setSelectedItem(node.item)
              setMobileSidebarOpen(false)
              loadRelatedContent(node.item.id)
            }
          }}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {node.isExpanded ?
                <ChevronDown className="h-4 w-4" /> :
                <ChevronRight className="h-4 w-4" />}
            </span>
          )}
          {isFolder && (
            <Folder className={`h-3.5 w-3.5 flex-shrink-0 ${node.isExpanded ? 'text-blue-500' : 'text-gray-400'}`} />
          )}
          {!hasChildren && !isSection && (
            node.item.type === 'pdf' ?
              <FileText className="h-3.5 w-3.5 text-red-500 flex-shrink-0" /> :
              <Globe className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          )}
          <span className="truncate flex-1" title={node.title}>{node.title}</span>
          {!hasChildren && node.item.wordCount && (
            <span className="text-xs text-gray-400 flex-shrink-0" title={`${node.item.wordCount} words`}>
              {node.item.wordCount > 1000
                ? `${Math.round(node.item.wordCount / 100) / 10}k`
                : node.item.wordCount}
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

  /**
   * Recursively filter tree nodes by search query
   */
  const filterTree = (nodes: NavigationNode[], query: string): NavigationNode[] => {
    const lowerQuery = query.toLowerCase()

    return nodes.map(node => {
      const titleMatches = node.title.toLowerCase().includes(lowerQuery)
      const filteredChildren = node.children.length > 0
        ? filterTree(node.children, query)
        : []

      // Include node if title matches OR if any children match
      if (titleMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
          isExpanded: filteredChildren.length > 0 ? true : node.isExpanded // Auto-expand if children match
        }
      }
      return null
    }).filter((node): node is NavigationNode => node !== null)
  }

  const filteredTree = searchQuery
    ? filterTree(navigationTree, searchQuery)
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
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 text-xs border rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="page">Pages</option>
                <option value="pdf">PDFs</option>
                <option value="document">Documents</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 text-xs border rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="facilitator">Facilitators</option>
                <option value="participant">Participants</option>
                <option value="tool">Tools</option>
                <option value="resource">Resources</option>
                <option value="training">Training</option>
              </select>
            </div>
            {(filterType !== 'all' || filterCategory !== 'all') && (
              <button
                onClick={() => {
                  setFilterType('all')
                  setFilterCategory('all')
                }}
                className="text-xs text-blue-600 hover:text-blue-800 mt-2"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Navigation Tree */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="px-3 py-2 text-xs text-gray-500">
              {navigationTree.reduce((sum, section) => sum + section.children.length, 0)} items
            </div>
            {filteredTree.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-gray-400">
                No content matches your filters
              </div>
            ) : (
              filteredTree.map(node => renderNavigationNode(node))
            )}
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
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="flex-1 text-xs border rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="page">Pages</option>
                    <option value="pdf">PDFs</option>
                    <option value="document">Documents</option>
                  </select>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="flex-1 text-xs border rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="facilitator">Facilitators</option>
                    <option value="participant">Participants</option>
                    <option value="tool">Tools</option>
                    <option value="resource">Resources</option>
                    <option value="training">Training</option>
                  </select>
                </div>
                {(filterType !== 'all' || filterCategory !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterType('all')
                      setFilterCategory('all')
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="px-3 py-2 text-xs text-gray-500">
                  {navigationTree.reduce((sum, section) => sum + section.children.length, 0)} items
                </div>
                {filteredTree.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-400">
                    No content matches your filters
                  </div>
                ) : (
                  filteredTree.map(node => renderNavigationNode(node))
                )}
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

                  {selectedItem.content ? (
                    <div className="prose prose-lg max-w-none">
                      <MarkdownRenderer
                        content={selectedItem.content}
                        onHeadingsExtracted={setHeadings}
                      />
                    </div>
                  ) : (
                    <div className="text-gray-500 py-8">
                      <p>No content available for this item.</p>
                      <p className="mt-2">
                        <a
                          href={selectedItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          View original source <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
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
