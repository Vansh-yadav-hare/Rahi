import express from 'express'
import { createReview, getUserReviews } from '../controllers/reviewController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

// Submit review endpoint (protected)
router.post('/', authGuard, createReview)

// Get all reviews for a user (protected)
router.get('/user/:userId', authGuard, getUserReviews)

export default router
