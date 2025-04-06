import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  createDatabaseClient,
  DatabaseClient,
  InsertMeeting,
  meetingTable,
  participantTable,
} from 'db'
import { generateObject } from 'ai'
import type { S3Event, SQSEvent } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import Groq from 'groq-sdk'
import * as path from 'path'
import { z } from 'zod'
import pLimit from 'p-limit'
import TelegramBot from 'node-telegram-bot-api'
import { serializeError } from 'serialize-error'
import { Redis } from '@upstash/redis'

const TEMP_DIR = '/tmp'

const CHUNK_LENGTH_SEC = 600
const OVERLAP_SEC = 10

//14 minutes in ms
const TIMEOUT_MS = 840000

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!)

const measureOp = async <T extends any>(
  operationName: string,
  cb: () => Promise<T>
) => {
  console.log(`${operationName} starting at ${new Date().toISOString()}`)

  const start = performance.now()

  const result = await cb()

  const end = performance.now()

  console.log(
    `${operationName} took ${end - start}ms. Output: ${JSON.stringify(result, null, 4)}`
  )

  return result
}

const createTempDir = () => {
  try {
    // Ensure /tmp exists and is writable
    fs.accessSync('/tmp', fs.constants.W_OK)
    return fs.mkdtempSync(path.join('/tmp', 'meeting-'))
  } catch (error) {
    console.error('Error accessing /tmp directory:', error)
    throw new Error('Cannot access temporary directory in Lambda environment')
  }
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export const handler = async (event: SQSEvent) => {
  const [record] = event.Records

  console.log('record', JSON.stringify(record, null, 4))

  const s3Event: S3Event = JSON.parse(record.body)

  console.log('s3Event', JSON.stringify(s3Event, null, 4))

  const bucket = s3Event.Records[0].s3.bucket.name
  const key = decodeURIComponent(s3Event.Records[0].s3.object.key)

  const mutexKey = `meeting:${key}`

  //15 minutes in seconds
  const acquireResult = await redis.set(mutexKey, 'true', { ex: 900, nx: true })

  if (acquireResult !== 'OK') {
    console.log(
      `Acquire mutex for meeting ${key} failed. Result: ${acquireResult}`
    )

    return
  }

  console.log(`Won mutex for meeting ${key}`)

  const handle = async () => {
    let tempDir: string

    try {
      tempDir = createTempDir()
      console.log(`Created temporary directory: ${tempDir}`)

      const start = performance.now()

      const videoPath = path.join(tempDir, 'input.mp4')

      const deps = bootstrapDependencies()

      const existentMeeting = await deps.db.query.meetingTable.findFirst({
        //@ts-ignore
        where: eq(meetingTable.filename, key),
      })

      if (existentMeeting) {
        console.log(`Meeting ${key} already exists. Skipping...`)

        return
      }

      await measureOp('downloadFile', () =>
        downloadFromS3(deps.s3, {
          bucket,
          key,
          filePath: videoPath,
        })
      )

      const { title, short_summary } = await processMeeting({
        ...deps,
        videoPath,
        key,
      })

      const end = performance.now()

      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID!,
        `Meeting ${key} processed successfully\nTitle: ${title}\nSummary: ${short_summary}\nTime taken: ${end - start}ms`
      )

      return {
        statusCode: 200,
        body: 'Audio extraction completed successfully',
      }
    } catch (err) {
      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID!,
        `Error processing meeting ${key}: ${JSON.stringify(serializeError(err), null, 4)}`
      )

      throw err
    } finally {
      if (tempDir!) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true })
          console.log(`Cleaned up temporary directory: ${tempDir}`)
        } catch (cleanupError) {
          console.error('Error cleaning up temp directory:', cleanupError)
        }
      }

      await redis.del(mutexKey)
    }
  }

  const timeout = (): any =>
    new Promise((_, reject) =>
      setTimeout(async () => {
        await bot.sendMessage(
          process.env.TELEGRAM_CHAT_ID!,
          `Could not process meeting ${key} before timeout: ${TIMEOUT_MS}ms`
        )

        await redis.del(mutexKey)

        reject()
      }, TIMEOUT_MS)
    )

  return await Promise.race([handle(), timeout()])
}

export const processMeeting = async ({
  videoPath,
  transcriber,
  google,
  db,
  key,
}: {
  videoPath: string
  key: string
} & ReturnType<typeof bootstrapDependencies>) =>
  await measureOp('processMeeting', async () => {
    const audioPath = path.join(TEMP_DIR, 'output.mp3')

    const { durationMs, chunks } = await measureOp('extractAudio', () =>
      extractAudio(videoPath, audioPath)
    )

    const limit = pLimit(5)

    const transcriptionResults = await Promise.all(
      chunks.map((chunk, i) =>
        limit(() =>
          measureOp(`transcribeChunk${i + 1} ${chunk.path}`, async () => {
            const result = await transcribeChunk(transcriber, chunk.path)
            return { ...result, startMs: chunk.startMs }
          })
        )
      )
    )

    const transcriptionText = transcriptionResults
      .map((transcription, chunkIndex) => {
        return transcription.segments
          .map((segment, segmentIndex) => {
            const globalStartMs = transcription.startMs + segment.start * 1000
            const globalEndMs = transcription.startMs + segment.end * 1000

            const startTime = formatSRTTimestamp(globalStartMs)
            const endTime = formatSRTTimestamp(globalEndMs)

            const sequenceNumber = chunkIndex * 1000 + segmentIndex + 1

            return `${sequenceNumber}\n${startTime} --> ${endTime}\n${segment.text}\n`
          })
          .join('\n')
      })
      .join('\n')

    console.log('transcriptionText', transcriptionText)

    const analysis = await measureOp('digestTranscription', () =>
      digestTranscription(transcriptionText, google)
    )

    await measureOp('saveMeeting', () =>
      saveMeeting(db, {
        analysis,
        durationMs,
        transcription: transcriptionText,
        key,
      })
    )

    chunks.forEach((chunk) => fs.unlinkSync(chunk.path))

    return analysis
  })

export const bootstrapDependencies = () => {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
  })

  const transcriber = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })

  const db = createDatabaseClient({
    authToken: process.env.TURSO_AUTH_TOKEN!,
    url: process.env.TURSO_DATABASE_URL!,
  })

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY!,
  })

  return {
    s3,
    transcriber,
    db,
    google,
  }
}

const downloadFromS3 = async (
  s3: S3Client,
  {
    bucket,
    filePath,
    key,
  }: {
    bucket: string
    key: string
    filePath: string
  }
): Promise<void> => {
  const writeStream = fs.createWriteStream(filePath)
  const response = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  )

  return new Promise((resolve, reject) =>
    //@ts-ignore
    response.Body?.pipe(writeStream).on('error', reject).on('close', resolve)
  )
}

const extractAudio = (
  inputPath: string,
  outputPath: string,
  chunkLengthSec: number = CHUNK_LENGTH_SEC
): Promise<{
  durationMs: number
  chunks: { path: string; startMs: number }[]
}> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err)

      const duration = metadata.format.duration! * 1000 // Convert to ms
      const chunks: { path: string; startMs: number }[] = []

      console.log(
        `Extracting audio from ${inputPath} - Duration: ${duration}ms`
      )

      // Extract and segment audio in a single pass
      const chunkBasePath = path.join(TEMP_DIR, 'chunk_%03d.mp3')

      ffmpeg(inputPath)
        .outputOptions([
          '-vn', // Skip video
          '-f',
          'segment', // Use segmenter
          '-segment_time',
          chunkLengthSec.toString(),
          '-reset_timestamps',
          '1',
          '-c:a',
          'libmp3lame', // Use MP3 codec
          '-q:a',
          '4', // Quality setting (0-9, lower is better)
          '-ar',
          '16000', // 16kHz sample rate
          '-ac',
          '1', // Mono channel
        ])
        .output(chunkBasePath)
        .on('error', reject)
        .on('progress', (progress) => {
          console.log(`Audio Processing Progress: ${progress.timemark}`)
        })
        .on('end', () => {
          // Read created chunks
          const chunkFiles = fs
            .readdirSync(TEMP_DIR)
            .filter((file) => file.startsWith('chunk_'))
            .sort()

          chunkFiles.forEach((file, index) => {
            const startMs = index * chunkLengthSec * 1000
            const chunkPath = path.join(TEMP_DIR, file)
            chunks.push({ path: chunkPath, startMs })
          })

          console.log(`Created ${chunks.length} chunks`)
          resolve({ durationMs: duration, chunks })
        })
        .run()
    })
  })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const transcribeChunkWithRetry = async (
  client: Groq,
  chunkPath: string,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<{
  text: string
  segments: { start: number; end: number; text: string }[]
}> => {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const file = fs.createReadStream(chunkPath)

      const transcription = await client.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3-turbo',
        response_format: 'verbose_json',
        temperature: 0,
      })

      //@ts-ignore
      return transcription
    } catch (error) {
      lastError = error
      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt)
        console.log(
          `Transcription attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`
        )
        await sleep(delayMs)
      }
    }
  }

  throw new Error(
    `Failed to transcribe after ${maxRetries} attempts. Last error: ${lastError}`
  )
}

const transcribeChunk = async (
  client: Groq,
  chunkPath: string
): Promise<{
  text: string
  segments: { start: number; end: number; text: string }[]
}> => {
  return transcribeChunkWithRetry(client, chunkPath)
}

const digestTranscription = async (
  transcription: string,
  llmProvider: ReturnType<typeof createGoogleGenerativeAI>
) => {
  const { object } = await generateObject({
    schema: z.object({
      title: z.string().describe('El titulo de la reunion'),
      summary: z.string().describe('Un resumen mas extenso de la reunion'),
      short_summary: z
        .string()
        .describe(
          'Un resumen corto de la reunion con los key points. Que no supere los 255 caracteres'
        ),
      participants: z
        .array(
          z.object({
            name: z.string().describe('El nombre del participante'),
            role: z.string().describe('El rol del participante'),
          })
        )
        .describe(
          'Los participantes de la reunion. Deben ser los usuarios que formaron parte de la reunion. Evita agregar participantes que fueron mencionados unicamente'
        ),
    }),
    model: llmProvider('gemini-2.0-flash-001'),
    prompt: `Sos un experto en resumir reuniones. Tienes muchos años de experiencia definiendo un titulo y resumen de una transcripción de reunion. Genera un titulo y resumen para la siguiente transcripción de reunion:\n ${transcription}`,
  })

  return object
}

const saveMeeting = async (
  db: DatabaseClient,
  {
    analysis,
    durationMs,
    transcription,
    key,
  }: {
    analysis: Awaited<ReturnType<typeof digestTranscription>>
    durationMs: number
    transcription: string
    key: string
  }
) => {
  const { meeting } = await db.transaction(async (tx) => {
    const [meeting] = await tx
      .insert(meetingTable)
      .values({
        filename: key,
        title: analysis.title,
        summary: analysis.summary,
        short_summary: analysis.short_summary,
        duration_ms: durationMs,
        transcription,
      })
      .returning()

    await tx.insert(participantTable).values(
      analysis.participants.map((participant) => ({
        name: participant.name,
        role: participant.role,
        meeting_id: meeting.id,
      }))
    )

    return {
      meeting,
    }
  })

  console.log(`Meeting ${meeting.id} persisted successfully`)
}

const formatSRTTimestamp = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const milliseconds = ms % 1000

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`
}
