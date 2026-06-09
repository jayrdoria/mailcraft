import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { analyzeHtml } from '@/lib/services/htmlImportService'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

// POST /api/import/analyze
// Accepts multipart form data with a single "file" field (HTML file)
// Returns instrumented HTML (with data-mc-id attrs) + eligible DOM nodes for the visual mapper
export const POST = apiHandler(async (req) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return apiError('Invalid form data', 400)
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') return apiError('No HTML file provided', 400)

  if (file.size > MAX_FILE_SIZE) return apiError('File too large (max 2 MB)', 400)
  if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
    return apiError('Only .html files are accepted', 400)
  }

  const html = await file.text()
  if (!html.trim()) return apiError('File is empty', 400)

  const result = analyzeHtml(html)
  return apiSuccess(result)
})
