import Review from '../models/Review.js'
import Ride from '../models/Ride.js'
import Booking from '../models/Booking.js'
import User from '../models/User.js'

/**
 * Creates a review for a user (protected, participant only).
 */
export const createReview = async (req, res) => {
  const { rideId, rating, comment } = req.body
  const fromUserId = req.user._id

  if (!rideId || rating === undefined) {
    return res.status(400).json({ message: 'rideId and rating are required.' })
  }

  const parsedRating = parseInt(rating, 10)
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' })
  }

  try {
    // 1. Fetch the ride to check status and driver
    const ride = await Ride.findById(rideId)
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' })
    }

    const toUserId = ride.driverId

    // Prevent users from reviewing themselves
    if (fromUserId.toString() === toUserId.toString()) {
      return res.status(400).json({ message: 'You cannot review yourself.' })
    }

    // 2. Ensure ride is completed
    if (ride.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed rides.' })
    }

    // 3. Ensure the reviewer was a participant (has a confirmed booking)
    const booking = await Booking.findOne({
      rideId,
      passengerId: fromUserId,
      status: { $in: ['BOOKED', 'COMPLETED'] },
    })

    if (!booking) {
      return res.status(403).json({ message: 'Only confirmed passengers of this ride can leave a review.' })
    }

    // 4. Ensure no duplicate review has been left by this user for this ride
    const existingReview = await Review.findOne({
      rideId,
      fromUserId,
    })

    if (existingReview) {
      return res.status(400).json({ message: 'You have already submitted a review for this ride.' })
    }

    // 5. Create the review
    const review = await Review.create({
      rideId,
      fromUserId,
      toUserId,
      rating: parsedRating,
      comment,
    })

    // 6. Update target user's trustScore as running average of ratings (scaled to 100)
    const reviews = await Review.find({ toUserId })
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    
    // Scale 1-5 rating to 0-100 score (e.g. 5.0 -> 100, 4.5 -> 90)
    const trustScore = Math.round(averageRating * 20)

    await User.findByIdAndUpdate(toUserId, { trustScore })

    return res.status(201).json({
      message: 'Review submitted successfully',
      review,
    })
  } catch (error) {
    console.error(`Create Review Error: ${error.message}`)
    return res.status(500).json({ message: 'Failed to submit review.' })
  }
}

/**
 * Retrieves all reviews submitted for a specific user (public).
 */
export const getUserReviews = async (req, res) => {
  const { userId } = req.params

  try {
    const reviews = await Review.find({ toUserId: userId })
      .populate('fromUserId', 'name profilePhoto')
      .populate('rideId', 'origin destination dateTime')
      .sort({ createdAt: -1 })

    return res.status(200).json(reviews)
  } catch (error) {
    console.error(`Get User Reviews Error: ${error.message}`)
    return res.status(500).json({ message: 'Failed to retrieve reviews.' })
  }
}
