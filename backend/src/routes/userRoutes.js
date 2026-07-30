import express from 'express'
import authGuard from '../middleware/authGuard.js'
import { getProfile, updateProfile } from '../controllers/userController.js'

const router = express.Router()

// Profile routes (both protected by authGuard)
router.get('/me', authGuard, getProfile)
router.put('/me', authGuard, updateProfile)

export default router
export { router }
