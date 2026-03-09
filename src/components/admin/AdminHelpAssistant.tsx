'use client'

import { SendHorizonal, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { ADMIN_HELP_QUICK_QUESTIONS } from '@/lib/admin-help/knowledge'
import type { ApiResponse } from '@/types/api'

interface HelpSource {
  href: string
  title: string
}

interface HelpChatPayload {
  reply: string
  mode: 'openai' | 'fallback'
  model: string
  note: string | null
  sources: HelpSource[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  meta?: {
    mode: 'openai' | 'fallback'
    model: string
    note: string | null
    sources: HelpSource[]
  }
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Ich helfe dir bei Fragen zum Paarbereich. Ich kenne die Unterseiten Übersicht, Planung, Inhalte, Zugänge, RSVP, Vorschau und Hilfe und sage dir, wo du eine Funktion tatsächlich findest.',
}

export function AdminHelpAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function sendMessage(question: string) {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || isLoading) {
      return
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmedQuestion }]
    setMessages(nextMessages)
    setDraft('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/help-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      const result = (await response.json()) as ApiResponse<HelpChatPayload>

      if (!response.ok || !result.success) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: result.success ? 'Der Assistent konnte nicht antworten.' : result.error,
          },
        ])
        return
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.data.reply,
          meta: {
            mode: result.data.mode,
            model: result.data.model,
            note: result.data.note,
            sources: result.data.sources,
          },
        },
      ])
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'Der Assistent konnte gerade keine Antwort laden.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {ADMIN_HELP_QUICK_QUESTIONS.map((question) => (
          <button
            key={question}
            className="rounded-full border border-gold-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
            type="button"
            onClick={() => void sendMessage(question)}
          >
            {question}
          </button>
        ))}
      </div>

      <div className="surface-card space-y-4 px-5 py-5">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={message.role === 'assistant' ? 'rounded-[1.5rem] bg-cream-50 px-4 py-4' : 'ml-auto max-w-3xl rounded-[1.5rem] bg-gold-50 px-4 py-4'}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">
                {message.role === 'assistant' ? 'Assistent' : 'Du'}
              </p>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-charcoal-800">
                {message.content}
              </div>
              {message.meta ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-charcoal-700">
                      {message.meta.mode === 'openai' ? `OpenAI · ${message.meta.model}` : message.meta.model}
                    </span>
                  </div>
                  {message.meta.note ? (
                    <p className="text-xs leading-6 text-charcoal-500">{message.meta.note}</p>
                  ) : null}
                  {message.meta.sources.length ? (
                    <div className="flex flex-wrap gap-2">
                      {message.meta.sources.map((source) => (
                        <span
                          key={`${source.href}-${source.title}`}
                          className="rounded-full border border-cream-200 bg-white px-3 py-1 text-xs text-charcoal-600"
                        >
                          {source.title} · {source.href}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}

          {isLoading ? (
            <div className="rounded-[1.5rem] bg-cream-50 px-4 py-4 text-sm text-charcoal-600">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold-700" />
                Antwort wird vorbereitet...
              </div>
            </div>
          ) : null}
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void sendMessage(draft)
          }}
        >
          <Textarea
            label="Frage an den Assistenten"
            maxLength={4000}
            placeholder="Zum Beispiel: Wo bearbeite ich den Dresscode oder wie übernehme ich RSVP-Antworten in den Tischplan?"
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button loading={isLoading} size="lg" type="submit">
            <SendHorizonal className="h-4 w-4" />
            Frage senden
          </Button>
        </form>
      </div>
    </div>
  )
}
