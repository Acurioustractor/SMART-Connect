/**
 * API Route: /api/media/search
 * Semantic search across media transcripts using embeddings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/media/search
 * Semantic search across media transcripts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10, threshold = 0.7, includeTranscript = true } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    console.log(`[Media Search] Searching for: ${query}`);

    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search using pgvector cosine similarity
    const { data: results, error } = await supabase.rpc('search_media_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('[Media Search] Error:', error);

      // Fallback: manual search if RPC function doesn't exist
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from('media_embeddings')
        .select(`
          *,
          media_items!inner(*),
          media_transcripts(*)
        `)
        .limit(limit);

      if (fallbackError) {
        throw fallbackError;
      }

      return NextResponse.json({
        success: true,
        results: fallbackResults || [],
        query,
        note: 'Using fallback search. Consider adding the search_media_embeddings RPC function.',
      });
    }

    // Enrich results with media details
    const enrichedResults = await Promise.all(
      (results || []).map(async (result: any) => {
        const { data: mediaItem } = await supabase
          .from('media_items')
          .select('*')
          .eq('id', result.media_item_id)
          .single();

        const { data: transcript } = includeTranscript
          ? await supabase
              .from('media_transcripts')
              .select('transcript_text, word_count, language')
              .eq('media_item_id', result.media_item_id)
              .single()
          : { data: null };

        return {
          ...result,
          media_item: mediaItem,
          transcript: transcript,
          similarity: result.similarity || 0,
        };
      })
    );

    console.log(`[Media Search] Found ${enrichedResults.length} results`);

    return NextResponse.json({
      success: true,
      results: enrichedResults,
      query,
      count: enrichedResults.length,
    });
  } catch (error) {
    console.error('[Media Search] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/media/search
 * Keyword search across media items and transcripts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    // Search media items
    const { data: mediaResults, error: mediaError } = await supabase
      .from('media_items')
      .select('*')
      .textSearch('search_vector', query)
      .limit(limit);

    if (mediaError) {
      throw mediaError;
    }

    // Search transcripts
    const { data: transcriptResults, error: transcriptError } = await supabase
      .from('media_transcripts')
      .select('*, media_items(*)')
      .textSearch('search_vector', query)
      .limit(limit);

    if (transcriptError) {
      throw transcriptError;
    }

    // Combine and deduplicate results
    const mediaItemIds = new Set<string>();
    const combinedResults: any[] = [];

    // Add media results
    mediaResults?.forEach(item => {
      if (!mediaItemIds.has(item.id)) {
        mediaItemIds.add(item.id);
        combinedResults.push({
          ...item,
          matchType: 'metadata',
        });
      }
    });

    // Add transcript results
    transcriptResults?.forEach(transcript => {
      const mediaId = transcript.media_items?.id;
      if (mediaId && !mediaItemIds.has(mediaId)) {
        mediaItemIds.add(mediaId);
        combinedResults.push({
          ...transcript.media_items,
          matchType: 'transcript',
          transcriptSnippet: transcript.transcript_text?.substring(0, 200) + '...',
        });
      }
    });

    return NextResponse.json({
      success: true,
      results: combinedResults,
      query,
      count: combinedResults.length,
    });
  } catch (error) {
    console.error('[Media Search] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
