# Interview Analysis Setup Guide

The system now has **world-class AI-powered interview analysis** built in! Here's how to use it:

## What's Been Built

### 1. Deep Thematic Analysis System
The AI analyzes each interview to extract:
- **Executive Summary**: Compelling 3-4 sentence synthesis of unique insights
- **Key Themes**: Themes with descriptions, supporting quotes, and significance
- **Powerful Quotes**: Verbatim quotes with context and why they matter
- **LearnWorld Content Suggestions**: Specific courses with:
  - Course titles and descriptions
  - Target audience and format (Podcast/Video/Workshop/etc.)
  - Key learning outcomes
  - Estimated length
- **Facilitator Insights**: Challenges, strengths, support needs, learning preferences
- **Platform Implications**: Feature ideas with priority levels and rationale
- **Cultural Considerations**: Safety insights and recommendations
- **One-Line Takeaway**: The single most important insight

### 2. API Endpoints Created
- `POST /api/interviews/analyze-all` - Analyzes ALL interviews (run once)
- `GET /api/interviews/analysis/[name]` - Gets analysis for specific interview
- Analyses stored in: `knowledge-base/interview-analysis/[filename].json`

### 3. Interview Display
- Shows AI-generated summaries and theme titles
- Detects unanalyzed interviews
- Currently shows warning: "Not yet analyzed"

## How to Run the Analysis

### Step 1: Make Sure You Have API Keys

In `hub/.env.local`, ensure you have:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 2: Run the Analysis

You have two options:

**Option A: Using curl (Recommended)**
```bash
cd /home/user/SMART-Connect/hub
curl -X POST http://localhost:3080/api/interviews/analyze-all
```

**Option B: Using the browser**
1. Start the dev server: `npm run dev`
2. Open browser dev tools (F12)
3. In Console, run:
```javascript
fetch('/api/interviews/analyze-all', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log(d))
```

### Step 3: Wait for Analysis to Complete

The system will:
- Process each interview with GPT-4
- Extract deep insights with nuance
- Generate LearnWorld content suggestions
- Save results to JSON files
- Takes about 1-2 minutes per interview (with rate limiting)

You'll see output like:
```json
{
  "success": true,
  "total": 20,
  "analyzed": 20,
  "skipped": 0,
  "failed": 0
}
```

### Step 4: View Results

1. Go to `/interviews` page
2. Click on any interview to expand
3. You'll now see:
   - Executive Summary
   - Key Themes with evidence
   - Powerful Quotes with significance
   - LearnWorld Content Suggestions
   - Platform Implications
   - And more!

## What Makes This World-Class

1. **Nuanced Understanding**: The AI doesn't just extract keywords - it understands context, significance, and implications

2. **Evidence-Based**: Every theme includes actual quotes from the interview as evidence

3. **Actionable Insights**: LearnWorld suggestions are specific, practical, with clear learning outcomes

4. **Strategic Value**: Platform implications help inform product development decisions

5. **Cultural Sensitivity**: Recognizes and highlights cultural safety considerations

6. **Human-Centered**: Focuses on the unique human experience, not just data points

## Analysis Quality Standards

The AI has been instructed to:
- Extract ACTUAL verbatim quotes (not summaries)
- Be specific, not generic (avoid platitudes)
- Focus on what's UNIQUE about each person's experience
- Think deeply about implications
- Suggest practical, implementable content ideas
- Consider the whole facilitator journey
- Identify patterns that might apply broadly

## Example Output Structure

Each analysis JSON file contains:
```json
{
  "filename": "Tony Wales 2a9ebcf981cf80ceb48ed5d41e8642a9.md",
  "name": "Tony Wales",
  "executiveSummary": "...",
  "keyThemes": [
    {
      "theme": "Financial Sustainability of Recovery Organizations",
      "description": "...",
      "evidence": ["actual quote 1", "actual quote 2"],
      "significance": "..."
    }
  ],
  "powerfulQuotes": [
    {
      "quote": "exact verbatim quote from interview",
      "context": "what was being discussed",
      "significance": "why this matters"
    }
  ],
  "learnWorldContentSuggestions": [
    {
      "courseTitle": "Building Sustainable Non-Profit Recovery Organizations",
      "description": "...",
      "targetAudience": "...",
      "format": "Video series",
      "keyLearningOutcomes": ["outcome 1", "outcome 2", "outcome 3"],
      "estimatedLength": "6 x 20-minute episodes"
    }
  ],
  "facilitatorInsights": {...},
  "platformImplications": [...],
  "culturalConsiderations": {...},
  "oneLineTakeaway": "...",
  "analyzedAt": "2025-11-12T..."
}
```

## Troubleshooting

**Problem**: Analysis fails
- Check that OPENAI_API_KEY is set correctly
- Ensure you have GPT-4 API access
- Check rate limits on your OpenAI account

**Problem**: Some interviews fail to analyze
- Long interviews might hit token limits
- Check the `failed` count in the response
- Re-run analyze-all (it skips already analyzed interviews)

**Problem**: Analysis seems shallow
- The prompt has been carefully crafted for depth
- If results seem generic, the interview content might lack detail
- Consider re-interviewing with more depth

## Next Steps

Once analysis is complete:
1. **Review** the analyses in the knowledge-base/interview-analysis folder
2. **Export** insights for reports or presentations
3. **Use** LearnWorld suggestions to build actual courses
4. **Implement** platform features based on implications
5. **Share** powerful quotes in communications

---

The system is now ready to provide world-class insights from your facilitator interviews!
