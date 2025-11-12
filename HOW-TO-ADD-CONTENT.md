# How to Add Content to the SMART Connect Knowledge Base

**Simple Guide for Team Members**

---

## Why Add Content?

The more research, interviews, resources, and best practices you add to this knowledge base, the smarter the AI becomes. Every piece of content makes the SLM more useful for:
- Generating evidence-based content
- Answering facilitator questions
- Developing engagement strategies
- Identifying patterns across research

---

## Quick Reference: What Goes Where

| Content Type | Goes In | Template |
|--------------|---------|----------|
| Facilitator interviews | `/knowledge-base/interviews/` | `interview-template.md` |
| Survey data | `/knowledge-base/surveys/` | (Create summary markdown) |
| PDFs (strategic docs, research) | `/knowledge-base/strategic-documents/` | `research-note-template.md` |
| Resources (scripts, tools) | `/knowledge-base/resources/` | `resource-template.md` |
| Community best practices | `/knowledge-base/community-best-practices/` | `community-pattern-template.md` |
| Generated content | `/content-calendar/` | (As-is, organized by week/month) |
| Implementation plans | `/implementation-plans/` | (As-is) |

---

## Method 1: Add a Facilitator Interview

### Step 1: Start with the Template

Copy `/templates/interview-template.md`

### Step 2: Fill It Out

**Required sections:**
- **Facilitator name** (or anonymize if needed)
- **Date, meeting type, location**
- **Background** (2-3 sentences about the facilitator)
- **Key themes** (3-5 main topics from interview)
- **Transcript or detailed notes**
- **Powerful quotes** (3-5 impactful quotes)
- **Insights** (what you learned, patterns noticed)
- **Tags** (for searchability)

**Example:**
```markdown
# Facilitator Interview: Sarah Mitchell

**Date:** 2025-10-15
**Meeting Type:** General Meetings
**Location:** Brisbane, QLD
**Years Facilitating:** 2 years

## Background
Sarah became a SMART facilitator after her own recovery journey. She runs
a Tuesday evening general meeting in Brisbane with 8-12 regular attendees.

## Key Themes
- Handling dominant participants without alienating them
- Balancing structure with flexibility
- Self-care challenges as a volunteer

## Powerful Quotes
> "Sometimes I feel like I'm the only one dealing with this, and then I talk
> to another facilitator and realize we're all struggling with the same things."
> — Sarah Mitchell
```

### Step 3: Save the File

**Naming convention:** `[facilitator-name]-[date].md`

Example: `sarah-mitchell-2025-10-15.md`

**Save to:** `/knowledge-base/interviews/`

### Step 4: Update the Interview Index

Open `/knowledge-base/metadata/interview-index.md` and add one line:

```markdown
- **Sarah Mitchell** (General, Brisbane QLD, 2025-10-15): Handling dominant participants, facilitator self-care [📄 Link](../interviews/sarah-mitchell-2025-10-15.md)
```

### Step 5: Commit to Git

```bash
git add knowledge-base/interviews/sarah-mitchell-2025-10-15.md
git add knowledge-base/metadata/interview-index.md
git commit -m "Add Sarah Mitchell facilitator interview - general meetings, Brisbane"
git push
```

**Done!** The SLM can now reference Sarah's interview.

---

## Method 2: Add a PDF Document

You have two options: convert to markdown OR create a summary.

### Option A: Convert PDF to Markdown (Best)

**Step 1: Convert the PDF**

Use a tool:
- Adobe Acrobat (Export to Word, then convert to Markdown)
- Online converter (Google "PDF to Markdown")
- Copy-paste text from PDF into markdown file

**Step 2: Format as Markdown**

Add headers, structure, and formatting:

```markdown
# [Document Title]

**Authors:** [Names]
**Published:** [Date]
**Source:** [Organization]

## Summary
[Brief overview]

## Key Findings
### Finding 1
[Content]

### Finding 2
[Content]
```

**Step 3: Save**

Save to `/knowledge-base/strategic-documents/[filename].md`

---

### Option B: Create a Summary (Faster)

**Step 1: Use the Template**

Copy `/templates/research-note-template.md`

**Step 2: Read the PDF and Fill Out Template**

Extract:
- Key findings (3-5 main points)
- Powerful quotes
- Data/statistics
- Relevance to SMART Connect
- Actionable takeaways

**Step 3: Save Both Files**

- Save PDF: `/knowledge-base/strategic-documents/[filename].pdf`
- Save summary: `/knowledge-base/strategic-documents/[filename]-SUMMARY.md`

**Example:**
- `volunteer-retention-research-2024.pdf`
- `volunteer-retention-research-2024-SUMMARY.md`

---

## Method 3: Add a Resource (Script, Template, Tool)

### Step 1: Start with Template

Copy `/templates/resource-template.md`

### Step 2: Fill It Out

**Required sections:**
- **What it is** (brief description)
- **Who it's for** (target audience)
- **The problem it solves** (why it's needed)
- **How to use it** (step-by-step)
- **The resource itself** (paste the full script/template/tool)
- **Example** (concrete usage example)
- **Tags** (for searchability)

**Example:**
```markdown
# Resource: Meeting Closing Script

## What It Is
A 2-minute closing script for SMART meetings that reinforces key messages
and invites participants back.

## Who It's For
- New facilitators who aren't sure how to end meetings
- Facilitators who want a consistent closing

## The Resource

"As we close today's meeting, I want to acknowledge the courage it takes to
show up and do this work. Remember:
- Recovery is possible
- You don't have to do it alone
- SMART meetings are here every [day of week] at [time]

Thank you for being here today. Take care of yourselves this week."

## Tags
#resources #meeting-scripts #facilitation-basics
```

### Step 3: Save the File

**Naming convention:** `[resource-name].md`

Example: `meeting-closing-script.md`

**Save to:** `/knowledge-base/resources/`

### Step 4: Update Resource Index

Add to `/knowledge-base/metadata/resource-index.md`:

```markdown
- **Meeting Closing Script**: 2-minute closing for SMART meetings [📄 Link](../resources/meeting-closing-script.md)
```

---

## Method 4: Add a Community Best Practice

### Step 1: Start with Template

Copy `/templates/community-pattern-template.md`

### Step 2: Document the Pattern

**Key sections:**
- **Source community** (Where this pattern comes from—Reddit, Discord, etc.)
- **What it is** (Clear description of the pattern)
- **Why it works** (Psychological/behavioral reasoning)
- **Adaptation for SMART Connect** (How to modify it for facilitators)
- **Implementation steps** (Concrete how-to)
- **Success metrics** (How to measure if it's working)

**Example:**
```markdown
# Community Pattern: "Ask Me Anything" (AMA) Threads

## Source Community
Reddit (r/IAmA and subreddit AMAs)

## What It Is
Scheduled Q&A sessions where a community member with specific experience
answers questions from other members.

## Adaptation for SMART Connect
**SMART Connect version: "Ask a Facilitator"**
- Monthly thread featuring experienced facilitator
- Open for 48 hours
- Facilitator answers questions about [their specialty]

## Implementation Steps
1. Identify facilitator with 2+ years experience
2. Ask if they'd do an "Ask a Facilitator" thread
3. Schedule for Tuesday 9am (high traffic day)
4. Post announcement Monday: "Tomorrow: Ask [Name] anything about [topic]"
5. Facilitator commits to checking in 3-4 times during 48-hour window
6. Community Manager compiles top Q&As into resource afterward

## Success Metrics
- 15+ questions asked
- 80%+ questions answered
- 10+ facilitators participate
- Facilitator reports positive experience
```

### Step 3: Save and Index

Save to `/knowledge-base/community-best-practices/[pattern-name].md`

Update `/knowledge-base/metadata/tag-index.md` with new tags

---

## Method 5: Add Survey Data

### Step 1: Create Survey Summary File

**File name:** `[survey-name]-[date].md`

Example: `facilitator-needs-survey-2025-11.md`

### Step 2: Include These Sections

```markdown
# Survey: [Survey Name]

**Date conducted:** [YYYY-MM-DD]
**Sample size:** n=[number]
**Response rate:** [percentage]
**Conducted by:** [Name/organization]

## Survey Questions
1. [Question 1]
2. [Question 2]
[...]

## Key Findings

### Finding 1: [Headline]
[Details, percentages]

### Finding 2: [Headline]
[Details, percentages]

## Data Table
| Question | Response | Percentage |
|----------|----------|------------|
| [Q1] | [Option A] | 78% |
| [Q1] | [Option B] | 61% |

## Qualitative Responses
> "[Powerful quote from open-ended question]"

## Insights
[What this tells us about facilitator needs]

## Recommendations
[What we should do based on this data]

## Tags
#survey-data #facilitator-needs #[topic]
```

### Step 3: Save

Save to `/knowledge-base/surveys/`

---

## Method 6: Quick Add (Just Paste In)

**Don't have time to use a template?** That's okay!

### Minimum Requirements for Usability

Create a markdown file with:
- **Title/Header** (clear name)
- **Date** (when this was created/published)
- **The actual content** (interview transcript, resource text, etc.)
- **Tags** (at least 3-5 tags at the bottom)

**Example:**
```markdown
# Quick Notes: Facilitator Call October 2025

**Date:** 2025-10-23
**Participants:** 8 facilitators from various meeting types

## Key Themes Discussed
- Tech challenges with online meetings (Zoom fatigue, engagement)
- Need for more youth-specific resources
- Cultural safety training request

## Action Items
- Create tech troubleshooting guide for online facilitators
- Interview 3-4 youth facilitators
- Schedule cultural safety workshop

## Tags
#meeting-notes #online-meetings #youth #cultural-safety
```

Save anywhere in `/knowledge-base/` that makes sense. Better to have content quickly captured than perfectly formatted!

---

## Method 7: Paste Content from ChatGPT/Claude

**If the SLM generated something useful and you want to save it:**

### Step 1: Copy the Generated Content

Example: SLM generated a great discussion post

### Step 2: Save It

Create file: `/content-calendar/generated/[descriptive-name].md`

Example: `/content-calendar/generated/yarning-circle-burnout-discussion.md`

### Step 3: Add Metadata at Top

```markdown
# Discussion Post: Handling Facilitator Burnout

**Generated:** 2025-11-12
**For:** The Yarning Circle forum
**Status:** Draft / Published
**Performance:** [Track engagement after posting]

---

[Paste generated content here]
```

### Step 4: Track What Works

If it performs well, note that:
```markdown
**Performance:** Posted 2025-11-15, received 23 comments, 8 facilitators shared their approaches. Success!
```

This helps the knowledge base learn what content resonates.

---

## Method 8: Batch Add Multiple Files

**Have 10 interview transcripts to add?**

### Step 1: Create All Files at Once

- Use interview template
- Fill out one field at a time across all files (faster than completing one at a time)

### Step 2: Use Consistent Naming

```
knowledge-base/interviews/
├── facilitator-1-2025-10-15.md
├── facilitator-2-2025-10-16.md
├── facilitator-3-2025-10-17.md
└── ...
```

### Step 3: Batch Commit to Git

```bash
git add knowledge-base/interviews/*.md
git commit -m "Add 10 facilitator interviews from October 2025"
git push
```

---

## Tips for Making Content More Useful

### ✅ DO:

**Use descriptive file names:**
- ✅ `family-friends-facilitator-mark-powell-2025-09.md`
- ❌ `interview-1.md`

**Add lots of tags:**
- The more tags, the easier to find
- Use consistent tag names (#burnout not #facilitator-burnout)

**Include quotes:**
- Direct quotes make research come alive
- Helps AI generate more authentic content

**Link related content:**
- "See also: [related interview]"
- "This connects to [strategic document]"

**Note what's missing:**
- "We don't have data on [topic]—should interview facilitators about this"
- Helps identify research gaps

---

### ❌ DON'T:

**Don't skip tags:**
- Without tags, content is hard to find

**Don't save PDFs without summaries:**
- AI can't read PDFs easily—create markdown summaries

**Don't forget permissions:**
- Note if facilitator gave permission for quotes
- Flag if content is sensitive/private

**Don't use jargon without explanation:**
- Make content accessible to new team members

---

## Updating Existing Content

**When you learn something new or get facilitator feedback:**

### Step 1: Find the File

Use git grep or your editor to search:
```bash
grep -r "meeting opening script" knowledge-base/
```

### Step 2: Edit the File

Add new information:
```markdown
## Updates

**2025-11-12:** Added variation for youth meetings based on feedback from Sarah.
**2025-10-20:** Initial creation.
```

### Step 3: Update "Last Updated" Date

Change the date at bottom of file.

### Step 4: Commit Changes

```bash
git add [filename]
git commit -m "Update meeting opening script with youth variation"
git push
```

---

## Creating Metadata Indexes (Keep Things Organized)

**Maintain these index files:**

### Interview Index
`/knowledge-base/metadata/interview-index.md`

```markdown
# Facilitator Interview Index

## By Meeting Type

### General Meetings
- Sarah Mitchell (Brisbane QLD, 2025-10-15) [Link]
- John Doe (Sydney NSW, 2025-09-20) [Link]

### Family & Friends
- Mark Powell (Regional VIC, 2025-09-18) [Link]

### LGBTQIA+
- Ambika Scott Jodrell (Melbourne VIC, 2025-08-10) [Link]
```

### Resource Index
`/knowledge-base/metadata/resource-index.md`

```markdown
# Resource Index

## Meeting Facilitation
- Meeting Opening Script [Link]
- Meeting Closing Script [Link]
- Check-In Questions (20 variations) [Link]

## Challenging Situations
- Handling Dominant Participants [Link]
- Participant in Crisis Response [Link]
```

### Tag Index
`/knowledge-base/metadata/tag-index.md`

```markdown
# Tag Index

All tags used in knowledge base and what they mean.

- **#facilitator-interviews** — Interview transcripts with SMART facilitators
- **#burnout** — Content related to facilitator burnout and self-care
- **#cultural-safety** — Cultural safety protocols, especially for Aboriginal facilitators
- **#family-and-friends** — Specific to Family & Friends meetings
- **#resources** — Tools, scripts, templates for facilitators
```

**Update these indexes whenever you add content.**

---

## Quality Checklist Before Adding Content

Before saving a new file, check:

- [ ] **File name is descriptive** (not "interview1.md")
- [ ] **Date is included** (when created/conducted)
- [ ] **Tags are added** (minimum 3-5 tags)
- [ ] **Source is cited** (if external research)
- [ ] **Permissions are noted** (if using facilitator names/quotes)
- [ ] **Cultural safety considered** (especially for Aboriginal facilitator content)
- [ ] **File is saved in correct folder** (interviews, resources, etc.)
- [ ] **Metadata index updated** (added to relevant index file)
- [ ] **Committed to git** (with clear commit message)

---

## Git Commands Quick Reference

**Add new file:**
```bash
git add knowledge-base/interviews/new-interview.md
```

**Add multiple files:**
```bash
git add knowledge-base/interviews/*.md
```

**Commit with message:**
```bash
git commit -m "Add 3 new facilitator interviews from November"
```

**Push to remote:**
```bash
git push origin [branch-name]
```

**Check status:**
```bash
git status
```

---

## Common Questions

**Q: What if I don't have time to fill out the full template?**
A: Capture what you can! Minimum: title, date, content, tags. You can always add more later.

**Q: Can I add content in other formats (Word, PDF)?**
A: PDFs can stay as PDFs (with markdown summary). Convert Word docs to markdown for best AI usability.

**Q: How often should I add content?**
A: Whenever you have something! Weekly is great. Monthly minimum to keep knowledge base current.

**Q: What if I make a mistake?**
A: Git keeps version history—you can always revert. Don't worry about perfection.

**Q: Can multiple people add content at once?**
A: Yes! Git handles this. Just pull latest changes before adding yours, then push.

---

## Getting Help

**If you're stuck:**
1. Check template files in `/templates/`
2. Look at existing files for examples
3. Ask teammate who's added content before
4. Refer to this guide

**If templates don't fit your content:**
Create your own structure! Just include: title, date, content, tags, and commit message.

---

## The Goal

**A living, growing knowledge base** that gets smarter every week because you and your team keep adding:
- Facilitator interviews
- Survey data
- Strategic research
- Resources that work
- Community best practices
- Content that performs well

**The more you add, the better the AI gets at supporting your work.** 🚀

---

**Ready to add your first piece of content?**

1. Pick a template from `/templates/`
2. Fill it out
3. Save to the right folder
4. Add tags
5. Commit and push

**You're building a world-class knowledge base. Every piece counts.** ✨
