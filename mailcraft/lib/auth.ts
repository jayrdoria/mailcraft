import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

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
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
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
  },
})
