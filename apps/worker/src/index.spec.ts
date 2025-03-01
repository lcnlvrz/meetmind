import * as path from 'path'

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
})

import { test } from 'vitest'
import { bootstrapDependencies, processMeeting } from '.'

test('should execute successfully', async () => {
  const deps = bootstrapDependencies()

  await processMeeting({
    ...deps,
    videoPath: path.join(__dirname, '../test/data/meeting-short.webm'),
  })
})
