'use client'

import { useState } from 'react'
import { Search, Download, FileText, Loader2, Globe, Brain, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ScrapedContent {
  id: string
  url: string
  title: string
  type: 'page' | 'pdf' | 'document'
  content: string
  scrapedAt: string
  wordCount: number
  category?: string
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

interface PDFResource {
  id: string
  title: string
  url: string
  description: string
  category: string
  downloadedAt?: string
  pageCount?: number
}

export default function SmartSiteToolsPage() {
  const [loading, setLoading] = useState(false)
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'scraping' | 'completed' | 'error'>('idle')
  const [scrapedContent, setScrapedContent] = useState<ScrapedContent[]>([])
  const [pdfResources, setPdfResources] = useState<PDFResource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showInsights, setShowInsights] = useState(false)

  const loadFromDatabase = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/smart-site/library?includeInsights=${showInsights}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load from database')
      }

      setScrapedContent(data.resources.filter((r: any) => r.type !== 'pdf'))
      setPdfResources(data.resources.filter((r: any) => r.type === 'pdf'))
      setScrapeStatus('completed')
    } catch (err: any) {
      setError(err.message || 'Failed to load from database')
      setScrapeStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const startFullSiteScrape = async () => {
    setLoading(true)
    setScrapeStatus('scraping')
    setError(null)

    try {
      const response = await fetch('/api/smart-site/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://smartrecoveryaustralia.com.au',
          scrapeType: 'full-site',
          includePDFs: true
        })
      })

      if (!response.ok) {
        throw new Error('Scraping failed')
      }

      const data = await response.json()
      setScrapedContent(data.pages || [])
      setPdfResources(data.pdfs || [])
      setScrapeStatus('completed')
    } catch (err: any) {
      setError(err.message || 'Failed to scrape site')
      setScrapeStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const analyzeContent = async (contentId: string) => {
    setAnalyzing(contentId)

    try {
      const response = await fetch('/api/smart-site/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId })
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const data = await response.json()

      setScrapedContent(prev =>
        prev.map(item =>
          item.id === contentId
            ? { ...item, analysis: data.analysis }
            : item
        )
      )
    } catch (err: any) {
      setError(err.message || 'Failed to analyze content')
    } finally {
      setAnalyzing(null)
    }
  }

  const filteredContent = scrapedContent.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Container size="xl" className="py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Globe className="h-10 w-10 text-[#003B5C]" />
            <h1 className="text-4xl font-bold text-gray-900">SMART Site & Tools</h1>
          </div>
          <p className="text-xl text-gray-600">
            Scrape, analyze, and explore all content from smartrecoveryaustralia.com.au with world-class AI analysis
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#003B5C] to-[#00527A] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Load Database
              </CardTitle>
              <CardDescription className="text-gray-300">
                Load all scraped content from database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={loadFromDatabase}
                disabled={loading}
                className="w-full bg-white text-[#003B5C] hover:bg-gray-100 mb-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Load Content
                  </>
                )}
              </Button>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInsights}
                  onChange={(e) => setShowInsights(e.target.checked)}
                  className="rounded"
                />
                Include interview insights
              </label>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#00A5E0] to-[#0090C8] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Full Site Scrape
              </CardTitle>
              <CardDescription className="text-gray-300">
                Scrape entire SMART Recovery Australia website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={startFullSiteScrape}
                disabled={loading}
                className="w-full bg-white text-[#00A5E0] hover:bg-gray-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#00A5E0]" />
                PDF Resources
              </CardTitle>
              <CardDescription>
                {pdfResources.length} PDFs discovered and extracted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#003B5C]">
                {pdfResources.length}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                All PDFs available for viewing and analysis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#06D6A0]" />
                AI Analysis
              </CardTitle>
              <CardDescription>
                World-class content analysis and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#003B5C]">
                {scrapedContent.filter(c => c.analysis).length}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Pages analyzed with AI
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Banner */}
        {scrapeStatus !== 'idle' && (
          <Card className={`mb-8 ${
            scrapeStatus === 'completed' ? 'border-green-200 bg-green-50' :
            scrapeStatus === 'error' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }`}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                {scrapeStatus === 'scraping' && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                {scrapeStatus === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                {scrapeStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                <div>
                  <p className="font-semibold">
                    {scrapeStatus === 'scraping' && 'Scraping SMART Recovery Australia website...'}
                    {scrapeStatus === 'completed' && `Successfully scraped ${scrapedContent.length} pages and ${pdfResources.length} PDFs`}
                    {scrapeStatus === 'error' && `Error: ${error}`}
                  </p>
                  {scrapeStatus === 'scraping' && (
                    <p className="text-sm text-gray-600 mt-1">
                      This may take a few minutes. We're extracting all content and PDFs for analysis.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Bar */}
        {scrapedContent.length > 0 && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search scraped content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 text-base"
                />
              </div>
              {searchQuery && (
                <p className="mt-3 text-sm text-gray-600">
                  Showing {filteredContent.length} of {scrapedContent.length} results
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* PDF Resources Section */}
        {pdfResources.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#00A5E0]" />
              PDF Resources ({pdfResources.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdfResources.map((pdf) => (
                <Card key={pdf.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base flex items-start gap-2">
                      <FileText className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{pdf.title}</span>
                    </CardTitle>
                    {pdf.category && (
                      <div className="mt-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {pdf.category}
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {pdf.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pdf.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(pdf.url, '_blank')}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {/* TODO: View PDF */}}
                        className="flex-1"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Scraped Content */}
        {filteredContent.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-6 w-6 text-[#003B5C]" />
              Scraped Pages ({filteredContent.length})
            </h2>
            <div className="space-y-4">
              {filteredContent.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription className="mt-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {item.url}
                          </a>
                        </CardDescription>
                        <div className="flex gap-3 mt-2 text-sm text-gray-600">
                          <span>{item.wordCount.toLocaleString()} words</span>
                          <span>•</span>
                          <span>{new Date(item.scrapedAt).toLocaleDateString()}</span>
                        </div>
                        {item.category && (
                          <div className="mt-2">
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {item.category}
                            </span>
                          </div>
                        )}
                        {item.interviewInsights && item.interviewInsights.length > 0 && (
                          <div className="mt-2">
                            <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                              {item.interviewInsights.length} facilitator insight{item.interviewInsights.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => analyzeContent(item.id)}
                        disabled={analyzing === item.id || !!item.analysis}
                      >
                        {analyzing === item.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Analyzing...
                          </>
                        ) : item.analysis ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Analyzed
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {(item.analysis || item.interviewInsights) && (
                    <CardContent className="border-t bg-gray-50">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-900 mb-1">AI Summary</h4>
                          <p className="text-sm text-gray-700">{item.analysis.summary}</p>
                        </div>
                        {item.analysis.keyTopics.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900 mb-2">Key Topics</h4>
                            <div className="flex flex-wrap gap-2">
                              {item.analysis.keyTopics.map((topic, idx) => (
                                <span
                                  key={idx}
                                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">Content Type: <span className="font-medium">{item.analysis.contentType}</span></span>
                          {item.analysis.relevantForFacilitators && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              ✓ Relevant for Facilitators
                            </span>
                          )}
                        </div>
                      </div>
                      {item.interviewInsights && item.interviewInsights.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-orange-500" />
                            Connected to Facilitator Insights ({item.interviewInsights.length})
                          </h4>
                          <div className="space-y-2">
                            {item.interviewInsights.slice(0, 3).map((insight, idx) => (
                              <div key={idx} className="text-sm bg-white rounded p-2 border">
                                <span className="font-medium text-gray-900">{insight.facilitator}:</span>{' '}
                                {insight.type === 'addresses_challenge' && insight.challenge}
                                {insight.type === 'theme' && `Theme: ${insight.theme}`}
                                {insight.type === 'platform_need' && (
                                  <>
                                    {insight.featureIdea}
                                    {insight.priority && (
                                      <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                        insight.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                        insight.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-100 text-blue-700'
                                      }`}>
                                        {insight.priority}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                            {item.interviewInsights.length > 3 && (
                              <p className="text-xs text-gray-500">
                                +{item.interviewInsights.length - 3} more insights
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {scrapedContent.length === 0 && scrapeStatus === 'idle' && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No content scraped yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Click "Start Scraping" above to begin extracting all content and PDFs from the SMART Recovery Australia website for analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </Container>
    </div>
  )
}
