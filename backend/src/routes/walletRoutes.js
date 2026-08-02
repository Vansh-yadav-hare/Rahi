import express from 'express'
import { getMyWallet } from '../controllers/walletController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

router.get('/', authGuard, getMyWallet)

export default router
