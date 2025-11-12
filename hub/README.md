# SMART Connect Hub

AI-powered research and strategy tool for SMART Recovery facilitator community development.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and add your OpenAI API key:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API key:

```
OPENAI_API_KEY=sk-...your-key-here
```

Get your OpenAI API key from: https://platform.openai.com/api-keys

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **AI Chat**: Query the knowledge base with natural language
  - 24 facilitator interviews
  - 219 survey responses
  - Strategic documents and implementation plans

- **AI Tools**: Specialized tools for content creation and analysis
  - Content Generator
  - Interview Summarizer
  - Cultural Safety Checker
  - Research Pattern Detector
  - Strategy Advisor

## Project Structure

```
hub/
├── app/
│   ├── api/chat/        # OpenAI API integration
│   ├── chat/            # AI chat interface
│   ├── tools/           # AI tools pages
│   ├── layout.tsx       # Root layout with navigation
│   ├── page.tsx         # Homepage
│   └── globals.css      # Global styles
├── public/              # Static assets
└── package.json         # Dependencies
```

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4, AI SDK
- **Deployment**: Vercel

## Deployment

### Deploy to Vercel

1. Push to GitHub:

```bash
git add .
git commit -m "Initial commit"
git push
```

2. Import project in Vercel dashboard

3. Add environment variables:
   - `OPENAI_API_KEY`

4. Deploy!

## Knowledge Base

The AI chat is powered by the SMART Connect knowledge base, which includes:

- 24 facilitator interviews covering diverse perspectives
- 219 facilitator survey responses
- Strategic planning documents
- Community best practices
- Cultural safety protocols

The system prompt (`../MASTER-SLM-PROMPT.md`) defines the AI's role and capabilities.

## Cost Estimates

**MVP (Month 1)**
- Vercel hosting: $0 (free tier)
- OpenAI API: ~$50-100 (team usage)
- Domain: ~$12/year
- **Total: ~$50-100/month**

**Production**
- Vercel Pro: $20/month (if needed)
- OpenAI API: $200-500/month (higher usage)
- **Total: ~$220-520/month**

## Support

For technical documentation, see:
- [Frontend Quick Start](../FRONTEND-QUICKSTART.md)
- [Frontend Architecture](../SMART-CONNECT-FRONTEND-ARCHITECTURE.md)
- [Knowledge Base README](../SMART-CONNECT-SLM-KNOWLEDGE-BASE-README.md)

## License

© 2025 SMART Recovery Australia
