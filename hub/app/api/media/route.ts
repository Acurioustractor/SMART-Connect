/**
 * API Route: /api/media
 * Handles media library operations (list, create, update, delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/media
 * List media items with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');

    // If ID is provided, fetch single item
    if (id) {
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[Media API] Error fetching media:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: [data],
      });
    }

    const mediaType = searchParams.get('type'); // audio, video, podcast
    const status = searchParams.get('status'); // download, transcription, embedding status
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const speaker = searchParams.get('speaker');
    const outlet = searchParams.get('outlet');
    const sortBy = searchParams.get('sortBy') || 'publish_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = supabase
      .from('media_items')
      .select('*', { count: 'exact' });

    // Apply filters
    if (mediaType) {
      query = query.eq('media_type', mediaType);
    }

    if (status === 'transcribed') {
      query = query.eq('transcription_status', 'completed');
    } else if (status === 'pending') {
      query = query.eq('transcription_status', 'pending');
    }

    if (search) {
      query = query.textSearch('search_vector', search);
    }

    if (speaker) {
      query = query.contains('featured_people', [speaker]);
    }

    if (outlet) {
      query = query.ilike('outlet_host', `%${outlet}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Media API] Error fetching media:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      },
    });
  } catch (error) {
    console.error('[Media API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media
 * Create a new media item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      description,
      media_type,
      outlet_host,
      source_url,
      publish_date,
      publish_date_approx,
      featured_people,
      why_matters,
      topics,
      tags,
    } = body;

    // Validate required fields
    if (!title || !media_type || !source_url) {
      return NextResponse.json(
        { error: 'Missing required fields: title, media_type, source_url' },
        { status: 400 }
      );
    }

    // Check if URL already exists
    const { data: existing } = await supabase
      .from('media_items')
      .select('id')
      .eq('source_url', source_url)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Media item with this URL already exists', id: existing.id },
        { status: 409 }
      );
    }

    // Insert media item
    const { data, error } = await supabase
      .from('media_items')
      .insert({
        title,
        description,
        media_type,
        outlet_host,
        source_url,
        publish_date,
        publish_date_approx: publish_date_approx || false,
        featured_people: featured_people || [],
        why_matters,
        topics: topics || [],
        tags: tags || [],
        download_status: 'pending',
        transcription_status: 'pending',
        embedding_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[Media API] Error creating media:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Media API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/media
 * Update media item
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing media item id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('media_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Media API] Error updating media:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Media API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media
 * Delete media item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing media item id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Media API] Error deleting media:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Media item deleted',
    });
  } catch (error) {
    console.error('[Media API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
