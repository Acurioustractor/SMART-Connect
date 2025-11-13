'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ExternalLink, FileText, Video, Mic, Podcast, Clock, Calendar, User } from 'lucide-react';
import Link from 'next/link';

interface MediaItem {
  id: string;
  title: string;
  description: string;
  media_type: 'audio' | 'video' | 'podcast';
  outlet_host: string;
  source_url: string;
  publish_date: string;
  publish_date_approx: boolean;
  duration_seconds?: number;
  featured_people: string[];
  why_matters: string;
  topics: string[];
  tags: string[];
  transcription_status: string;
}

interface Transcript {
  id: string;
  transcript_text: string;
  transcript_markdown: string;
  language: string;
  confidence_score: number;
  word_count: number;
  segments: any[];
}

export default function MediaDetailPage() {
  const params = useParams();
  const mediaId = params.id as string;

  const [mediaItem, setMediaItem] = useState<MediaItem | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transcript' | 'segments'>('transcript');

  useEffect(() => {
    if (mediaId) {
      fetchMediaDetails();
    }
  }, [mediaId]);

  const fetchMediaDetails = async () => {
    try {
      setLoading(true);

      // Fetch media item
      const mediaResponse = await fetch(`/api/media?id=${mediaId}`);
      const mediaResult = await mediaResponse.json();

      if (mediaResult.success && mediaResult.data.length > 0) {
        setMediaItem(mediaResult.data[0]);

        // Fetch transcript if available
        if (mediaResult.data[0].transcription_status === 'completed') {
          const transcriptResponse = await fetch(`/api/media/transcript?mediaItemId=${mediaId}`);
          const transcriptResult = await transcriptResponse.json();

          if (transcriptResult.success) {
            setTranscript(transcriptResult.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching media details:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = (format: 'txt' | 'md' | 'srt') => {
    if (!transcript || !mediaItem) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'txt':
        content = transcript.transcript_text;
        filename = `${mediaItem.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        mimeType = 'text/plain';
        break;
      case 'md':
        content = transcript.transcript_markdown;
        filename = `${mediaItem.title.replace(/[^a-z0-9]/gi, '_')}.md`;
        mimeType = 'text/markdown';
        break;
      case 'srt':
        // TODO: Generate SRT from segments
        content = 'SRT format not yet implemented';
        filename = `${mediaItem.title.replace(/[^a-z0-9]/gi, '_')}.srt`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string, approx: boolean) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return approx ? `~${formatted}` : formatted;
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-6 h-6" />;
      case 'podcast':
        return <Podcast className="w-6 h-6" />;
      default:
        return <Mic className="w-6 h-6" />;
    }
  };

  const getYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  if (loading) {
    return (
      <Container className="py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading media details...</p>
        </div>
      </Container>
    );
  }

  if (!mediaItem) {
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Media item not found.</p>
            <Link href="/media">
              <Button className="mt-4" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Media Library
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/media">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Media Library
          </Button>
        </Link>
      </div>

      {/* YouTube Embed */}
      {mediaItem.source_url.includes('youtube.com') && (
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${getYouTubeId(mediaItem.source_url)}`}
                title={mediaItem.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              {getMediaIcon(mediaItem.media_type)}
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{mediaItem.title}</CardTitle>
              <CardDescription className="text-base">{mediaItem.outlet_host}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Why it matters */}
            <div>
              <h3 className="font-semibold mb-2">Why it matters</h3>
              <p className="text-gray-700">{mediaItem.why_matters}</p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-t border-b">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Published</div>
                  <div className="font-medium">
                    {formatDate(mediaItem.publish_date, mediaItem.publish_date_approx)}
                  </div>
                </div>
              </div>

              {mediaItem.duration_seconds && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Duration</div>
                    <div className="font-medium">{formatDuration(mediaItem.duration_seconds)}</div>
                  </div>
                </div>
              )}

              {mediaItem.featured_people.length > 0 && (
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Featured</div>
                    <div className="font-medium">{mediaItem.featured_people.join(', ')}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Topics */}
            {mediaItem.topics.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {mediaItem.topics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => window.open(mediaItem.source_url, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Original
              </Button>

              {transcript && (
                <Button variant="outline" onClick={() => downloadTranscript('txt')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Transcript
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcript */}
      {transcript ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Transcript
                </CardTitle>
                <CardDescription>
                  {transcript.word_count.toLocaleString()} words • {transcript.language.toUpperCase()} •
                  {Math.round(transcript.confidence_score * 100)}% confidence
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={activeTab === 'transcript' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('transcript')}
                >
                  Full Text
                </Button>
                <Button
                  size="sm"
                  variant={activeTab === 'segments' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('segments')}
                >
                  Timestamped
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {activeTab === 'transcript' ? (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">
                  {transcript.transcript_text}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {transcript.segments.map((segment: any, i: number) => (
                  <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="text-xs text-gray-500 mb-1">
                      {formatDuration(segment.start)} - {formatDuration(segment.end)}
                    </div>
                    <div className="text-gray-700">{segment.text}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {mediaItem.transcription_status === 'completed'
                ? 'Transcript not available'
                : 'This media has not been transcribed yet'}
            </p>
            {mediaItem.transcription_status === 'pending' && (
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Process Media
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
