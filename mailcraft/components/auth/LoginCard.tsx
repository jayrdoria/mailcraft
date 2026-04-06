'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import LoginForm from './LoginForm'

export default function LoginCard() {
  const cardRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 24,
        duration: 0.5,
        ease: 'power2.out',
      })
    },
    { scope: cardRef }
  )

  return (
    <div
      ref={cardRef}
      className="w-full max-w-sm p-8 rounded-xl border bg-card shadow-sm"
    >
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mailcraft/logo.png"
            alt="MailCraft"
            width={64}
            height={64}
            className="rounded-xl"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">MailCraft</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
      </div>
      <LoginForm />
    </div>
  )
}
