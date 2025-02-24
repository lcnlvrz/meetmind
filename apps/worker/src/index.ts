import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { S3Event, SQSEvent } from 'aws-lambda'
import * as ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import Groq from 'groq-sdk'
import * as path from 'path'
import { db, transcriptionTable } from '@meetmind/db'

const s3 = new S3Client({})
const TEMP_DIR = '/tmp'

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const handler = async (event: SQSEvent) => {
  console.log('received event', JSON.stringify(event, null, 4))

  const [record] = event.Records

  const s3Event: S3Event = JSON.parse(record.body)
  const bucket = s3Event.Records[0].s3.bucket.name
  const key = decodeURIComponent(s3Event.Records[0].s3.object.key)

  const videoPath = path.join(TEMP_DIR, 'input.mp4')

  await downloadFromS3(bucket, key, videoPath)

  const audioPath = path.join(TEMP_DIR, 'output.mp3')
  await extractAudio(videoPath, audioPath)

  const transcription = await transcribeAudio(audioPath)

  await saveTranscription(transcription)

  return {
    statusCode: 200,
    body: 'Audio extraction completed successfully',
  }
}

const transcribeAudio = async (audioPath: string) => {
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
  bucket: string,
  key: string,
  filePath: string
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

const extractAudio = (inputPath: string, outputPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    ffmpeg(inputPath)
      .toFormat('flac')
      .audioCodec('flac')
      .on('error', reject)
      .on('end', resolve)
      .save(outputPath)
  })
}

const saveTranscription = async (transcription: string) => {
  await db.insert(transcriptionTable).values({
    transcription: transcription,
  })
}
