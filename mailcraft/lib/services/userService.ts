import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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
      createdAt: true,
    },
  })
}

export async function createUser(params: {
  email: string
  name: string
  password: string
  department: string
}) {
  const { email, name, password, department } = params

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('Email already in use')

  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'DEPARTMENT',
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
    isActive: boolean
    canAccessEmails: boolean
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
