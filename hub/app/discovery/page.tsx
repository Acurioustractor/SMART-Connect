'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, Sparkles, FileText, Video, Wrench, Calendar, User, Tag, TrendingUp, BarChart3, ChevronDown, ChevronRight, Loader2, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Interview {
  id: string
  name: string
  summary: string
  keyThemes: string[]
  filename: string
  analyzed: boolean
  type: 'interview'
}

interface MediaItem {
  id: string
  title: string
  description: string
  media_type: string
  outlet_host: string
  source_url: string
  topics: string[]
  publish_date: string
  type: 'media'
}

interface Tool {
  name: string
  description: string
  status: string
  href: string
  type: 'tool'
}

type ContentItem = Interview | MediaItem | Tool

export default function DiscoveryPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [tools] = useState<Tool[]>([
    {
      name: 'Content Generator',
      description: 'Generate evidence-based posts, emails, and resources grounded in research',
      status: 'Active',
      href: '/tools/content-generator',
      type: 'tool'
    },
    {
      name: 'Interview Summarizer',
      description: 'Paste interview transcripts to generate structured summaries',
      status: 'Coming Soon',
      href: '/tools/interview-summarizer',
      type: 'tool'
    },
    {
      name: 'Cultural Safety Checker',
      description: 'Review content for cultural safety and inclusivity',
      status: 'Coming Soon',
      href: '/tools/cultural-safety-checker',
      type: 'tool'
    }
  ])

  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>(['interview', 'media', 'tool'])
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'all' | 'rollup'>('all')

  useEffect(() => {
    fetchAllContent()
  }, [])

  const fetchAllContent = async () => {
    setLoading(true)
    try {
      // Fetch interviews
      const interviewsRes = await fetch('/api/interviews')
      const interviewsData = await interviewsRes.json()
      if (interviewsData.interviews) {
        setInterviews(interviewsData.interviews.map((i: any) => ({ ...i, type: 'interview' })))
      }

      // Fetch media items
      const mediaRes = await fetch('/api/media')
      const mediaData = await mediaRes.json()
      if (mediaData.success && mediaData.data) {
        setMediaItems(mediaData.data.map((m: any) => ({ ...m, type: 'media' })))
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  // Extract all unique topics from interviews and media
  const allTopics = useMemo(() => {
    const topics = new Set<string>()

    interviews.forEach(i => {
      i.keyThemes?.forEach(theme => topics.add(theme))
    })

    mediaItems.forEach(m => {
      m.topics?.forEach(topic => topics.add(topic))
    })

    return Array.from(topics).sort()
  }, [interviews, mediaItems])

  // Combined and filtered content
  const filteredContent = useMemo(() => {
    let combined: ContentItem[] = []

    // Add interviews
    if (selectedContentTypes.includes('interview')) {
      combined = [...combined, ...interviews]
    }

    // Add media items
    if (selectedContentTypes.includes('media')) {
      combined = [...combined, ...mediaItems]
    }

    // Add tools
    if (selectedContentTypes.includes('tool')) {
      combined = [...combined, ...tools]
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      combined = combined.filter(item => {
        if (item.type === 'interview') {
          const i = item as Interview
          return (
            i.name.toLowerCase().includes(query) ||
            i.summary?.toLowerCase().includes(query) ||
            i.keyThemes?.some(t => t.toLowerCase().includes(query))
          )
        } else if (item.type === 'media') {
          const m = item as MediaItem
          return (
            m.title.toLowerCase().includes(query) ||
            m.description.toLowerCase().includes(query) ||
            m.outlet_host.toLowerCase().includes(query) ||
            m.topics?.some(t => t.toLowerCase().includes(query))
          )
        } else if (item.type === 'tool') {
          const t = item as Tool
          return (
            t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
          )
        }
        return false
      })
    }

    // Apply topic filter
    if (selectedTopics.length > 0) {
      combined = combined.filter(item => {
        if (item.type === 'interview') {
          const i = item as Interview
          return i.keyThemes?.some(t => selectedTopics.includes(t))
        } else if (item.type === 'media') {
          const m = item as MediaItem
          return m.topics?.some(t => selectedTopics.includes(t))
        }
        return false
      })
    }

    return combined
  }, [interviews, mediaItems, tools, searchQuery, selectedContentTypes, selectedTopics])

  // Content rollup by topic
  const contentRollup = useMemo(() => {
    const rollup: Record<string, { interviews: Interview[], media: MediaItem[], count: number }> = {}

    filteredContent.forEach(item => {
      let topics: string[] = []

      if (item.type === 'interview') {
        topics = (item as Interview).keyThemes || []
      } else if (item.type === 'media') {
        topics = (item as MediaItem).topics || []
      }

      topics.forEach(topic => {
        if (!rollup[topic]) {
          rollup[topic] = { interviews: [], media: [], count: 0 }
        }

        if (item.type === 'interview') {
          rollup[topic].interviews.push(item as Interview)
        } else if (item.type === 'media') {
          rollup[topic].media.push(item as MediaItem)
        }

        rollup[topic].count++
      })
    })

    return Object.entries(rollup)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20) // Top 20 topics
  }, [filteredContent])

  const toggleContentType = (type: string) => {
    setSelectedContentTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    )
  }

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'interview': return <User className="h-4 w-4" />
      case 'media': return <Video className="h-4 w-4" />
      case 'tool': return <Wrench className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getContentColor = (type: string) => {
    switch (type) {
      case 'interview': return 'bg-blue-100 text-blue-700'
      case 'media': return 'bg-purple-100 text-purple-700'
      case 'tool': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      <Container size="xl" className="py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center gap-3">
                <Sparkles className="h-10 w-10 text-[#00A5E0]" />
                Content Discovery
              </h1>
              <p className="text-xl text-gray-600">
                Search across all interviews, media, and tools in one place
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Content</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {interviews.length + mediaItems.length + tools.length}
                    </p>
                  </div>
                  <div className="p-3 bg-[#003B5C]/10 rounded-lg">
                    <FileText className="h-6 w-6 text-[#003B5C]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Interviews</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{interviews.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Media Items</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{mediaItems.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Video className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unique Topics</p>
                    <p className="text-3xl font-bold text-[#06D6A0] mt-1">{allTopics.length}</p>
                  </div>
                  <div className="p-3 bg-[#06D6A0]/10 rounded-lg">
                    <Tag className="h-6 w-6 text-[#06D6A0]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search across all content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 text-base"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Filter Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                      {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    {(selectedTopics.length > 0 || selectedContentTypes.length < 3) && (
                      <span className="text-sm text-gray-600">
                        {filteredContent.length} results
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('all')}
                    >
                      All Content
                    </Button>
                    <Button
                      variant={viewMode === 'rollup' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('rollup')}
                      className="flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Topic Rollup
                    </Button>
                  </div>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                  <div className="pt-4 border-t space-y-4">
                    {/* Content Type Filter */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Content Type</h3>
                      <div className="flex flex-wrap gap-2">
                        {['interview', 'media', 'tool'].map(type => (
                          <button
                            key={type}
                            onClick={() => toggleContentType(type)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              selectedContentTypes.includes(type)
                                ? 'bg-[#003B5C] text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {getContentIcon(type)}
                              {type.charAt(0).toUpperCase() + type.slice(1)}s
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Topic Filter */}
                    {allTopics.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Topics {selectedTopics.length > 0 && `(${selectedTopics.length})`}
                        </h3>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                          {allTopics.slice(0, 30).map(topic => (
                            <button
                              key={topic}
                              onClick={() => toggleTopic(topic)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                selectedTopics.includes(topic)
                                  ? 'bg-[#00A5E0] text-white'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                        {selectedTopics.length > 0 && (
                          <button
                            onClick={() => setSelectedTopics([])}
                            className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                          >
                            Clear topic filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#003B5C]" />
            <span className="ml-3 text-gray-600">Loading content...</span>
          </div>
        )}

        {/* Content Display */}
        {!loading && viewMode === 'all' && (
          <div>
            {filteredContent.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No content found matching your filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredContent.map((item, idx) => (
                  <Card key={idx} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getContentColor(item.type)}`}>
                              {getContentIcon(item.type)}
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </span>
                            {item.type === 'interview' && (item as Interview).analyzed && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                Analyzed
                              </span>
                            )}
                          </div>
                          <CardTitle className="text-xl mb-2">
                            {item.type === 'interview' && (item as Interview).name}
                            {item.type === 'media' && (item as MediaItem).title}
                            {item.type === 'tool' && (item as Tool).name}
                          </CardTitle>
                          <CardDescription className="text-base">
                            {item.type === 'interview' && (item as Interview).summary}
                            {item.type === 'media' && (item as MediaItem).description}
                            {item.type === 'tool' && (item as Tool).description}
                          </CardDescription>

                          {/* Topics/Themes */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.type === 'interview' && (item as Interview).keyThemes?.slice(0, 5).map((theme, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                {theme}
                              </span>
                            ))}
                            {item.type === 'media' && (item as MediaItem).topics?.slice(0, 5).map((topic, i) => (
                              <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="ml-4">
                          {item.type === 'interview' && (
                            <Link href={`/interviews#${(item as Interview).id}`}>
                              <Button variant="outline" size="sm">View</Button>
                            </Link>
                          )}
                          {item.type === 'media' && (
                            <Link href={`/media/${(item as MediaItem).id}`}>
                              <Button variant="outline" size="sm">View</Button>
                            </Link>
                          )}
                          {item.type === 'tool' && (
                            <Link href={(item as Tool).href}>
                              <Button variant="outline" size="sm">Open</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Topic Rollup View */}
        {!loading && viewMode === 'rollup' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Content by Topic</h2>
              <p className="text-gray-600">Explore content organized by the most common themes and topics</p>
            </div>

            {contentRollup.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No topics found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {contentRollup.map(([topic, data]) => (
                  <Card key={topic} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl flex items-center gap-3">
                            <Tag className="h-5 w-5 text-[#00A5E0]" />
                            {topic}
                          </CardTitle>
                          <CardDescription className="mt-2 flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                              <User className="h-4 w-4" />
                              {data.interviews.length} interviews
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Video className="h-4 w-4" />
                              {data.media.length} media items
                            </span>
                            <span className="font-semibold text-[#003B5C]">
                              {data.count} total
                            </span>
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTopics([topic])
                            setViewMode('all')
                            setShowFilters(true)
                          }}
                        >
                          Explore
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  )
}
