import express from 'express'
import { createBooking, cancelBooking, getMyBookings, confirmBookingCompletion, disputeBooking, payWithWallet } from '../controllers/bookingController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

// Get current user's booking history
router.get('/my-bookings', authGuard, getMyBookings)
router.get('/me', authGuard, getMyBookings)

// Create booking endpoint
router.post('/', authGuard, createBooking)

// Cancel booking endpoint
router.put('/:id/cancel', authGuard, cancelBooking)

// Confirm ride completion (releases escrow funds)
router.put('/:id/confirm-completion', authGuard, confirmBookingCompletion)

// Raise dispute on a booking (escrow holds funds)
router.put('/:id/dispute', authGuard, disputeBooking)

// Pay with wallet balance
router.put('/:id/pay-wallet', authGuard, payWithWallet)

export default router
