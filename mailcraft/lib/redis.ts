import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL

  if (!url) {
    // During `next build`, NEXT_PHASE is set automatically — return a stub that never connects
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return new Redis('redis://localhost:6379', {
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
      })
    }
    throw new Error('REDIS_URL is not defined in environment variables')
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null
      return Math.min(times * 200, 2000)
    },
    lazyConnect: true,
    enableOfflineQueue: false,
    family: 4,
  })

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message)
  })

  return client
}

function getRedisClient(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = createRedisClient()
  }
  return globalForRedis.redis
}

// Proxy defers init to first property access (request time, not build/import time).
// Methods MUST be bound to the real client — otherwise they execute with `this`
// set to the proxy, and internal writes inside ioredis (e.g. `this.condition = …`
// during connect) silently land on the proxy target instead of the client.
// That corrupts ioredis state and makes `connectHandler` throw an uncatchable
// `TypeError: Cannot read properties of undefined (reading 'auth')` on every
// connection attempt.
export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    const client = getRedisClient()
    const value = client[prop as keyof Redis]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

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
