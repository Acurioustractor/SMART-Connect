/**
 * API Route: /api/media/transcript
 * Get transcript for a media item
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/media/transcript
 * Get transcript for a media item
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaItemId = searchParams.get('mediaItemId');
    const transcriptId = searchParams.get('transcriptId');

    if (!mediaItemId && !transcriptId) {
      return NextResponse.json(
        { error: 'Missing mediaItemId or transcriptId' },
        { status: 400 }
      );
    }

    let query = supabase.from('media_transcripts').select('*');

    if (transcriptId) {
      query = query.eq('id', transcriptId);
    } else if (mediaItemId) {
      query = query.eq('media_item_id', mediaItemId);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('[Transcript API] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Transcript API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
