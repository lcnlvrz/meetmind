import * as path from 'path'

console.log('dotenv path', path.resolve(__dirname, '../.env'))

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
})

import { test } from 'vitest'
import { handler } from '.'

test('should execute successfully', async () => {
  await handler({
    Records: [
      {
        body: JSON.stringify({
          Records: [
            {
              s3: {
                bucket: {
                  name: 'meetmind-meetings',
                },
                object: {
                  key: '2025-01-30_14-38-10.mkv',
                },
              },
            },
          ],
        }),
      },
    ],
  } as any)
})
