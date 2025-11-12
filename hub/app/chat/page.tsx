'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Lightbulb, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      setMessages([...newMessages, data.message])
    } catch (error: any) {
      console.error('Error:', error)
      const errorMessage = error.message || 'Unknown error occurred'
      setMessages([...newMessages, {
        role: 'assistant',
        content: `⚠️ Error: ${errorMessage}\n\nPlease check:\n• OpenAI API key is configured in .env.local\n• Dev server has been restarted after adding the key`
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestedQuestions = [
    {
      icon: <Lightbulb className="h-4 w-4" />,
      text: 'What did facilitators say about burnout?'
    },
    {
      icon: <Lightbulb className="h-4 w-4" />,
      text: 'Generate a discussion post about cultural safety'
    },
    {
      icon: <Lightbulb className="h-4 w-4" />,
      text: 'What are the key challenges facilitators face?'
    }
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      <Container size="xl" className="flex flex-col h-full py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SMART Connect AI</h1>
          <p className="text-gray-600">
            Ask questions about facilitator research, generate content, and get strategic insights
          </p>
        </div>

        {/* Messages Container */}
        <Card className="flex-1 overflow-hidden flex flex-col mb-6 border-2">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-[#003B5C]/10 rounded-full mb-6">
                  <Bot className="h-12 w-12 text-[#003B5C]" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-gray-900">
                  How can I help you today?
                </h2>
                <p className="text-gray-600 mb-8 max-w-md">
                  I'm here to answer questions about SMART facilitators, generate content, and provide strategic recommendations.
                </p>
                <div className="grid gap-3 w-full max-w-2xl">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => setInput(question.text)}
                      className="justify-start text-left h-auto py-4 px-5 text-gray-900"
                    >
                      <span className="mr-3 text-[#00A5E0]">{question.icon}</span>
                      <span className="flex-1">{question.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-4 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-[#003B5C]/10 rounded-full flex items-center justify-center">
                    <Bot className="h-5 w-5 text-[#003B5C]" aria-hidden="true" />
                  </div>
                )}
                <div
                  className={`px-5 py-3 rounded-2xl max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-[#003B5C] text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-[#00A5E0]/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-[#00A5E0]" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-[#003B5C]/10 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-[#003B5C]" aria-hidden="true" />
                </div>
                <div className="px-5 py-3 rounded-2xl bg-white border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Input Area */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="text-base"
              disabled={loading}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="lg"
            className="px-8"
            loading={loading}
          >
            <Send className="h-5 w-5" aria-hidden="true" />
            <span className="ml-2">Send</span>
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Responses are generated by AI and grounded in facilitator research. Always verify important information.
        </p>
      </Container>
    </div>
  )
}
