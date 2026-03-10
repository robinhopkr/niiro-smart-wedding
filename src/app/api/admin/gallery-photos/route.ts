import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import {
  deleteGalleryPhoto,
  getAdminWeddingConfig,
  moveGalleryPhoto,
} from '@/lib/supabase/repository'
import {
  adminGalleryDeleteSchema,
  adminGalleryMoveSchema,
} from '@/lib/validations/admin-gallery.schema'
import type { ApiResponse } from '@/types/api'
import type { GalleryPhoto } from '@/types/wedding'

type DeleteResponse = { deleted: true }
type MoveResponse = { moved: true; photo: GalleryPhoto }

export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<DeleteResponse>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = adminGalleryDeleteSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte wähle ein gültiges Foto aus.',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      },
      { status: 422 },
    )
  }

  const supabase = createAdminClient() ?? createPublicClient()
  const config = await getAdminWeddingConfig(supabase, undefined)

  try {
    await deleteGalleryPhoto(supabase, config, parseResult.data.path)

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
      },
      message: 'Das Foto wurde gelöscht.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Das Foto konnte gerade nicht gelöscht werden.',
        code: 'DELETE_FAILED',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<MoveResponse>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = adminGalleryMoveSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte wähle Foto und Zielbereich korrekt aus.',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      },
      { status: 422 },
    )
  }

  const supabase = createAdminClient() ?? createPublicClient()
  const config = await getAdminWeddingConfig(supabase, undefined)

  try {
    const photo = await moveGalleryPhoto(
      supabase,
      config,
      parseResult.data.path,
      parseResult.data.targetVisibility,
    )

    return NextResponse.json({
      success: true,
      data: {
        moved: true,
        photo,
      },
      message:
        parseResult.data.targetVisibility === 'private'
          ? 'Das Foto wurde in den privaten Bereich verschoben.'
          : 'Das Foto wurde in den öffentlichen Bereich verschoben.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Das Foto konnte gerade nicht verschoben werden.',
        code: 'MOVE_FAILED',
      },
      { status: 500 },
    )
  }
}
