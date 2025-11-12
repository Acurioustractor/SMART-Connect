# SMART Connect Hub - Testing Guide

## Team Testing Checklist

Use this guide to test the SMART Connect Hub MVP before rolling it out to the wider team.

---

## Pre-Testing Setup

### 1. Get Access
- Deployed URL: `[Your Vercel URL]`
- Test on multiple devices:
  - Desktop browser (Chrome, Firefox, Safari)
  - Mobile browser (iOS Safari, Android Chrome)
  - Tablet (if available)

### 2. Test Accounts
- No authentication required for MVP
- Any team member can access the URL

---

## Core Functionality Testing

### Test 1: Homepage

**Steps:**
1. Open the deployed URL
2. Verify homepage loads completely

**Expected Results:**
- ✅ Page loads within 3 seconds
- ✅ "Welcome to SMART Connect Hub" heading visible
- ✅ Three feature cards displayed: AI Chat, AI Tools
- ✅ Navigation bar shows: SMART Connect, 💬 AI Chat, 🛠️ Tools
- ✅ Quick Start section visible at bottom

**Mobile Check:**
- ✅ Layout adapts to mobile screen (cards stack vertically)
- ✅ Text is readable without zooming

---

### Test 2: Navigation

**Steps:**
1. Click "💬 AI Chat" in navigation
2. Verify chat page loads
3. Click "SMART Connect" logo to return home
4. Click "🛠️ Tools" in navigation
5. Verify tools page loads

**Expected Results:**
- ✅ All navigation links work
- ✅ Page transitions are smooth
- ✅ No 404 errors

---

### Test 3: AI Chat - Basic Functionality

**Steps:**
1. Go to `/chat`
2. Verify the page displays correctly

**Expected Results:**
- ✅ "SMART Connect AI" heading visible
- ✅ "Ask anything about SMART facilitators" subheading
- ✅ Three example prompt buttons displayed
- ✅ Message input box at bottom
- ✅ "Send" button present

**Mobile Check:**
- ✅ Chat interface fits screen without horizontal scrolling
- ✅ Input box and Send button accessible

---

### Test 4: AI Chat - Example Prompts

**Steps:**
1. Click the first example prompt: "What did facilitators say about burnout?"
2. Click "Send"
3. Wait for response

**Expected Results:**
- ✅ Prompt appears in chat as user message (blue background)
- ✅ "Thinking..." indicator appears
- ✅ AI response appears within 10 seconds (gray background)
- ✅ Response is research-grounded (mentions interviews, specific facilitators)
- ✅ Response is relevant to burnout

**Quality Check:**
- Response should reference specific facilitator interviews
- Response should be coherent and well-structured
- Response should be 3-5 paragraphs (not too short)

---

### Test 5: AI Chat - Custom Questions

Test each of these questions one by one:

#### Question 1: Facilitator Challenges
**Prompt:** "What are the key challenges facilitators face?"

**Expected Response:**
- ✅ Lists multiple challenges (isolation, time constraints, burnout)
- ✅ References survey data or interviews
- ✅ Provides specific examples

#### Question 2: Cultural Safety
**Prompt:** "Tell me about cultural safety for Aboriginal facilitators"

**Expected Response:**
- ✅ Discusses cultural safety protocols
- ✅ References Danielle Caruana's interview (Aboriginal facilitator)
- ✅ Shows sensitivity and respect

#### Question 3: Content Generation
**Prompt:** "Generate a discussion post about peer-to-peer support"

**Expected Response:**
- ✅ Creates a ready-to-use post
- ✅ Includes engaging headline
- ✅ Grounded in research
- ✅ Appropriate tone for SMART community

#### Question 4: Strategy Question
**Prompt:** "What engagement strategies work best for facilitators?"

**Expected Response:**
- ✅ Provides actionable strategies
- ✅ References research findings (survey data)
- ✅ Prioritizes based on facilitator needs

---

### Test 6: AI Chat - Error Handling

**Steps:**
1. Type a very long message (500+ words)
2. Send and verify it works
3. Try sending an empty message (should be disabled)
4. Type a non-English message (should still work)

**Expected Results:**
- ✅ Long messages are handled gracefully
- ✅ Send button is disabled when input is empty
- ✅ Non-English messages receive polite response

---

### Test 7: AI Chat - Conversation Flow

**Steps:**
1. Start a new conversation: "What did facilitators say about burnout?"
2. Wait for response
3. Follow up: "Can you give me specific examples?"
4. Follow up again: "How can we address this?"

**Expected Results:**
- ✅ All messages appear in conversation history
- ✅ AI maintains context from previous messages
- ✅ Follow-up responses are relevant
- ✅ Conversation flows naturally

---

### Test 8: Tools Page

**Steps:**
1. Go to `/tools`
2. Verify page loads

**Expected Results:**
- ✅ "AI Tools" heading visible
- ✅ Six tool cards displayed:
  - Content Generator
  - Interview Summarizer
  - Cultural Safety Checker
  - Research Pattern Detector
  - Content Scheduler
  - Strategy Advisor
- ✅ All cards show "Coming Soon" status
- ✅ Blue info box at bottom with link to Chat

---

### Test 9: Mobile Experience

**Devices to Test:**
- iPhone (Safari)
- Android phone (Chrome)
- iPad/Tablet

**Steps:**
1. Open site on mobile device
2. Navigate through all pages
3. Test AI chat functionality

**Expected Results:**
- ✅ All text is readable (no tiny fonts)
- ✅ Buttons are tap-friendly (not too small)
- ✅ Chat messages display correctly (don't overflow screen)
- ✅ Input box is accessible (not hidden by keyboard)
- ✅ No horizontal scrolling required

---

### Test 10: Performance

**Steps:**
1. Use browser DevTools (F12)
2. Go to Network tab
3. Reload homepage

**Expected Results:**
- ✅ Page loads in under 3 seconds
- ✅ No JavaScript errors in console
- ✅ Images/fonts load correctly

**For Chat:**
- ✅ AI responses arrive within 10 seconds
- ✅ No console errors during chat

---

## Content Quality Testing

### Research Grounding

The AI should demonstrate knowledge of:
- ✅ 24 facilitator interviews
- ✅ 219 survey responses
- ✅ Specific facilitator names (e.g., Ambika, Mark, Danielle)
- ✅ Key findings (78% want discussion boards, 70% want news)
- ✅ Strategic goals (600 meetings by 2025, 1000 long-term)

### Cultural Safety

The AI should:
- ✅ Show respect for Aboriginal and Torres Strait Islander perspectives
- ✅ Reference cultural safety frameworks
- ✅ Use appropriate language (not appropriating or insensitive)
- ✅ Acknowledge diversity within facilitator community

### Content Style

Generated content should:
- ✅ Use professional but warm tone
- ✅ Be free of jargon (unless SMART-specific)
- ✅ Be action-oriented (not overly academic)
- ✅ Include practical examples

---

## Issue Tracking

If you find issues, document them with:

1. **What happened** (screenshot if possible)
2. **What you expected**
3. **Device and browser** (e.g., "iPhone 13, Safari")
4. **Steps to reproduce**
5. **Severity**: Critical / High / Medium / Low

### Example Issue Report

```
ISSUE: Chat not responding on mobile

What happened: Tapped "Send" button but nothing happened.
No "Thinking..." indicator appeared.

Expected: AI should respond within 10 seconds

Device: Samsung Galaxy S21, Chrome 120
Steps:
1. Open chat page on mobile
2. Type "test message"
3. Tap Send
4. Nothing happens

Severity: High
```

---

## Testing Timeline

### Day 1: Core Functionality (2 hours)
- Tests 1-8 (Homepage, Navigation, Chat, Tools)
- Focus on desktop browsers
- One tester documents all findings

### Day 2: Mobile & Edge Cases (2 hours)
- Test 9 (Mobile experience)
- Test 10 (Performance)
- Test error scenarios
- Multiple devices

### Day 3: Content Quality (2 hours)
- Deep testing of AI responses
- Verify research grounding
- Test content generation
- Cultural safety review

### Day 4: Team Walkthrough (1 hour)
- Demo to wider team
- Gather initial feedback
- Document questions for FAQ

---

## Success Criteria

Before rolling out to all facilitators, the MVP should:

✅ **Core Functionality**
- All pages load correctly
- Navigation works on all devices
- Chat interface is intuitive

✅ **AI Quality**
- Responses are research-grounded (cite interviews)
- Cultural safety is maintained
- Content is actionable and relevant

✅ **Performance**
- Pages load in under 3 seconds
- AI responds in under 10 seconds
- No critical bugs

✅ **Mobile Experience**
- All features work on mobile
- Interface is user-friendly
- No layout issues

✅ **Team Readiness**
- At least 3 team members have tested
- Major issues resolved
- Documentation is clear

---

## First Content Generation Test

Once testing is complete, try generating actual content:

### Test: Create Week 2 Discussion Post

**Prompt:**
```
Create a discussion post for Week 2 about facilitator peer support.
Include:
- Engaging headline
- 2-3 paragraphs
- Call-to-action
- Grounded in interview findings
```

**Review:**
- ✅ Headline is engaging
- ✅ Content references specific interviews
- ✅ Tone is appropriate for SMART community
- ✅ Call-to-action is clear
- ✅ Ready to publish (minimal editing needed)

---

## Next Steps After Testing

1. ✅ Fix any critical or high-priority issues
2. ✅ Document common questions in FAQ
3. ✅ Create team onboarding guide
4. ✅ Schedule training session
5. ✅ Generate first 5 pieces of content with AI
6. ✅ Roll out to facilitators for co-design testing

---

## Support During Testing

If you encounter issues:
1. Check console for error messages (F12 in browser)
2. Verify API key is configured in Vercel
3. Check Vercel Function logs for API errors
4. Document the issue following the template above

For urgent issues, contact the technical team immediately.
