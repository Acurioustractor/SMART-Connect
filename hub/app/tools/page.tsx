import Link from 'next/link'
import { FileText, ClipboardList, Shield, Search, Calendar, Target, MessageCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export default function ToolsPage() {
  const tools = [
    {
      name: 'Content Generator',
      description: 'Generate evidence-based posts, emails, and resources grounded in research',
      icon: <FileText className="h-10 w-10" />,
      color: 'bg-[#003B5C]/10 text-[#003B5C]',
      status: 'Active',
      statusColor: 'bg-green-100 text-green-700',
      href: '/tools/content-generator'
    },
    {
      name: 'Interview Summarizer',
      description: 'Paste interview transcripts to generate structured summaries',
      icon: <ClipboardList className="h-10 w-10" />,
      color: 'bg-[#00A5E0]/10 text-[#00A5E0]',
      status: 'Coming Soon',
      statusColor: 'bg-[#FFD23F]/10 text-[#FFD23F]',
      href: '/tools/interview-summarizer'
    },
    {
      name: 'Cultural Safety Checker',
      description: 'Review content for cultural safety and inclusivity',
      icon: <Shield className="h-10 w-10" />,
      color: 'bg-[#FF6B35]/10 text-[#FF6B35]',
      status: 'Coming Soon',
      statusColor: 'bg-[#FFD23F]/10 text-[#FFD23F]',
      href: '/tools/cultural-safety-checker'
    },
    {
      name: 'Research Pattern Detector',
      description: 'Find themes and patterns across facilitator interviews',
      icon: <Search className="h-10 w-10" />,
      color: 'bg-[#06D6A0]/10 text-[#06D6A0]',
      status: 'Coming Soon',
      statusColor: 'bg-[#FFD23F]/10 text-[#FFD23F]',
      href: '/tools/pattern-detector'
    },
    {
      name: 'Content Scheduler',
      description: 'Get AI recommendations on what and when to post',
      icon: <Calendar className="h-10 w-10" />,
      color: 'bg-[#0066A1]/10 text-[#0066A1]',
      status: 'Coming Soon',
      statusColor: 'bg-[#FFD23F]/10 text-[#FFD23F]',
      href: '/tools/content-scheduler'
    },
    {
      name: 'Strategy Advisor',
      description: 'Develop engagement strategies based on facilitator needs',
      icon: <Target className="h-10 w-10" />,
      color: 'bg-[#003B5C]/10 text-[#003B5C]',
      status: 'Coming Soon',
      statusColor: 'bg-[#FFD23F]/10 text-[#FFD23F]',
      href: '/tools/strategy-advisor'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Container size="xl" className="py-12">
        {/* Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">AI Tools</h1>
          <p className="text-xl text-gray-600">
            Specialized tools for content creation, research analysis, and strategy development
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tools.map((tool) => (
            <Card key={tool.name} className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-4 rounded-lg ${tool.color}`}>
                    {tool.icon}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${tool.statusColor}`}>
                    {tool.status}
                  </span>
                </div>
                <CardTitle className="group-hover:text-[#003B5C] transition-colors">
                  {tool.name}
                </CardTitle>
                <CardDescription className="text-base">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                {tool.status === 'Active' ? (
                  <Link href={tool.href} className="w-full">
                    <Button variant="ghost" className="w-full group-hover:bg-gray-100">
                      Open Tool
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="ghost" className="w-full group-hover:bg-gray-100" disabled>
                    Learn More
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* CTA Card */}
        <Card className="bg-gradient-to-br from-[#003B5C] to-[#0066A1] text-white border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <CardHeader className="relative">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <MessageCircle className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-white text-2xl mb-3">
                  Use AI Chat in the Meantime
                </CardTitle>
                <CardDescription className="text-gray-200 text-base">
                  While these specialized tools are in development, our AI Chat can help you with all these tasks and more.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#06D6A0] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-gray-100">Generate content by describing what you need</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#06D6A0] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-gray-100">Ask questions about facilitator research</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#06D6A0] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-gray-100">Get strategy recommendations</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#06D6A0] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-gray-100">Review cultural safety considerations</span>
              </li>
            </ul>
            <Link href="/chat">
              <Button size="lg" variant="secondary" className="bg-white text-[#003B5C] hover:bg-gray-100">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Open AI Chat
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}
