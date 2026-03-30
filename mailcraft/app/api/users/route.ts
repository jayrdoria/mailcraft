import { apiError, apiSuccess, requireAdmin } from '@/lib/api'

// GET /api/users — list all department accounts (admin only)
export async function GET() {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  // Implemented in Phase 4
  return apiSuccess({ users: [] })
}

// POST /api/users — create a new department account (admin only)
export async function POST() {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}
