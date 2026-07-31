import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

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
