import express from 'express'
import { sendOTP, verifyOTP, googleLogin } from '../controllers/authController.js'

const router = express.Router()

// OTP login / signup routes
router.post('/otp/send', sendOTP)
router.post('/otp/verify', verifyOTP)

// Google OAuth route
router.post('/google', googleLogin)

export default router
export { router }
