import { apiError, apiSuccess, requireAuth, requireAdmin } from '@/lib/api'

// GET /api/templates/master — list all active master templates
export async function GET() {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  // Implemented in Phase 4
  return apiSuccess({ templates: [] })
}

// POST /api/templates/master — create a new master template (admin only)
export async function POST() {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}
