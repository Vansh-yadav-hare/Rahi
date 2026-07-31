import express from 'express'
import { getMe, updateMe } from '../controllers/userController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

router.get('/me', authGuard, getMe)
router.put('/me', authGuard, updateMe)

export default router
