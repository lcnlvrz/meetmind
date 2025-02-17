import Groq from 'groq-sdk'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

config({
  path: path.join(__dirname, '.env'),
})

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const main = async () => {
  const file = fs.createReadStream(path.join(__dirname, 'groq-test.flac'))

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    language: 'es',
    response_format: 'verbose_json',
    temperature: 0,
  })

  console.log('transcription', transcription.text)
}

;(async () => {
  await main()
})()
