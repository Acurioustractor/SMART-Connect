'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { useEffect, useState } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
  onHeadingsExtracted?: (headings: Heading[]) => void
}

export interface Heading {
  id: string
  text: string
  level: number
}

export default function MarkdownRenderer({ content, className = '', onHeadingsExtracted }: MarkdownRendererProps) {
  const [headings, setHeadings] = useState<Heading[]>([])

  useEffect(() => {
    // Extract headings from markdown content
    const extractedHeadings: Heading[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const text = match[2].trim()
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        extractedHeadings.push({ id, text, level })
      }
    }

    setHeadings(extractedHeadings)
    if (onHeadingsExtracted) {
      onHeadingsExtracted(extractedHeadings)
    }
  }, [content, onHeadingsExtracted])

  // Add IDs to headings for anchor links
  const processedContent = content.split('\n').map(line => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const text = match[2].trim()
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return `${match[1]} ${text} {#${id}}`
    }
    return line
  }).join('\n')

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          h1: ({ node, ...props }) => {
            const text = props.children?.toString() || ''
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            return <h1 id={id} className="text-3xl font-bold text-gray-900 mb-4 mt-8 first:mt-0 pb-2 border-b-2 border-gray-200" {...props} />
          },
          h2: ({ node, ...props }) => {
            const text = props.children?.toString() || ''
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            return <h2 id={id} className="text-2xl font-bold text-gray-900 mb-3 mt-6 pb-1 border-b border-gray-200" {...props} />
          },
          h3: ({ node, ...props }) => {
            const text = props.children?.toString() || ''
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            return <h3 id={id} className="text-xl font-semibold text-gray-900 mb-2 mt-5" {...props} />
          },
          h4: ({ node, ...props }) => {
            const text = props.children?.toString() || ''
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            return <h4 id={id} className="text-lg font-semibold text-gray-900 mb-2 mt-4" {...props} />
          },
          h5: ({ node, ...props }) => {
            const text = props.children?.toString() || ''
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            return <h5 id={id} className="text-base font-semibold text-gray-800 mb-1 mt-3" {...props} />
          },
          h6: ({ node, ...props }) => {
            const text = props.children?.toString() || ''
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            return <h6 id={id} className="text-sm font-semibold text-gray-800 mb-1 mt-3" {...props} />
          },
          p: ({ node, ...props }) => <p className="text-gray-700 mb-4 leading-7" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 ml-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2 ml-4" {...props} />,
          li: ({ node, ...props }) => <li className="text-gray-700 leading-7" {...props} />,
          a: ({ node, ...props }) => <a className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-4 bg-blue-50 py-2 pr-4" {...props} />
          ),
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
            ) : (
              <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto text-sm font-mono" {...props} />
            ),
          pre: ({ node, ...props }) => <pre className="mb-4 overflow-x-auto" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border-collapse border border-gray-300" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-100" {...props} />,
          th: ({ node, ...props }) => <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props} />,
          td: ({ node, ...props }) => <td className="border border-gray-300 px-4 py-2" {...props} />,
          hr: ({ node, ...props }) => <hr className="my-6 border-t-2 border-gray-200" {...props} />,
          img: ({ node, ...props }) => (
            <img className="max-w-full h-auto rounded-lg my-4" {...props} alt={props.alt || ''} />
          ),
          strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>

      <style jsx global>{`
        .markdown-content {
          @apply text-base;
        }
        .markdown-content > *:first-child {
          margin-top: 0 !important;
        }
        .markdown-content a {
          word-break: break-word;
        }
      `}</style>
    </div>
  )
}
