'use client';

import { useState, useEffect, useMemo } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Download, FileText, Video, Mic, Podcast, ExternalLink, Filter, Search, RefreshCw, ArrowUpDown, PlayCircle, Grid3x3, List, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';

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

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'views-desc' | 'duration-desc';
type ViewMode = 'grid' | 'list';

export default function MediaPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(24);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Get unique topics from all media items
  const allTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    mediaItems.forEach(item => {
      item.topics.forEach(topic => topicsSet.add(topic));
    });
    return Array.from(topicsSet).sort();
  }, [mediaItems]);

  // Filter, sort, and paginate media items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = mediaItems;

    // Apply search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.outlet_host.toLowerCase().includes(query) ||
        item.topics.some(t => t.toLowerCase().includes(query)) ||
        item.featured_people.some(p => p.toLowerCase().includes(query))
      );
    }

    // Apply topic filter
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(item => item.topics.includes(selectedTopic));
    }

    // Sort items
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
        case 'date-asc':
          return new Date(a.publish_date).getTime() - new Date(b.publish_date).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'views-desc':
          return (b.view_count || 0) - (a.view_count || 0);
        case 'duration-desc':
          return (b.duration_seconds || 0) - (a.duration_seconds || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [mediaItems, debouncedSearch, selectedTopic, sortBy]);

  // Paginate items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, endIndex);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);

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
          <div className="space-y-4">
            {/* Search and View Mode */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by title, description, topics, or featured people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                    {filteredAndSortedItems.length} results
                  </span>
                )}
              </div>
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-2"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-2"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Type Filter */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                  <option value="podcast">Podcast</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="transcribed">Transcribed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Topic Filter */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Topic</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => {
                    setSelectedTopic(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Topics</option>
                  {allTopics.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
                  <option value="views-desc">Most Viewed</option>
                  <option value="duration-desc">Longest First</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-end">
                <Button onClick={fetchMedia} variant="outline" size="sm" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(debouncedSearch || selectedType !== 'all' || selectedStatus !== 'all' || selectedTopic !== 'all') && (
              <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                <Filter className="w-4 h-4" />
                <span>
                  Showing {filteredAndSortedItems.length} of {mediaItems.length} items
                </span>
                {(debouncedSearch || selectedType !== 'all' || selectedStatus !== 'all' || selectedTopic !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedType('all');
                      setSelectedStatus('all');
                      setSelectedTopic('all');
                      setCurrentPage(1);
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredAndSortedItems.length}</div>
            <div className="text-sm text-gray-600">
              {debouncedSearch || selectedType !== 'all' || selectedStatus !== 'all' || selectedTopic !== 'all'
                ? 'Filtered'
                : 'Total'} Items
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {mediaItems.filter(m => m.transcription_status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Transcribed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {mediaItems.filter(m => m.transcription_status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {mediaItems.filter(m => m.media_type === 'video').length}
            </div>
            <div className="text-sm text-gray-600">Videos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {mediaItems.filter(m => m.media_type === 'audio' || m.media_type === 'podcast').length}
            </div>
            <div className="text-sm text-gray-600">Audio/Podcasts</div>
          </CardContent>
        </Card>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="w-full h-48 bg-gray-200 animate-pulse" />
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">No media items found.</p>
            <p className="text-sm text-gray-500 mt-2">
              {debouncedSearch || selectedType !== 'all' || selectedStatus !== 'all' || selectedTopic !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Import media data to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {paginatedItems.map((item) => (
            <Card
              key={item.id}
              className={`group hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer ${
                viewMode === 'list' ? 'flex flex-row' : ''
              }`}
              onClick={() => window.location.href = `/media/${item.id}`}
            >
              {/* Thumbnail */}
              {item.thumbnail_url && (
                <div className={`relative bg-gray-100 overflow-hidden ${
                  viewMode === 'list' ? 'w-64 h-36' : 'w-full h-48'
                }`}>
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                    <PlayCircle className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(item.transcription_status)}
                  </div>
                  {/* Media type badge */}
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    {getMediaIcon(item.media_type)}
                    <span className="uppercase">{item.media_type}</span>
                  </div>
                  {/* Duration badge */}
                  {item.duration_seconds && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      {formatDuration(item.duration_seconds)}
                    </div>
                  )}
                </div>
              )}

              <div className={viewMode === 'list' ? 'flex-1' : ''}>
                <CardHeader className={viewMode === 'list' ? 'pb-2' : ''}>
                  <div className="flex items-start justify-between mb-1">
                    <CardTitle className={`line-clamp-2 group-hover:text-blue-600 transition-colors ${
                      viewMode === 'list' ? 'text-base' : 'text-lg'
                    }`}>
                      {item.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="line-clamp-1 text-sm">
                    {item.outlet_host}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className={`space-y-3 ${viewMode === 'list' ? 'flex flex-col' : ''}`}>
                    {/* Why it matters */}
                    {viewMode === 'grid' && (
                      <p className="text-sm text-gray-600 line-clamp-2">{item.why_matters}</p>
                    )}

                    {/* Metadata */}
                    <div className={`text-xs text-gray-500 ${viewMode === 'list' ? 'flex items-center gap-4' : 'space-y-1'}`}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.publish_date, item.publish_date_approx)}
                      </div>
                      {item.view_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {item.view_count.toLocaleString()} views
                        </div>
                      )}
                      {item.featured_people.length > 0 && viewMode === 'grid' && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.featured_people.slice(0, 2).join(', ')}
                          {item.featured_people.length > 2 && ` +${item.featured_people.length - 2}`}
                        </div>
                      )}
                    </div>

                    {/* Topics */}
                    {item.topics.length > 0 && viewMode === 'grid' && (
                      <div className="flex flex-wrap gap-1">
                        {item.topics.slice(0, 3).map((topic, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                          >
                            {topic}
                          </span>
                        ))}
                        {item.topics.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            +{item.topics.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {viewMode === 'grid' && (
                      <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.source_url, '_blank');
                          }}
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Source
                        </Button>

                        {item.transcription_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              processMedia(item.id);
                            }}
                            disabled={processingIds.has(item.id)}
                            className="flex-1"
                          >
                            {processingIds.has(item.id) ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                                Processing
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
                            variant="default"
                            className="flex-1"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                // Show first page, last page, current page, and pages around current
                const showPage = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                const showEllipsis = (page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2);

                if (showEllipsis) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }

                if (!showPage) return null;

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>

            <span className="ml-4 text-sm text-gray-600">
              Page {currentPage} of {totalPages} ({filteredAndSortedItems.length} items)
            </span>
          </div>
        )}
        </>
      )}
    </Container>
  );
}
