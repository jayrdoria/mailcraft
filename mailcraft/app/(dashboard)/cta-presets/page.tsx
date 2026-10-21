import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canManageCtaPresets } from '@/lib/services/ctaPresetService'
import CtaPresetsClient from '@/components/cta-presets/CtaPresetsClient'

export const metadata = {
  title: 'CTA Presets — MailCraft',
}

export default async function CtaPresetsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!(await canManageCtaPresets(session.user.id))) redirect('/dashboard')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">CTA Presets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Options in the editor&apos;s CTA Button Text dropdown. Picking one fills every language — FRCA uses the FR text.
        </p>
      </div>
      <CtaPresetsClient />
    </div>
  )
}
