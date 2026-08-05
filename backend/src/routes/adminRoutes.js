import express from 'express'
import { getAllBookings, resolveDispute, markNoShow } from '../controllers/adminController.js'
import authGuard from '../middleware/authGuard.js'
import adminGuard from '../middleware/adminGuard.js'

const router = express.Router()

router.get('/bookings', authGuard, adminGuard, getAllBookings)
router.put('/bookings/:id/resolve', authGuard, adminGuard, resolveDispute)
router.put('/bookings/:id/no-show', authGuard, adminGuard, markNoShow)

export default router
