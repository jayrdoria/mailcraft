import { apiError, apiSuccess, requireAdmin } from '@/lib/api'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/users/:id — get a department account (admin only)
export async function GET(_req: Request, { params }: RouteContext) {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await params

  // Implemented in Phase 4
  return apiSuccess({ user: null, id })
}

// PATCH /api/users/:id — update name, email, department, isActive, canAccessEmails (admin only)
export async function PATCH(_req: Request, { params }: RouteContext) {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await params

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}

// DELETE /api/users/:id — deactivate account (admin only, no hard delete)
export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await params

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}
