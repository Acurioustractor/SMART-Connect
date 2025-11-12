import Link from 'next/link'

export default function ToolsPage() {
  const tools = [
    {
      name: 'Content Generator',
      description: 'Generate evidence-based posts, emails, and resources grounded in research',
      icon: '✍️',
      status: 'Coming Soon',
      href: '/tools/content-generator'
    },
    {
      name: 'Interview Summarizer',
      description: 'Paste interview transcripts to generate structured summaries',
      icon: '📝',
      status: 'Coming Soon',
      href: '/tools/interview-summarizer'
    },
    {
      name: 'Cultural Safety Checker',
      description: 'Review content for cultural safety and inclusivity',
      icon: '🖤❤️💛',
      status: 'Coming Soon',
      href: '/tools/cultural-safety-checker'
    },
    {
      name: 'Research Pattern Detector',
      description: 'Find themes and patterns across facilitator interviews',
      icon: '🔍',
      status: 'Coming Soon',
      href: '/tools/pattern-detector'
    },
    {
      name: 'Content Scheduler',
      description: 'Get AI recommendations on what and when to post',
      icon: '📅',
      status: 'Coming Soon',
      href: '/tools/content-scheduler'
    },
    {
      name: 'Strategy Advisor',
      description: 'Develop engagement strategies based on facilitator needs',
      icon: '🎯',
      status: 'Coming Soon',
      href: '/tools/strategy-advisor'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">AI Tools</h1>
          <p className="text-xl text-gray-600">
            Specialized tools for content creation, research analysis, and strategy development
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
            >
              <div className="text-4xl mb-3">{tool.icon}</div>
              <h2 className="text-xl font-bold mb-2">{tool.name}</h2>
              <p className="text-gray-600 mb-4">{tool.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600 font-medium">
                  {tool.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 p-6 rounded-lg">
          <h3 className="font-bold mb-3">In the meantime...</h3>
          <p className="text-gray-700 mb-4">
            Use the <Link href="/chat" className="text-blue-600 hover:underline font-medium">AI Chat</Link> to:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Generate content by describing what you need</li>
            <li>✓ Ask questions about facilitator research</li>
            <li>✓ Get strategy recommendations</li>
            <li>✓ Review cultural safety considerations</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
