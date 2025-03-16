import { z } from 'zod'

export const env = z.object({
  BETTER_AUTH_SECRET: z.string(),
  TURSO_DATABASE_URL: z.string(),
  TURSO_AUTH_TOKEN: z.string(),

  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_BUCKET_NAME: z.string(),

  GOOGLE_API_KEY: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  WHITELISTED_EMAILS: z.string(),

  NEXT_PUBLIC_APP_URL: z.string(),
})

try {
  env.parse(process.env)
} catch (err) {
  if (err instanceof z.ZodError) {
    console.log(
      `Failed to parse environment variables: ${JSON.stringify(
        err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
        null,
        4
      )}`
    )
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof env> {}
  }
}
