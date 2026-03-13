import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

import { APP_BRAND_NAME } from '@/lib/constants'
import { formatGermanDate } from '@/lib/utils/date'
import type { BuffetSong, SeatingPlanData, WeddingConfig } from '@/types/wedding'

interface BuffetSongPlanEntry extends BuffetSong {
  tableNames: string[]
}

function sanitizeFileName(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      currentLine = nextLine
      return
    }
    if (currentLine) lines.push(currentLine)
    currentLine = word
  })

  if (currentLine) lines.push(currentLine)
  return lines
}

function drawTextBlock(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, lineHeight = size * 1.5, color = rgb(0.2, 0.22, 0.25)) {
  const lines = wrapText(text, font, size, width)
  let currentY = y
  lines.forEach((line) => {
    page.drawText(line, { x, y: currentY, size, font, color })
    currentY -= lineHeight
  })
  return currentY
}

function buildSongEntries(plan: SeatingPlanData): BuffetSongPlanEntry[] {
  return plan.buffetMode.songs.map((song) => ({
    ...song,
    tableNames: plan.tables.filter((table) => table.buffetSongId === song.id && table.kind !== 'service').map((table) => table.name),
  }))
}

export function buildBuffetSongPlanPdfFilename(config: WeddingConfig): string {
  const baseName = sanitizeFileName(config.guestCode ?? config.coupleLabel) || 'buffet-songplan'
  return `niiro-smart-wedding-buffet-songplan-${baseName}.pdf`
}

export async function createBuffetSongPlanPdf(config: WeddingConfig, plan: SeatingPlanData): Promise<Uint8Array> {
  const songEntries = buildSongEntries(plan)

  if (!plan.buffetMode.enabled || !songEntries.length) {
    throw new Error('Bitte aktiviert zuerst den Buffet-Modus und hinterlegt mindestens einen Song.')
  }

  const pdfDoc = await PDFDocument.create()
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  let page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  const margin = 52
  const contentWidth = width - margin * 2
  let currentY = height - 70

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.996, 0.988, 0.973) })
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, color: rgb(1, 1, 1), borderColor: rgb(0.949, 0.894, 0.812), borderWidth: 1 })

  page.drawText(APP_BRAND_NAME, {
    x: margin,
    y: currentY,
    size: 12,
    font: sansBold,
    color: rgb(0.443, 0.33, 0.11),
  })
  currentY -= 34

  page.drawText('Buffet-Songplan für DJ / Band', {
    x: margin,
    y: currentY,
    size: 28,
    font: serifBold,
    color: rgb(0.118, 0.133, 0.157),
  })
  currentY -= 42

  currentY = drawTextBlock(
    page,
    `${config.coupleLabel} · ${formatGermanDate(config.weddingDate)} · ${config.venueName}`,
    margin,
    currentY,
    contentWidth,
    sansBold,
    12,
    16,
    rgb(0.353, 0.431, 0.373),
  )
  currentY -= 14

  currentY = drawTextBlock(
    page,
    'Wenn der jeweilige Song gespielt wird, ist das der Aufruf für den ersten Gang ans Buffet. Songs ohne Tischzuordnung sind unten entsprechend markiert.',
    margin,
    currentY,
    contentWidth,
    sans,
    11.5,
    17,
  )
  currentY -= 10

  songEntries.forEach((song) => {
    const blockHeight = 78 + Math.max(song.tableNames.length, 1) * 16

    if (currentY - blockHeight < 70) {
      page = pdfDoc.addPage([595.28, 841.89])
      page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.996, 0.988, 0.973) })
      page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, color: rgb(1, 1, 1), borderColor: rgb(0.949, 0.894, 0.812), borderWidth: 1 })
      currentY = height - 70
    }

    page.drawRectangle({
      x: margin,
      y: currentY - blockHeight,
      width: contentWidth,
      height: blockHeight,
      color: rgb(0.996, 0.992, 0.983),
      borderColor: rgb(0.949, 0.894, 0.812),
      borderWidth: 1,
    })

    page.drawText(`${song.sortOrder}. ${song.title}`, {
      x: margin + 16,
      y: currentY - 24,
      size: 15,
      font: serifBold,
      color: rgb(0.118, 0.133, 0.157),
    })

    page.drawText(song.artist ?? 'Interpret offen', {
      x: margin + 16,
      y: currentY - 44,
      size: 11,
      font: sans,
      color: rgb(0.353, 0.431, 0.373),
    })

    currentY = drawTextBlock(
      page,
      song.tableNames.length ? `Aufruf für: ${song.tableNames.join(', ')}` : 'Noch keinem Tisch zugeordnet',
      margin + 16,
      currentY - 66,
      contentWidth - 32,
      sansBold,
      11,
      16,
      rgb(0.24, 0.27, 0.31),
    )
    currentY -= 18
  })

  page.drawText('Erstellt mit NiiRo Smart Wedding', {
    x: margin,
    y: 34,
    size: 10,
    font: serif,
    color: rgb(0.43, 0.45, 0.48),
  })

  return pdfDoc.save()
}
