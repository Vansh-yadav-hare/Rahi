import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  throw new Error('REDIS_URL is not defined in the environment variables')
}

class MemoryRedisClient {
  constructor() {
    this.store = new Map()
    this.timeouts = new Map()
  }

  async connect() {
    return Promise.resolve()
  }

  async get(key) {
    return Promise.resolve(this.store.get(key) || null)
  }

  async set(key, value, options) {
    this.store.set(key, value)
    if (options && options.EX) {
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key))
      }
      const timeoutId = setTimeout(() => {
        this.store.delete(key)
        this.timeouts.delete(key)
      }, options.EX * 1000)
      this.timeouts.set(key, timeoutId)
    }
    return Promise.resolve('OK')
  }

  async del(key) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key))
      this.timeouts.delete(key)
    }
    const existed = this.store.delete(key)
    return Promise.resolve(existed ? 1 : 0)
  }

  on(event, callback) {
    if (event === 'ready' || event === 'connect') {
      setTimeout(callback, 0)
    }
    return this
  }
}

let redisClient
let isMock = false

const hasPlaceholderPassword = redisUrl.includes('********')

if (hasPlaceholderPassword) {
  console.warn('WARNING: Redis URL contains placeholder password "********". Using in-memory Redis fallback.')
  redisClient = new MemoryRedisClient()
  isMock = true
} else {
  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 1) {
          return new Error('Redis connection retry limit reached')
        }
        return 500 // retry after 500ms
      },
    },
  })

  redisClient.on('error', (err) => {
    if (!isMock) {
      console.error('Redis Client Error:', err.message)
    }
  })

  redisClient.on('connect', () => {
    if (!isMock) console.log('Redis client connecting...')
  })

  redisClient.on('ready', () => {
    if (!isMock) console.log('Redis Connected')
  })
}

const connectRedis = async () => {
  if (isMock) {
    console.log('Redis Connected (In-Memory Fallback)')
    return
  }

  try {
    await redisClient.connect()
  } catch (error) {
    console.warn(`Redis connection failed: ${error.message}. Falling back to in-memory Redis.`)
    isMock = true
    redisClient = new MemoryRedisClient()
    console.log('Redis Connected (In-Memory Fallback)')
  }
}

export { redisClient, connectRedis }
export default redisClient
