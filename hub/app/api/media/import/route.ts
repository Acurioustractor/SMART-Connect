/**
 * API Route: /api/media/import
 * Import media items from a structured list
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MediaImportItem {
  title: string;
  type: string; // Radio interview, Podcast, Video, etc.
  outlet_host: string;
  date: string; // YYYY-MM-DD or approx
  url: string;
  why_matters: string;
}

/**
 * POST /api/media/import
 * Import multiple media items from a list
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, autoProcess } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Missing items array' },
        { status: 400 }
      );
    }

    console.log(`[Media Import] Importing ${items.length} media items...`);

    const results = {
      created: 0,
      skipped: 0,
      errors: 0,
      items: [] as any[],
    };

    for (const item of items) {
      try {
        // Detect media type from item.type
        let mediaType = 'audio'; // default
        if (item.type.toLowerCase().includes('video')) {
          mediaType = 'video';
        } else if (item.type.toLowerCase().includes('podcast')) {
          mediaType = 'podcast';
        }

        // Parse date
        let publishDate = null;
        let publishDateApprox = false;
        if (item.date) {
          if (item.date.includes('approx')) {
            publishDateApprox = true;
            const yearMatch = item.date.match(/\d{4}/);
            if (yearMatch) {
              publishDate = `${yearMatch[0]}-01-01`;
            }
          } else {
            publishDate = item.date;
          }
        }

        // Extract featured people from title/type
        const featuredPeople: string[] = [];
        const intervieweeMatch = item.title.match(/with ([^)]+)/i) ||
                                 item.type.match(/– ([^(]+)/);
        if (intervieweeMatch) {
          featuredPeople.push(intervieweeMatch[1].trim());
        }

        // Extract topics from title and why_matters
        const topics: string[] = [];
        const lowerTitle = item.title.toLowerCase();
        const lowerWhy = item.why_matters.toLowerCase();

        if (lowerTitle.includes('gambling') || lowerWhy.includes('gambling')) {
          topics.push('gambling harm');
        }
        if (lowerTitle.includes('addiction') || lowerWhy.includes('addiction')) {
          topics.push('addiction');
        }
        if (lowerTitle.includes('recovery') || lowerWhy.includes('recovery')) {
          topics.push('recovery');
        }
        if (lowerTitle.includes('smart') || lowerWhy.includes('smart')) {
          topics.push('SMART Recovery');
        }
        if (lowerTitle.includes('lgbtqia') || lowerWhy.includes('lgbtqia')) {
          topics.push('LGBTQIA+');
        }
        if (lowerTitle.includes('indigenous') || lowerTitle.includes('yarn') || lowerWhy.includes('first nations')) {
          topics.push('First Nations');
        }
        if (lowerTitle.includes('family') || lowerTitle.includes('carer') || lowerWhy.includes('family')) {
          topics.push('family & carers');
        }

        // Check if already exists
        const { data: existing } = await supabase
          .from('media_items')
          .select('id')
          .eq('source_url', item.url)
          .single();

        if (existing) {
          console.log(`[Media Import] Skipping (already exists): ${item.title}`);
          results.skipped++;
          results.items.push({
            title: item.title,
            status: 'skipped',
            reason: 'Already exists',
            id: existing.id,
          });
          continue;
        }

        // Insert media item
        const { data: newItem, error } = await supabase
          .from('media_items')
          .insert({
            title: item.title,
            description: item.why_matters,
            media_type: mediaType,
            outlet_host: item.outlet_host,
            source_url: item.url,
            publish_date: publishDate,
            publish_date_approx: publishDateApprox,
            featured_people: featuredPeople,
            why_matters: item.why_matters,
            topics: topics,
            tags: [],
            download_status: 'pending',
            transcription_status: 'pending',
            embedding_status: 'pending',
          })
          .select()
          .single();

        if (error) {
          console.error(`[Media Import] Error importing ${item.title}:`, error);
          results.errors++;
          results.items.push({
            title: item.title,
            status: 'error',
            error: error.message,
          });
          continue;
        }

        console.log(`[Media Import] Created: ${item.title}`);
        results.created++;
        results.items.push({
          title: item.title,
          status: 'created',
          id: newItem.id,
        });

        // If autoProcess is enabled, trigger processing
        if (autoProcess && newItem.id) {
          // Trigger processing in background (non-blocking)
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/media/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mediaItemId: newItem.id,
              steps: ['download', 'transcribe', 'embed'],
            }),
          }).catch(err => {
            console.error(`[Media Import] Failed to trigger processing for ${item.title}:`, err);
          });
        }
      } catch (error: any) {
        console.error(`[Media Import] Error processing item:`, error);
        results.errors++;
        results.items.push({
          title: item.title || 'Unknown',
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`[Media Import] Complete! Created: ${results.created}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

    return NextResponse.json({
      success: true,
      results,
      message: `Import complete. Created: ${results.created}, Skipped: ${results.skipped}, Errors: ${results.errors}`,
    });
  } catch (error) {
    console.error('[Media Import] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
