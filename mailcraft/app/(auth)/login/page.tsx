import LoginCard from '@/components/auth/LoginCard'
import { isGoogleSsoEnabled } from '@/lib/googleSso'

export const metadata = {
  title: 'MailCraft',
}

// Fixed messages per Auth.js / signIn-callback error code — never echo the raw query value
const LOGIN_ERRORS: Record<string, string> = {
  GoogleDomain: 'Please sign in with your company Google account.',
  GoogleNoAccount: 'No active MailCraft account matches this Google account. Contact an admin.',
  AccessDenied: 'No active MailCraft account matches this Google account. Contact an admin.',
}
const DEFAULT_LOGIN_ERROR = 'Sign-in failed. Please try again.'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  const { error } = await searchParams
  const code = Array.isArray(error) ? error[0] : error
  const errorMessage = code ? (LOGIN_ERRORS[code] ?? DEFAULT_LOGIN_ERROR) : undefined

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <LoginCard googleEnabled={isGoogleSsoEnabled} errorMessage={errorMessage} />
    </main>
  )
}
