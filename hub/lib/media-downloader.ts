/**
 * Media Downloader Utilities
 * Handles downloading media from various sources including:
 * - YouTube
 * - Omny Studio (podcast platform)
 * - 3CR Community Radio
 * - ABC Radio
 * - Podbean
 * - SoundCloud
 * - Spotify
 * - Apple Podcasts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);

export interface MediaDownloadResult {
  success: boolean;
  filePath?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  audioCodec?: string;
  videoCodec?: string;
  bitrate?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MediaDownloadOptions {
  outputDir?: string;
  format?: 'mp3' | 'mp4' | 'm4a' | 'wav' | 'best';
  quality?: 'high' | 'medium' | 'low';
  audioOnly?: boolean;
}

/**
 * Detect media source from URL
 */
export function detectMediaSource(url: string): string {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube';
  }
  if (urlLower.includes('omny.fm')) {
    return 'omny';
  }
  if (urlLower.includes('3cr.org.au')) {
    return '3cr';
  }
  if (urlLower.includes('abc.net.au')) {
    return 'abc';
  }
  if (urlLower.includes('podbean.com')) {
    return 'podbean';
  }
  if (urlLower.includes('soundcloud.com')) {
    return 'soundcloud';
  }
  if (urlLower.includes('spotify.com')) {
    return 'spotify';
  }
  if (urlLower.includes('apple.com/podcast') || urlLower.includes('podcasts.apple.com')) {
    return 'apple-podcasts';
  }

  return 'generic';
}

/**
 * Download media from any supported source
 */
export async function downloadMedia(
  url: string,
  options: MediaDownloadOptions = {}
): Promise<MediaDownloadResult> {
  const source = detectMediaSource(url);

  console.log(`[MediaDownloader] Downloading from ${source}: ${url}`);

  try {
    switch (source) {
      case 'youtube':
        return await downloadFromYouTube(url, options);
      case 'omny':
        return await downloadFromOmny(url, options);
      case '3cr':
        return await downloadFrom3CR(url, options);
      case 'abc':
        return await downloadFromABC(url, options);
      case 'podbean':
        return await downloadFromPodbean(url, options);
      case 'soundcloud':
        return await downloadFromSoundCloud(url, options);
      case 'spotify':
        return await downloadFromSpotify(url, options);
      case 'apple-podcasts':
        return await downloadFromApplePodcasts(url, options);
      default:
        return await downloadGeneric(url, options);
    }
  } catch (error) {
    console.error(`[MediaDownloader] Error downloading ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Download from YouTube using yt-dlp (improved fork of youtube-dl)
 */
async function downloadFromYouTube(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  const outputDir = options.outputDir || '/tmp/media-downloads';
  await fs.mkdir(outputDir, { recursive: true });

  const outputTemplate = path.join(outputDir, '%(id)s.%(ext)s');

  // Build yt-dlp command
  let cmd = 'yt-dlp';

  // Audio only option
  if (options.audioOnly) {
    cmd += ' -x --audio-format mp3 --audio-quality 0';
  } else {
    cmd += ' -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"';
  }

  cmd += ` -o "${outputTemplate}"`;
  cmd += ' --print-json'; // Get metadata as JSON
  cmd += ` "${url}"`;

  console.log(`[YouTube] Running: ${cmd}`);

  try {
    const { stdout, stderr } = await execAsync(cmd);

    // Log any warnings or errors from yt-dlp
    if (stderr) {
      console.log(`[YouTube] stderr: ${stderr.slice(0, 500)}`);
    }

    // Parse JSON output from yt-dlp
    const metadata = JSON.parse(stdout);
    let filePath = metadata._filename || metadata.requested_downloads?.[0]?.filename;

    if (!filePath) {
      throw new Error('Could not determine output file path from yt-dlp metadata');
    }

    // Check if file exists at the reported path
    let fileExists = false;
    try {
      await fs.stat(filePath);
      fileExists = true;
    } catch {
      console.log(`[YouTube] File not found at expected path: ${filePath}`);

      // Try to find the file with the same ID but different extension
      const parsedPath = path.parse(filePath);
      const fileId = parsedPath.name;

      console.log(`[YouTube] Searching for files matching pattern: ${fileId}.*`);

      const files = await fs.readdir(outputDir);
      const matchingFiles = files.filter(f => f.startsWith(fileId + '.'));

      if (matchingFiles.length > 0) {
        filePath = path.join(outputDir, matchingFiles[0]);
        console.log(`[YouTube] Found file at: ${filePath}`);
        fileExists = true;
      }
    }

    if (!fileExists) {
      const files = await fs.readdir(outputDir);
      console.error(`[YouTube] Available files in ${outputDir}:`, files);
      throw new Error(`Downloaded file not found. Expected: ${filePath}`);
    }

    const stats = await fs.stat(filePath);

    return {
      success: true,
      filePath,
      duration: metadata.duration,
      fileSize: stats.size,
      mimeType: metadata.ext === 'mp4' ? 'video/mp4' : 'audio/mpeg',
      audioCodec: metadata.acodec,
      videoCodec: metadata.vcodec,
      bitrate: metadata.abr || metadata.tbr,
      metadata: {
        title: metadata.title,
        description: metadata.description,
        uploader: metadata.uploader,
        uploadDate: metadata.upload_date,
        viewCount: metadata.view_count,
        likeCount: metadata.like_count,
      },
    };
  } catch (error) {
    console.error('[YouTube] Download error:', error);
    throw error;
  }
}

/**
 * Download from Omny Studio (podcast platform)
 */
async function downloadFromOmny(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  // Omny URLs are like: https://omny.fm/shows/show-name/episode-name
  // We need to fetch the page and extract the actual audio URL

  try {
    const response = await fetch(url);
    const html = await response.text();

    // Look for audio URL in the HTML
    // Omny embeds audio URLs in JSON-LD or meta tags
    const audioUrlMatch = html.match(/"AudioUrl":"([^"]+)"/i) ||
                          html.match(/<meta property="og:audio" content="([^"]+)"/i);

    if (!audioUrlMatch) {
      // Try using yt-dlp which supports many podcast platforms
      return await downloadWithYtDlp(url, options);
    }

    const audioUrl = audioUrlMatch[1];
    return await downloadGeneric(audioUrl, options);
  } catch (error) {
    console.error('[Omny] Error:', error);
    // Fallback to yt-dlp
    return await downloadWithYtDlp(url, options);
  }
}

/**
 * Download from 3CR Community Radio
 */
async function downloadFrom3CR(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  // 3CR URLs are like: https://www.3cr.org.au/livingfree/episode/...
  // They often have direct MP3 links in the page

  try {
    const response = await fetch(url);
    const html = await response.text();

    // Look for MP3 URL
    const mp3UrlMatch = html.match(/href="([^"]+\.mp3)"/i) ||
                        html.match(/<audio[^>]*src="([^"]+)"/i);

    if (!mp3UrlMatch) {
      throw new Error('Could not find audio URL on 3CR page');
    }

    let audioUrl = mp3UrlMatch[1];

    // Make URL absolute if needed
    if (audioUrl.startsWith('/')) {
      audioUrl = `https://www.3cr.org.au${audioUrl}`;
    }

    return await downloadGeneric(audioUrl, options);
  } catch (error) {
    console.error('[3CR] Error:', error);
    throw error;
  }
}

/**
 * Download from ABC Radio
 */
async function downloadFromABC(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  // ABC uses a complex player, best to use yt-dlp
  return await downloadWithYtDlp(url, options);
}

/**
 * Download from Podbean
 */
async function downloadFromPodbean(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  // Try to extract direct audio URL from Podbean page first
  // This avoids the recursion issues with yt-dlp's generic extractor
  try {
    console.log('[Podbean] Attempting to extract direct audio URL...');
    const response = await fetch(url);
    const html = await response.text();

    // Podbean typically has the audio URL in a data attribute or in JSON
    // Look for patterns like: data-url="..." or src="..." in audio tags
    const audioUrlPatterns = [
      /"audioUrl":"([^"]+)"/i,
      /data-url="([^"]+\.mp3[^"]*)"/i,
      /<audio[^>]+src="([^"]+)"/i,
      /"logo_url":"[^"]+","media":"([^"]+)"/i,
      /"media_url":"([^"]+)"/i,
    ];

    let audioUrl: string | null = null;
    for (const pattern of audioUrlPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        audioUrl = match[1];
        // Decode if it's URL encoded
        audioUrl = audioUrl.replace(/\\u002F/g, '/').replace(/\\/g, '');
        console.log(`[Podbean] Found audio URL: ${audioUrl.slice(0, 100)}...`);
        break;
      }
    }

    if (audioUrl) {
      // Download directly
      return await downloadGeneric(audioUrl, options);
    }

    console.log('[Podbean] Could not extract direct URL, falling back to yt-dlp...');
  } catch (error) {
    console.log('[Podbean] Direct extraction failed:', error);
    console.log('[Podbean] Falling back to yt-dlp...');
  }

  // Fallback to yt-dlp
  try {
    return await downloadWithYtDlp(url, options);
  } catch (error: any) {
    // Check if it's the recursion error
    if (error.message?.includes('RecursionError') || error.message?.includes('maximum recursion')) {
      throw new Error(
        'Podbean download failed due to yt-dlp recursion error. ' +
        'This URL may require manual download or updating yt-dlp. ' +
        'Please run: bash hub/scripts/update-yt-dlp.sh'
      );
    }
    throw error;
  }
}

/**
 * Download from SoundCloud
 */
async function downloadFromSoundCloud(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  // SoundCloud is well supported by yt-dlp
  return await downloadWithYtDlp(url, options);
}

/**
 * Download from Spotify (Note: requires special handling)
 */
async function downloadFromSpotify(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  // Spotify requires authentication and special tools
  // For now, we'll skip or return an error
  return {
    success: false,
    error: 'Spotify downloads require special authentication. Please use Spotify API or consider alternative sources.',
  };
}

/**
 * Download from Apple Podcasts
 */
async function downloadFromApplePodcasts(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  // Apple Podcasts can sometimes be handled by yt-dlp
  // Or we need to extract RSS feed and get audio URL
  return await downloadWithYtDlp(url, options);
}

/**
 * Generic download using yt-dlp (supports many sites)
 */
async function downloadWithYtDlp(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  const outputDir = options.outputDir || '/tmp/media-downloads';
  await fs.mkdir(outputDir, { recursive: true });

  const outputTemplate = path.join(outputDir, '%(id)s.%(ext)s');

  let cmd = 'yt-dlp';
  cmd += ' -x --audio-format mp3 --audio-quality 0';
  cmd += ` -o "${outputTemplate}"`;
  cmd += ' --print-json';
  cmd += ` "${url}"`;

  console.log(`[yt-dlp] Running: ${cmd}`);

  try {
    const { stdout, stderr } = await execAsync(cmd);

    // Log any warnings or errors from yt-dlp
    if (stderr) {
      console.log(`[yt-dlp] stderr: ${stderr.slice(0, 500)}`);
    }

    const metadata = JSON.parse(stdout);
    let filePath = metadata._filename || metadata.requested_downloads?.[0]?.filename;

    if (!filePath) {
      throw new Error('Could not determine output file path from yt-dlp metadata');
    }

    // Check if file exists at the reported path
    let fileExists = false;
    try {
      await fs.stat(filePath);
      fileExists = true;
    } catch {
      console.log(`[yt-dlp] File not found at expected path: ${filePath}`);

      // Try to find the file with the same ID but different extension
      // Extract the ID from the expected path
      const parsedPath = path.parse(filePath);
      const fileId = parsedPath.name; // This is the filename without extension

      console.log(`[yt-dlp] Searching for files matching pattern: ${fileId}.*`);

      // List all files in the output directory
      const files = await fs.readdir(outputDir);
      const matchingFiles = files.filter(f => f.startsWith(fileId + '.'));

      if (matchingFiles.length > 0) {
        // Use the first matching file (should only be one)
        filePath = path.join(outputDir, matchingFiles[0]);
        console.log(`[yt-dlp] Found file at: ${filePath}`);
        fileExists = true;
      }
    }

    if (!fileExists) {
      // List directory contents for debugging
      const files = await fs.readdir(outputDir);
      console.error(`[yt-dlp] Available files in ${outputDir}:`, files);
      throw new Error(`Downloaded file not found. Expected: ${filePath}`);
    }

    const stats = await fs.stat(filePath);

    return {
      success: true,
      filePath,
      duration: metadata.duration,
      fileSize: stats.size,
      mimeType: 'audio/mpeg',
      audioCodec: metadata.acodec,
      bitrate: metadata.abr,
      metadata: {
        title: metadata.title,
        description: metadata.description,
        uploader: metadata.uploader,
      },
    };
  } catch (error) {
    console.error('[yt-dlp] Error:', error);
    throw error;
  }
}

/**
 * Generic HTTP(S) download for direct audio/video URLs
 */
async function downloadGeneric(
  url: string,
  options: MediaDownloadOptions
): Promise<MediaDownloadResult> {
  const outputDir = options.outputDir || '/tmp/media-downloads';
  await fs.mkdir(outputDir, { recursive: true });

  // Generate filename from URL
  const urlObj = new URL(url);
  const filename = path.basename(urlObj.pathname) || `download-${Date.now()}.mp3`;
  const filePath = path.join(outputDir, filename);

  console.log(`[Generic] Downloading ${url} to ${filePath}`);

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(filePath);

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlink(filePath).catch(() => {});
          downloadGeneric(redirectUrl, options).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(filePath).catch(() => {});
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const contentLength = parseInt(response.headers['content-length'] || '0');
      const mimeType = response.headers['content-type'] || 'audio/mpeg';

      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const progress = contentLength ? (downloadedBytes / contentLength * 100).toFixed(1) : '?';
        console.log(`[Generic] Progress: ${progress}% (${downloadedBytes}/${contentLength} bytes)`);
      });

      response.pipe(file);

      file.on('finish', async () => {
        file.close();

        const stats = await fs.stat(filePath);

        resolve({
          success: true,
          filePath,
          fileSize: stats.size,
          mimeType,
        });
      });
    }).on('error', (error) => {
      file.close();
      fs.unlink(filePath).catch(() => {});
      reject(error);
    });
  });
}

/**
 * Check if yt-dlp is installed
 */
export async function checkYtDlpInstalled(): Promise<boolean> {
  try {
    await execAsync('which yt-dlp');
    return true;
  } catch {
    try {
      await execAsync('which youtube-dl');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Install yt-dlp instructions
 */
export function getYtDlpInstallInstructions(): string {
  return `
yt-dlp is not installed. To install:

# On Ubuntu/Debian:
sudo apt install yt-dlp

# Or using pip:
pip install -U yt-dlp

# Or download binary:
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
`;
}

/**
 * Extract metadata from URL without downloading
 */
export async function extractMediaMetadata(url: string): Promise<Record<string, any>> {
  const source = detectMediaSource(url);

  if (source === 'youtube' || source === 'soundcloud') {
    try {
      const cmd = `yt-dlp --dump-json --no-download "${url}"`;
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      console.error('[Metadata] Error:', error);
      return {};
    }
  }

  // For other sources, fetch HTML and try to extract metadata
  try {
    const response = await fetch(url);
    const html = await response.text();

    const metadata: Record<string, any> = {};

    // Extract Open Graph tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
    if (titleMatch) metadata.title = titleMatch[1];

    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
    if (descMatch) metadata.description = descMatch[1];

    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (imageMatch) metadata.thumbnail = imageMatch[1];

    return metadata;
  } catch (error) {
    console.error('[Metadata] Error:', error);
    return {};
  }
}
