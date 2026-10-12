import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import {
  googleAllowedDomains,
  isGoogleSsoEnabled,
  findUserForGoogle,
  checkGoogleSignIn,
} from '@/lib/googleSso'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: '/mailcraft/api/auth',
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            department: true,
            isActive: true,
            canAccessEmails: true,
          },
        })

        if (!user || !user.isActive) return null

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        )
        if (!passwordValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          canAccessEmails: user.canAccessEmails,
        }
      },
    }),
    ...(isGoogleSsoEnabled
      ? [
          Google({
            checks: ['pkce', 'state'],
            authorization: {
              params: {
                prompt: 'select_account',
                // UI hint only — the real domain check is in the signIn callback
                ...(googleAllowedDomains.length === 1 && { hd: googleAllowedDomains[0] }),
              },
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      },
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true

      const rejection = await checkGoogleSignIn(profile)
      return rejection ? `/mailcraft/login?error=${rejection}` : true
    },
    async jwt({ token, user, account }) {
      // Google: identity comes from Google, everything else from the DB row.
      // token.id must be the DB user id (not Google's sub) so ownership checks match.
      if (account?.provider === 'google') {
        const dbUser = token.email ? await findUserForGoogle(token.email) : null
        if (!dbUser) throw new Error('Google sign-in: account not found')
        token.id = dbUser.id
        token.email = dbUser.email
        token.name = dbUser.name
        token.role = dbUser.role
        token.department = dbUser.department
        token.canAccessEmails = dbUser.canAccessEmails
        return token
      }
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.department = (user as { department: string | null }).department
        token.canAccessEmails = (user as { canAccessEmails: boolean }).canAccessEmails
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as 'ADMIN' | 'DEPARTMENT'
      session.user.department = token.department as string | null
      session.user.canAccessEmails = token.canAccessEmails as boolean
      return session
    },
  },
  pages: {
    signIn: '/mailcraft/login',
    // OAuth errors land on the login page (?error=...) instead of the bare Auth.js page.
    // Credentials login is unaffected — server-action signIn throws instead of redirecting.
    error: '/mailcraft/login',
  },
})
