/**
 * Media Transcription Service
 * Uses OpenAI Whisper API to transcribe audio/video content
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  segments?: TranscriptionSegment[];
  language?: string;
  duration?: number;
  wordCount?: number;
  confidence?: number;
  processingTimeMs?: number;
  costUsd?: number;
  error?: string;
}

export interface TranscriptionOptions {
  language?: string; // ISO-639-1 code (e.g., 'en', 'es')
  prompt?: string; // Optional text to guide the model
  temperature?: number; // 0-1, higher = more creative
  timestampGranularities?: ('segment' | 'word')[];
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

/**
 * Transcribe audio file using OpenAI Whisper API
 */
export async function transcribeAudio(
  filePath: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    console.log(`[Transcription] Starting transcription for: ${filePath}`);

    // Check file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file size
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    console.log(`[Transcription] File size: ${fileSizeMB.toFixed(2)} MB`);

    // Whisper API has 25MB limit, split if needed
    if (fileSizeMB > 25) {
      console.log('[Transcription] File exceeds 25MB, will need to split...');
      return await transcribeLargeFile(filePath, options);
    }

    // Create read stream
    const audioStream = createReadStream(filePath);

    // Call Whisper API with detailed response
    const response = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: options.language,
      prompt: options.prompt,
      temperature: options.temperature || 0,
      response_format: options.responseFormat || 'verbose_json',
      timestamp_granularities: options.timestampGranularities || ['segment'],
    });

    const processingTimeMs = Date.now() - startTime;

    // Parse response
    let text = '';
    let segments: TranscriptionSegment[] = [];
    let language = options.language || 'en';
    let duration = 0;

    if (typeof response === 'string') {
      text = response;
    } else {
      // @ts-ignore - verbose_json includes these fields
      text = response.text || '';
      // @ts-ignore
      segments = response.segments || [];
      // @ts-ignore
      language = response.language || language;
      // @ts-ignore
      duration = response.duration || 0;
    }

    const wordCount = text.split(/\s+/).length;

    // Calculate cost (rough estimate: $0.006 per minute)
    const durationMinutes = duration / 60;
    const costUsd = durationMinutes * 0.006;

    // Calculate confidence (average of segment confidences)
    let confidence = 0.95; // Default high confidence
    if (segments.length > 0) {
      const avgLogProb = segments.reduce((sum, seg) => sum + (seg.avg_logprob || 0), 0) / segments.length;
      // Convert log prob to confidence (rough approximation)
      confidence = Math.exp(avgLogProb);
    }

    console.log(`[Transcription] Completed in ${processingTimeMs}ms`);
    console.log(`[Transcription] Transcribed ${wordCount} words in ${language}`);
    console.log(`[Transcription] Duration: ${duration.toFixed(1)}s, Cost: $${costUsd.toFixed(4)}`);

    return {
      success: true,
      text,
      segments,
      language,
      duration,
      wordCount,
      confidence,
      processingTimeMs,
      costUsd,
    };
  } catch (error) {
    console.error('[Transcription] Error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Transcribe large audio files by splitting into chunks
 */
async function transcribeLargeFile(
  filePath: string,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  console.log('[Transcription] Splitting large file into chunks...');

  try {
    const { promisify } = await import('util');
    const { exec } = await import('child_process');
    const execAsync = promisify(exec);

    // Check if ffmpeg is available
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      throw new Error('ffmpeg is required for processing large files. Install it with: brew install ffmpeg (Mac) or apt-get install ffmpeg (Linux)');
    }

    // Get audio duration
    const ffprobeCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const { stdout: durationStr } = await execAsync(ffprobeCommand);
    const totalDuration = parseFloat(durationStr.trim());

    console.log(`[Transcription] Total duration: ${totalDuration.toFixed(1)}s`);

    // Split into 20-minute chunks (to stay well under 25MB)
    const chunkDuration = 20 * 60; // 20 minutes in seconds
    const numChunks = Math.ceil(totalDuration / chunkDuration);

    console.log(`[Transcription] Splitting into ${numChunks} chunks...`);

    const chunkResults: TranscriptionResult[] = [];
    const tempDir = path.dirname(filePath);

    // Process each chunk
    for (let i = 0; i < numChunks; i++) {
      const startOffset = i * chunkDuration;
      const chunkPath = path.join(tempDir, `chunk_${i}_${path.basename(filePath)}`);

      console.log(`[Transcription] Processing chunk ${i + 1}/${numChunks} (${startOffset}s - ${startOffset + chunkDuration}s)...`);

      // Extract chunk using ffmpeg
      const ffmpegCommand = `ffmpeg -y -i "${filePath}" -ss ${startOffset} -t ${chunkDuration} -acodec libmp3lame -ab 128k "${chunkPath}"`;
      await execAsync(ffmpegCommand);

      // Transcribe chunk with retry logic
      let chunkResult = await transcribeAudio(chunkPath, options);
      let retryCount = 0;
      const maxRetries = 2;

      while (!chunkResult.success && retryCount < maxRetries) {
        retryCount++;
        console.log(`[Transcription] Chunk ${i + 1} failed, retrying (${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
        chunkResult = await transcribeAudio(chunkPath, options);
      }

      if (chunkResult.success) {
        // Adjust segment timestamps to account for chunk offset
        if (chunkResult.segments) {
          chunkResult.segments = chunkResult.segments.map(seg => ({
            ...seg,
            start: seg.start + startOffset,
            end: seg.end + startOffset,
          }));
        }
        chunkResults.push(chunkResult);
      } else {
        console.error(`[Transcription] Chunk ${i + 1} failed after ${maxRetries} retries:`, chunkResult.error);

        // Clean up chunk file before throwing
        try {
          await fs.promises.unlink(chunkPath);
        } catch (e) {
          // Ignore cleanup errors
        }

        // Throw error instead of continuing with partial results
        throw new Error(`Chunk ${i + 1}/${numChunks} failed after ${maxRetries} retries: ${chunkResult.error}`);
      }

      // Clean up chunk file
      try {
        await fs.promises.unlink(chunkPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      // Small delay between chunks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Combine results
    if (chunkResults.length === 0) {
      return {
        success: false,
        error: 'All chunks failed to transcribe',
        processingTimeMs: Date.now() - startTime,
      };
    }

    const combinedText = chunkResults.map(r => r.text).join(' ');
    const combinedSegments: TranscriptionSegment[] = [];
    let segmentIdCounter = 0;

    for (const result of chunkResults) {
      if (result.segments) {
        for (const seg of result.segments) {
          combinedSegments.push({
            ...seg,
            id: segmentIdCounter++,
          });
        }
      }
    }

    const wordCount = combinedText.split(/\s+/).length;
    const totalCost = chunkResults.reduce((sum, r) => sum + (r.costUsd || 0), 0);
    const processingTimeMs = Date.now() - startTime;

    console.log(`[Transcription] Large file completed in ${processingTimeMs}ms`);
    console.log(`[Transcription] Transcribed ${wordCount} words from ${numChunks} chunks`);
    console.log(`[Transcription] Total cost: $${totalCost.toFixed(4)}`);

    return {
      success: true,
      text: combinedText,
      segments: combinedSegments,
      language: chunkResults[0].language,
      duration: totalDuration,
      wordCount,
      confidence: chunkResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / chunkResults.length,
      processingTimeMs,
      costUsd: totalCost,
    };
  } catch (error) {
    console.error('[Transcription] Large file error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Convert transcription to markdown format with timestamps
 */
export function formatTranscriptToMarkdown(
  text: string,
  segments?: TranscriptionSegment[]
): string {
  if (!segments || segments.length === 0) {
    return text;
  }

  let markdown = '# Transcript\n\n';

  for (const segment of segments) {
    const startTime = formatTimestamp(segment.start);
    const endTime = formatTimestamp(segment.end);

    markdown += `**[${startTime} - ${endTime}]**\n\n`;
    markdown += `${segment.text.trim()}\n\n`;
  }

  return markdown;
}

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Convert transcription to SRT subtitle format
 */
export function formatTranscriptToSRT(segments: TranscriptionSegment[]): string {
  if (!segments || segments.length === 0) {
    return '';
  }

  let srt = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    srt += `${i + 1}\n`;
    srt += `${formatSRTTimestamp(segment.start)} --> ${formatSRTTimestamp(segment.end)}\n`;
    srt += `${segment.text.trim()}\n\n`;
  }

  return srt;
}

/**
 * Format timestamp for SRT (HH:MM:SS,mmm)
 */
function formatSRTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
}

/**
 * Convert transcription to WebVTT subtitle format
 */
export function formatTranscriptToVTT(segments: TranscriptionSegment[]): string {
  if (!segments || segments.length === 0) {
    return '';
  }

  let vtt = 'WEBVTT\n\n';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    vtt += `${i + 1}\n`;
    vtt += `${formatVTTTimestamp(segment.start)} --> ${formatVTTTimestamp(segment.end)}\n`;
    vtt += `${segment.text.trim()}\n\n`;
  }

  return vtt;
}

/**
 * Format timestamp for WebVTT (HH:MM:SS.mmm)
 */
function formatVTTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

/**
 * Split transcript into chunks for embedding
 */
export function chunkTranscript(
  text: string,
  segments?: TranscriptionSegment[],
  maxChunkSize: number = 1000
): Array<{ text: string; startTime?: number; endTime?: number; index: number }> {
  const chunks: Array<{ text: string; startTime?: number; endTime?: number; index: number }> = [];

  if (!segments || segments.length === 0) {
    // Simple text splitting if no segments
    const words = text.split(/\s+/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const word of words) {
      if (currentChunk.length + word.length + 1 > maxChunkSize) {
        if (currentChunk) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunkIndex++,
          });
        }
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word;
      }
    }

    if (currentChunk) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
      });
    }

    return chunks;
  }

  // Chunk by segments
  let currentChunk = '';
  let chunkStartTime: number | undefined = undefined;
  let chunkIndex = 0;

  for (const segment of segments) {
    const segmentText = segment.text.trim();

    if (chunkStartTime === undefined) {
      chunkStartTime = segment.start;
    }

    if (currentChunk.length + segmentText.length + 1 > maxChunkSize) {
      if (currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          startTime: chunkStartTime,
          endTime: segment.start,
          index: chunkIndex++,
        });
      }
      currentChunk = segmentText;
      chunkStartTime = segment.start;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + segmentText;
    }
  }

  if (currentChunk) {
    chunks.push({
      text: currentChunk.trim(),
      startTime: chunkStartTime,
      endTime: segments[segments.length - 1].end,
      index: chunkIndex,
    });
  }

  return chunks;
}

/**
 * Detect language of audio file (uses Whisper for detection)
 */
export async function detectAudioLanguage(filePath: string): Promise<string> {
  try {
    const audioStream = createReadStream(filePath);

    const response = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    // @ts-ignore
    return response.language || 'en';
  } catch (error) {
    console.error('[Language Detection] Error:', error);
    return 'en'; // Default to English
  }
}

/**
 * Check if OpenAI API is configured
 */
export function isTranscriptionConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Estimate transcription cost
 */
export function estimateTranscriptionCost(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  return minutes * 0.006; // $0.006 per minute
}

/**
 * Batch transcribe multiple files
 */
export async function transcribeBatch(
  filePaths: string[],
  options: TranscriptionOptions = {}
): Promise<Array<{ filePath: string; result: TranscriptionResult }>> {
  const results: Array<{ filePath: string; result: TranscriptionResult }> = [];

  for (const filePath of filePaths) {
    console.log(`[Batch] Transcribing ${filePath}...`);
    const result = await transcribeAudio(filePath, options);
    results.push({ filePath, result });

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}
