import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { departmentKey } from '@/lib/department'

/**
 * Reuse the spelling of an existing department when the input matches it
 * case-insensitively ("crm" → "CRM"), so one team never ends up split in two.
 */
export async function canonicalDepartment(input: string): Promise<string> {
  const key = departmentKey(input)
  if (!key) return input
  const existing = await prisma.user.findMany({
    where: { department: { not: null } },
    select: { department: true },
    orderBy: { createdAt: 'asc' },
  })
  return existing.find((u) => departmentKey(u.department) === key)?.department ?? input
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      isActive: true,
      canAccessEmails: true,
      canManageCtaPresets: true,
      createdAt: true,
      _count: {
        select: { savedTemplates: true },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      isActive: true,
      canAccessEmails: true,
      canManageCtaPresets: true,
      createdAt: true,
    },
  })
}

export async function createUser(params: {
  email: string
  name: string
  password?: string // omitted = Google-only account
  department: string
  role?: 'ADMIN' | 'DEPARTMENT'
}) {
  const { email, name, password, department, role = 'DEPARTMENT' } = params

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })
  if (existing) throw new Error('Email already in use')

  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: password ? await bcrypt.hash(password, 12) : null,
      role,
      department,
      isActive: true,
      canAccessEmails: true,
    },
  })
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string
    email: string
    role: 'ADMIN' | 'DEPARTMENT'
    isActive: boolean
    canAccessEmails: boolean
    canManageCtaPresets: boolean
    department: string
  }>
) {
  return prisma.user.update({ where: { id }, data })
}

export async function resetUserPassword(id: string, newPassword: string) {
  return prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  })
}

export async function deactivateUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
  })
}
