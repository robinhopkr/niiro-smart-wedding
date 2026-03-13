import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'

const HOST = process.env.PLAY_CAPTURE_HOST ?? '127.0.0.1'
const PORT = Number(process.env.PLAY_CAPTURE_PORT ?? 8123)
const OUTPUT_DIR = process.env.PLAY_CAPTURE_OUTPUT_DIR
  ? process.env.PLAY_CAPTURE_OUTPUT_DIR
  : join(process.cwd(), 'tmp', 'play-console-capture')

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS,GET',
    'Content-Type': 'application/json; charset=utf-8',
  }
}

function summarizePayload(payload) {
  return {
    title: payload?.title ?? null,
    url: payload?.url ?? null,
    headingCount: Array.isArray(payload?.headings) ? payload.headings.length : 0,
    buttonCount: Array.isArray(payload?.buttons) ? payload.buttons.length : 0,
    bodyPreview:
      typeof payload?.body === 'string' ? payload.body.replace(/\s+/g, ' ').trim().slice(0, 200) : null,
  }
}

async function persistPayload(payload) {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const timestamp = new Date().toISOString().replaceAll(':', '-')
  const latestPath = join(OUTPUT_DIR, 'latest.json')
  const archivePath = join(OUTPUT_DIR, `${timestamp}.json`)
  const serialized = JSON.stringify(payload, null, 2)

  await Promise.all([
    writeFile(latestPath, serialized, 'utf8'),
    writeFile(archivePath, serialized, 'utf8'),
  ])

  return {
    archivePath,
    latestPath,
  }
}

const server = createServer(async (request, response) => {
  const corsHeaders = buildCorsHeaders()

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders)
    response.end()
    return
  }

  if (request.method === 'GET') {
    response.writeHead(200, corsHeaders)
    response.end(
      JSON.stringify({
        ok: true,
        host: HOST,
        outputDir: OUTPUT_DIR,
        port: PORT,
      }),
    )
    return
  }

  if (request.method !== 'POST') {
    response.writeHead(405, corsHeaders)
    response.end(JSON.stringify({ ok: false, error: 'Nur POST wird unterstützt.' }))
    return
  }

  const chunks = []

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  try {
    const rawBody = Buffer.concat(chunks).toString('utf8')
    const payload = JSON.parse(rawBody)
    const paths = await persistPayload(payload)
    const summary = summarizePayload(payload)

    console.log(
      JSON.stringify(
        {
          receivedAt: new Date().toISOString(),
          ...summary,
          ...paths,
        },
        null,
        2,
      ),
    )

    response.writeHead(200, corsHeaders)
    response.end(
      JSON.stringify({
        ok: true,
        ...paths,
        summary,
      }),
    )
  } catch (error) {
    response.writeHead(400, corsHeaders)
    response.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Ungültige Anfrage.',
      }),
    )
  }
})

server.listen(PORT, HOST, () => {
  console.log(
    JSON.stringify(
      {
        host: HOST,
        outputDir: OUTPUT_DIR,
        port: PORT,
        status: 'listening',
      },
      null,
      2,
    ),
  )
})
