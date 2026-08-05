import './config/env.js' // Loads and validates environment variables first
import express from 'express'
import cors from 'cors'
import http from 'http'
import { initSocket } from './services/socketService.js'
import connectDB from './config/db.js'
import { connectRedis } from './config/redis.js'

import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import rideRoutes from './routes/rideRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import walletRoutes from './routes/walletRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import verificationRoutes from './routes/verificationRoutes.js'
import sosRoutes from './routes/sosRoutes.js'
import reportRoutes from './routes/reportRoutes.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/rides', rideRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/verification', verificationRoutes)
app.use('/api/sos', sosRoutes)
app.use('/api/reports', reportRoutes)

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

    const server = http.createServer(app)
    initSocket(server)

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  } catch (error) {
    console.error(`Fatal error starting server: ${error.message}`)
    process.exit(1)
  }
}

startServer()

export default app
