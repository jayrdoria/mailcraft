import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────
// Google SSO — enabled only when all three env vars are set.
// Sign-in is lookup-only: it never creates, updates or deletes a user.
// ─────────────────────────────────────────────

export const googleAllowedDomains = (process.env.GOOGLE_ALLOWED_DOMAINS ?? '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean)

export const isGoogleSsoEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET &&
    googleAllowedDomains.length > 0
)

export type GoogleSignInError = 'GoogleDomain' | 'GoogleNoAccount'

interface GoogleProfileClaims {
  email?: string | null
  email_verified?: unknown
  hd?: unknown
}

// Case-insensitive match against an existing active account.
// Returns null when there is no match or more than one (never guesses).
export async function findUserForGoogle(email: string) {
  const matches = await prisma.user.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      isActive: true,
      canAccessEmails: true,
    },
    take: 2,
  })
  if (matches.length !== 1 || !matches[0].isActive) return null
  return matches[0]
}

// Returns null when the Google account may sign in, otherwise the rejection code.
export async function checkGoogleSignIn(
  profile: GoogleProfileClaims | undefined
): Promise<GoogleSignInError | null> {
  const email = profile?.email?.toLowerCase()
  const hostedDomain = typeof profile?.hd === 'string' ? profile.hd.toLowerCase() : ''
  const emailDomain = email?.split('@')[1] ?? ''

  if (
    !email ||
    profile?.email_verified !== true ||
    !googleAllowedDomains.includes(hostedDomain) ||
    !googleAllowedDomains.includes(emailDomain)
  ) {
    console.warn(`[Auth] Google sign-in rejected (domain): ${email ?? 'no email'}`)
    return 'GoogleDomain'
  }

  if (!(await findUserForGoogle(email))) {
    console.warn(`[Auth] Google sign-in rejected (no active account): ${email}`)
    return 'GoogleNoAccount'
  }

  return null
}
