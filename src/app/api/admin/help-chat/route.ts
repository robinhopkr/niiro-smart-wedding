import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { answerAdminHelpChat } from '@/lib/admin-help/chatbot'
import type { ApiResponse } from '@/types/api'

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4_000),
})

const helpChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
})

type HelpChatResponse = Awaited<ReturnType<typeof answerAdminHelpChat>>

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<HelpChatResponse>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = helpChatSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte sende einen gültigen Chatverlauf.',
        code: 'VALIDATION_ERROR',
      },
      { status: 422 },
    )
  }

  try {
    const result = await answerAdminHelpChat(parseResult.data.messages)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Der Assistent konnte gerade nicht antworten.',
        code: 'CHAT_FAILED',
      },
      { status: 500 },
    )
  }
}
