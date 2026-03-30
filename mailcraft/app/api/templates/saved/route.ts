import { apiError, apiSuccess, requireAuth } from '@/lib/api'

// GET /api/templates/saved — list current user's saved templates
export async function GET() {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  // Implemented in Phase 4
  return apiSuccess({ templates: [] })
}

// POST /api/templates/saved — clone a master template into a new saved template
export async function POST() {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}
