'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Copy, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export default function ContentGeneratorPage() {
  const [type, setType] = useState('forum-post')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const contentTypes = [
    { value: 'forum-post', label: 'Forum Post', description: 'Engaging discussion starter for facilitators' },
    { value: 'tool-summary', label: 'Tool Summary', description: 'Clear explanation of a SMART tool' },
    { value: 'content-ideas', label: 'Content Ideas', description: '10 ideas for community engagement' },
    { value: 'community-insight', label: 'Community Insights', description: 'Synthesized themes from interviews' }
  ]

  const handleGenerate = async () => {
    setLoading(true)
    setResult('')
    setCopied(false)

    try {
      const response = await fetch('/api/content-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setResult(data.content)
      setStats(data.knowledgeBase)
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Container size="xl" className="py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">AI Content Generator</h1>
          <p className="text-xl text-gray-600">
            Generate evidence-based content grounded in facilitator interviews and research
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Type</CardTitle>
                <CardDescription>Select what you want to generate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {contentTypes.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setType(ct.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      type === ct.value
                        ? 'border-[#00A5E0] bg-[#00A5E0]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{ct.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{ct.description}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Context (Optional)</CardTitle>
                <CardDescription>
                  Add specific details, topics, or focus areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A5E0] focus:border-transparent"
                  placeholder="E.g., Focus on burnout prevention, include Aboriginal cultural perspectives, emphasize online facilitation..."
                />
              </CardContent>
            </Card>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Content
                </>
              )}
            </Button>

            {stats && (
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-700 space-y-1">
                    <div className="font-semibold mb-2">Context Used:</div>
                    <div>📄 {stats.interviewsLoaded} facilitator interviews</div>
                    <div>🌐 {stats.scrapedPagesLoaded} website pages</div>
                    <div>🛠️ {stats.toolsLoaded} tools/resources</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Output Section */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Content</CardTitle>
                  {result && !result.startsWith('❌') && (
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Review and edit as needed before using
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Analyzing {stats?.interviewsLoaded || 0} interviews...</p>
                  </div>
                ) : result ? (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans bg-white p-6 rounded-lg border border-gray-200">
                      {result}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Select a content type and click Generate to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  )
}
