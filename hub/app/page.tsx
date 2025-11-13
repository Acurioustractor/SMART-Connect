import Link from 'next/link'
import { MessageCircle, Wrench, CheckCircle2, Sparkles, Users, Shield, Globe, FileText, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      {/* Hero Section */}
      <section className="py-16 sm:py-24">
        <Container size="lg">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#003B5C]/10 text-[#003B5C] px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>AI-Powered Facilitator Support</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-gray-900 leading-tight">
              Welcome to <span className="text-[#003B5C]">SMART Connect Hub</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed">
              AI-powered research and strategy tool for facilitator community development
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/chat">
                <Button size="lg" variant="primary" className="w-full sm:w-auto">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Start AI Chat
                </Button>
              </Link>
              <Link href="/tools">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <Wrench className="h-5 w-5" aria-hidden="true" />
                  Explore Tools
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Feature Cards */}
      <section className="py-12">
        <Container size="lg">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Link href="/chat" className="block group">
              <Card className="h-full hover:shadow-xl transition-all duration-300 group-hover:border-[#00A5E0]">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-[#003B5C]/10 rounded-lg mb-4">
                      <MessageCircle className="h-8 w-8 text-[#003B5C]" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-medium text-[#06D6A0] bg-[#06D6A0]/10 px-3 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  <CardTitle>AI Chat</CardTitle>
                  <CardDescription>
                    Ask questions about facilitator research, generate evidence-based content, and develop strategies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Query 24+ facilitator interviews</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Generate research-backed content</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Get strategic recommendations</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link href="/discovery" className="block group">
              <Card className="h-full hover:shadow-xl transition-all duration-300 group-hover:border-[#00A5E0]">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-[#00A5E0]/10 rounded-lg mb-4">
                      <Search className="h-8 w-8 text-[#00A5E0]" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-medium text-[#06D6A0] bg-[#06D6A0]/10 px-3 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  <CardTitle>Content Discovery</CardTitle>
                  <CardDescription>
                    Search across all interviews, media, and tools with advanced filtering and topic rollups
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Unified search across all content</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Advanced filtering by topic & type</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Topic rollup views</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link href="/tools" className="block group">
              <Card className="h-full hover:shadow-xl transition-all duration-300 group-hover:border-[#00A5E0]">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-[#00A5E0]/10 rounded-lg mb-4">
                      <Wrench className="h-8 w-8 text-[#00A5E0]" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-medium text-[#FFD23F] bg-[#FFD23F]/10 px-3 py-1 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <CardTitle>AI Tools</CardTitle>
                  <CardDescription>
                    Specialized tools for content creation, research analysis, and cultural safety
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Interview summarizer</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Content generator</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Cultural safety checker</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link href="/smart-site-tools" className="block group">
              <Card className="h-full hover:shadow-xl transition-all duration-300 group-hover:border-[#06D6A0] bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-[#06D6A0]/20 rounded-lg mb-4">
                      <Globe className="h-8 w-8 text-[#06D6A0]" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-medium text-[#06D6A0] bg-white px-3 py-1 rounded-full border border-[#06D6A0]">
                      New!
                    </span>
                  </div>
                  <CardTitle>SMART Site & Tools</CardTitle>
                  <CardDescription>
                    Scrape and analyze all content from smartrecoveryaustralia.com.au
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Extract all PDFs & documents</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>Full site content scraping</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#06D6A0]" aria-hidden="true" />
                      <span>AI-powered content analysis</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Value Props */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="inline-flex p-4 bg-[#003B5C]/10 rounded-full mb-4">
                <Users className="h-8 w-8 text-[#003B5C]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold mb-2">Community-Driven</h3>
              <p className="text-gray-600 text-sm">
                Built from insights of 219+ SMART Recovery facilitators
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex p-4 bg-[#00A5E0]/10 rounded-full mb-4">
                <Shield className="h-8 w-8 text-[#00A5E0]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold mb-2">Culturally Safe</h3>
              <p className="text-gray-600 text-sm">
                Designed with cultural safety and inclusivity at the core
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex p-4 bg-[#06D6A0]/10 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-[#06D6A0]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold mb-2">Evidence-Based</h3>
              <p className="text-gray-600 text-sm">
                All recommendations grounded in facilitator research
              </p>
            </div>
          </div>

          {/* Quick Start Card */}
          <Card className="bg-gradient-to-br from-[#003B5C] to-[#0066A1] text-white border-0">
            <CardHeader>
              <CardTitle className="text-white">Get Started in 3 Steps</CardTitle>
              <CardDescription className="text-gray-200">
                Everything you need to start using SMART Connect Hub
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <h4 className="font-semibold mb-1">Open AI Chat</h4>
                    <p className="text-sm text-gray-200">Start a conversation with our AI assistant</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <h4 className="font-semibold mb-1">Ask Your Question</h4>
                    <p className="text-sm text-gray-200">Query facilitator research or request content generation</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <h4 className="font-semibold mb-1">Get Results</h4>
                    <p className="text-sm text-gray-200">Receive evidence-based insights and recommendations</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </Container>
      </section>
    </div>
  )
}
