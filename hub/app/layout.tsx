import './globals.css'
import Link from 'next/link'
import type { Metadata } from 'next'

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
      <body>
        <nav className="bg-[#003B5C] text-white p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold">
                SMART Connect
              </Link>
              <Link href="/chat" className="hover:text-gray-300">
                💬 AI Chat
              </Link>
              <Link href="/tools" className="hover:text-gray-300">
                🛠️ Tools
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
