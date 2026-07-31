import express from 'express'
import { sendOTP, verifyOTP, googleLogin } from '../controllers/authController.js'

const router = express.Router()

router.post('/otp/send', sendOTP)
router.post('/otp/verify', verifyOTP)
router.post('/google', googleLogin)

export default router
