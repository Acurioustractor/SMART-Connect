# AI-Powered Features & Content Generation System

## 🎯 Overview

SMART Connect Hub now includes **world-class AI-powered tools** for analyzing facilitator interviews, generating content for the LearnWorlds community, and building a comprehensive knowledge base from web content.

All features are designed to scale automatically as you add more interviews and scrape more content.

---

## ✨ Features Built

### 1. **AI-Powered Interview Analysis**

Location: `/api/interviews/analyze`

**What it does:**
- Uses GPT-4 Turbo to deeply analyze facilitator interviews
- Extracts themes focused on **community, connection, and support**
- Identifies key quotes about online engagement
- Generates actionable recommendations

**Output Structure:**
```json
{
  "summary": "2-3 sentence overview highlighting community themes",
  "keyThemes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "keyInsights": [
    "Quote about community",
    "Quote about connection",
    "Quote about support"
  ],
  "communityFocus": "How this person views/experiences community",
  "recommendations": ["actionable recommendation 1", "recommendation 2"]
}
```

**Why it matters:**
- No more manual theme extraction
- Consistent analysis across all interviews
- Focused on what matters for building online community
- Scales automatically - analyze 100 interviews as easily as 1

---

### 2. **Interview Upload System**

Location: `/interviews/upload`

**What it does:**
- Web form to add new facilitator interviews
- Paste transcript, add metadata (name, email, date, affiliation)
- **Automatic AI analysis** when you click "Upload & Analyze"
- Saves to `knowledge-base/interviews/` as structured markdown
- Immediately available to AI Chat and Content Generator

**Fields:**
- **Required:** Name, Transcript
- **Optional:** Email, Interview Date, Affiliation, Notes/Role

**What happens on upload:**
1. Form validates required fields
2. Calls AI analysis endpoint
3. Generates structured summary with themes
4. Creates markdown file with:
   - Metadata header
   - AI-generated summary
   - Key quotes and sentiments
   - Community focus insights
   - Recommendations
   - Full transcript
5. Saves to knowledge base
6. Redirects to interviews page

**Access:**
- Button on `/interviews` page: "Add Interview"
- Direct link: `/interviews/upload`

---

### 3. **Content Generator**

Location: `/tools/content-generator`

**What it does:**
Generates evidence-based content grounded in facilitator interviews and research.

**4 Content Types:**

**A. Forum Posts**
- Engaging discussion starters for facilitators
- References real interview insights
- Includes 2-3 discussion questions
- Warm, professional, culturally safe tone

**B. Tool Summaries**
- Clear explanations of SMART Recovery tools
- When to use, key benefits, examples
- Tips for online/hybrid facilitation
- Written in plain language

**C. Content Ideas (10 at once)**
- Specific ideas for LearnWorlds forum
- Based on real facilitator pain points
- Covers: training, support, cultural safety, tools
- Each includes: Title, Description, Why It Matters, Format

**D. Community Insights**
- 200-word overview of community needs
- Top 5 themes about connection and support
- 3 recommendations for online community
- Quotes illustrating peer support importance

**How it works:**
1. Select content type
2. Optionally add context (e.g., "focus on burnout prevention")
3. Click "Generate Content"
4. AI analyzes all available interviews + scraped content
5. Generates content in 10-30 seconds
6. Copy and use immediately

**Context Used:**
- All facilitator interviews
- Scraped website pages
- Tools and resources
- Shows count of each when generating

---

### 4. **Firecrawl Web Scraping**

Location: `/api/scrape`

**What it does:**
- Scrapes smartrecoveryaustralia.com.au
- Extracts clean markdown from all pages
- Downloads and processes PDFs
- Saves to `knowledge-base/scraped-content/`

**3 Actions:**

**A. Scrape Single Page**
```bash
curl -X POST http://localhost:3080/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://smartrecoveryaustralia.com.au/about",
    "action": "scrape"
  }'
```

**B. Crawl Entire Site**
```bash
curl -X POST http://localhost:3080/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://smartrecoveryaustralia.com.au",
    "action": "crawl"
  }'
```
Returns a `jobId` to check status.

**C. Check Crawl Status**
```bash
curl -X POST http://localhost:3080/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "action": "status",
    "jobId": "your-job-id"
  }'
```

When complete, automatically saves all pages to knowledge base.

**Setup:**
1. Get API key from https://firecrawl.dev
2. Add to `.env.local`: `FIRECRAWL_API_KEY=fc-your-key`
3. See full docs in `FIRECRAWL-SETUP.md`

---

## 🚀 Quick Start

### 1. **Start Dev Server**
```bash
cd hub
npm run dev
```

### 2. **Add an Interview**
- Go to `/interviews`
- Click "Add Interview" button
- Fill in name and paste transcript
- Click "Upload & Analyze"
- AI generates summary automatically

### 3. **Generate Content**
- Go to `/tools`
- Click "Content Generator"
- Select content type (e.g., "Forum Post")
- Add optional context
- Click "Generate Content"
- Copy and use

### 4. **Scrape SMART Site** (Optional)
- Get Firecrawl API key
- Add to `.env.local`
- Use curl or create script (see `FIRECRAWL-SETUP.md`)
- Wait for crawl to complete
- Content automatically added to knowledge base

---

## 📊 How It Scales

### **Interview Analysis**
- **1 interview:** 10 seconds to analyze
- **100 interviews:** Same interface, still instant
- AI Chat uses all interviews for answers

### **Content Generation**
- Loads context from all sources
- More interviews = richer, more grounded content
- Automatically references recent insights

### **Web Scraping**
- One-time setup with Firecrawl
- Crawl entire site: 10-30 minutes
- Re-crawl monthly to stay updated
- All content available to AI immediately

---

## 🎯 Use Cases

### **For Community Managers**

**Generate Weekly Forum Posts:**
1. Open Content Generator
2. Select "Forum Post"
3. Add context: "Focus on new facilitators, addressing imposter syndrome"
4. Generate
5. Post to LearnWorlds

**Create Tool Guides:**
1. Select "Tool Summary"
2. Add context: "Explain the CBA worksheet for online meetings"
3. Generate
4. Edit and publish

### **For Researchers**

**Analyze New Interviews:**
1. Upload interview via form
2. AI extracts themes automatically
3. Compare themes across facilitators
4. Use Content Generator → "Community Insights" to synthesize

**Find Patterns:**
1. Upload multiple interviews
2. Use AI Chat: "What are common burnout themes?"
3. Generate synthesis report with Content Generator

### **For Content Strategists**

**Plan Content Calendar:**
1. Content Generator → "Content Ideas"
2. Get 10 research-backed ideas
3. Pick 3-4 for next month
4. Generate actual content for each

**Create Onboarding Series:**
1. Generate forum posts for new facilitators
2. Create tool summaries for key resources
3. All grounded in actual facilitator experiences

---

## 🛠️ Technical Details

### **AI Models Used**
- **GPT-4 Turbo** for all analysis and generation
- **Temperature 0.3** for analysis (consistent, focused)
- **Temperature 0.7** for content generation (creative but grounded)
- **JSON mode** for structured analysis

### **Knowledge Base Structure**
```
knowledge-base/
├── interviews/          # Facilitator interviews
│   ├── Ambika_*.md
│   ├── April_*.md
│   └── [new uploads]
├── scraped-content/     # Website pages
│   ├── page_0_*.md
│   └── page_1_*.md
└── tools/              # PDF resources (future)
```

### **API Endpoints**
- `POST /api/interviews/analyze` - Analyze interview content
- `POST /api/interviews/upload` - Upload new interview
- `POST /api/scrape` - Scrape web content
- `POST /api/content-generator` - Generate content

### **Environment Variables**
```bash
# Required for AI features
OPENAI_API_KEY=sk-...

# Optional for web scraping
FIRECRAWL_API_KEY=fc-...

# Optional for API calls
NEXT_PUBLIC_BASE_URL=http://localhost:3080
```

---

## 📈 Next Steps

### **Immediate Actions**
1. ✅ Add your OpenAI API key to `.env.local`
2. ✅ Upload existing interviews via the new form
3. ✅ Generate your first forum post
4. ✅ Test the Content Generator with different types

### **This Week**
1. Get Firecrawl API key
2. Scrape smartrecoveryaustralia.com.au
3. Generate 10 content ideas for LearnWorlds
4. Create tool summaries for top 5 resources

### **This Month**
1. Upload all 24 facilitator interviews
2. Set up weekly scraping to keep content fresh
3. Generate monthly content calendar
4. Create onboarding series for new facilitators

---

## 🎓 Best Practices

### **Interview Uploads**
- Include facilitator name (required)
- Add affiliation/role for context
- Paste full transcript (not summary)
- AI handles theme extraction automatically

### **Content Generation**
- Be specific in optional context field
- Review and edit generated content
- Add personal touches before publishing
- Reference actual facilitator quotes when possible

### **Web Scraping**
- Scrape site every 2-4 weeks
- Focus on resources/tools pages first
- Check Firecrawl credit usage
- Store PDFs separately if needed

---

## 🐛 Troubleshooting

**"OpenAI API key not configured"**
- Add `OPENAI_API_KEY` to `/hub/.env.local`
- Restart dev server
- Check key has credits

**"Firecrawl API key not configured"**
- Add `FIRECRAWL_API_KEY` to `.env.local`
- See `FIRECRAWL-SETUP.md` for details
- Restart dev server

**Interview upload fails**
- Check name and transcript are filled
- Ensure transcript is not empty
- Check console for detailed error

**Content generation is slow**
- First generation takes 20-30 seconds (loading context)
- Subsequent generations are faster
- Large context (100+ interviews) may take 40-60 seconds

**Scraped content not appearing**
- Check `/knowledge-base/scraped-content/` directory exists
- Verify crawl completed (status: "completed")
- Restart dev server to reload knowledge base

---

## 📞 Support

**Issues or Questions?**
- Check this document first
- Review `FIRECRAWL-SETUP.md` for scraping help
- Test in AI Chat first (it can answer most questions)
- Check browser console for errors

**Feature Requests?**
- Content types to add?
- Analysis improvements?
- New AI tools?

---

## 🎉 Summary

You now have a **world-class AI-powered system** for:
- ✅ Analyzing facilitator interviews automatically
- ✅ Extracting community and connection themes
- ✅ Generating evidence-based content for LearnWorlds
- ✅ Scraping and indexing SMART Recovery resources
- ✅ Creating forum posts, tool summaries, and content ideas
- ✅ Scaling automatically as you add more content

**Everything is grounded in real facilitator experiences and research.**

Start by uploading an interview and generating your first piece of content!
