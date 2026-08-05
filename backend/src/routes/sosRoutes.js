import express from 'express'
import authGuard from '../middleware/authGuard.js'
import { triggerSOS } from '../controllers/sosController.js'

const router = express.Router()

// Secure POST /api/sos endpoint
router.post('/', authGuard, triggerSOS)

export default router
