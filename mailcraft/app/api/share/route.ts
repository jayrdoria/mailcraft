import { apiError, requireAuth } from '@/lib/api'

// POST /api/share — share a saved template with another internal account
// Body: { savedTemplateId: string, sharedWithId: string }
export async function POST() {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  // Implemented in Phase 4
  return apiError('Not yet implemented', 501)
}
