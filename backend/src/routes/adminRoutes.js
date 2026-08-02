import express from 'express'
import { getAllBookings, resolveDispute, markNoShow } from '../controllers/adminController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

router.get('/bookings', authGuard, getAllBookings)
router.put('/bookings/:id/resolve', authGuard, resolveDispute)
router.put('/bookings/:id/no-show', authGuard, markNoShow)

export default router
