import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getAdminWeddingConfig, uploadContentImageFile } from '@/lib/supabase/repository'
import type { ApiResponse } from '@/types/api'

const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_FOLDERS = new Set(['cover', 'couple', 'section', 'vendor'])

function isAllowedFolder(value: string): value is 'cover' | 'couple' | 'section' | 'vendor' {
  return ALLOWED_FOLDERS.has(value)
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ publicUrl: string; path: string }>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const formData = await request.formData().catch(() => null)
  const sourceId = formData?.get('sourceId')
  const folder = formData?.get('folder')
  const file = formData?.get('file')

  if (
    typeof sourceId !== 'string' ||
    typeof folder !== 'string' ||
    !(file instanceof File) ||
    !isAllowedFolder(folder)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte wähle ein gültiges Bild aus.',
        code: 'VALIDATION_ERROR',
      },
      { status: 422 },
    )
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Es können nur Bilddateien hochgeladen werden.',
        code: 'INVALID_FILE_TYPE',
      },
      { status: 422 },
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: 'Das Bild ist größer als 8 MB.',
        code: 'FILE_TOO_LARGE',
      },
      { status: 422 },
    )
  }

  const supabase = createAdminClient() ?? createPublicClient()
  const config = await getAdminWeddingConfig(supabase, undefined)

  if (!config.sourceId || config.sourceId !== sourceId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Die aktive Hochzeit konnte nicht zugeordnet werden.',
        code: 'CONFIG_MISMATCH',
      },
      { status: 409 },
    )
  }

  try {
    const upload = await uploadContentImageFile(supabase, config, {
      name: file.name,
      contentType: file.type,
      body: new Uint8Array(await file.arrayBuffer()),
      folder,
    })

    return NextResponse.json({
      success: true,
      data: upload,
      message: 'Das Bild wurde hochgeladen.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Das Bild konnte gerade nicht hochgeladen werden.',
        code: 'UPLOAD_FAILED',
      },
      { status: 500 },
    )
  }
}
