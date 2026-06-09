import ImportsClient from '@/components/import/ImportsClient'

export const metadata = {
  title: 'My Imports — MailCraft',
}

export default function ImportsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ImportsClient />
    </div>
  )
}
