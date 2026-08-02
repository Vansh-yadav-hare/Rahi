import express from 'express'
import { createReview, getUserReviews } from '../controllers/reviewController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

// Create a review (protected)
router.post('/', authGuard, createReview)

// Retrieve reviews for a user (protected - so only logged in users see reviews)
router.get('/user/:userId', authGuard, getUserReviews)

export default router
