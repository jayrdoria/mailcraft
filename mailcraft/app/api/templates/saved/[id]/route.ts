import { apiError, apiSuccess, requireAuth } from '@/lib/api'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/templates/saved/:id — get a saved template (owner only)
export async function GET(_req: Request, { params }: RouteContext) {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await params

  // Implemented in Phase 4
  return apiSuccess({ template: null, id })
}

// PATCH /api/templates/saved/:id — update field values / name / sectionConfig
export async function PATCH(_req: Request, { params }: RouteContext) {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await params

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}

// DELETE /api/templates/saved/:id — delete a saved template (owner only)
export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await params

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}
