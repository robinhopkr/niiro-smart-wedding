import { PDFDocument, PDFImage, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'

import { APP_BRAND_NAME } from '@/lib/constants'
import { formatGermanDate } from '@/lib/utils/date'
import type { WeddingConfig } from '@/types/wedding'

interface InvitationPdfInput {
  config: WeddingConfig
  inviteUrl: string
}

interface DrawTextBlockOptions {
  color?: ReturnType<typeof rgb>
  font: PDFFont
  lineHeight?: number
  maxWidth: number
  page: PDFPage
  size: number
  text: string
  x: number
  y: number
}

function splitLongToken(token: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const chunks: string[] = []
  let current = ''

  for (const character of token) {
    const candidate = `${current}${character}`

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate
      continue
    }

    chunks.push(current)
    current = character
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const trimmedParagraph = paragraph.trim()

    if (!trimmedParagraph) {
      lines.push('')
      return
    }

    const words = trimmedParagraph.split(/\s+/)
    let currentLine = ''

    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        currentLine = candidate
        return
      }

      if (currentLine) {
        lines.push(currentLine)
      }

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        currentLine = word
        return
      }

      const chunks = splitLongToken(word, font, size, maxWidth)
      const lastChunk = chunks.pop() ?? ''

      lines.push(...chunks)
      currentLine = lastChunk
    })

    if (currentLine) {
      lines.push(currentLine)
    }

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push('')
    }
  })

  return lines
}

function drawTextBlock({
  color = rgb(0.24, 0.27, 0.31),
  font,
  lineHeight,
  maxWidth,
  page,
  size,
  text,
  x,
  y,
}: DrawTextBlockOptions): number {
  const lines = wrapText(text, font, size, maxWidth)
  const resolvedLineHeight = lineHeight ?? size * 1.55
  let currentY = y

  lines.forEach((line) => {
    if (line) {
      page.drawText(line, {
        x,
        y: currentY,
        size,
        font,
        color,
      })
    }

    currentY -= resolvedLineHeight
  })

  return currentY
}

function fitFontSize(text: string, font: PDFFont, maxWidth: number, preferredSize: number, minSize: number): number {
  let currentSize = preferredSize

  while (currentSize > minSize && font.widthOfTextAtSize(text, currentSize) > maxWidth) {
    currentSize -= 1
  }

  return currentSize
}

async function embedRemoteImage(pdfDoc: PDFDocument, imageUrl: string | null): Promise<PDFImage | null> {
  if (!imageUrl) {
    return null
  }

  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      return null
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

    if (contentType.includes('png')) {
      return pdfDoc.embedPng(bytes)
    }

    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      return pdfDoc.embedJpg(bytes)
    }
  } catch {
    return null
  }

  return null
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const [, content = ''] = dataUrl.split(',')
  return Uint8Array.from(Buffer.from(content, 'base64'))
}

async function createQrImage(pdfDoc: PDFDocument, inviteUrl: string): Promise<PDFImage> {
  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    width: 920,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#2b2520',
      light: '#fffdf8',
    },
  })

  return pdfDoc.embedPng(dataUrlToBytes(qrDataUrl))
}

function drawPageShell(page: PDFPage): void {
  const { width, height } = page.getSize()

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.996, 0.988, 0.973),
  })

  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.949, 0.894, 0.812),
    borderWidth: 1,
  })

  page.drawRectangle({
    x: 30,
    y: height - 108,
    width: width - 60,
    height: 78,
    color: rgb(0.991, 0.958, 0.904),
  })
}

function drawCenteredText(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color: ReturnType<typeof rgb>): void {
  const { width } = page.getSize()
  const textWidth = font.widthOfTextAtSize(text, size)

  page.drawText(text, {
    x: (width - textWidth) / 2,
    y,
    size,
    font,
    color,
  })
}

function sanitizeFileName(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function buildInvitationPdfFilename(config: WeddingConfig): string {
  const baseName = sanitizeFileName(config.guestCode ?? config.coupleLabel) || 'einladung'
  return `mywed-einladung-${baseName}.pdf`
}

export async function createInvitationPdf({
  config,
  inviteUrl,
}: InvitationPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const serifFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const serifBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const sansFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const sansBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  pdfDoc.setTitle(`Einladung für ${config.coupleLabel}`)
  pdfDoc.setAuthor(APP_BRAND_NAME)
  pdfDoc.setCreator(APP_BRAND_NAME)
  pdfDoc.setSubject(`Digitale Hochzeitseinladung für ${config.coupleLabel}`)
  pdfDoc.setKeywords(['Hochzeit', 'Einladung', 'myWed', config.coupleLabel, config.guestCode ?? ''])

  const page = pdfDoc.addPage([595.28, 841.89])
  drawPageShell(page)

  const { width, height } = page.getSize()
  const margin = 56
  const contentWidth = width - margin * 2
  let currentY = height - 70

  drawCenteredText(page, APP_BRAND_NAME, sansBoldFont, 12, currentY, rgb(0.443, 0.33, 0.11))
  currentY -= 30

  const coverImage = await embedRemoteImage(
    pdfDoc,
    config.heroImageUrl ?? config.couplePhotos[0]?.imageUrl ?? null,
  )

  if (coverImage) {
    const heroHeightLimit = 176
    const dimensions = coverImage.scaleToFit(contentWidth, heroHeightLimit)
    const imageX = margin + (contentWidth - dimensions.width) / 2
    const imageY = currentY - dimensions.height

    page.drawImage(coverImage, {
      x: imageX,
      y: imageY,
      width: dimensions.width,
      height: dimensions.height,
    })

    page.drawRectangle({
      x: imageX,
      y: imageY,
      width: dimensions.width,
      height: dimensions.height,
      borderColor: rgb(0.949, 0.894, 0.812),
      borderWidth: 1,
    })

    currentY = imageY - 28
  } else {
    page.drawRectangle({
      x: margin,
      y: currentY - 34,
      width: contentWidth,
      height: 34,
      color: rgb(0.986, 0.965, 0.929),
    })
    currentY -= 52
  }

  drawCenteredText(page, 'UNSERE HOCHZEIT', sansFont, 11, currentY, rgb(0.353, 0.431, 0.373))
  currentY -= 38

  const coupleFontSize = fitFontSize(config.coupleLabel, serifBoldFont, contentWidth - 24, 34, 24)
  drawCenteredText(page, config.coupleLabel, serifBoldFont, coupleFontSize, currentY, rgb(0.118, 0.133, 0.157))
  currentY -= coupleFontSize + 22

  drawCenteredText(page, formatGermanDate(config.weddingDate), sansBoldFont, 14, currentY, rgb(0.24, 0.27, 0.31))
  currentY -= 24
  drawCenteredText(page, config.venueName, sansFont, 14, currentY, rgb(0.353, 0.431, 0.373))
  currentY -= 30

  page.drawLine({
    start: { x: margin + 16, y: currentY },
    end: { x: width - margin - 16, y: currentY },
    thickness: 1,
    color: rgb(0.949, 0.894, 0.812),
  })
  currentY -= 30

  const qrImage = await createQrImage(pdfDoc, inviteUrl)
  const qrSize = 138
  const leftColumnWidth = contentWidth - qrSize - 28
  const storyText =
    config.invitationStory?.trim() ||
    config.welcomeMessage ||
    'Wir würden uns sehr freuen, diesen besonderen Tag gemeinsam mit euch zu feiern.'
  const storyMaxWidth = leftColumnWidth - 36
  const storyLineHeight = 20
  const storyLines = wrapText(storyText, sansFont, 13, storyMaxWidth)
  const storyBoxHeight = Math.max(168, storyLines.length * storyLineHeight + 58)

  page.drawRectangle({
    x: margin,
    y: currentY - storyBoxHeight,
    width: leftColumnWidth,
    height: storyBoxHeight,
    color: rgb(0.996, 0.992, 0.983),
    borderColor: rgb(0.949, 0.894, 0.812),
    borderWidth: 1,
  })
  page.drawText('EINLADUNG', {
    x: margin + 18,
    y: currentY - 24,
    size: 11,
    font: sansBoldFont,
    color: rgb(0.443, 0.33, 0.11),
  })
  const storyBottomY = drawTextBlock({
    page,
    text: storyText,
    x: margin + 18,
    y: currentY - 50,
    maxWidth: storyMaxWidth,
    font: sansFont,
    size: 13,
    lineHeight: storyLineHeight,
  })

  const qrX = width - margin - qrSize
  const qrY = currentY - qrSize

  page.drawRectangle({
    x: qrX - 12,
    y: qrY - 44,
    width: qrSize + 24,
    height: qrSize + 56,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.949, 0.894, 0.812),
    borderWidth: 1,
  })
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  })
  page.drawText('QR-Code zum Gästebereich', {
    x: qrX - 2,
    y: qrY - 22,
    size: 10,
    font: sansBoldFont,
    color: rgb(0.24, 0.27, 0.31),
  })

  const inviteCopy =
    'Über den folgenden Link gelangen eure Gäste direkt auf den Gästebereich von myWed. Dort können sie zu- oder absagen und alle wichtigen Informationen zur Hochzeit sehen.'
  const inviteCopyLineHeight = 17
  const inviteCopyLines = wrapText(inviteCopy, sansFont, 11.5, contentWidth - 36)
  const inviteUrlLineHeight = 14
  const inviteUrlLines = wrapText(inviteUrl, sansBoldFont, 10.5, contentWidth - 60)
  const inviteUrlBoxHeight = Math.max(42, inviteUrlLines.length * inviteUrlLineHeight + 18)
  const inviteSectionHeight =
    74 + inviteCopyLines.length * inviteCopyLineHeight + inviteUrlBoxHeight

  currentY = Math.min(storyBottomY, qrY - 38)

  let activePage = page
  let activeHeight = height

  if (currentY - inviteSectionHeight < 118) {
    activePage = pdfDoc.addPage([595.28, 841.89])
    drawPageShell(activePage)
    activeHeight = activePage.getSize().height
    currentY = activeHeight - 86
  }

  activePage.drawRectangle({
    x: margin,
    y: currentY - inviteSectionHeight,
    width: contentWidth,
    height: inviteSectionHeight,
    color: rgb(0.991, 0.958, 0.904),
    borderColor: rgb(0.949, 0.894, 0.812),
    borderWidth: 1,
  })
  activePage.drawText('RÜCKMELDUNG & GÄSTEBEREICH', {
    x: margin + 18,
    y: currentY - 24,
    size: 11,
    font: sansBoldFont,
    color: rgb(0.443, 0.33, 0.11),
  })
  activePage.drawText(`Bitte sagt uns bis ${formatGermanDate(config.rsvpDeadline)} Bescheid.`, {
    x: margin + 18,
    y: currentY - 48,
    size: 12,
    font: sansBoldFont,
    color: rgb(0.118, 0.133, 0.157),
  })

  const inviteTextBottomY = drawTextBlock({
    page: activePage,
    text: inviteCopy,
    x: margin + 18,
    y: currentY - 72,
    maxWidth: contentWidth - 36,
    font: sansFont,
    size: 11.5,
    lineHeight: inviteCopyLineHeight,
  })

  activePage.drawRectangle({
    x: margin + 18,
    y: inviteTextBottomY - inviteUrlBoxHeight + 6,
    width: contentWidth - 36,
    height: inviteUrlBoxHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.867, 0.664, 0.337),
    borderWidth: 1.1,
  })
  drawTextBlock({
    page: activePage,
    text: inviteUrl,
    x: margin + 30,
    y: inviteTextBottomY - 14,
    maxWidth: contentWidth - 60,
    font: sansBoldFont,
    size: 10.5,
    lineHeight: inviteUrlLineHeight,
    color: rgb(0.118, 0.133, 0.157),
  })

  activePage.drawText(`Veranstaltungsort: ${config.venueName}, ${config.venueAddress}`, {
    x: margin,
    y: 54,
    size: 10,
    font: sansFont,
    color: rgb(0.353, 0.431, 0.373),
  })

  activePage.drawText('Erstellt mit myWed by NiiRo AI', {
    x: width - margin - sansFont.widthOfTextAtSize('Erstellt mit myWed by NiiRo AI', 10),
    y: 34,
    size: 10,
    font: sansFont,
    color: rgb(0.43, 0.45, 0.48),
  })

  return pdfDoc.save()
}
