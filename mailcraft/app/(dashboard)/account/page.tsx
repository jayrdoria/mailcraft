import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserById } from '@/lib/services/userService'
import AccountClient from '@/components/account/AccountClient'

export default async function AccountPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const user = await getUserById(session.user.id)
  if (!user) redirect('/login')

  return (
    <AccountClient
      id={user.id}
      name={user.name}
      email={user.email}
      role={user.role}
      department={user.department}
      createdAt={user.createdAt.toISOString()}
    />
  )
}
