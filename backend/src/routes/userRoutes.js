import express from 'express'
import { getMe, updateMe, getPublicProfile, testPushNotification } from '../controllers/userController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

router.get('/me', authGuard, getMe)
router.put('/me', authGuard, updateMe)
router.post('/me/test-push', authGuard, testPushNotification)
router.get('/:id', authGuard, getPublicProfile)

export default router
