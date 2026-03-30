'use server'

import { signIn, signOut } from '@/lib/auth'
import { AuthError } from 'next-auth'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

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

export async function logoutAction() {
  await signOut({ redirectTo: '/mailcraft/login' })
}
