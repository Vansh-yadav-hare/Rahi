import express from 'express'
import authGuard from '../middleware/authGuard.js'
import upload from '../middleware/upload.js'
import {
  getVerificationStatus,
  uploadId,
  verifyFace,
} from '../controllers/verificationController.js'

const router = express.Router()

// All verification routes are protected by authGuard
router.get('/status', authGuard, getVerificationStatus)
router.post('/id', authGuard, upload.single('idDoc'), uploadId)
router.post('/face', authGuard, upload.single('selfie'), verifyFace)

export default router
