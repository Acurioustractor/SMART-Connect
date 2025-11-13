import './globals.css'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MessageCircle, Wrench, Home, FileText, Video, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'SMART Connect Hub',
  description: 'AI-powered research and strategy tool for SMART Recovery facilitator community development',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <nav className="bg-[#003B5C] text-white shadow-lg sticky top-0 z-50" role="navigation" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <Link
                  href="/"
                  className="text-xl font-bold hover:text-[#00A5E0] transition-colors flex items-center gap-2"
                  aria-label="SMART Connect Home"
                >
                  <Home className="h-5 w-5" aria-hidden="true" />
                  <span>SMART Connect</span>
                </Link>
                <div className="hidden md:flex items-center gap-6">
                  <Link
                    href="/chat"
                    className="flex items-center gap-2 hover:text-[#00A5E0] transition-colors py-2 px-3 rounded-lg hover:bg-[#0066A1] min-h-[44px]"
                    aria-label="AI Chat"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    <span>AI Chat</span>
                  </Link>
                  <Link
                    href="/discovery"
                    className="flex items-center gap-2 hover:text-[#00A5E0] transition-colors py-2 px-3 rounded-lg hover:bg-[#0066A1] min-h-[44px]"
                    aria-label="Discovery"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>Discovery</span>
                  </Link>
                  <Link
                    href="/media"
                    className="flex items-center gap-2 hover:text-[#00A5E0] transition-colors py-2 px-3 rounded-lg hover:bg-[#0066A1] min-h-[44px]"
                    aria-label="Media Library"
                  >
                    <Video className="h-4 w-4" aria-hidden="true" />
                    <span>Media Library</span>
                  </Link>
                  <Link
                    href="/interviews"
                    className="flex items-center gap-2 hover:text-[#00A5E0] transition-colors py-2 px-3 rounded-lg hover:bg-[#0066A1] min-h-[44px]"
                    aria-label="Interviews"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    <span>Interviews</span>
                  </Link>
                  <Link
                    href="/tools"
                    className="flex items-center gap-2 hover:text-[#00A5E0] transition-colors py-2 px-3 rounded-lg hover:bg-[#0066A1] min-h-[44px]"
                    aria-label="Tools"
                  >
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                    <span>Tools</span>
                  </Link>
                </div>
              </div>
              <div className="text-sm text-gray-300 hidden sm:block">
                Facilitator Community Hub
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="bg-gray-900 text-white mt-auto" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-bold mb-4">SMART Connect</h3>
                <p className="text-gray-400 text-sm">
                  AI-powered research and strategy tool for SMART Recovery facilitator community development
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-4">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/chat" className="text-gray-400 hover:text-white transition-colors">AI Chat</Link></li>
                  <li><Link href="/discovery" className="text-gray-400 hover:text-white transition-colors">Discovery</Link></li>
                  <li><Link href="/media" className="text-gray-400 hover:text-white transition-colors">Media Library</Link></li>
                  <li><Link href="/interviews" className="text-gray-400 hover:text-white transition-colors">Interviews</Link></li>
                  <li><Link href="/tools" className="text-gray-400 hover:text-white transition-colors">Tools</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-4">About</h3>
                <p className="text-gray-400 text-sm">
                  Built to support SMART Recovery facilitators with evidence-based insights and AI-powered tools.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-400">
              <p>&copy; {new Date().getFullYear()} SMART Connect. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
