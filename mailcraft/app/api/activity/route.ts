import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope } from '@/lib/services/accessService'
import { prisma } from '@/lib/prisma'
import { ActivityAction } from '@prisma/client'
const DEFAULT_PAGE_SIZE = 50

const VALID_ACTIONS = new Set([
  'TEMPLATE_CLONED', 'TEMPLATE_SAVED', 'TEMPLATE_DELETED',
  'HTML_COPIED', 'HTML_DOWNLOADED', 'SECTION_DELETED',
  'ACCOUNT_CREATED', 'ACCOUNT_DEACTIVATED',
])

// GET /api/activity — activity logs (admin: all, department account: whole department, else own)
// Query: ?userId=&action=&from=&to=&savedTemplateId=&limit=&page=
export const GET = apiHandler(async (req) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const url = new URL(req.url)
  const isAdmin = scope.isAdmin

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10)))
  const skip = (page - 1) * limit

  const rawAction = url.searchParams.get('action')
  const action = rawAction && VALID_ACTIONS.has(rawAction) ? rawAction : undefined
  const savedTemplateId = url.searchParams.get('savedTemplateId') ?? undefined
  const from = url.searchParams.get('from') ?? undefined
  const to = url.searchParams.get('to') ?? undefined

  // Admin can filter by userId; everyone else sees their department's activity (or just their own)
  const userId = isAdmin ? (url.searchParams.get('userId') ?? undefined) : undefined

  const where = {
    ...(isAdmin ? (userId ? { userId } : {}) : { userId: { in: scope.memberIds } }),
    ...(action ? { action: action as ActivityAction } : {}),
    ...(savedTemplateId ? { savedTemplateId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      // Accounts in a department can share a display name — email tells them apart
      include: { user: { select: { email: true } } },
    }),
    prisma.activityLog.count({ where }),
  ])

  return apiSuccess({
    logs,
    pagination: { page, pageSize: limit, total },
  })
})
