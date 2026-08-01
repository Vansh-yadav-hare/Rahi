import express from 'express'
import { createRide, searchRides, getRideById } from '../controllers/rideController.js'
import authGuard from '../middleware/authGuard.js'

const router = express.Router()

// Search endpoint (placed before /:id to avoid route collision)
router.get('/search', searchRides)

// Create endpoint (protected)
router.post('/', authGuard, createRide)

// Detail retrieval endpoint
router.get('/:id', getRideById)

export default router
