import { apiError, apiSuccess, requireAuth } from '@/lib/api'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/templates/saved/:id/html — render and return full HTML (with section comments)
export async function GET(_req: Request, { params }: RouteContext) {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await params

  // Implemented in Phase 4
  return apiSuccess({ html: null, id })
}
