# How to Get Your Credentials

## 1. Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project (or create one if you haven't)
3. Click **Settings** (gear icon) in the left sidebar
4. Click **API** in the settings menu

You'll see:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
```
Copy this to: `NEXT_PUBLIC_SUPABASE_URL`

Scroll down to **Project API keys**:

```
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Copy this to: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```
service_role secret: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (DIFFERENT from anon key!)
```
Copy this to: `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANT**: You need the `service_role` key (not the `anon` key) for `SUPABASE_SERVICE_ROLE_KEY`

## 2. OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy the key (starts with `sk-...`)
4. Paste it to: `OPENAI_API_KEY`

## 3. Firecrawl API Key (Optional - for site scraping)

1. Go to https://firecrawl.dev
2. Sign up / Log in
3. Go to Dashboard > API Keys
4. Copy your key
5. Paste it to: `FIRECRAWL_API_KEY`

## Your .env.local File Should Look Like:

```bash
# Development Server Port
PORT=3080

# OpenAI API Key (required for AI chat functionality)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Firecrawl API (for web scraping smartrecoveryaustralia.com.au)
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (REQUIRED for database storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

## After Adding Credentials:

1. **Run the SQL schemas in Supabase**:
   - Open Supabase Dashboard > SQL Editor
   - Run `supabase-schema.sql` (click Run)
   - Run `supabase-interviews-schema.sql` (click Run)

2. **Run the migration**:
   ```bash
   cd hub
   npx tsx scripts/migrate-to-supabase.ts
   ```

3. Wait 30-60 minutes for migration to complete

4. Let me know when it's done and I'll update the API routes!
