import express from 'express'
import { getMyWallet, withdrawWallet } from '../controllers/walletController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

router.get('/', authGuard, getMyWallet)
router.post('/withdraw', authGuard, withdrawWallet)

export default router
