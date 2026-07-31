import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  throw new Error('REDIS_URL is not defined in the environment variables')
}

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Fail fast during startup if it cannot connect, do not retry forever
      if (retries > 2) {
        return new Error('Redis connection retry limit reached')
      }
      return 1000 // retry after 1s
    }
  }
})

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err.message)
})

redisClient.on('connect', () => {
  console.log('Redis client connecting...')
})

redisClient.on('ready', () => {
  console.log('Redis Connected')
})

const connectRedis = async () => {
  try {
    await redisClient.connect()
  } catch (error) {
    console.error(`Redis startup connection failed: ${error.message}`)
    process.exit(1)
  }
}

export { redisClient, connectRedis }
export default redisClient
