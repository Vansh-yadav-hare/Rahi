import express from 'express'
import { createBooking, cancelBooking, getMyBookings } from '../controllers/bookingController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

// Get current user's booking history
router.get('/my-bookings', authGuard, getMyBookings)

// Create booking endpoint
router.post('/', authGuard, createBooking)

// Cancel booking endpoint
router.put('/:id/cancel', authGuard, cancelBooking)

export default router
