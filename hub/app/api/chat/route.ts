import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// Load master SLM prompt from parent directory
const promptPath = path.join(process.cwd(), '../MASTER-SLM-PROMPT.md')

let SYSTEM_PROMPT = ''

try {
  SYSTEM_PROMPT = fs.readFileSync(promptPath, 'utf-8')
} catch (error) {
  console.error('Failed to load MASTER-SLM-PROMPT.md:', error)
  SYSTEM_PROMPT = `You are the SMART Connect AI assistant, an expert on SMART Recovery facilitator community development.

You have access to comprehensive research including:
- 24 facilitator interviews covering diverse perspectives
- 219 survey responses from facilitators
- Strategic documents and implementation plans
- Community best practices and cultural safety protocols

Your role is to:
1. Answer questions about facilitator needs, challenges, and insights
2. Generate evidence-based content for community engagement
3. Provide strategic recommendations grounded in research
4. Support cultural safety, especially for Aboriginal and Torres Strait Islander facilitators

Always cite specific interviews or data points when possible.`
}

export async function POST(req: Request) {
  try {
    const { messages, conversationId } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.' },
        { status: 500 }
      )
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const assistantMessage = completion.choices[0].message.content

    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        let currentConversationId = conversationId

        // Create conversation if it doesn't exist
        if (!currentConversationId) {
          const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              title: lastUserMessage.content.substring(0, 100), // First 100 chars as title
            })
            .select()
            .single()

          if (convError) {
            console.error('Error creating conversation:', convError)
          } else {
            currentConversationId = conversation.id
          }
        }

        // Save both messages if we have a conversation ID
        if (currentConversationId) {
          const messagesToSave = [
            {
              conversation_id: currentConversationId,
              role: 'user',
              content: lastUserMessage.content,
              tokens_used: completion.usage?.prompt_tokens || 0,
            },
            {
              conversation_id: currentConversationId,
              role: 'assistant',
              content: assistantMessage,
              tokens_used: completion.usage?.completion_tokens || 0,
            },
          ]

          const { error: msgError } = await supabase
            .from('messages')
            .insert(messagesToSave)

          if (msgError) {
            console.error('Error saving messages:', msgError)
          }

          // Track analytics event
          const { error: analyticsError } = await supabase
            .from('analytics_events')
            .insert({
              event_type: 'chat_message',
              event_name: 'ai_chat_interaction',
              page_url: '/chat',
              metadata: {
                message_length: lastUserMessage.content.length,
                response_length: assistantMessage?.length || 0,
                tokens_used: completion.usage?.total_tokens || 0,
              },
            })

          if (analyticsError) {
            console.error('Error tracking analytics:', analyticsError)
          }
        }
      } catch (supabaseError) {
        // Log but don't fail the request if Supabase has issues
        console.error('Supabase error (non-fatal):', supabaseError)
      }
    }

    return NextResponse.json({
      message: {
        role: 'assistant',
        content: assistantMessage,
      },
      conversationId: conversationId || null,
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to process chat',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
