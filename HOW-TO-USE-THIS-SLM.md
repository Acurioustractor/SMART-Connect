# How to Use the SMART Connect SLM Knowledge Base

**Quick Start Guide for Team Members**

---

## What Is This?

This repository is a **queryable knowledge base** powered by AI. Think of it as having an expert research analyst, content strategist, and community development specialist available 24/7—grounded in real facilitator research.

---

## 🚀 Method 1: Use with ChatGPT, Claude, or Any AI (Easiest)

### Step 1: Copy the Master Prompt

Open **MASTER-SLM-PROMPT.md** and copy the entire file.

### Step 2: Start a New Conversation

- **ChatGPT:** Go to chat.openai.com, start new chat
- **Claude:** Go to claude.ai, start new conversation
- **Other AI:** Use your preferred AI assistant

### Step 3: Paste the Master Prompt

Paste the entire MASTER-SLM-PROMPT.md content into the chat.

### Step 4: Ask Your Question

Now ask anything! Examples:

```
Write a discussion post for The Yarning Circle about handling participant
burnout in meetings. Ground it in facilitator interviews.
```

```
What are the top 3 challenges Aboriginal facilitators mentioned in interviews?
Include quotes and suggest resources we should create.
```

```
Design a 4-week content plan for the Family & Friends Community of Practice
that addresses the specific needs they mentioned in research.
```

```
Review this welcome email for cultural safety issues:
[paste email]
```

---

## 📊 Method 2: Use with Claude Projects (Best for Ongoing Work)

### Step 1: Create a Claude Project

1. Go to claude.ai
2. Click "Projects" in sidebar
3. Create new project: "SMART Connect Knowledge Base"

### Step 2: Add Knowledge Base Files

Upload all markdown files from `/knowledge-base/` folder:
- All interview transcripts
- Survey summaries
- Strategic documents
- Implementation plans
- Content calendars
- Resources

### Step 3: Set Project Instructions

Paste **MASTER-SLM-PROMPT.md** as the project instructions.

### Step 4: Start Querying

Now every conversation in this project will have access to all the research. Claude will automatically reference relevant documents when answering.

**Benefits:**
- Don't need to re-paste prompt every time
- Can have multiple ongoing conversations
- Claude learns your patterns and preferences
- Easy to share with team (invite collaborators to project)

---

## 💬 Method 3: Use ChatGPT Custom GPT (For Frequent Use)

### Step 1: Create a Custom GPT

1. Go to ChatGPT (requires Plus subscription)
2. Click your profile → "My GPTs" → "Create a GPT"

### Step 2: Configure the GPT

**Name:** SMART Connect Strategy AI

**Description:** AI strategist for SMART Recovery facilitator community development, grounded in real research.

**Instructions:** Paste MASTER-SLM-PROMPT.md

**Knowledge:** Upload all markdown files from `/knowledge-base/`

**Conversation starters:**
- "Generate content for The Yarning Circle"
- "Analyze facilitator interview patterns"
- "Review this content for cultural safety"
- "Suggest engagement strategies"

### Step 3: Save and Use

Now you (and anyone you share it with) can instantly query the knowledge base.

---

## 🤖 Method 4: Build a Slack/Discord Bot (For Team Access)

**Coming soon:** We'll build a custom bot that your team can query directly in Slack or Discord.

**How it will work:**
1. Type `/smart ask [your question]` in Slack
2. Bot searches knowledge base for relevant content
3. Bot sends answer grounded in research with citations

**Want to build this?** See technical guide in SMART-CONNECT-SLM-KNOWLEDGE-BASE-README.md

---

## 💡 Example Questions You Can Ask

### Content Generation

**Discussion posts:**
```
Write a discussion post for The Yarning Circle about [topic].
Keep it under 200 words, peer-to-peer tone, invite facilitator input.
```

**Email campaigns:**
```
Draft a Week 3 digest email highlighting [X discussions].
Include facilitator quotes and preview next week's content.
```

**Welcome messages:**
```
Write a welcome post for the Youth Facilitators Community of Practice.
Address the unique challenges youth facilitators face based on research.
```

**Resource creation:**
```
Create a facilitator self-care checklist based on what facilitators
said about burnout in interviews.
```

---

### Strategy Development

**Engagement strategies:**
```
What engagement patterns from Reddit and Discord could we adapt for
the Yarning Circle forum? Reference community best practices in knowledge base.
```

**Problem-solving:**
```
Engagement in Communities of Practice is low. What strategies should we try
based on facilitator research and community best practices?
```

**Planning:**
```
Design a 6-month content plan for the LGBTQIA+ Facilitators CoP
that addresses the challenges Ambika mentioned in their interview.
```

---

### Research Analysis

**Pattern detection:**
```
What patterns emerge across all facilitator interviews about isolation?
Provide summary with quotes organized by meeting type.
```

**Survey analysis:**
```
Summarize survey findings on facilitator platform preferences.
What are the top 3 features they want and what percentage requested each?
```

**Cross-referencing:**
```
Compare what Family & Friends facilitators said in interviews vs.
what they indicated in the survey. Any contradictions?
```

---

### Cultural Safety Review

**Content audit:**
```
Review this Month 2 content calendar for cultural safety issues.
Flag any concerns related to Aboriginal facilitators.
```

**Language check:**
```
Is this language culturally safe for Aboriginal facilitators?
[paste content]
```

**Protocol review:**
```
We're planning a Facilitator Spotlight featuring an Aboriginal facilitator.
What cultural protocols should we follow based on Danielle's interview?
```

---

### Resource Requests

**Tools:**
```
Create a meeting opening script for justice system facilitators
that acknowledges the unique dynamics they face.
```

**Templates:**
```
Design a Community Champion check-in email template based on
the support structure outlined in the Champion Pack.
```

**Guides:**
```
Build a troubleshooting guide for online meeting facilitators
addressing the tech challenges they mentioned in research.
```

---

## 🎯 Tips for Getting Better Answers

### ✅ DO:

**Be specific:**
❌ "Write content about burnout"
✅ "Write a 150-word discussion post for The Yarning Circle about facilitator burnout. Include a scenario from interviews and invite peers to share their self-care practices."

**Reference the knowledge base:**
❌ "What do facilitators want?"
✅ "Based on facilitator interviews and survey data, what are the top 3 platform features facilitators requested?"

**Ask for citations:**
❌ "Why is cultural safety important?"
✅ "What did Danielle Caruana say about cultural safety in her interview? Include direct quotes."

**Iterate:**
If the first answer isn't quite right, refine:
"Make that shorter" / "Use a more conversational tone" / "Add specific examples"

---

### ❌ DON'T:

**Don't ask opinion questions without grounding in data:**
❌ "What's the best way to engage facilitators?"
✅ "Based on facilitator research, what engagement approaches align with their reality as time-poor volunteers?"

**Don't assume the SLM has data it doesn't:**
If you ask about something not in the knowledge base, the SLM will tell you. That's helpful feedback—it means we need to add that research!

**Don't skip cultural safety checks:**
Always ask for cultural safety review on content related to Aboriginal facilitators, Mob Yarning Space, or cultural protocols.

---

## 🔄 Iterating on Responses

The SLM is conversational—you can refine answers:

**Example dialogue:**

**You:** Write a discussion post about meeting formats.

**SLM:** [Generates 300-word post]

**You:** Make it shorter—under 150 words. And more casual.

**SLM:** [Generates revised shorter, casual version]

**You:** Perfect. Now suggest 3 follow-up posts on related topics.

**SLM:** [Suggests 3 related posts]

---

## 📝 Saving Your Work

**If using ChatGPT/Claude directly:**
- Copy responses to your content calendar or docs
- Name conversations clearly (e.g., "Week 3 Content Generation")
- Share conversation links with team

**If using Claude Projects:**
- All conversations saved automatically in project
- Easy to search past conversations
- Can revisit and continue any conversation thread

**If using Custom GPT:**
- Conversations saved in ChatGPT history
- Export content to your tools

---

## 🚨 When to NOT Use the SLM

**Don't use for:**
- ❌ Making final decisions (humans decide, AI advises)
- ❌ Sensitive conversations about specific facilitators (privacy)
- ❌ Replacing facilitator feedback (AI guides, facilitators lead)
- ❌ Overriding cultural safety concerns (Cultural Safety Moderator has final say)

**Always:**
- ✅ Review generated content before publishing
- ✅ Run cultural safety checks past Cultural Safety Moderator
- ✅ Test content with facilitators (especially new formats)
- ✅ Track what works and add learnings back to knowledge base

---

## 🎓 Learning the System

### Week 1: Basic Queries
- Ask simple questions to understand what the SLM knows
- Try: "Summarize key findings from facilitator interviews"
- Try: "What did the survey say about discussion boards?"

### Week 2: Content Generation
- Start generating simple content (discussion posts, emails)
- Compare AI-generated content to what you'd write manually
- Refine prompts to get closer to your voice

### Week 3: Strategy Support
- Ask strategic questions about engagement, Community Champions, etc.
- Use AI to think through problems before team meetings
- Bring AI-generated options to team for discussion

### Week 4: Advanced Use
- Build content series (4-week plans)
- Conduct research analysis across multiple sources
- Use for A/B testing (generate 2-3 versions, test with facilitators)

---

## 📊 Measuring Impact

**Track:**
- **Time saved:** How many hours per week does this save your team?
- **Content quality:** Is AI-generated content as good/better than manual?
- **Research usage:** Are insights from knowledge base making it into decisions?
- **Facilitator response:** Do facilitators engage more with AI-assisted content?

---

## 🔄 Continuous Improvement

**As you use this system:**

**When something works well:**
- Note why (add to knowledge base as a pattern)
- Share with team
- Replicate

**When something doesn't work:**
- Ask: Is the problem the AI, the prompt, or missing data?
- If missing data: Add interviews, research, resources
- If prompt issue: Refine how you ask questions
- If AI limitation: Augment with human judgment

---

## ❓ FAQs

**Q: How accurate is the SLM?**
A: As accurate as the knowledge base. It cites research, so you can verify. Always review outputs.

**Q: Can it create content in our brand voice?**
A: Yes, with guidance. Include tone/style examples in your prompts. It learns your patterns.

**Q: Will this replace our jobs?**
A: No. It's a tool to augment your work—saves time on drafting, research synthesis, pattern-finding. You still make decisions, ensure quality, and maintain relationships.

**Q: What if it generates something culturally unsafe?**
A: Always run cultural content past your Cultural Safety Moderator. The SLM has protocols but human judgment is essential.

**Q: Can facilitators use this directly?**
A: Eventually, yes—we can build a facilitator-facing bot. For now, it's internal team use only.

**Q: How do I add new research to improve it?**
A: See HOW-TO-ADD-CONTENT.md for step-by-step guides.

---

## 🆘 Getting Help

**If you're stuck:**
1. **Review example queries** in this guide
2. **Check MASTER-SLM-PROMPT.md** to see what the AI knows
3. **Ask the SLM directly:** "What kinds of questions can you answer about facilitators?"
4. **Reach out to:** [Your team's technical lead or community manager]

---

## 🚀 Ready to Start?

**Your first query:**

1. **Copy MASTER-SLM-PROMPT.md**
2. **Paste into ChatGPT or Claude**
3. **Ask:** "What are the top 3 things facilitators said they need from the SMART Connect community? Include quotes."

**See what happens!**

Then try generating your first piece of content. You're off to the races. 🏁

---

**Questions? Feedback? Issues?**
Add them to the repo as issues or discuss with your team.

**Let's build world-class facilitator support—faster and smarter with AI.** 🚀
