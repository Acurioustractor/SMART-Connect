# SMART Connect Wiki Setup Guide
## GitBook-Style Documentation for Team Knowledge Base

**Purpose:** Create beautiful, searchable documentation from your knowledge base

---

## 🎯 Three Options (Choose One)

### **Option 1: Nextra (Recommended for MVP)** ⭐

**Pros:**
- ✅ Free and open source
- ✅ Beautiful, modern design
- ✅ Same tech stack as main app (Next.js)
- ✅ Full control and customization
- ✅ Deploy anywhere (Vercel, Netlify)
- ✅ Integrated with main frontend

**Cons:**
- ❌ Need to host yourself (easy with Vercel)
- ❌ Less features than GitBook Cloud

**Best for:** Starting fast, full control, integrated solution

---

### **Option 2: GitBook Cloud**

**Pros:**
- ✅ Most polished, professional look
- ✅ Zero setup (fully managed)
- ✅ Advanced features (insights, collaboration)
- ✅ WYSIWYG editor (non-technical team can edit)
- ✅ Built-in search and analytics

**Cons:**
- ❌ $99/month for team plan
- ❌ Less customization
- ❌ Separate from main app

**Best for:** Budget available, want premium experience

---

### **Option 3: Docusaurus**

**Pros:**
- ✅ Free and open source
- ✅ Battle-tested (used by Facebook, Meta)
- ✅ Excellent docs features
- ✅ Strong community

**Cons:**
- ❌ Different tech stack (React but not Next.js)
- ❌ Setup more complex than Nextra
- ❌ Separate from main app

**Best for:** Need advanced docs features, okay with separate app

---

## 🚀 Quick Start: Nextra Setup (Recommended)

### **Step 1: Install Nextra**

```bash
# In your smart-connect-frontend project
npm install nextra nextra-theme-docs
```

### **Step 2: Configure Next.js**

Create/update `next.config.js`:

```javascript
const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
  latex: true,
})

module.exports = withNextra()
```

### **Step 3: Create Theme Config**

Create `theme.config.tsx`:

```typescript
import { useRouter } from 'next/router'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span><strong>SMART Connect</strong> Knowledge Base</span>,
  project: {
    link: 'https://github.com/your-org/SMART-Connect',
  },
  docsRepositoryBase: 'https://github.com/your-org/SMART-Connect/tree/main',
  useNextSeo: true,
  search: {
    placeholder: 'Search knowledge base...',
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    title: 'On This Page',
    backToTop: true,
  },
  editLink: {
    text: 'Edit this page on GitHub →',
  },
  feedback: {
    content: 'Question? Give us feedback →',
    labels: 'feedback',
  },
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} ©{' '}
        <a href="https://smartrecovery.org.au" target="_blank">
          SMART Recovery Australia
        </a>
      </span>
    ),
  },
  faviconGlyph: '🧠',
}

export default config
```

### **Step 4: Create Wiki Structure**

```bash
mkdir -p pages/wiki
cd pages/wiki
```

Create `_meta.json` (defines sidebar structure):

```json
{
  "index": "Welcome",
  "getting-started": "Getting Started",
  "research": "Research & Insights",
  "content": "Content Library",
  "resources": "Resources for Facilitators",
  "community": "Community Building",
  "cultural-safety": "🖤❤️💛 Cultural Safety",
  "ai-tools": "🤖 AI & Tools"
}
```

### **Step 5: Create Pages**

Create `pages/wiki/index.mdx`:

```mdx
# Welcome to SMART Connect Knowledge Base

Your comprehensive resource for SMART Recovery facilitator community development.

## What's Inside

<Cards>
  <Card title="Research & Insights" href="/wiki/research">
    24 facilitator interviews, survey data, strategic documents
  </Card>
  <Card title="Content Library" href="/wiki/content">
    Ready-to-use posts, emails, and templates
  </Card>
  <Card title="Resources" href="/wiki/resources">
    Meeting scripts, tools, and facilitator support materials
  </Card>
  <Card title="Cultural Safety" href="/wiki/cultural-safety">
    Protocols for Aboriginal & Torres Strait Islander facilitators
  </Card>
</Cards>

## Quick Actions

- [Ask AI about this content](/chat)
- [Generate content](/tools/content-generator)
- [Analyze research](/tools/pattern-detector)

---

**New here?** Start with [Getting Started](/wiki/getting-started)
```

---

## 📁 Wiki Content Structure

```
pages/wiki/
│
├── index.mdx                           # Homepage
├── _meta.json                          # Sidebar config
│
├── getting-started/
│   ├── _meta.json
│   ├── welcome.mdx
│   ├── how-to-use-wiki.mdx
│   └── quick-start.mdx
│
├── research/
│   ├── _meta.json
│   ├── facilitator-interviews.mdx
│   │   ├── by-meeting-type.mdx
│   │   ├── by-theme.mdx
│   │   └── key-quotes.mdx
│   ├── survey-data.mdx
│   └── strategic-documents.mdx
│
├── content/
│   ├── _meta.json
│   ├── week-1-launch.mdx
│   ├── month-1-calendar.mdx
│   ├── discussion-templates.mdx
│   ├── email-templates.mdx
│   └── facilitator-spotlight.mdx
│
├── resources/
│   ├── _meta.json
│   ├── meeting-scripts.mdx
│   ├── facilitation-tools.mdx
│   ├── self-care.mdx
│   └── cultural-safety-protocols.mdx
│
├── community/
│   ├── _meta.json
│   ├── implementation-plan.mdx
│   ├── community-champions.mdx
│   ├── communities-of-practice.mdx
│   └── engagement-strategies.mdx
│
├── cultural-safety/
│   ├── _meta.json
│   ├── framework.mdx
│   ├── mob-yarning-space.mdx
│   ├── danielle-caruana-interview.mdx
│   └── resources-for-non-indigenous.mdx
│
└── ai-tools/
    ├── _meta.json
    ├── how-to-use.mdx
    ├── tool-suite.mdx
    ├── adding-content.mdx
    └── technical-docs.mdx
```

---

## 🎨 Customize Wiki Appearance

### **Brand Colors**

Edit `styles/globals.css`:

```css
:root {
  --smart-blue: #003B5C;
  --smart-orange: #FF6B35;
  --smart-gray: #64748B;
}

/* Override Nextra theme */
.nextra-nav-container {
  background: var(--smart-blue);
}

.nextra-link {
  color: var(--smart-orange);
}
```

### **Custom Components**

Create `components/wiki/AskAI.tsx`:

```typescript
export function AskAI({ page }: { page: string }) {
  return (
    <div className="border-2 border-orange-500 p-4 rounded-lg my-6">
      <h3 className="font-bold mb-2">🤖 Ask AI about this page</h3>
      <p className="text-sm mb-3">
        Get instant answers about {page} from our knowledge base
      </p>
      <button className="bg-orange-500 text-white px-4 py-2 rounded">
        Open AI Chat
      </button>
    </div>
  )
}
```

Use in any MDX page:

```mdx
import { AskAI } from '@/components/wiki/AskAI'

# Facilitator Interviews

Content here...

<AskAI page="facilitator interviews" />
```

---

## 🔍 Add Full-Text Search

### **Option 1: Built-in Nextra Search (Simple)**

Already included! Uses FlexSearch for fast client-side search.

### **Option 2: Algolia (Advanced)**

**Step 1:** Sign up at algolia.com (free for docs)

**Step 2:** Configure in `theme.config.tsx`:

```typescript
search: {
  component: <AlgoliaSearch
    appId="YOUR_APP_ID"
    apiKey="YOUR_SEARCH_KEY"
    indexName="smart-connect-wiki"
  />,
}
```

**Step 3:** Install Algolia DocSearch:

```bash
npm install @docsearch/react
```

---

## 📊 Add Analytics

### **Google Analytics**

In `theme.config.tsx`:

```typescript
head: (
  <>
    <script
      async
      src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
    />
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-XXXXXXXXXX');
        `,
      }}
    />
  </>
)
```

### **Track Popular Pages**

Simple solution using Vercel Analytics:

```bash
npm install @vercel/analytics
```

Add to `_app.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

---

## 🚀 Deploy Wiki

### **Deploy to Vercel (Free)**

```bash
# Connect to GitHub
vercel login
vercel

# Follow prompts:
# - Link to existing project? Yes
# - What's the name? smart-connect-wiki
# - Build command? next build
# - Output directory? .next

# Done! Your wiki is live at:
# https://smart-connect-wiki.vercel.app
```

### **Custom Domain**

```bash
vercel domains add wiki.smartconnect.org.au
```

Follow DNS instructions to point domain.

---

## 📱 Mobile Optimization

Nextra is mobile-friendly by default, but test:

**Checklist:**
- [ ] Sidebar collapses on mobile
- [ ] Search works on touch devices
- [ ] Tables scroll horizontally on mobile
- [ ] Code blocks don't overflow
- [ ] Images are responsive
- [ ] Touch targets are 44px minimum

---

## 🔐 Private Wiki (Team-Only Access)

### **Option 1: Vercel Auth**

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/wiki/:path*',
}
```

### **Option 2: Basic Auth (Simple)**

```typescript
// Use Vercel password protection (easiest)
// Dashboard > Project > Settings > Environment Variables
// Add PASSWORD_PROTECTION=true
```

### **Option 3: Google OAuth (Team)**

```bash
npm install next-auth
```

Configure with team Google Workspace accounts only.

---

## 📝 Content Editing Workflow

### **For Technical Team:**

1. **Edit locally:**
   ```bash
   # Edit MDX files
   code pages/wiki/research/facilitator-interviews.mdx
   ```

2. **Preview changes:**
   ```bash
   npm run dev
   # Visit http://localhost:3000/wiki
   ```

3. **Commit to git:**
   ```bash
   git add pages/wiki/
   git commit -m "Update facilitator interview page"
   git push
   ```

4. **Auto-deploy:**
   Vercel deploys automatically on push to main.

---

### **For Non-Technical Team:**

**Option 1: GitHub Web Editor**
1. Go to GitHub repo
2. Navigate to `pages/wiki/`
3. Click file → Edit (pencil icon)
4. Make changes in browser
5. Commit (save) → Auto-deploys

**Option 2: Prose.io (WYSIWYG)**
1. Go to prose.io
2. Authorize with GitHub
3. Select SMART-Connect repo
4. Edit pages with rich text editor
5. Save → Auto-deploys

**Option 3: Admin Panel (Future)**
Build a simple CMS interface in main app for editing wiki pages.

---

## 🔗 Integration with Main App

### **"Ask AI" Button on Every Page**

Add to `theme.config.tsx`:

```typescript
navbar: {
  extraContent: (
    <button
      onClick={() => window.open('/chat?context=current-page', '_blank')}
      className="bg-orange-500 text-white px-3 py-1 rounded"
    >
      🤖 Ask AI
    </button>
  ),
}
```

### **Related Content Suggestions**

Create `components/wiki/RelatedContent.tsx`:

```typescript
export function RelatedContent({ current }: { current: string }) {
  const related = getRelatedPages(current) // AI-powered suggestions

  return (
    <div className="my-8 p-4 bg-gray-50 rounded">
      <h3 className="font-bold mb-3">Related Content</h3>
      <ul className="space-y-2">
        {related.map(page => (
          <li key={page.slug}>
            <a href={page.slug}>{page.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 📦 Import Existing Content

### **Script to Convert Knowledge Base to Wiki**

Create `scripts/import-knowledge-base.js`:

```javascript
const fs = require('fs')
const path = require('path')

// Read knowledge-base/ directory
const kbPath = '../knowledge-base'
const wikiPath = './pages/wiki'

// Map folders to wiki structure
const mapping = {
  'interviews': 'research/interviews',
  'research-reports': 'research/reports',
  'strategic-documents': 'research/strategic',
  'resources': 'resources',
  // etc.
}

// Copy files and add frontmatter
function importFiles(source, dest) {
  const files = fs.readdirSync(source)

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(source, file), 'utf8')

      // Add frontmatter for Nextra
      const withFrontmatter = `---
title: ${getTitle(file)}
description: Auto-imported from knowledge base
---

${content}
`

      // Write to wiki location
      fs.writeFileSync(
        path.join(dest, file.replace('.md', '.mdx')),
        withFrontmatter
      )
    }
  })
}

// Run import
Object.keys(mapping).forEach(source => {
  importFiles(
    path.join(kbPath, source),
    path.join(wikiPath, mapping[source])
  )
})

console.log('✅ Knowledge base imported to wiki!')
```

Run:
```bash
node scripts/import-knowledge-base.js
```

---

## 🎯 Wiki Features Checklist

**MVP (Week 1):**
- [ ] Basic Nextra setup
- [ ] Homepage with navigation
- [ ] 5-10 key pages imported
- [ ] Search working
- [ ] Mobile-friendly
- [ ] Deployed to Vercel

**Phase 2 (Month 1):**
- [ ] All knowledge base content imported
- [ ] Custom styling (SMART brand)
- [ ] "Ask AI" button on every page
- [ ] Related content suggestions
- [ ] Analytics tracking
- [ ] Team-only auth (if needed)

**Phase 3 (Month 2+):**
- [ ] Admin panel for editing
- [ ] AI-powered search (semantic)
- [ ] Automatic content updates from KB
- [ ] Version history visible
- [ ] Multi-language support (future)

---

## 💰 Cost Comparison

| Option | Setup Time | Monthly Cost | Customization | Hosting |
|--------|-----------|--------------|---------------|---------|
| **Nextra** | 1 day | $0 (Vercel free) | High | Self |
| **GitBook** | 1 hour | $99 | Medium | Managed |
| **Docusaurus** | 2 days | $0 (hosting) | High | Self |

**Recommendation:** Start with **Nextra** (free, fast, integrated). Migrate to **GitBook** later if budget allows and you want managed solution.

---

## 📚 Example Wiki Pages

### **Example: Facilitator Interview Index Page**

`pages/wiki/research/facilitator-interviews.mdx`:

```mdx
---
title: Facilitator Interviews
description: 24 interviews with SMART Recovery facilitators
---

import { AskAI } from '@/components/wiki/AskAI'
import { Callout } from 'nextra-theme-docs'

# Facilitator Interviews

24 interviews with SMART Recovery facilitators across diverse meeting types, regions, and demographics.

<Callout type="info">
  **Total Interviews:** 24 | **Date Range:** 2024-2025
</Callout>

## By Meeting Type

### General Meetings
- [Alison Beck](/wiki/research/interviews/alison-beck)
- [Brad Gunders](/wiki/research/interviews/brad-gunders)
- [Diego Gonzalez](/wiki/research/interviews/diego-gonzalez)

### Family & Friends
- [Mark Powell](/wiki/research/interviews/mark-powell) ⭐
  > "I save quite a few [webinar recordings] and never get around to them."

### LGBTQIA+
- [Ambika Scott Jodrell](/wiki/research/interviews/ambika-scott-jodrell)
  > Concerns about gamification feeling inauthentic

### Aboriginal & Torres Strait Islander 🖤❤️💛
- [Danielle Caruana](/wiki/research/interviews/danielle-caruana) 🔒 **KEY**
  > "If it's culturally safe, that's the main thing for me."

## Key Themes

<Cards>
  <Card title="Isolation" href="/wiki/research/themes/isolation">
    Facilitators feel they operate in "own little world"
  </Card>
  <Card title="Time Constraints" href="/wiki/research/themes/time">
    Time-poor volunteers need asynchronous engagement
  </Card>
  <Card title="Cultural Safety" href="/wiki/cultural-safety">
    Non-negotiable for Aboriginal facilitators
  </Card>
</Cards>

<AskAI page="facilitator interviews" />

---

**Next:** [Survey Data](/wiki/research/survey-data) | [Strategic Documents](/wiki/research/strategic)
```

---

## ✅ Quick Start Checklist

**To launch wiki in 1 day:**

1. [ ] Install Nextra: `npm install nextra nextra-theme-docs`
2. [ ] Configure `next.config.js` and `theme.config.tsx`
3. [ ] Create wiki structure in `pages/wiki/`
4. [ ] Import 5-10 key pages from knowledge base
5. [ ] Test search and mobile
6. [ ] Deploy to Vercel: `vercel`
7. [ ] Share with team!

---

**You now have a beautiful, searchable wiki ready to go!** 📚
