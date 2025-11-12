# Supabase Setup Guide for SMART Connect Hub

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** → Sign in/Sign up
3. Click **"New Project"**
4. Fill in:
   - **Name:** SMART Connect Hub
   - **Database Password:** (save this securely!)
   - **Region:** Choose closest to your users (e.g., Sydney)
5. Click **"Create new project"** (takes ~2 minutes)

### 2. Run the SQL Schema

1. In your Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from this repository
4. Copy ALL the contents and paste into the SQL editor
5. Click **"Run"** or press `Cmd+Enter`
6. You should see: **"Success. No rows returned"**

### 3. Get Your API Keys

1. In Supabase dashboard, click **"Settings"** (gear icon, bottom left)
2. Click **"API"**
3. Copy these two values:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### 4. Update Your Environment Variables

1. Open `hub/.env.local` (or create it if it doesn't exist)
2. Add these lines:

```env
# OpenAI API Key (required for AI chat)
OPENAI_API_KEY=your-openai-key-here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file
4. Restart your dev server: `npm run dev`

---

## What You Get

The schema creates these tables:

### Core Tables
- **`user_profiles`** - Extended user information (name, role, organization)
- **`conversations`** - Chat conversation threads
- **`messages`** - Individual messages in conversations
- **`analytics_events`** - User behavior tracking (page views, clicks)
- **`tool_usage`** - Track usage of AI tools
- **`feedback`** - User feedback and feature requests
- **`saved_queries`** - Save and share common queries

### Security Features
- **Row Level Security (RLS)** enabled on all tables
- Users can only see their own data
- Admins can see aggregate analytics
- Public queries can be shared across users

### Performance
- Indexes on frequently queried columns
- Optimized for chat message retrieval
- Fast analytics queries

---

## Next Steps: Integrate into Your App

### Install Supabase Client

```bash
cd hub
npm install @supabase/supabase-js
```

### Create Supabase Client (`hub/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Example: Save Chat Messages

```typescript
// In your chat API route or component
import { supabase } from '@/lib/supabase'

// Create a conversation
const { data: conversation } = await supabase
  .from('conversations')
  .insert({ title: 'Chat about burnout' })
  .select()
  .single()

// Save messages
await supabase.from('messages').insert([
  {
    conversation_id: conversation.id,
    role: 'user',
    content: 'What did facilitators say about burnout?'
  },
  {
    conversation_id: conversation.id,
    role: 'assistant',
    content: 'Based on the research...'
  }
])
```

### Example: Track Analytics

```typescript
import { supabase } from '@/lib/supabase'

// Track page view
await supabase.from('analytics_events').insert({
  event_type: 'page_view',
  event_name: 'home_page',
  page_url: '/chat',
  metadata: { referrer: document.referrer }
})
```

### Example: Get Chat History

```typescript
// Get all conversations for a user
const { data: conversations } = await supabase
  .from('conversations')
  .select(`
    *,
    messages (*)
  `)
  .order('created_at', { ascending: false })
```

---

## Testing Your Setup

Run this in the SQL Editor to verify everything works:

```sql
-- Check all tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return:
-- analytics_events
-- conversations
-- feedback
-- messages
-- saved_queries
-- tool_usage
-- user_profiles
```

---

## Optional: Enable Authentication

If you want users to log in:

1. In Supabase dashboard → **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates
4. Install auth helpers:
   ```bash
   npm install @supabase/auth-helpers-nextjs
   ```

---

## Monitoring & Analytics

### View Analytics in Supabase

Go to **Database** → **Views** in Supabase to see:
- `daily_active_users` - DAU metrics
- `chat_engagement_stats` - Message counts per user
- `tool_usage_summary` - Tool performance metrics

### Query Examples

```sql
-- Most active users this week
SELECT
  u.full_name,
  COUNT(DISTINCT c.id) as conversations,
  COUNT(m.id) as messages
FROM user_profiles u
JOIN conversations c ON u.id = c.user_id
JOIN messages m ON c.id = m.conversation_id
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.full_name
ORDER BY messages DESC
LIMIT 10;

-- Popular topics (simple keyword analysis)
SELECT
  LOWER(SUBSTRING(content FROM '[a-zA-Z]+')) as keyword,
  COUNT(*) as mentions
FROM messages
WHERE role = 'user'
  AND LENGTH(content) > 10
GROUP BY keyword
ORDER BY mentions DESC
LIMIT 20;
```

---

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the entire SQL schema file
- Check you're in the right project

### "permission denied" error
- RLS is enabled - make sure you're authenticated
- Or disable RLS temporarily for testing:
  ```sql
  ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
  ```

### Can't see data in tables
- Check RLS policies are correct
- Use the Supabase dashboard to insert test data
- Make sure user_id matches authenticated user

---

## Security Best Practices

✅ **DO:**
- Keep your `SUPABASE_ANON_KEY` public-facing
- Use Row Level Security (RLS) policies
- Validate data on the server side
- Use prepared statements (built into Supabase)

❌ **DON'T:**
- Don't expose your `SUPABASE_SERVICE_ROLE_KEY` (it's for backend only)
- Don't disable RLS in production
- Don't trust client-side validation alone

---

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Integration Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**You're all set!** 🎉

Your SMART Connect Hub now has a scalable, secure database backend.
