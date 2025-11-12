'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface ScrapingJob {
  id: string
  job_type: string
  target_url: string
  status: string
  progress_percent: number
  pages_discovered: number
  pages_scraped: number
  pdfs_processed: number
  started_at: string
  completed_at: string
  duration_seconds: number
  error_message?: string
}

export default function ScrapingDashboard() {
  const [jobs, setJobs] = useState<ScrapingJob[]>([])
  const [activeJob, setActiveJob] = useState<ScrapingJob | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // Fetch jobs on mount and refresh every 5 seconds if there's an active job
  useEffect(() => {
    fetchJobs()
    const interval = setInterval(() => {
      if (jobs.some(j => j.status === 'running' || j.status === 'pending')) {
        fetchJobs()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [jobs])

  const fetchJobs = async () => {
    try {
      // You'll need to create an API endpoint to list jobs
      // For now, this is a placeholder
      const response = await fetch('/api/content/scraping-jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
        const running = data.jobs?.find((j: ScrapingJob) => j.status === 'running')
        if (running) setActiveJob(running)
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    }
  }

  const startCrawl = async () => {
    setIsStarting(true)
    try {
      const response = await fetch('/api/content/scrape-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_crawl',
          url: 'https://smartrecoveryaustralia.com.au'
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Crawl started:', data.jobId)
        fetchJobs()
      }
    } catch (error) {
      console.error('Failed to start crawl:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const processResults = async (jobId: string) => {
    try {
      const response = await fetch('/api/content/scrape-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_results',
          jobId
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Processing complete:', data)
        fetchJobs()
      }
    } catch (error) {
      console.error('Failed to process results:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'running': return 'bg-blue-500'
      case 'pending': return 'bg-yellow-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Content Scraping Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage website crawls</p>
        </div>
        <Button onClick={startCrawl} disabled={isStarting}>
          {isStarting ? 'Starting...' : 'Start New Crawl'}
        </Button>
      </div>

      {/* Active Job */}
      {activeJob && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Active Crawl
              <Badge className={getStatusColor(activeJob.status)}>
                {activeJob.status}
              </Badge>
            </CardTitle>
            <CardDescription>{activeJob.target_url}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Progress</span>
                <span className="font-medium">
                  {activeJob.pages_scraped}/{activeJob.pages_discovered} pages
                </span>
              </div>
              <Progress value={activeJob.progress_percent || 0} />
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Pages Discovered</div>
                <div className="text-2xl font-bold">{activeJob.pages_discovered}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Pages Scraped</div>
                <div className="text-2xl font-bold">{activeJob.pages_scraped}</div>
              </div>
              <div>
                <div className="text-muted-foreground">PDFs Processed</div>
                <div className="text-2xl font-bold">{activeJob.pdfs_processed || 0}</div>
              </div>
            </div>

            {activeJob.status === 'completed' && (
              <Button onClick={() => processResults(activeJob.id)} className="w-full">
                Process Results & Generate Embeddings
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Crawl History</CardTitle>
          <CardDescription>Recent scraping jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No crawls yet. Start your first crawl above!
              </p>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{job.target_url}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(job.started_at).toLocaleString()}
                      {job.duration_seconds && ` • ${Math.round(job.duration_seconds / 60)}m ${job.duration_seconds % 60}s`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <div>{job.pages_scraped} pages</div>
                      {job.pdfs_processed > 0 && (
                        <div className="text-muted-foreground">{job.pdfs_processed} PDFs</div>
                      )}
                    </div>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
