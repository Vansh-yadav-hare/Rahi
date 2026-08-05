import express from 'express'
import authGuard from '../middleware/authGuard.js'
import { submitReport } from '../controllers/reportController.js'

const router = express.Router()

// POST /api/reports - File a safety/concern report
router.post('/', authGuard, submitReport)

export default router
