import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function GET() {
  try {
    const supabase = getSupabase()

    const { data: jobs, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20)

    if (error) {
      throw error
    }

    return NextResponse.json({ jobs })
  } catch (error: any) {
    console.error('Failed to fetch jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: error.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
