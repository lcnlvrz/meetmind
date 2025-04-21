import './env'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './lib/server/db'
import * as schema from 'db/schema'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'

export const auth = betterAuth({
  trustedOrigins: ['https://meetmind.lucianoalvarez.dev'],
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      enabled: true,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      mapProfileToUser: async (profile) => {
        if (!process.env.WHITELISTED_EMAILS.split(',').includes(profile.email))
          throw new APIError('FORBIDDEN', {
            message: 'Your email is not whitelisted',
            code: 'FORBIDDEN',
          })

        return {
          name: profile.given_name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified,
        }
      },
    },
  },
})
