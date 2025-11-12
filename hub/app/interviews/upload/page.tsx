'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function UploadInterviewPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    date: '',
    interviewDate: '',
    affiliation: '',
    notes: '',
    transcript: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/interviews/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/interviews')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to upload interview')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Uploaded!</h2>
            <p className="text-gray-600">AI analysis complete. Redirecting to interviews page...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Container size="lg" className="py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Upload New Interview</h1>
          <p className="text-xl text-gray-600">
            Add a facilitator interview with AI-powered analysis
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interview Details</CardTitle>
            <CardDescription>
              Fill in the details below. AI will automatically extract themes about community and connection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required Fields */}
              <div className="space-y-4">
                <Input
                  label="Facilitator Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Jane Smith"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                  />

                  <Input
                    label="Interview Date"
                    name="interviewDate"
                    type="date"
                    value={formData.interviewDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="SRAU Affiliation"
                    name="affiliation"
                    value={formData.affiliation}
                    onChange={handleChange}
                    placeholder="e.g., Facilitator, Volunteer"
                  />

                  <Input
                    label="Notes/Role"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="e.g., Lead facilitator, youth focus"
                  />
                </div>
              </div>

              {/* Transcript */}
              <div>
                <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Transcript *
                </label>
                <textarea
                  id="transcript"
                  name="transcript"
                  value={formData.transcript}
                  onChange={handleChange}
                  rows={16}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A5E0] focus:ring-offset-2 focus:border-transparent"
                  placeholder="Paste the full interview transcript here..."
                />
                <p className="mt-2 text-sm text-gray-600">
                  AI will analyze this to extract key themes about community, connection, and facilitator support.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Upload Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading || !formData.name || !formData.transcript}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Upload & Analyze
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/interviews')}
                  disabled={loading}
                  size="lg"
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-gray-600">
                * Required fields. The interview will be saved to the knowledge base and automatically indexed for the AI chat.
              </p>
            </form>
          </CardContent>
        </Card>
      </Container>
    </div>
  )
}
