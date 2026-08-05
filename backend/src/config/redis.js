import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  throw new Error('REDIS_URL is not defined in the environment variables')
}

// In-Memory fallback store
const memoryStore = {
  store: new Map(),
  timeouts: new Map(),

  async get(key) {
    return this.store.get(key) || null
  },

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
    return 'OK'
  },

  async del(key) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key))
      this.timeouts.delete(key)
    }
    const existed = this.store.delete(key)
    return existed ? 1 : 0
  },
}

let isMock = false
const hasPlaceholderPassword = redisUrl.includes('********')

if (hasPlaceholderPassword) {
  console.warn('WARNING: Redis URL contains placeholder password "********". Using in-memory Redis fallback.')
  isMock = true
}

// Wrapper Client to guarantee dynamic, error-free fallback
class ResilientRedisClient {
  constructor() {
    if (!isMock) {
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            // Keep retry attempts minimal during outage to avoid logging spam
            if (retries > 2) {
              if (!isMock) {
                console.warn('Redis reconnection failed. Falling back to in-memory store.')
                isMock = true
              }
              return new Error('Redis connection retry limit reached')
            }
            return 1000 // Retry once after 1s
          },
        },
      })

      this.client.on('error', (err) => {
        if (!isMock) {
          console.error('Redis Client connection issue:', err.message)
          isMock = true
        }
      })
    }
  }

  async connect() {
    if (isMock) return Promise.resolve()
    try {
      await this.client.connect()
      console.log('Redis Connected successfully')
    } catch (err) {
      console.warn(`Redis initial connect failed: ${err.message}. Falling back to in-memory.`)
      isMock = true
    }
  }

  async get(key) {
    if (isMock) return memoryStore.get(key)
    try {
      return await this.client.get(key)
    } catch (err) {
      isMock = true
      console.warn(`Redis GET failed: ${err.message}. Switched to in-memory fallback.`)
      return memoryStore.get(key)
    }
  }

  async set(key, value, options) {
    if (isMock) return memoryStore.set(key, value, options)
    try {
      return await this.client.set(key, value, options)
    } catch (err) {
      isMock = true
      console.warn(`Redis SET failed: ${err.message}. Switched to in-memory fallback.`)
      return memoryStore.set(key, value, options)
    }
  }

  async del(key) {
    if (isMock) return memoryStore.del(key)
    try {
      return await this.client.del(key)
    } catch (err) {
      isMock = true
      console.warn(`Redis DEL failed: ${err.message}. Switched to in-memory fallback.`)
      return memoryStore.del(key)
    }
  }

  on(event, callback) {
    if (isMock) {
      if (event === 'ready' || event === 'connect') {
        setTimeout(callback, 0)
      }
      return this
    }
    this.client.on(event, callback)
    return this
  }
}

const redisClient = new ResilientRedisClient()

const connectRedis = async () => {
  await redisClient.connect()
}

export { redisClient, connectRedis }
export default redisClient
