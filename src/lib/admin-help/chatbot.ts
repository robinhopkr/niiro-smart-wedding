import 'server-only'

import {
  buildAdminHelpSystemPrompt,
  buildFallbackAdminHelpAnswer,
  type AdminHelpSource,
} from './knowledge'

export interface AdminHelpChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AdminHelpChatResult {
  reply: string
  mode: 'openai' | 'fallback'
  model: string
  note: string | null
  sources: AdminHelpSource[]
}

interface OpenAIResponseContentItem {
  type?: string
  text?: string
}

interface OpenAIResponseOutputItem {
  content?: OpenAIResponseContentItem[]
}

interface OpenAIResponsePayload {
  output?: OpenAIResponseOutputItem[]
}

function getConfiguredModel(): string {
  return process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-5.2'
}

function getLatestUserMessage(messages: AdminHelpChatMessage[]): string {
  return [...messages].reverse().find((message) => message.role === 'user')?.content?.trim() || ''
}

function extractOutputText(payload: unknown): string {
  const responsePayload = payload as OpenAIResponsePayload

  if (!Array.isArray(responsePayload.output)) {
    return ''
  }

  return responsePayload.output
    .flatMap((item) => {
      if (!Array.isArray(item.content)) {
        return []
      }

      return item.content
        .filter(
          (
            contentItem: OpenAIResponseContentItem,
          ): contentItem is OpenAIResponseContentItem & { type: 'output_text'; text: string } =>
            contentItem.type === 'output_text' &&
            typeof contentItem.text === 'string',
        )
        .map((contentItem) => contentItem.text.trim())
    })
    .filter(Boolean)
    .join('\n\n')
}

async function requestOpenAI(messages: AdminHelpChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY fehlt.')
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getConfiguredModel(),
      instructions: buildAdminHelpSystemPrompt(),
      input: messages.slice(-10).map((message) => ({
        role: message.role,
        content: [
          {
            type: 'input_text',
            text: message.content,
          },
        ],
      })),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI-Antwort fehlgeschlagen: ${response.status} ${errorText}`)
  }

  const payload = (await response.json()) as unknown
  return extractOutputText(payload)
}

export async function answerAdminHelpChat(
  messages: AdminHelpChatMessage[],
): Promise<AdminHelpChatResult> {
  const latestUserMessage = getLatestUserMessage(messages)
  const fallback = buildFallbackAdminHelpAnswer(latestUserMessage)

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      reply: fallback.answer,
      mode: 'fallback',
      model: 'Lokale Wissensbasis',
      note: 'OPENAI_API_KEY ist noch nicht gesetzt. Der Assistent antwortet deshalb aus der eingebauten App-Wissensbasis.',
      sources: fallback.sources,
    }
  }

  try {
    const reply = await requestOpenAI(messages)

    if (!reply) {
      throw new Error('Leere OpenAI-Antwort.')
    }

    return {
      reply,
      mode: 'openai',
      model: getConfiguredModel(),
      note: null,
      sources: fallback.sources,
    }
  } catch (error) {
    return {
      reply: fallback.answer,
      mode: 'fallback',
      model: 'Lokale Wissensbasis',
      note:
        error instanceof Error
          ? `OpenAI war gerade nicht verfügbar. Fallback aktiv: ${error.message}`
          : 'OpenAI war gerade nicht verfügbar. Fallback aktiv.',
      sources: fallback.sources,
    }
  }
}
