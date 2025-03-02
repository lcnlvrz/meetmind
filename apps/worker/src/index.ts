import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  createDatabaseClient,
  DatabaseClient,
  InsertMeeting,
  meetingTable,
} from 'db'
import { generateObject } from 'ai'
import type { S3Event, SQSEvent } from 'aws-lambda'
import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import Groq from 'groq-sdk'
import * as path from 'path'
import { z } from 'zod'
import pLimit from 'p-limit'
import TelegramBot from 'node-telegram-bot-api'
import { serializeError } from 'serialize-error'

const TEMP_DIR = '/tmp'

const CHUNK_LENGTH_SEC = 600
const OVERLAP_SEC = 10

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

export const handler = async (event: SQSEvent) => {
  try {
    const start = performance.now()

    const [record] = event.Records

    const s3Event: S3Event = JSON.parse(record.body)

    const bucket = s3Event.Records[0].s3.bucket.name
    const key = decodeURIComponent(s3Event.Records[0].s3.object.key)

    const videoPath = path.join(TEMP_DIR, 'input.mp4')

    const deps = bootstrapDependencies()

    await measureOp('downloadFile', () =>
      downloadFromS3(deps.s3, {
        bucket,
        key,
        filePath: videoPath,
      })
    )

    const { title, summary } = await processMeeting({
      ...deps,
      videoPath,
    })

    const end = performance.now()

    await bot.sendMessage(
      process.env.TELEGRAM_CHAT_ID!,
      `Meeting ${key} processed successfully\nTitle: ${title}\nSummary: ${summary}\nTime taken: ${end - start}ms`
    )

    return {
      statusCode: 200,
      body: 'Audio extraction completed successfully',
    }
  } catch (err) {
    await bot.sendMessage(
      process.env.TELEGRAM_CHAT_ID!,
      `Error processing meeting: ${JSON.stringify(serializeError(err), null, 4)}`
    )

    throw err
  }
}

export const processMeeting = async ({
  videoPath,
  transcriber,
  google,
  db,
}: {
  videoPath: string
} & ReturnType<typeof bootstrapDependencies>) =>
  await measureOp('processMeeting', async () => {
    const audioPath = path.join(TEMP_DIR, 'output.flac')

    const { durationMs, chunks } = await measureOp('extractAudio', () =>
      extractAudio(videoPath, audioPath)
    )

    const limit = pLimit(5)

    const transcriptionResults = await Promise.all(
      chunks.map((chunk, i) =>
        limit(() =>
          measureOp(`transcribeChunk${i + 1}`, async () => {
            const result = await transcribeChunk(transcriber, chunk.path)
            return { ...result, startMs: chunk.startMs }
          })
        )
      )
    )

    const transcriptionText = transcriptionResults
      .map((transcription) => transcription.text)
      .join(' ')

    const { title, summary } = await measureOp('digestTranscription', () =>
      digestTranscription(transcriptionText, google)
    )

    await measureOp('saveMeeting', () =>
      saveMeeting(db, {
        title,
        summary,
        transcription: transcriptionText,
        duration_ms: durationMs,
      })
    )

    chunks.forEach((chunk) => fs.unlinkSync(chunk.path))

    return { title, summary }
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
  chunkLengthSec: number = CHUNK_LENGTH_SEC,
  overlapSec: number = OVERLAP_SEC
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

      ffmpeg(inputPath)
        .toFormat('flac')
        .audioCodec('flac')
        .audioFrequency(16000)
        .audioChannels(1)
        .on('error', reject)
        .on('end', async () => {
          const fileSizeInBytes = fs.statSync(outputPath).size
          const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2)
          console.log(
            `Audio file size: ${fileSizeInMB} MB. Duration: ${duration}ms`
          )

          const chunkMs = chunkLengthSec * 1000
          const overlapMs = overlapSec * 1000
          const totalChunks = Math.ceil(duration / (chunkMs - overlapMs))

          console.log('Going to create', totalChunks, 'audio chunks')

          const splitterLimit = pLimit(5)

          await Promise.all(
            Array.from({ length: totalChunks }).map((_, i) =>
              splitterLimit(async () => {
                const startMs = i * (chunkMs - overlapMs)
                const chunkPath = path.join(TEMP_DIR, `chunk_${i}.flac`)
                chunks.push({ path: chunkPath, startMs })

                console.log('Creating chunk', i, 'of', totalChunks)

                await new Promise<void>((resolve) =>
                  ffmpeg(outputPath)
                    .setStartTime(startMs / 1000)
                    .setDuration(chunkLengthSec)
                    .output(chunkPath)
                    .audioCodec('flac')
                    .audioFrequency(16000)
                    .audioChannels(1)
                    .on('end', () => {
                      console.log('Chunk', i, 'of', totalChunks, 'created')
                      resolve()
                    })
                    .on('error', reject)
                    .run()
                )
              })
            )
          )

          resolve({ durationMs: duration, chunks })
        })
        .save(outputPath)
    })
  })
}

const transcribeChunk = async (
  client: Groq,
  chunkPath: string
): Promise<{ text: string; segments: any[] }> => {
  const file = fs.createReadStream(chunkPath)

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    response_format: 'verbose_json',
    temperature: 0,
  })

  //@ts-ignore
  return transcription
}

const digestTranscription = async (
  transcription: string,
  llmProvider: ReturnType<typeof createGoogleGenerativeAI>
) => {
  const { object } = await generateObject({
    schema: z.object({
      title: z.string(),
      summary: z.string(),
    }),
    model: llmProvider('gemini-1.5-flash'),
    prompt: `Sos un experto en resumir reuniones. Tienes muchos años de experiencia definiendo un titulo y resumen de una transcripción de reunion. Genera un titulo y resumen para la siguiente transcripción de reunion:\n ${transcription}`,
  })

  return object
}

const saveMeeting = async (db: DatabaseClient, meeting: InsertMeeting) => {
  await db.insert(meetingTable).values(meeting)
}

//@ts-ignore
handler()
