-- =====================================================
-- SMART Connect Hub - Supabase Database Schema
-- =====================================================
-- This schema supports:
-- - Chat conversation history
-- - User analytics and engagement tracking
-- - Feedback and feature requests
-- - Tool usage metrics
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE (optional - extends Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'facilitator' CHECK (role IN ('facilitator', 'admin', 'staff')),
  organization TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CHAT CONVERSATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CHAT MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON public.messages(conversation_id, created_at DESC);

-- =====================================================
-- USER ANALYTICS & ENGAGEMENT
-- =====================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'page_view', 'chat_message', 'tool_use', 'feature_click'
  event_name TEXT NOT NULL, -- specific action name
  page_url TEXT,
  metadata JSONB, -- flexible data storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_user_time
ON public.analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_type
ON public.analytics_events(event_type, created_at DESC);

-- =====================================================
-- TOOL USAGE TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tool_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL, -- 'content_generator', 'cultural_safety_checker', etc.
  input_data JSONB,
  output_data JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for tool usage queries
CREATE INDEX IF NOT EXISTS idx_tool_usage_user
ON public.tool_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_usage_name
ON public.tool_usage(tool_name, created_at DESC);

-- =====================================================
-- FEEDBACK & FEATURE REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature_request', 'general', 'cultural_safety')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_status
ON public.feedback(status, created_at DESC);

-- =====================================================
-- SAVED SEARCHES / QUERIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.saved_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  query_text TEXT NOT NULL,
  category TEXT, -- 'burnout', 'cultural_safety', 'engagement', etc.
  is_public BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = id);

-- Conversations: Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Messages: Users can only see messages in their conversations
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Analytics: Users can only see their own analytics
CREATE POLICY "Users can view own analytics"
ON public.analytics_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create analytics"
ON public.analytics_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Tool Usage: Users can only see their own tool usage
CREATE POLICY "Users can view own tool usage"
ON public.tool_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tool usage"
ON public.tool_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Feedback: Users can see their own feedback
CREATE POLICY "Users can view own feedback"
ON public.feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback"
ON public.feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Saved Queries: Users can see their own + public queries
CREATE POLICY "Users can view queries"
ON public.saved_queries FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create queries"
ON public.saved_queries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queries"
ON public.saved_queries FOR UPDATE
USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR ANALYTICS (Optional but helpful)
-- =====================================================

-- Daily active users
CREATE OR REPLACE VIEW public.daily_active_users AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as active_users
FROM public.analytics_events
WHERE event_type IN ('page_view', 'chat_message')
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Popular chat topics (based on message content keywords)
CREATE OR REPLACE VIEW public.chat_engagement_stats AS
SELECT
  c.user_id,
  COUNT(DISTINCT c.id) as total_conversations,
  COUNT(m.id) as total_messages,
  MAX(m.created_at) as last_message_at
FROM public.conversations c
LEFT JOIN public.messages m ON c.id = m.conversation_id
GROUP BY c.user_id;

-- Tool usage summary
CREATE OR REPLACE VIEW public.tool_usage_summary AS
SELECT
  tool_name,
  COUNT(*) as total_uses,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(processing_time_ms) as avg_processing_time_ms,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as success_rate
FROM public.tool_usage
GROUP BY tool_name
ORDER BY total_uses DESC;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- You can uncomment this to insert sample data for testing
/*
-- Insert a test user profile (after authentication)
INSERT INTO public.user_profiles (id, email, full_name, role, organization)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test Facilitator', 'facilitator', 'SMART Recovery AU');

-- Insert a test conversation
INSERT INTO public.conversations (id, user_id, title)
VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'First Chat');

-- Insert test messages
INSERT INTO public.messages (conversation_id, role, content)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'user', 'What did facilitators say about burnout?'),
  ('00000000-0000-0000-0000-000000000002', 'assistant', 'Based on the research, facilitators reported high levels of burnout due to...');
*/

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
--
-- To use this schema:
--
-- 1. Go to your Supabase project dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
--
-- The schema will create:
-- - All necessary tables
-- - Indexes for performance
-- - Row Level Security policies
-- - Helper functions and triggers
-- - Useful analytics views
--
-- After running this, update your .env.local with:
-- NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
-- NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
--
-- =====================================================
