import express from 'express'
import { getMe, updateMe, getPublicProfile } from '../controllers/userController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

router.get('/me', authGuard, getMe)
router.put('/me', authGuard, updateMe)
router.get('/:id', authGuard, getPublicProfile)

export default router
