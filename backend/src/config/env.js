import dns from 'dns'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Set DNS servers to prevent localhost resolution issue if misconfigured
try {
  const servers = dns.getServers()
  if (servers.length === 1 && servers[0] === '127.0.0.1') {
    dns.setServers(['8.8.8.8', '1.1.1.1'])
  }
} catch {
  // Ignore fallback configuration failure if not supported
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure dotenv to load .env from the backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const requiredEnv = ['MONGODB_URI', 'REDIS_URL', 'JWT_SECRET']
const missingEnv = requiredEnv.filter((key) => !process.env[key])

if (missingEnv.length > 0) {
  throw new Error(
    `FATAL STARTUP ERROR: Missing required environment variables: ${missingEnv.join(', ')}.\n` +
      `Please create a '.env' file in the 'backend/' directory (or check .env.example) and add these values.`
  )
}
