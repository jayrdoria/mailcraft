import { apiError, apiSuccess, requireAuth } from '@/lib/api'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/templates/saved/:id/clean — render and return clean HTML (disabled sections stripped)
export async function GET(_req: Request, { params }: RouteContext) {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await params

  // Implemented in Phase 4
  return apiSuccess({ html: null, id })
}
