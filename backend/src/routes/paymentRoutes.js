import express from 'express'
import { createPaymentOrder, verifyPaymentSignature } from '../controllers/paymentController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

// Route to create a Razorpay order from booking details
router.post('/order', authGuard, createPaymentOrder)

// Route to verify the payment signature
router.post('/verify', authGuard, verifyPaymentSignature)

export default router
