import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createClient } from '@libsql/client'

// Create server instance
const server = new McpServer({
  name: 'meetmind',
  version: '1.0.0',
  capabilities: {
    resources: {},
    tools: {},
  },
})

server.tool(
  'get-current-day',
  'Retrieves the current day in ISO 8601 format',
  {},
  async () => {
    return {
      content: [
        {
          type: 'text',
          mimeType: 'text/plain',
          text: new Date().toISOString(),
        },
      ],
    }
  }
)

server.tool(
  'get-meetings',
  'Get meetings for a given date',
  {
    start_date: z.string().describe('ISO 8601 formatted date'),
    end_date: z.string().describe('ISO 8601 formatted date'),
  },
  async ({ start_date, end_date }) => {
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    const result = await turso.execute(
      `
    SELECT title, summary, filename, short_summary FROM meetings
    WHERE created_at BETWEEN $start_date AND $end_date
  `,
      {
        $start_date: start_date,
        $end_date: end_date,
      }
    )

    return {
      content: [
        {
          type: 'text',
          mimeType: 'application/json',
          text: JSON.stringify(result.rows, null, 2),
        },
      ],
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('Fatal error in main()', err)
  process.exit(1)
})
