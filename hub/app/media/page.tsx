'use client';

import { useState, useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Download, FileText, Video, Mic, Podcast, ExternalLink, Filter, Search, RefreshCw } from 'lucide-react';

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
  download_status: string;
  transcription_status: string;
  embedding_status: string;
  view_count: number;
  play_count: number;
  file_path?: string;
  thumbnail_url?: string;
}

export default function MediaPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMedia();
  }, [selectedType, selectedStatus]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/media?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setMediaItems(result.data);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMedia = async (mediaItemId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(mediaItemId));

      const response = await fetch('/api/media/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaItemId,
          steps: ['download', 'transcribe', 'embed'],
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Media processing started! This may take a few minutes.');
        fetchMedia(); // Refresh the list
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing media:', error);
      alert('Failed to start processing');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(mediaItemId);
        return newSet;
      });
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'podcast':
        return <Podcast className="w-5 h-5" />;
      default:
        return <Mic className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || colors.pending}`}>
        {status}
      </span>
    );
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
    const formatted = date.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
    return approx ? `~${formatted}` : formatted;
  };

  return (
    <Container className="py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Media Library</h1>
        <p className="text-gray-600">
          Browse interviews, podcasts, and videos featuring SMART Recovery Australia
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMedia()}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Types</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="podcast">Podcast</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Status</option>
                <option value="transcribed">Transcribed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={fetchMedia} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{mediaItems.length}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {mediaItems.filter(m => m.transcription_status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Transcribed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {mediaItems.filter(m => m.media_type === 'video').length}
            </div>
            <div className="text-sm text-gray-600">Videos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {mediaItems.filter(m => m.media_type === 'audio' || m.media_type === 'podcast').length}
            </div>
            <div className="text-sm text-gray-600">Audio/Podcasts</div>
          </CardContent>
        </Card>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading media...</p>
        </div>
      ) : mediaItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">No media items found.</p>
            <p className="text-sm text-gray-500 mt-2">
              Try adjusting your filters or importing media data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              {/* Thumbnail */}
              {item.thumbnail_url && (
                <div className="relative w-full h-48 bg-gray-100">
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(item.transcription_status)}
                  </div>
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getMediaIcon(item.media_type)}
                    <span className="text-xs text-gray-500 uppercase">{item.media_type}</span>
                  </div>
                  {!item.thumbnail_url && getStatusBadge(item.transcription_status)}
                </div>
                <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                <CardDescription className="line-clamp-2">{item.outlet_host}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {/* Why it matters */}
                  <p className="text-sm text-gray-600 line-clamp-3">{item.why_matters}</p>

                  {/* Metadata */}
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>
                      <strong>Date:</strong> {formatDate(item.publish_date, item.publish_date_approx)}
                    </div>
                    {item.duration_seconds && (
                      <div>
                        <strong>Duration:</strong> {formatDuration(item.duration_seconds)}
                      </div>
                    )}
                    {item.featured_people.length > 0 && (
                      <div>
                        <strong>Featured:</strong> {item.featured_people.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Topics */}
                  {item.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.topics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Status indicators */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {getStatusBadge(item.download_status)}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {getStatusBadge(item.transcription_status)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(item.source_url, '_blank')}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>

                    {item.transcription_status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => processMedia(item.id)}
                        disabled={processingIds.has(item.id)}
                        className="flex-1"
                      >
                        {processingIds.has(item.id) ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Process
                          </>
                        )}
                      </Button>
                    )}

                    {item.transcription_status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/media/${item.id}`}
                        className="flex-1"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Transcript
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
