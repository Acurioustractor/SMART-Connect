# SMART Connect Frontend Quick Start
## Get Your AI-Powered Hub Running in 1 Day

**Goal:** Launch a working frontend where your team can query the knowledge base and browse the wiki

---

## ⚡ Super Fast Path (< 4 hours)

### **Step 1: Create Next.js Project** (10 min)

```bash
# Create new Next.js app
npx create-next-app@latest smart-connect-hub

# Choose these options:
# ✓ TypeScript
# ✓ ESLint
# ✓ Tailwind CSS
# ✓ App Router
# ✓ No src/ directory
# ✓ Import alias: @/*

cd smart-connect-hub
```

### **Step 2: Install Dependencies** (5 min)

```bash
# UI components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react class-variance-authority clsx tailwind-merge

# AI & Backend
npm install openai ai
npm install @supabase/supabase-js

# Wiki (Nextra)
npm install nextra nextra-theme-docs

# Markdown
npm install gray-matter remark remark-html
```

### **Step 3: Set Up Environment Variables** (2 min)

Create `.env.local`:

```bash
# OpenAI (for AI chat)
OPENAI_API_KEY=sk-...your-key-here

# Optional: Anthropic Claude (alternative)
ANTHROPIC_API_KEY=sk-ant-...your-key-here

# Optional: Supabase (for user data, analytics)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get OpenAI API key: https://platform.openai.com/api-keys

###  **Step 4: Create Basic Chat Interface** (30 min)

Create `app/chat/page.tsx`:

```typescript
'use client'

import { useState } from 'react'

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages([...messages, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      const data = await response.json()
      setMessages([...messages, userMessage, data.message])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">SMART Connect AI</h1>
        <p className="text-gray-600">Ask anything about SMART facilitators</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg mb-4">💬 What can I help you with?</p>
            <div className="space-y-2">
              <button
                onClick={() => setInput('What did facilitators say about burnout?')}
                className="block mx-auto px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                What did facilitators say about burnout?
              </button>
              <button
                onClick={() => setInput('Generate a discussion post about cultural safety')}
                className="block mx-auto px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                Generate a discussion post about cultural safety
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className="bg-gray-100 p-4 rounded-lg mr-auto max-w-[80%]">
            <p className="text-gray-500">Thinking...</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask me anything..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
```

### **Step 5: Create API Route** (20 min)

Create `app/api/chat/route.ts`:

```typescript
import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Load master SLM prompt
const promptPath = path.join(process.cwd(), '../MASTER-SLM-PROMPT.md')
const SYSTEM_PROMPT = fs.readFileSync(promptPath, 'utf-8')

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    return NextResponse.json({
      message: {
        role: 'assistant',
        content: completion.choices[0].message.content,
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    )
  }
}
```

### **Step 6: Add Navigation** (15 min)

Create `app/layout.tsx`:

```typescript
import './globals.css'
import Link from 'next/link'

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
              <Link href="/wiki" className="hover:text-gray-300">
                📚 Wiki
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
```

### **Step 7: Create Homepage** (10 min)

Update `app/page.tsx`:

```typescript
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

        <div className="grid md:grid-cols-3 gap-6 mb-12">
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
            href="/wiki"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">📚</div>
            <h2 className="text-xl font-bold mb-2">Knowledge Base</h2>
            <p className="text-gray-600">
              Browse 24+ interviews, survey data, resources, and implementation plans
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
```

### **Step 8: Test Locally** (5 min)

```bash
npm run dev
```

Visit http://localhost:3000

**Test:**
- ✅ Homepage loads
- ✅ Navigate to /chat
- ✅ Ask a question ("What did facilitators say about burnout?")
- ✅ Get a response from AI

---

## 🚀 Deploy to Vercel (15 min)

### **Step 1: Push to GitHub**

```bash
git init
git add .
git commit -m "Initial SMART Connect Hub"
git branch -M main
git remote add origin https://github.com/your-org/smart-connect-hub.git
git push -u origin main
```

### **Step 2: Deploy to Vercel**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts - it will detect Next.js automatically
```

### **Step 3: Add Environment Variables**

In Vercel dashboard:
1. Go to Project Settings
2. Environment Variables
3. Add `OPENAI_API_KEY`
4. Redeploy

### **Step 4: Get Your URL**

Your app is now live at: `https://smart-connect-hub.vercel.app`

---

## 📚 Add Wiki (Nextra) - 30 min

### **Step 1: Configure Nextra**

Update `next.config.js`:

```javascript
const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

module.exports = withNextra()
```

### **Step 2: Create Theme Config**

Create `theme.config.tsx`:

```typescript
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <strong>SMART Connect Wiki</strong>,
  search: {
    placeholder: 'Search knowledge base...',
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
  },
  footer: {
    text: '© 2025 SMART Recovery Australia',
  },
}

export default config
```

### **Step 3: Create Wiki Pages**

```bash
mkdir -p pages/wiki
```

Create `pages/wiki/_meta.json`:

```json
{
  "index": "Welcome",
  "research": "Research & Insights",
  "content": "Content Library",
  "resources": "Resources",
  "cultural-safety": "🖤❤️💛 Cultural Safety"
}
```

Create `pages/wiki/index.mdx`:

```mdx
# SMART Connect Knowledge Base

Your comprehensive resource for SMART facilitator community development.

## What's Inside

- **[Research & Insights](/wiki/research)**: 24 facilitator interviews, survey data
- **[Content Library](/wiki/content)**: Ready-to-use posts, emails, templates
- **[Resources](/wiki/resources)**: Meeting scripts, tools, guides
- **[Cultural Safety](/wiki/cultural-safety)**: Protocols and frameworks

## Quick Actions

- [Ask AI about this content](/chat)
- [Generate content](/tools/content-generator)
- [Analyze research](/tools/pattern-detector)
```

### **Step 4: Import Knowledge Base Content**

Copy markdown files from your knowledge base:

```bash
# From SMART-Connect repo
cp -r knowledge-base/interviews pages/wiki/research/
cp -r knowledge-base/resources pages/wiki/resources/
# etc.
```

Or create a script (see WIKI-SETUP-GUIDE.md for full script).

---

## 🛠️ Add AI Tools (1-2 hours)

### **Interview Summarizer**

Create `app/tools/interview-summarizer/page.tsx`:

```typescript
'use client'

import { useState } from 'react'

export default function InterviewSummarizer() {
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const summarize = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/tools/summarize-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })

      const data = await response.json()
      setSummary(data.summary)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Interview Summarizer</h1>
      <p className="text-gray-600 mb-6">
        Paste interview transcript below to generate structured summary
      </p>

      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Paste interview transcript here..."
        className="w-full h-64 p-4 border rounded-lg mb-4"
      />

      <button
        onClick={summarize}
        disabled={loading || !transcript}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Summary'}
      </button>

      {summary && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Summary</h2>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap">{summary}</pre>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(summary)}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  )
}
```

Create API route `app/api/tools/summarize-interview/route.ts`:

```typescript
import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Load interview template
const templatePath = path.join(process.cwd(), '../templates/interview-template.md')
const TEMPLATE = fs.readFileSync(templatePath, 'utf-8')

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json()

    const prompt = `You are analyzing a SMART Recovery facilitator interview. Extract key information and format it using this template:

${TEMPLATE}

Interview transcript:
${transcript}

Generate a structured summary following the template above.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    })

    return NextResponse.json({
      summary: completion.choices[0].message.content,
    })
  } catch (error) {
    console.error('Summarize error:', error)
    return NextResponse.json(
      { error: 'Failed to summarize interview' },
      { status: 500 }
    )
  }
}
```

---

## 📱 Mobile Optimization

### **Tailwind Breakpoints**

```typescript
// Mobile-first responsive design
<div className="
  flex-col          // Mobile: stack vertically
  md:flex-row       // Desktop: side-by-side
  p-4               // Mobile: smaller padding
  md:p-8            // Desktop: larger padding
">
```

### **Test on Multiple Devices**

```bash
# Your local IP
ifconfig | grep inet

# Access from phone on same WiFi
# http://192.168.1.X:3000
```

---

## ✅ Launch Checklist

**Before sharing with team:**

- [ ] Chat interface works
- [ ] AI responds to questions
- [ ] Wiki is browseable
- [ ] Mobile-friendly
- [ ] Deployed to Vercel
- [ ] Custom domain (optional)
- [ ] Environment variables set
- [ ] Team can access

---

## 🎯 What You Now Have

✅ **AI Chat Interface**: Query knowledge base in natural language
✅ **Wiki**: Searchable docs (GitBook-style)
✅ **Deployed**: Live on Vercel with custom domain
✅ **Mobile-friendly**: Works on phone
✅ **Scalable**: Easy to add more tools and features

**Total time:** 4-6 hours from zero to deployed! 🚀

---

## 📈 Next Steps (Week 2+)

**Add more AI tools:**
- Content Generator
- Cultural Safety Checker
- Research Pattern Detector
- Content Scheduler

**Enhance chat:**
- Citations (link to source interviews)
- Conversation history
- Export conversations
- Share conversations with team

**Improve wiki:**
- Import all knowledge base content
- Add search analytics
- Related content suggestions
- Edit directly from UI

**Team features:**
- Google OAuth login
- User roles (admin vs viewer)
- Usage analytics
- Saved queries/templates

---

## 💰 Cost Breakdown

**Month 1:**
- Vercel hosting: $0 (free tier)
- OpenAI API: ~$50-100 (team usage)
- Domain: $12/year
- **Total: ~$50-100/month**

**Scaling up:**
- Vercel Pro: $20/month (if needed)
- OpenAI API: $200-500/month (higher usage)
- Pinecone vector DB: $70/month (better search)
- **Total: ~$300-600/month**

---

## 🆘 Troubleshooting

**Chat not working:**
- Check `OPENAI_API_KEY` in `.env.local`
- Ensure API route is at `app/api/chat/route.ts`
- Check browser console for errors

**Wiki not showing:**
- Verify Nextra is installed: `npm list nextra`
- Check `pages/wiki/` folder exists
- Ensure `_meta.json` files are valid JSON

**Deploy failed:**
- Check Vercel logs in dashboard
- Ensure all dependencies in `package.json`
- Add environment variables in Vercel dashboard

**Mobile issues:**
- Test responsive breakpoints
- Check viewport meta tag in layout
- Use Chrome DevTools mobile simulator

---

## 📞 Get Help

**Resources:**
- Next.js docs: https://nextjs.org/docs
- Nextra docs: https://nextra.site
- OpenAI API docs: https://platform.openai.com/docs
- Vercel docs: https://vercel.com/docs

**Community:**
- Next.js Discord: https://discord.gg/nextjs
- Vercel Discord: https://vercel.com/discord

---

**Ready to build?** Follow the steps above and you'll have a working frontend in hours, not weeks! 🚀

**Questions?** Review SMART-CONNECT-FRONTEND-ARCHITECTURE.md for detailed technical specs.
