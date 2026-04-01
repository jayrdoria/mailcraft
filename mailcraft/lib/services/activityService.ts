import { prisma } from '@/lib/prisma'
import type { ActivityAction } from '@prisma/client'

export async function log(entry: {
  action:             ActivityAction
  userId:             string
  userName:           string
  savedTemplateId?:   string
  savedTemplateName?: string
  masterTemplateName?: string
  sectionName?:       string
  htmlType?:          string
  targetAccountName?: string
}): Promise<void> {
  await prisma.activityLog.create({ data: entry })
}
