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

const TEMP_DIR = '/tmp'

const measureOp = async <T extends any>(
  operationName: string,
  cb: () => Promise<T>
) => {
  const start = performance.now()

  const result = await cb()

  const end = performance.now()

  console.log(`${operationName} took ${end - start}ms. Output: ${result}`)

  return result
}

export const handler = async (event: SQSEvent) => {
  const { s3, transcriber, db, google } = bootstrapDependencies()

  const [record] = event.Records

  const s3Event: S3Event = JSON.parse(record.body)

  const bucket = s3Event.Records[0].s3.bucket.name
  const key = decodeURIComponent(s3Event.Records[0].s3.object.key)

  const videoPath = path.join(TEMP_DIR, 'input.mp4')

  await measureOp('processMeeting', async () => {
    await measureOp('downloadFile', () =>
      downloadFromS3(s3, {
        bucket,
        key,
        filePath: videoPath,
      })
    )

    const audioPath = path.join(TEMP_DIR, 'output.flac')

    const durationMs = await measureOp('extractAudio', () =>
      extractAudio(videoPath, audioPath)
    )

    const transcription = await measureOp('transcribeAudio', () =>
      transcribeAudio(transcriber, audioPath)
    )

    const { title, summary } = await measureOp('digestTranscription', () =>
      digestTranscription(transcription, google)
    )

    await measureOp('saveMeeting', () =>
      saveMeeting(db, {
        title,
        summary,
        transcription,
        duration_ms: durationMs,
      })
    )
  })

  return {
    statusCode: 200,
    body: 'Audio extraction completed successfully',
  }
}

const bootstrapDependencies = () => {
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

const transcribeAudio = async (client: Groq, audioPath: string) => {
  const file = fs.createReadStream(audioPath)

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    language: 'es',
    response_format: 'verbose_json',
    temperature: 0,
  })

  return transcription.text
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
  outputPath: string
): Promise<number> => {
  return new Promise((resolve, reject) => {
    let duration: number = 0

    ffmpeg(inputPath)
      .toFormat('flac')
      .audioCodec('flac')
      .on('error', reject)
      .on('codecData', (data) => {
        duration = parseFloat(data.duration)
      })
      //@ts-ignore
      .on('end', () => resolve(duration))
      .save(outputPath)
  })
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
