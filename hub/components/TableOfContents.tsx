'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, BookOpen } from 'lucide-react'
import type { Heading } from './MarkdownRenderer'

interface TableOfContentsProps {
  headings: Heading[]
  className?: string
}

export default function TableOfContents({ headings, className = '' }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-20% 0% -35% 0%' }
    )

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id)
        if (element) {
          observer.unobserve(element)
        }
      })
    }
  }, [headings])

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 80 // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  if (headings.length === 0) {
    return null
  }

  return (
    <nav className={`${className}`}>
      <div className="sticky top-20">
        <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
          <BookOpen className="h-4 w-4" />
          <span className="text-sm uppercase tracking-wide">Table of Contents</span>
        </div>
        <ul className="space-y-1 border-l-2 border-gray-200">
          {headings.map((heading) => (
            <li key={heading.id} style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}>
              <button
                onClick={() => scrollToHeading(heading.id)}
                className={`
                  w-full text-left px-3 py-1.5 text-sm transition-colors rounded-r
                  hover:bg-gray-100 hover:text-blue-600
                  ${activeId === heading.id
                    ? 'text-blue-600 font-medium bg-blue-50 border-l-2 border-blue-600 -ml-[2px]'
                    : 'text-gray-600'
                  }
                `}
              >
                <span className="flex items-center gap-1">
                  {heading.level > 2 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                  <span className="line-clamp-2">{heading.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
