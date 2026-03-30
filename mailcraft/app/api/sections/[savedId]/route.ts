import { apiError, apiSuccess, requireAuth } from '@/lib/api'

interface RouteContext {
  params: Promise<{ savedId: string }>
}

// PATCH /api/sections/:savedId — toggle a section on or off
// Body: { sectionName: string, action: 'enable' | 'disable' }
export async function PATCH(_req: Request, { params }: RouteContext) {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { savedId } = await params

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}

// DELETE /api/sections/:savedId — permanently delete a section
// Body: { sectionName: string }
export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { savedId } = await params

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}
