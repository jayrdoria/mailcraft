import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL is not defined in environment variables')

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null
      return Math.min(times * 200, 2000)
    },
    lazyConnect: true,
  })

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err)
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Cache keys
export const CacheKeys = {
  masterTemplateHtml: (templateId: string, lang: string) =>
    `mailcraft:master:html:${templateId}:${lang}`,
  masterTemplateList: 'mailcraft:master:list',
} as const

export const CacheTTL = {
  masterTemplateHtml: 60 * 60,     // 1 hour
  masterTemplateList: 5 * 60,      // 5 minutes
} as const
