# SMART Connect Frontend Architecture
## Simple, Powerful UI for AI-Powered Community Development

**Version:** 1.0
**Purpose:** Web interface for team to query knowledge base, access wiki, and use AI tools

---

## 🎯 Design Philosophy

**Core Principles:**
1. **Simple > Complex**: Clean interface, not overwhelming
2. **Fast**: Get answers in seconds, not minutes
3. **Mobile-first**: Works perfectly on phone (facilitators are mobile)
4. **No login friction**: Team can access instantly
5. **Progressive disclosure**: Advanced features available but not in your face

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SMART Connect Hub                         │
│                   (Frontend Web App)                         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼─────┐         ┌────▼─────┐        ┌─────▼─────┐
   │  AI Chat │         │   Wiki   │        │ AI Tools  │
   │ Interface│         │  (Docs)  │        │  Suite    │
   └──────────┘         └──────────┘        └───────────┘
        │                     │                     │
        │                     │                     │
   ┌────▼─────────────────────▼─────────────────────▼────┐
   │             Knowledge Base Backend                   │
   │  (Vector DB + LLM API + Git Repo + Search)          │
   └──────────────────────────────────────────────────────┘
```

---

## 📱 Frontend Components

### 1. **AI Chat Interface** (Primary Feature)

**What it is:** ChatGPT-style interface for querying knowledge base

**Features:**
- Natural language questions
- Streaming responses (shows answer as it types)
- Citations (links to source interviews/documents)
- Conversation history
- Pre-written prompt templates
- "Ask AI" button on every page

**Example UX:**
```
┌──────────────────────────────────────────────────┐
│ SMART Connect AI                            [≡]  │
├──────────────────────────────────────────────────┤
│                                                  │
│  💬 What can I help you with today?             │
│                                                  │
│  Quick actions:                                  │
│  • Generate content for The Yarning Circle       │
│  • Analyze facilitator interviews               │
│  • Review content for cultural safety           │
│  • Develop engagement strategy                  │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ Ask me anything about SMART facilitators...│ │
│  └────────────────────────────────────────────┘ │
│                                            [Send]│
└──────────────────────────────────────────────────┘
```

**User asks:** "What did facilitators say about burnout?"

**AI responds:**
```
Based on 24 facilitator interviews, burnout is a recurring theme:

**Key Patterns:**
1. **Isolation**: Facilitators operate in "own little world" without peer support
2. **Time pressure**: Saving resources but never watching ("I save webinars but never get around to them" - Mark Powell)
3. **Holding space without support**: Supporting others without self-care

**Top Quotes:**
> "Sometimes I feel like I'm the only one dealing with this, and then I talk to another facilitator and realize we're all struggling with the same things." - Sarah Mitchell

> "I pour so much into my meetings, but who's supporting me?" - Interview #12

**Resources to Create:**
- Facilitator self-care checklist
- Burnout recognition guide
- Peer support matching system

📄 Sources: [Mark Powell Interview], [Facilitator Survey], [Burnout Theme Analysis]
```

---

### 2. **SMART Wiki** (GitBook-Style Documentation)

**What it is:** Organized, searchable documentation of all research, resources, and guides

**Structure:**
```
📚 SMART Connect Wiki
│
├── 🏠 Getting Started
│   ├── Welcome to SMART Connect
│   ├── How to Use This Wiki
│   └── Quick Start Guide
│
├── 📊 Research & Insights
│   ├── Facilitator Interviews (24)
│   │   ├── By Meeting Type
│   │   ├── By Theme
│   │   └── Key Quotes
│   ├── Survey Data
│   └── Strategic Documents
│
├── 📝 Content Library
│   ├── Week 1 Launch Content
│   ├── Month 1 Content Calendar
│   ├── Discussion Post Templates
│   ├── Email Templates
│   └── Facilitator Spotlight Scripts
│
├── 🛠️ Resources for Facilitators
│   ├── Meeting Scripts
│   ├── Facilitation Tools
│   ├── Self-Care Resources
│   └── Cultural Safety Protocols
│
├── 👥 Community Building
│   ├── 12-Month Implementation Plan
│   ├── Community Champion Pack
│   ├── Communities of Practice Setup
│   └── Engagement Strategies
│
├── 🖤❤️💛 Cultural Safety
│   ├── Mob Yarning Space Protocols
│   ├── Cultural Safety Framework
│   ├── Danielle Caruana Interview (Key)
│   └── Resources for Non-Indigenous Facilitators
│
└── 🤖 AI & Tools
    ├── How to Use SMART Connect AI
    ├── AI Tool Suite
    ├── Adding Content to Knowledge Base
    └── Technical Documentation
```

**Features:**
- Full-text search across all content
- Mobile-responsive reading experience
- Breadcrumb navigation
- Related content suggestions
- "Ask AI about this page" button on every page
- Easy editing (GitHub-backed)
- Version history

**Example Page:**
```
┌─────────────────────────────────────────────────────────┐
│ 📚 SMART Wiki > Research > Facilitator Interviews       │
├─────────────────────────────────────────────────────────┤
│ [Search wiki...]                              [🤖 Ask AI]│
│                                                           │
│ # Facilitator Interviews                                 │
│                                                           │
│ 24 interviews with SMART Recovery facilitators across    │
│ diverse meeting types, regions, and demographics.        │
│                                                           │
│ ## By Meeting Type                                       │
│ • General Meetings (10)                                  │
│ • Family & Friends (3)                                   │
│ • LGBTQIA+ (2)                                          │
│ • Aboriginal & Torres Strait Islander (1) 🔒            │
│                                                           │
│ ## Key Themes                                            │
│ • Isolation & Need for Peer Connection →                │
│ • Time Constraints & Asynchronous Needs →               │
│ • Cultural Safety (Critical) →                          │
│                                                           │
│ [Read full interview index →]                            │
│                                                           │
│ 💡 Ask AI: "What patterns emerge across interviews       │
│            about facilitator burnout?"                   │
└─────────────────────────────────────────────────────────┘
```

---

### 3. **AI Tools Suite** (Specialized Functions)

**What it is:** Purpose-built AI tools for specific tasks

#### **Tool 1: Interview Summarizer**
**Purpose:** Turn raw interview transcripts into structured summaries

**UX:**
```
┌──────────────────────────────────────────────────────────┐
│ Interview Summarizer                                [🤖] │
├──────────────────────────────────────────────────────────┤
│ Paste your interview transcript below:                   │
│                                                           │
│ ┌──────────────────────────────────────────────────────┐│
│ │ [Interviewer]: How long have you been facilitating? ││
│ │ [Facilitator]: About 2 years...                      ││
│ │                                                       ││
│ │ (Paste full transcript here)                         ││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ Meeting Type: [General ▼]  Region: [QLD ▼]              │
│ Facilitator Name: [Optional]                             │
│                                                           │
│ [Generate Summary]                                        │
│                                                           │
│ AI will extract:                                          │
│ • Key themes (3-5)                                       │
│ • Powerful quotes (5-7)                                  │
│ • Insights & patterns                                    │
│ • Suggested tags                                         │
│ • Actionable takeaways                                   │
│                                                           │
│ Output format: [Markdown ▼] [Save to KB ✓]              │
└──────────────────────────────────────────────────────────┘
```

**Output:**
Generates a formatted markdown file using `interview-template.md` structure, ready to commit to knowledge base.

---

#### **Tool 2: Content Generator**
**Purpose:** Create posts, emails, resources on demand

**UX:**
```
┌──────────────────────────────────────────────────────────┐
│ Content Generator                                   [🤖] │
├──────────────────────────────────────────────────────────┤
│ What content do you need?                                │
│                                                           │
│ Content Type:                                            │
│ [• Discussion Post  ○ Email  ○ Resource  ○ Spotlight]   │
│                                                           │
│ For: [The Yarning Circle ▼]                             │
│                                                           │
│ Topic: ┌─────────────────────────────────────────────┐  │
│        │ Facilitator burnout and self-care          │  │
│        └─────────────────────────────────────────────┘  │
│                                                           │
│ Tone: [• Conversational  ○ Formal  ○ Casual]           │
│ Length: [150 words ▼]                                    │
│ Include facilitator quotes: [✓]                          │
│                                                           │
│ [Generate Content]                                        │
│                                                           │
│ ────────────────────────────────────────────────────────│
│                                                           │
│ Generated Content:                                        │
│                                                           │
│ **Let's talk about facilitator self-care**              │
│                                                           │
│ Real question from a facilitator: "I pour so much into  │
│ my meetings, but who's supporting me?"                   │
│                                                           │
│ [Full generated content...]                              │
│                                                           │
│ [Copy]  [Edit]  [Generate Another Version]               │
│ [Save to Content Calendar]  [Post Now]                   │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Generate 1-3 variations
- Edit inline
- Save to content calendar
- Cultural safety auto-check
- Cite sources used

---

#### **Tool 3: Cultural Safety Checker**
**Purpose:** Review content for cultural safety issues (especially Aboriginal facilitators)

**UX:**
```
┌──────────────────────────────────────────────────────────┐
│ Cultural Safety Checker                            [🖤❤️💛]│
├──────────────────────────────────────────────────────────┤
│ Paste your content below for cultural safety review:     │
│                                                           │
│ ┌──────────────────────────────────────────────────────┐│
│ │ Welcome to SMART Connect! We're excited to...        ││
│ │                                                       ││
│ │ (Paste content here)                                 ││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ Content Type: [Email ▼]                                  │
│ Audience: [All facilitators ▼]                          │
│                                                           │
│ [Check for Cultural Safety Issues]                       │
│                                                           │
│ ────────────────────────────────────────────────────────│
│                                                           │
│ ⚠️ 2 potential concerns found:                           │
│                                                           │
│ **1. Generic language about "community"**                │
│ "We're excited to build community together"              │
│ → Concern: Assumes everyone relates to community same way│
│ → Suggestion: Acknowledge diverse approaches to community│
│                                                           │
│ **2. No mention of cultural safety protocols**           │
│ → Aboriginal facilitators need to know Mob Yarning Space │
│   exists and is private/invite-only from Day 1           │
│ → Add: "Including a private Mob Yarning Space for        │
│   Aboriginal and Torres Strait Islander facilitators."   │
│                                                           │
│ ✓ No tokenistic language detected                        │
│ ✓ No extraction of cultural knowledge                    │
│                                                           │
│ 📋 Recommendation: Review with Cultural Safety Moderator │
│    before sending to Aboriginal facilitators             │
│                                                           │
│ [Accept Suggestions]  [Edit Manually]  [Approve as-is]   │
└──────────────────────────────────────────────────────────┘
```

**Checks for:**
- Tokenistic language
- Generic assumptions about community
- Lack of cultural protocols
- Extraction of cultural knowledge without permission
- Visibility/control issues
- References Danielle Caruana's interview criteria

---

#### **Tool 4: Research Pattern Detector**
**Purpose:** Find themes across multiple interviews automatically

**UX:**
```
┌──────────────────────────────────────────────────────────┐
│ Research Pattern Detector                            [📊] │
├──────────────────────────────────────────────────────────┤
│ Detect patterns across facilitator research              │
│                                                           │
│ Search for patterns about:                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ isolation, connection, peer support                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ In: [✓] Interviews  [✓] Survey data  [ ] Strategic docs │
│                                                           │
│ Filter by:                                               │
│ Meeting Type: [All ▼]                                    │
│ Region: [All ▼]                                          │
│                                                           │
│ [Detect Patterns]                                         │
│                                                           │
│ ────────────────────────────────────────────────────────│
│                                                           │
│ 🔍 Found 18 mentions across 15 interviews                │
│                                                           │
│ **Top Patterns:**                                        │
│                                                           │
│ 1. **Facilitators feel they operate alone** (12 mentions)│
│    "own little world" - Mark Powell                      │
│    "only one dealing with this" - Sarah Mitchell         │
│    → Highest among F&F and regional facilitators         │
│                                                           │
│ 2. **Desire for peer-to-peer connection** (15 mentions)  │
│    78% want discussion boards (survey)                   │
│    "need others who get it" - 8 interviews               │
│                                                           │
│ 3. **Time constraints limit engagement** (10 mentions)   │
│    "save webinars but never watch" - Mark Powell         │
│    → Suggests need for asynchronous, bite-sized content  │
│                                                           │
│ [View All Quotes]  [Export Report]  [Create Resource]    │
└──────────────────────────────────────────────────────────┘
```

**Output:**
- Pattern summary with frequency
- Organized quotes by theme
- Demographic breakdown (which facilitators say this most)
- Actionable recommendations
- Export as markdown report

---

#### **Tool 5: Content Scheduler with AI Recommendations**
**Purpose:** Suggest when to post based on engagement data

**UX:**
```
┌──────────────────────────────────────────────────────────┐
│ Smart Content Scheduler                              [📅] │
├──────────────────────────────────────────────────────────┤
│ Week 4 Schedule                        [◄ Week 3  Week 5 ►]│
│                                                           │
│ Monday, Nov 18                                            │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 9:00 AM  📝 Discussion: Facilitator Self-Care        ││
│ │          [Edit]  [Preview]                 [Post Now]││
│ │                                                       ││
│ │ 💡 AI Suggestion: This time gets 2x engagement       ││
│ │    Mondays at 9am have 67% open rate                 ││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ Wednesday, Nov 20                                         │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 🤖 AI Recommends: Post about "handling silence"      ││
│ │    Why: 3 facilitators asked about this in Yarning   ││
│ │    Circle last week. High relevance.                 ││
│ │                                                       ││
│ │    [Generate Post]  [Schedule]  [Dismiss]            ││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ Friday, Nov 22                                            │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 3:00 PM  ✉️ Week 4 Email Digest                      ││
│ │          [Edit]  [Preview]           [Send at 3pm ✓]││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ [Add Content]  [View Analytics]  [AI Recommendations]    │
└──────────────────────────────────────────────────────────┘
```

**AI Features:**
- Analyzes past engagement (open rates, comments, time of day)
- Suggests topics based on facilitator questions/needs
- Recommends posting frequency
- Identifies content gaps ("No Family & Friends content this week")
- Warns about oversaturation ("3 posts in one day may overwhelm")

---

#### **Tool 6: A/B Content Tester**
**Purpose:** Generate 2-3 variations of content to test

**UX:**
```
┌──────────────────────────────────────────────────────────┐
│ A/B Content Tester                                   [🧪] │
├──────────────────────────────────────────────────────────┤
│ Generate variations to test which performs better         │
│                                                           │
│ Original Content:                                         │
│ ┌──────────────────────────────────────────────────────┐│
│ │ **How do you handle silence in meetings?**           ││
│ │                                                       ││
│ │ Sometimes there's a long silence after asking a      ││
│ │ question. Do you wait it out or rephrase?            ││
│ │                                                       ││
│ │ Share your approach below 👇                         ││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ Test Variable: [• Tone  ○ Length  ○ Hook  ○ CTA]        │
│                                                           │
│ [Generate Variations]                                     │
│                                                           │
│ ────────────────────────────────────────────────────────│
│                                                           │
│ **Version A (Original):** Conversational question        │
│ **Version B:** Opens with facilitator quote             │
│ **Version C:** Opens with specific scenario              │
│                                                           │
│ ┌─ Version B ──────────────────────────────────────────┐│
│ │ **"The silence feels awkward, but I'm learning to    ││
│ │ wait it out."** - Facilitator interview              ││
│ │                                                       ││
│ │ How do you handle silence in meetings?               ││
│ │ Do you wait? Rephrase? Have a technique?             ││
│ │                                                       ││
│ │ Share your approach 👇                               ││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ ┌─ Version C ──────────────────────────────────────────┐│
│ │ You ask a question in your meeting. Silence. 10      ││
│ │ seconds. 20 seconds. Everyone's looking down.        ││
│ │                                                       ││
│ │ **What do you do?**                                  ││
│ │                                                       ││
│ │ Share how you handle awkward silence 👇              ││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ [Schedule A/B Test]  [Save All]  [Pick One]              │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Generates 2-3 variations testing specific elements
- Can schedule A/B test (post Version A to half, Version B to other half)
- Tracks which performs better (engagement, comments)
- Learns from results to improve future content

---

## 🎨 UI/UX Design System

### **Design Principles**

**1. SMART Recovery Brand Colors**
- Primary: Deep Blue `#003B5C`
- Accent: Warm Orange `#FF6B35`
- Cultural Safety: Aboriginal flag colors `#000000` `#FF0000` `#FFD700`
- Neutral: Grays for text and backgrounds
- Success: Green `#10B981`
- Warning: Amber `#F59E0B`

**2. Typography**
- Headings: Inter (clean, professional)
- Body: System fonts (fast loading, accessible)
- Monospace: Source Code Pro (for code/markdown)

**3. Layout**
- Single column on mobile
- Sidebar navigation on desktop
- Max width: 1200px (readable)
- Generous whitespace (not cluttered)

**4. Components**
- Buttons: Clear CTAs, high contrast
- Cards: Organized information blocks
- Input fields: Large, easy to tap on mobile
- Modals: For focused tasks (don't navigate away)

---

### **Responsive Design**

**Mobile (< 768px):**
```
┌─────────────────────┐
│   [≡] SMART AI      │
├─────────────────────┤
│                     │
│  💬 Chat Interface  │
│  (Full width)       │
│                     │
│                     │
│                     │
│  [Ask question...]  │
│                     │
└─────────────────────┘
```

**Desktop (> 768px):**
```
┌────────────┬──────────────────────────────────┐
│            │  SMART Connect AI                │
│ Sidebar    ├──────────────────────────────────┤
│ Navigation │                                  │
│            │  Main Content Area               │
│ • AI Chat  │  (Chat / Wiki / Tools)           │
│ • Wiki     │                                  │
│ • Tools    │                                  │
│ • Settings │                                  │
│            │                                  │
│            │                                  │
└────────────┴──────────────────────────────────┘
```

---

## 🔧 Technical Stack (Simple & Modern)

### **Frontend**
```yaml
Framework: Next.js 14 (React)
  Why: Server-side rendering, fast, great DX

Styling: Tailwind CSS
  Why: Fast styling, mobile-first, customizable

UI Components: shadcn/ui
  Why: Beautiful, accessible, copy-paste components

State Management: React Context + Zustand
  Why: Simple, no Redux overhead

Markdown: MDX + Gray Matter
  Why: Rich content with React components
```

### **Backend / API**
```yaml
API Framework: Next.js API Routes
  Why: Same codebase as frontend, serverless-ready

LLM Integration:
  - OpenAI API (GPT-4)
  - Anthropic API (Claude)
  - Fallback to local (Ollama)

Vector Database: Pinecone or Supabase Vector
  Why: Managed, scalable, easy semantic search

File Storage: GitHub (knowledge base)
  Why: Version control, easy editing, free

Search: Algolia or MeiliSearch
  Why: Fast full-text search for wiki
```

### **GitBook Wiki**
```yaml
Option 1: GitBook Cloud
  Pros: Managed, beautiful, easy
  Cons: $99/month for team plan

Option 2: Docusaurus (Open Source)
  Pros: Free, customizable, React-based
  Cons: Need to host yourself

Option 3: Nextra (Next.js Docs)
  Pros: Same stack as main app, beautiful
  Cons: Less features than GitBook

Recommendation: Start with Nextra (free, integrated)
             Migrate to GitBook if budget allows
```

### **Deployment**
```yaml
Frontend: Vercel
  Why: Free tier, Next.js optimized, fast deploys

API: Vercel Serverless Functions
  Why: Same platform, easy

Database: Supabase (Postgres + Vector)
  Why: Free tier, managed, great DX

Wiki: Vercel or Netlify
  Why: Static site, fast, free
```

---

## 📂 Project Structure

```
smart-connect-frontend/
│
├── app/                      # Next.js 14 app directory
│   ├── (chat)/              # AI Chat interface
│   │   ├── page.tsx
│   │   └── components/
│   ├── (wiki)/              # Wiki/docs
│   │   ├── page.tsx
│   │   └── [...slug]/
│   ├── (tools)/             # AI tools suite
│   │   ├── interview-summarizer/
│   │   ├── content-generator/
│   │   ├── cultural-safety-checker/
│   │   └── research-pattern-detector/
│   └── api/                 # API routes
│       ├── chat/
│       ├── search/
│       └── tools/
│
├── components/              # Reusable components
│   ├── ui/                 # shadcn/ui components
│   ├── chat/               # Chat-specific
│   ├── wiki/               # Wiki-specific
│   └── tools/              # Tool-specific
│
├── lib/                     # Utilities
│   ├── ai/                 # LLM integrations
│   ├── vector-db/          # Vector search
│   ├── knowledge-base/     # KB utilities
│   └── utils.ts
│
├── public/                  # Static assets
├── styles/                  # Global styles
├── wiki-content/           # Wiki markdown files
│   └── (mirrors knowledge-base/)
│
└── package.json
```

---

## 🚀 Implementation Roadmap

### **Phase 1: MVP (2-3 weeks)**

**Week 1: Core Infrastructure**
- [ ] Set up Next.js project
- [ ] Configure Tailwind + shadcn/ui
- [ ] Build basic layout (sidebar, mobile nav)
- [ ] Set up API routes
- [ ] Connect to OpenAI API
- [ ] Basic chat interface (no fancy features)

**Week 2: Wiki + Tools**
- [ ] Set up Nextra for wiki
- [ ] Import knowledge base content
- [ ] Build search functionality
- [ ] Create Interview Summarizer tool
- [ ] Create Content Generator tool

**Week 3: Polish + Deploy**
- [ ] Mobile optimization
- [ ] Add citations to AI responses
- [ ] Cultural Safety Checker tool
- [ ] Deploy to Vercel
- [ ] Team testing

**MVP Features:**
- ✅ Chat with AI about knowledge base
- ✅ Browse wiki
- ✅ 3 AI tools (summarizer, generator, safety checker)
- ✅ Mobile-friendly
- ✅ Deployed and accessible

---

### **Phase 2: Enhanced Features (4-6 weeks)**

**Month 2:**
- [ ] Research Pattern Detector
- [ ] Content Scheduler with AI recommendations
- [ ] A/B Content Tester
- [ ] Analytics dashboard (track usage)
- [ ] Save conversation history
- [ ] Export reports (PDF, markdown)

**Month 3:**
- [ ] Vector database integration (better search)
- [ ] Admin panel (add content via UI)
- [ ] Team collaboration (shared conversations)
- [ ] Advanced filters (search by meeting type, theme, etc.)
- [ ] Slack/Discord bot integration

---

### **Phase 3: Scale (Ongoing)**

**Facilitator-Facing Bot:**
- Public interface for facilitators to query resources
- Rate-limited (prevent abuse)
- Curated responses (only approved content)

**Advanced Analytics:**
- Track which content performs best
- Identify content gaps
- Facilitator engagement patterns
- A/B test results

**Integrations:**
- LearnWorlds (AI in community forums)
- Email (schedule sends)
- Calendar (sync content schedule)
- GitHub (auto-commit new content)

---

## 💰 Cost Estimate

### **MVP (Phase 1)**
```
Vercel:           $0/month (free tier)
Supabase:         $0/month (free tier)
OpenAI API:       ~$50-100/month (team usage)
Domain:           $12/year
Total:            ~$50-100/month
```

### **Production (Phase 2-3)**
```
Vercel Pro:       $20/month (if needed)
Supabase Pro:     $25/month (more storage)
OpenAI API:       $200-500/month (higher usage)
Pinecone:         $70/month (vector DB)
GitBook (optional): $99/month
Total:            ~$315-615/month
```

**Ways to reduce costs:**
- Use Claude API (cheaper than GPT-4)
- Use local SLM for simple queries (Ollama)
- Implement caching (same questions = cached answers)
- Free tier limits for internal team only

---

## 🎯 Success Metrics

**Usage:**
- Daily active users (team members)
- Questions asked per day
- Tools used per week
- Wiki pages viewed

**Value:**
- Time saved generating content (hours/week)
- Facilitator research queries (vs manual searching)
- Content created with AI assistance (%)
- Team satisfaction (survey quarterly)

---

## 📱 Mobile App (Future)

**Progressive Web App (PWA):**
- Install on phone home screen
- Offline access to wiki
- Push notifications (new content, reminders)
- Voice input for queries
- No app store needed (just visit website)

---

## 🔐 Security & Privacy

**Authentication:**
- Google OAuth (team accounts only)
- No public access to internal tools
- Role-based permissions (admin vs viewer)

**Data Privacy:**
- Facilitator interviews: De-identified by default
- Mob Yarning Space: Never included in training data
- Secure API keys (environment variables)
- HTTPS everywhere

**Cultural Safety:**
- Aboriginal content flagged and protected
- Cultural Safety Moderator review required for sensitive content
- Audit log of who accesses what

---

## ✅ Next Steps

1. **Review this architecture** with team
2. **Choose tech stack** (recommend Next.js + Nextra)
3. **Set up development environment**
4. **Build Phase 1 MVP** (2-3 weeks)
5. **Team testing and feedback**
6. **Iterate and launch Phase 2**

---

**Ready to build a simple, powerful frontend that makes AI accessible to your entire team.** 🚀
