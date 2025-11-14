'use client'

import { useState, useEffect } from 'react'
import {
  Library,
  FileText,
  File,
  Tool,
  Search,
  Filter,
  Download,
  ExternalLink,
  Tag,
  Clock,
  Users,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  BookOpen,
  Lightbulb
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

interface Resource {
  id: string
  title: string
  description?: string
  url: string
  type: 'page' | 'pdf' | 'tool' | 'resource'
  category?: string
  tags?: string[]
  metadata?: any
  relatedInsights?: any[]
  learnWorldsSuggestions?: any[]
  createdAt?: string
  updatedAt?: string
}

interface LibraryStats {
  totalPages: number
  totalPDFs: number
  totalTools: number
  totalResources: number
  totalEmbeddings: number
  searchEnabled: boolean
  categoryBreakdown: Record<string, number>
}

export default function ResourcesLibraryPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [stats, setStats] = useState<LibraryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showInsights, setShowInsights] = useState(false)
  const [showLearning, setShowLearning] = useState(false)

  useEffect(() => {
    fetchResources()
  }, [showInsights, showLearning])

  useEffect(() => {
    applyFilters()
  }, [resources, searchQuery, selectedType, selectedCategory])

  const fetchResources = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: '100',
        includeInsights: showInsights.toString(),
        includeLearningContent: showLearning.toString()
      })

      const res = await fetch(`/api/resources/library?${params}`)
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Failed to load resources')
        return
      }

      setResources(data.resources)
      setStats(data.stats)
    } catch (err: any) {
      setError('Failed to load resources')
      console.error('Error loading resources:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = resources

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.type === selectedType)
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    setFilteredResources(filtered)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <File className="h-5 w-5" />
      case 'tool':
        return <Tool className="h-5 w-5" />
      case 'page':
        return <FileText className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'tool':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'page':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Container className="py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading resource library...</p>
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
                <h3 className="font-semibold mb-1">Unable to Load Resources</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchResources} variant="outline">Try Again</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    )
  }

  const categories = stats ? Object.keys(stats.categoryBreakdown) : []

  return (
    <Container className="py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Library className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Resource Library</h1>
        </div>
        <p className="text-lg text-muted-foreground mb-6">
          Comprehensive collection of SMART Recovery resources, tools, and learning materials
        </p>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Library className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stats.totalResources}</div>
                  <div className="text-sm text-muted-foreground">Total Resources</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className="h-5 w-5 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">{stats.totalPages}</div>
                  <div className="text-sm text-muted-foreground">Pages</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <File className="h-5 w-5 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold">{stats.totalPDFs}</div>
                  <div className="text-sm text-muted-foreground">PDFs</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Tool className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{stats.totalTools}</div>
                  <div className="text-sm text-muted-foreground">Tools</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Sparkles className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">{stats.totalEmbeddings}</div>
                  <div className="text-sm text-muted-foreground">Searchable</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="all">All Types</option>
                    <option value="page">Pages</option>
                    <option value="pdf">PDFs</option>
                    <option value="tool">Tools</option>
                    <option value="resource">Resources</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    variant={showInsights ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowInsights(!showInsights)}
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Insights
                  </Button>
                  <Button
                    variant={showLearning ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowLearning(!showLearning)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Learning
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredResources.length} of {resources.length} resources
        </p>
      </div>

      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No resources found matching your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg border ${getTypeColor(resource.type)}`}>
                    {getTypeIcon(resource.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <Link href={`/resources/${resource.id}`}>
                          <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                            {resource.title}
                          </h3>
                        </Link>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                      </div>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {resource.category && (
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          {resource.category}
                        </span>
                      )}
                      {resource.tags?.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {tag}
                        </span>
                      ))}
                      {resource.metadata?.wordCount && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {resource.metadata.readingTime || Math.ceil(resource.metadata.wordCount / 200)} min read
                        </span>
                      )}
                    </div>

                    {/* Related Insights */}
                    {showInsights && resource.relatedInsights && resource.relatedInsights.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">Related Facilitator Insights</span>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {resource.relatedInsights.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {resource.relatedInsights.slice(0, 2).map((insight, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground pl-6">
                              • {insight.facilitator}: {insight.type === 'platform_recommendation' ? insight.featureIdea : insight.challenge}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Learning Content */}
                    {showLearning && resource.learnWorldsSuggestions && resource.learnWorldsSuggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">LearnWorlds Content Suggestions</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {resource.learnWorldsSuggestions.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {resource.learnWorldsSuggestions.slice(0, 2).map((suggestion, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground pl-6">
                              • {suggestion.courseTitle} ({suggestion.format})
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  )
}
