import './config/env.js' // Loads and validates environment variables first
import express from 'express'
import cors from 'cors'
import connectDB from './config/db.js'
import { connectRedis } from './config/redis.js'

import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Startup function to ensure database connections succeed before listening
const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...')
    await connectDB()

    console.log('Connecting to Redis...')
    await connectRedis()

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  } catch (error) {
    console.error(`Fatal error starting server: ${error.message}`)
    process.exit(1)
  }
}

startServer()

export default app
