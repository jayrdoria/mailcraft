import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canManageCtaPresets } from '@/lib/services/ctaPresetService'
import ThumbnailPresetsClient from '@/components/thumbnail-presets/ThumbnailPresetsClient'

export const metadata = {
  title: 'Thumbnail Presets — MailCraft',
}

// Same permission as CTA presets (admins + accounts with canManageCtaPresets)
export default async function ThumbnailPresetsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!(await canManageCtaPresets(session.user.id))) redirect('/dashboard')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Thumbnail Presets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Quick picks for the editor&apos;s thumbnail slots, per brand. Picking one fills the image, label, sublabel and link
          in every language — FRCA uses the FR text. Empty optional languages leave the template&apos;s value as is.
        </p>
      </div>
      <ThumbnailPresetsClient />
    </div>
  )
}
