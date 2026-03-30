import { apiError, apiSuccess, requireAuth, requireAdmin } from '@/lib/api'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/templates/master/:id — get a master template by ID
export async function GET(_req: Request, { params }: RouteContext) {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await params

  // Implemented in Phase 4
  return apiSuccess({ template: null, id })
}

// PATCH /api/templates/master/:id — update a master template (admin only)
export async function PATCH(_req: Request, { params }: RouteContext) {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await params

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}

// DELETE /api/templates/master/:id — soft-delete (set isActive=false) (admin only)
export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await params

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}
