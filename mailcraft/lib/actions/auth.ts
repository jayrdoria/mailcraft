'use server'

import { signIn, signOut } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { headers } from 'next/headers'
import { rateLimit } from '@/lib/rateLimit'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Rate limit: 5 attempts per IP per 60 seconds
  const headersList = await headers()
  const ip =
    headersList.get('x-real-ip') ??
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  const limited = await rateLimit(`login:${ip}`, 5, 60)
  if (limited) {
    console.warn(`[Auth] Rate limit exceeded for IP: ${ip}`)
    return { error: 'Too many login attempts. Please wait a minute and try again.' }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/mailcraft/dashboard',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password.' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }
}

export async function googleLoginAction() {
  // Rate limit: 10 attempts per IP per 60 seconds
  const headersList = await headers()
  const ip =
    headersList.get('x-real-ip') ??
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  const limited = await rateLimit(`login-google:${ip}`, 10, 60)
  if (limited) {
    console.warn(`[Auth] Google login rate limit exceeded for IP: ${ip}`)
    return { error: 'Too many login attempts. Please wait a minute and try again.' }
  }

  try {
    // Redirects to Google; access checks run in the signIn callback (lib/auth.ts)
    await signIn('google', { redirectTo: '/mailcraft/dashboard' })
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    return { error: 'Google sign-in is unavailable. Please try again.' }
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/mailcraft/login' })
}
