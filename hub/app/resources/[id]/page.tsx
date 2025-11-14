'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Download,
  Eye,
  Save,
  Share2,
  Tag,
  Calendar,
  Clock,
  FileText,
  File,
  Tool,
  Sparkles,
  Lightbulb,
  BookOpen,
  Users,
  Link as LinkIcon,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

interface ResourceDetail {
  id: string
  title: string
  content?: string
  htmlContent?: string
  extractedText?: string
  url: string
  filePath?: string
  type: string
  category?: string
  tags?: string[]
  metadata?: any
  links?: {
    parent?: string
    external?: string[]
    internal?: string[]
  }
  embeddings?: any[]
  recommendations?: any[]
  usage?: any
  relatedInsights?: any[]
  learningSuggestions?: any[]
  similarContent?: any[]
  createdAt?: string
  updatedAt?: string
}

export default function ResourceDetailPage() {
  const params = useParams()
  const resourceId = params.id as string

  const [resource, setResource] = useState<ResourceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (resourceId) {
      fetchResource()
    }
  }, [resourceId])

  const fetchResource = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/resources/${resourceId}`)
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Failed to load resource')
        return
      }

      setResource(data.resource)
    } catch (err: any) {
      setError('Failed to load resource')
      console.error('Error loading resource:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container className="py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading resource...</p>
          </div>
        </div>
      </Container>
    )
  }

  if (error || !resource) {
    return (
      <Container className="py-12">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Unable to Load Resource</h3>
                <p className="text-sm text-muted-foreground mb-4">{error || 'Resource not found'}</p>
                <Link href="/resources">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Library
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <File className="h-6 w-6" />
      case 'tool': return <Tool className="h-6 w-6" />
      default: return <FileText className="h-6 w-6" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'text-red-600 bg-red-50 border-red-200'
      case 'tool': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  return (
    <Container className="py-12">
      {/* Header */}
      <div className="mb-8">
        <Link href="/resources">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </Link>

        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-lg border ${getTypeColor(resource.type)}`}>
            {getTypeIcon(resource.type)}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{resource.title}</h1>
            {resource.metadata?.description && (
              <p className="text-lg text-muted-foreground mb-4">{resource.metadata.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mb-4">
              {resource.category && (
                <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {resource.category}
                </span>
              )}
              <span className="text-sm px-3 py-1 rounded-full bg-muted capitalize">
                {resource.type}
              </span>
              {resource.metadata?.smartToolNumber && (
                <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                  {resource.metadata.smartToolNumber}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                <Button>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </Button>
              </a>
              {resource.type === 'pdf' && resource.url && (
                <a href={resource.url} download>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content */}
          {resource.content && (
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{resource.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Insights */}
          {resource.relatedInsights && resource.relatedInsights.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-orange-500" />
                  <CardTitle>Related Facilitator Insights</CardTitle>
                </div>
                <CardDescription>
                  How this resource relates to facilitator feedback and needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resource.relatedInsights.map((insight, idx) => (
                    <Card key={idx} className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <Users className="h-4 w-4 text-primary mt-1" />
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-1">{insight.facilitator}</p>
                            <p className="text-sm text-muted-foreground mb-2">
                              {insight.type === 'platform_recommendation' && (
                                <>
                                  <span className="font-medium">Recommendation:</span> {insight.featureIdea}
                                </>
                              )}
                              {insight.type === 'addresses_challenge' && (
                                <>
                                  <span className="font-medium">Addresses:</span> {insight.challenge}
                                </>
                              )}
                              {insight.type === 'theme' && (
                                <>
                                  <span className="font-medium">Theme:</span> {insight.theme}
                                </>
                              )}
                            </p>
                            {insight.priority && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                insight.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                insight.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {insight.priority} Priority
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Learning Suggestions */}
          {resource.learningSuggestions && resource.learningSuggestions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  <CardTitle>LearnWorlds Content Suggestions</CardTitle>
                </div>
                <CardDescription>
                  Potential course content based on this resource
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resource.learningSuggestions.map((suggestion, idx) => (
                    <Card key={idx} className="bg-muted/30">
                      <CardContent className="pt-6">
                        <h3 className="font-semibold mb-2">{suggestion.courseTitle}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="text-xs px-2 py-1 rounded bg-background border">
                            {suggestion.format}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-background border">
                            {suggestion.targetAudience}
                          </span>
                        </div>
                        {suggestion.keyLearningOutcomes && suggestion.keyLearningOutcomes.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Key Outcomes:</p>
                            <ul className="space-y-1">
                              {suggestion.keyLearningOutcomes.slice(0, 3).map((outcome: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <Sparkles className="h-3 w-3 mt-1 flex-shrink-0 text-primary" />
                                  <span>{outcome}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resource.metadata?.wordCount && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{resource.metadata.readingTime || Math.ceil(resource.metadata.wordCount / 200)} min read ({resource.metadata.wordCount.toLocaleString()} words)</span>
                </div>
              )}
              {resource.metadata?.pageCount && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{resource.metadata.pageCount} pages</span>
                </div>
              )}
              {resource.updatedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Updated {new Date(resource.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
              {resource.metadata?.targetAudience && (
                <div>
                  <p className="text-sm font-medium mb-2">Target Audience:</p>
                  <div className="flex flex-wrap gap-2">
                    {resource.metadata.targetAudience.map((audience: string, idx: number) => (
                      <span key={idx} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                        {audience}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {resource.tags && resource.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {resource.tags.map((tag, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 rounded bg-muted">
                        <Tag className="h-3 w-3 inline mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Stats */}
          {resource.usage && (resource.usage.totalViews > 0 || resource.usage.totalDownloads > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Engagement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resource.usage.totalViews > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>Views</span>
                    </div>
                    <span className="font-semibold">{resource.usage.totalViews}</span>
                  </div>
                )}
                {resource.usage.totalDownloads > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span>Downloads</span>
                    </div>
                    <span className="font-semibold">{resource.usage.totalDownloads}</span>
                  </div>
                )}
                {resource.usage.totalSaves > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Save className="h-4 w-4 text-muted-foreground" />
                      <span>Saves</span>
                    </div>
                    <span className="font-semibold">{resource.usage.totalSaves}</span>
                  </div>
                )}
                {resource.usage.uniqueUsers > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Unique Users</span>
                    </div>
                    <span className="font-semibold">{resource.usage.uniqueUsers}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Similar Content */}
          {resource.similarContent && resource.similarContent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Similar Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resource.similarContent.map((similar) => (
                    <Link key={similar.id} href={`/resources/${similar.id}`}>
                      <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                        <p className="text-sm font-medium mb-1">{similar.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground capitalize">{similar.type}</span>
                          {similar.similarity && (
                            <span className="text-xs text-primary">
                              {Math.round(similar.similarity * 100)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links */}
          {resource.links && (resource.links.internal?.length || resource.links.external?.length) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resource.links.internal?.slice(0, 5).map((link, idx) => (
                    <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                        <LinkIcon className="h-3 w-3" />
                        <span className="truncate">{link}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Container>
  )
}
