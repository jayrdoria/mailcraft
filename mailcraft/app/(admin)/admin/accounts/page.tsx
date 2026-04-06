import AccountsClient from '@/components/admin/AccountsClient'

export const metadata = {
  title: 'Accounts — MailCraft Admin',
}

export default function AccountsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Accounts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage department accounts</p>
      </div>
      <AccountsClient />
    </div>
  )
}
