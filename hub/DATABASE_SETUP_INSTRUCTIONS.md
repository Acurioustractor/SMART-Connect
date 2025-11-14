# Database Access Issue - Fix Instructions

## Problem
Your application can retrieve data from the database using curl, but the application itself is getting permission errors due to missing Row Level Security (RLS) policies.

## What You Saw
```bash
# This works (direct API access with service key):
curl "https://gokmsihcbejttzimbrlw.supabase.co/rest/v1/scraped_content?select=*&limit=5" \
  -H "apikey: eyJhbGc..." \
  -H "Authorization: Bearer eyJhbGc..."

# But the app shows: "Failed to check database: Could not find the public.scraped_content table in Supabase"
```

## Root Cause
The tables exist and have data, but they need RLS policies to allow your application to access them.

## Solution

### Step 1: Access Supabase SQL Editor

1. Open your browser and go to: **https://supabase.com/dashboard**
2. Log in to your account
3. Select your project: **gokmsihcbejttzimbrlw**
4. Click on **"SQL Editor"** in the left navigation menu

### Step 2: Run the SQL Commands

Copy and paste this SQL into the editor and click "Run":

```sql
-- Enable RLS on both tables
ALTER TABLE scraped_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow service role full access" ON scraped_content;
DROP POLICY IF EXISTS "Allow service role full access" ON pdf_documents;
DROP POLICY IF EXISTS "Allow authenticated users to read scraped_content" ON scraped_content;
DROP POLICY IF EXISTS "Allow authenticated users to read pdf_documents" ON pdf_documents;

-- Create policies for service role (backend API)
CREATE POLICY "Allow service role full access"
ON scraped_content
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role full access"
ON pdf_documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policies for authenticated users (app users)
CREATE POLICY "Allow authenticated users to read scraped_content"
ON scraped_content
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to read pdf_documents"
ON pdf_documents
FOR SELECT
TO authenticated
USING (true);

-- Also allow anon users to read (for public access)
CREATE POLICY "Allow anon users to read scraped_content"
ON scraped_content
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon users to read pdf_documents"
ON pdf_documents
FOR SELECT
TO anon
USING (true);
```

### Step 3: Verify the Setup

After running the SQL, start your development server:

```bash
cd /Users/benknight/SMART-Connect/hub
npm run dev
```

Then visit: **http://localhost:3000/smart-site-tools**

You should now see:
- ✅ Database check successful
- Data loading from both `scraped_content` and `pdf_documents` tables

### Step 4: Test the API

You can also test the API endpoint directly:

```bash
curl http://localhost:3000/api/smart-site/library | jq
```

This should return data from both tables combined.

## What These Policies Do

1. **Service Role Policy**: Allows your backend (using `SUPABASE_SERVICE_ROLE_KEY`) to:
   - Read all data (SELECT)
   - Insert new data (INSERT)
   - Update existing data (UPDATE)
   - Delete data (DELETE)

2. **Authenticated User Policy**: Allows logged-in users to:
   - Read all data (SELECT only)

3. **Anonymous User Policy**: Allows public access to:
   - Read all data (SELECT only)
   - This is useful for public-facing parts of your app

## Troubleshooting

### If you still see errors:

1. **Check RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('scraped_content', 'pdf_documents');
   ```
   Both should show `rowsecurity: true`

2. **Check policies exist**:
   ```sql
   SELECT tablename, policyname, roles
   FROM pg_policies
   WHERE tablename IN ('scraped_content', 'pdf_documents');
   ```
   You should see 6 policies total (3 for each table)

3. **Verify environment variables**:
   ```bash
   cd /Users/benknight/SMART-Connect/hub
   grep SUPABASE .env.local
   ```
   Make sure you have:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Check the application logs**:
   When you run `npm run dev`, look for any Supabase-related errors in the console

## Why This Happened

Row Level Security (RLS) is a PostgreSQL feature that Supabase uses to control data access. When you create tables in Supabase:
- RLS is automatically enabled
- But no policies are created by default
- This means NO ONE can access the data until you create policies

The curl commands worked because you used the service role key directly with the REST API, which bypasses RLS. But your Next.js application needs proper policies to access the data.

## Next Steps

After fixing this, you might want to:
1. Review the Resource Library page to ensure all content loads correctly
2. Test the SMART Site Tools page
3. Consider adding more specific policies if you need different access levels for different users

## Need Help?

If you're still having issues after following these steps:
1. Check the Supabase dashboard > Logs for any error messages
2. Look at the browser console (F12) for client-side errors
3. Check the terminal where `npm run dev` is running for server-side errors
