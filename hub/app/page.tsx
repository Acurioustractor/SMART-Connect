import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold mb-4 text-center">
          Welcome to SMART Connect Hub
        </h1>
        <p className="text-xl text-gray-600 text-center mb-12">
          AI-powered research and strategy tool for facilitator community development
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/chat"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">💬</div>
            <h2 className="text-xl font-bold mb-2">AI Chat</h2>
            <p className="text-gray-600">
              Ask questions about facilitator research, generate content, develop strategy
            </p>
          </Link>

          <Link
            href="/tools"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">🛠️</div>
            <h2 className="text-xl font-bold mb-2">AI Tools</h2>
            <p className="text-gray-600">
              Interview summarizer, content generator, cultural safety checker
            </p>
          </Link>
        </div>

        <div className="bg-blue-100 p-6 rounded-lg">
          <h3 className="font-bold mb-2">Quick Start</h3>
          <ul className="space-y-2 text-sm">
            <li>✓ Query 24 facilitator interviews instantly</li>
            <li>✓ Generate content grounded in research</li>
            <li>✓ Develop strategies based on evidence</li>
            <li>✓ Review cultural safety protocols</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
