/**
 * API Route: /api/media/process
 * Full media processing pipeline: download → transcribe → embed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { downloadMedia, extractMediaMetadata } from '@/lib/media-downloader';
import { transcribeAudio, chunkTranscript, formatTranscriptToMarkdown } from '@/lib/media-transcription';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs/promises';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/media/process
 * Process a media item: download, transcribe, and create embeddings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaItemId, steps } = body;

    if (!mediaItemId) {
      return NextResponse.json(
        { error: 'Missing mediaItemId' },
        { status: 400 }
      );
    }

    // Get media item
    const { data: mediaItem, error: fetchError } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', mediaItemId)
      .single();

    if (fetchError || !mediaItem) {
      return NextResponse.json(
        { error: 'Media item not found' },
        { status: 404 }
      );
    }

    const processSteps = steps || ['download', 'transcribe', 'embed'];
    const results: any = {};

    console.log(`[Media Process] Starting processing for: ${mediaItem.title}`);
    console.log(`[Media Process] Steps: ${processSteps.join(' → ')}`);

    // Create processing job
    const { data: job } = await supabase
      .from('media_processing_jobs')
      .insert({
        media_item_id: mediaItemId,
        job_type: 'full_pipeline',
        status: 'running',
        started_at: new Date().toISOString(),
        items_total: processSteps.length,
      })
      .select()
      .single();

    // STEP 1: Download media
    if (processSteps.includes('download') && mediaItem.download_status !== 'completed') {
      console.log('[Media Process] Step 1: Downloading media...');

      try {
        await supabase
          .from('media_items')
          .update({ download_status: 'downloading' })
          .eq('id', mediaItemId);

        const downloadResult = await downloadMedia(mediaItem.source_url, {
          outputDir: '/tmp/media-downloads',
          audioOnly: mediaItem.media_type === 'audio' || mediaItem.media_type === 'podcast',
        });

        if (downloadResult.success && downloadResult.filePath) {
          // Upload to Supabase Storage
          const fileName = `${mediaItemId}${path.extname(downloadResult.filePath)}`;
          const fileContent = await fs.readFile(downloadResult.filePath);

          const { error: uploadError } = await supabase.storage
            .from('media-files')
            .upload(fileName, fileContent, {
              contentType: downloadResult.mimeType || 'audio/mpeg',
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }

          // Update media item
          await supabase
            .from('media_items')
            .update({
              download_status: 'completed',
              file_path: fileName,
              duration_seconds: downloadResult.duration,
              file_size_bytes: downloadResult.fileSize,
              mime_type: downloadResult.mimeType,
              audio_codec: downloadResult.audioCodec,
              video_codec: downloadResult.videoCodec,
              bitrate_kbps: downloadResult.bitrate,
              last_processed_at: new Date().toISOString(),
            })
            .eq('id', mediaItemId);

          results.download = {
            success: true,
            fileName,
            fileSize: downloadResult.fileSize,
            duration: downloadResult.duration,
          };

          // Clean up temp file
          await fs.unlink(downloadResult.filePath).catch(() => {});
        } else {
          throw new Error(downloadResult.error || 'Download failed');
        }
      } catch (error: any) {
        console.error('[Media Process] Download error:', error);

        await supabase
          .from('media_items')
          .update({
            download_status: 'failed',
            download_error: error.message,
          })
          .eq('id', mediaItemId);

        results.download = {
          success: false,
          error: error.message,
        };

        // Update job
        await supabase
          .from('media_processing_jobs')
          .update({
            status: 'failed',
            error_message: `Download failed: ${error.message}`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        return NextResponse.json({
          success: false,
          error: `Download failed: ${error.message}`,
          results,
        }, { status: 500 });
      }
    }

    // Get updated media item with file path
    const { data: updatedMediaItem } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', mediaItemId)
      .single();

    // STEP 2: Transcribe audio
    if (processSteps.includes('transcribe') && updatedMediaItem.transcription_status !== 'completed') {
      console.log('[Media Process] Step 2: Transcribing audio...');

      try {
        await supabase
          .from('media_items')
          .update({ transcription_status: 'processing' })
          .eq('id', mediaItemId);

        if (!updatedMediaItem.file_path) {
          throw new Error('No file available for transcription');
        }

        // Download from Supabase Storage to temp file
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('media-files')
          .download(updatedMediaItem.file_path);

        if (downloadError || !fileData) {
          throw new Error('Failed to download file from storage');
        }

        // Preserve original file extension for Whisper API
        const fileExtension = path.extname(updatedMediaItem.file_path) || '.mp3';
        const tempPath = `/tmp/${mediaItemId}${fileExtension}`;
        const buffer = Buffer.from(await fileData.arrayBuffer());
        await fs.writeFile(tempPath, buffer);

        // Transcribe
        const transcriptionResult = await transcribeAudio(tempPath, {
          language: 'en',
          responseFormat: 'verbose_json',
          timestampGranularities: ['segment'],
        });

        // Clean up temp file
        await fs.unlink(tempPath).catch(() => {});

        if (transcriptionResult.success && transcriptionResult.text) {
          // Format markdown
          const markdown = formatTranscriptToMarkdown(
            transcriptionResult.text,
            transcriptionResult.segments
          );

          // Insert transcript
          const { error: transcriptError } = await supabase
            .from('media_transcripts')
            .insert({
              media_item_id: mediaItemId,
              transcript_text: transcriptionResult.text,
              transcript_markdown: markdown,
              transcription_service: 'openai-whisper',
              language: transcriptionResult.language || 'en',
              confidence_score: transcriptionResult.confidence,
              segments: transcriptionResult.segments || [],
              word_count: transcriptionResult.wordCount,
              processing_time_seconds: Math.floor((transcriptionResult.processingTimeMs || 0) / 1000),
              cost_usd: transcriptionResult.costUsd,
            })
            .select()
            .single();

          if (transcriptError) {
            throw new Error(`Failed to save transcript: ${transcriptError.message}`);
          }

          // Update media item
          await supabase
            .from('media_items')
            .update({
              transcription_status: 'completed',
              last_processed_at: new Date().toISOString(),
            })
            .eq('id', mediaItemId);

          results.transcribe = {
            success: true,
            wordCount: transcriptionResult.wordCount,
            duration: transcriptionResult.duration,
            cost: transcriptionResult.costUsd,
          };
        } else {
          throw new Error(transcriptionResult.error || 'Transcription failed');
        }
      } catch (error: any) {
        console.error('[Media Process] Transcription error:', error);

        await supabase
          .from('media_items')
          .update({
            transcription_status: 'failed',
            transcription_error: error.message,
          })
          .eq('id', mediaItemId);

        results.transcribe = {
          success: false,
          error: error.message,
        };
      }
    }

    // STEP 3: Create embeddings
    if (processSteps.includes('embed') && updatedMediaItem.embedding_status !== 'completed') {
      console.log('[Media Process] Step 3: Creating embeddings...');

      try {
        await supabase
          .from('media_items')
          .update({ embedding_status: 'processing' })
          .eq('id', mediaItemId);

        // Get transcript
        const { data: transcript } = await supabase
          .from('media_transcripts')
          .select('*')
          .eq('media_item_id', mediaItemId)
          .single();

        if (!transcript) {
          throw new Error('No transcript available for embedding');
        }

        // Chunk transcript
        const chunks = chunkTranscript(
          transcript.transcript_text,
          transcript.segments,
          1000 // max chunk size in characters
        );

        console.log(`[Media Process] Creating ${chunks.length} embeddings...`);

        // Create embeddings for each chunk
        const embeddings = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          try {
            const response = await openai.embeddings.create({
              model: 'text-embedding-ada-002',
              input: chunk.text,
            });

            embeddings.push({
              media_item_id: mediaItemId,
              transcript_id: transcript.id,
              chunk_text: chunk.text,
              chunk_index: chunk.index,
              start_time_seconds: chunk.startTime,
              end_time_seconds: chunk.endTime,
              embedding: response.data[0].embedding,
              chunk_word_count: chunk.text.split(/\s+/).length,
            });

            // Log progress every 10 chunks
            if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
              console.log(`[Media Process] Embeddings progress: ${i + 1}/${chunks.length}`);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (embeddingError: any) {
            console.error(`[Media Process] Failed to create embedding for chunk ${i}:`, embeddingError.message);
            throw new Error(`Embedding creation failed at chunk ${i + 1}/${chunks.length}: ${embeddingError.message}`);
          }
        }

        console.log(`[Media Process] All ${embeddings.length} embeddings created successfully`);

        // Insert embeddings
        console.log(`[Media Process] Inserting ${embeddings.length} embeddings into database...`);
        const { error: embeddingError } = await supabase
          .from('media_embeddings')
          .insert(embeddings);

        if (embeddingError) {
          console.error('[Media Process] Database insert error:', embeddingError);
          throw new Error(`Failed to save embeddings: ${embeddingError.message}`);
        }

        console.log(`[Media Process] Embeddings saved to database successfully`);


        // Update media item
        await supabase
          .from('media_items')
          .update({
            embedding_status: 'completed',
            last_processed_at: new Date().toISOString(),
          })
          .eq('id', mediaItemId);

        results.embed = {
          success: true,
          embeddingCount: embeddings.length,
        };
      } catch (error: any) {
        console.error('[Media Process] Embedding error:', error);

        await supabase
          .from('media_items')
          .update({
            embedding_status: 'failed',
          })
          .eq('id', mediaItemId);

        results.embed = {
          success: false,
          error: error.message,
        };
      }
    }

    // Update job as completed
    await supabase
      .from('media_processing_jobs')
      .update({
        status: 'completed',
        result_data: results,
        completed_at: new Date().toISOString(),
        items_processed: processSteps.length,
        progress_percent: 100,
      })
      .eq('id', job.id);

    console.log('[Media Process] Processing complete!');

    const responseData = {
      success: true,
      results,
      message: 'Media processing completed',
    };

    console.log('[Media Process] Sending response...');
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[Media Process] Error:', error);
    console.error('[Media Process] Error stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/media/process
 * Get processing job status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const mediaItemId = searchParams.get('mediaItemId');

    if (jobId) {
      const { data, error } = await supabase
        .from('media_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    if (mediaItemId) {
      const { data, error } = await supabase
        .from('media_processing_jobs')
        .select('*')
        .eq('media_item_id', mediaItemId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    // List recent jobs
    const { data, error } = await supabase
      .from('media_processing_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Media Process] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
