import Review from '../models/Review.js'
import Ride from '../models/Ride.js'
import Booking from '../models/Booking.js'
import User from '../models/User.js'

/**
 * Creates a new review for a completed ride.
 * Only allowed if the ride status is "completed" and the requesting user was a participant.
 */
export const createReview = async (req, res) => {
  const { rideId, toUserId, rating, comment } = req.body
  const fromUserId = req.user._id

  // 1. Basic validation
  if (!rideId || !toUserId || rating === undefined) {
    return res.status(400).json({ message: 'rideId, toUserId, and rating are required.' })
  }

  const parsedRating = parseInt(rating, 10)
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' })
  }

  if (fromUserId.toString() === toUserId.toString()) {
    return res.status(400).json({ message: 'You cannot review yourself.' })
  }

  try {
    // 2. Fetch the ride
    const ride = await Ride.findById(rideId)
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' })
    }

    // 3. Verify ride status is "completed"
    if (ride.status !== 'completed') {
      return res.status(400).json({ message: 'Reviews can only be submitted for completed rides.' })
    }

    // 4. Verify participation and that toUserId is correct
    const isDriver = ride.driverId.toString() === fromUserId.toString()
    const isToUserDriver = ride.driverId.toString() === toUserId.toString()

    if (isDriver) {
      // Reviewer is the driver. Target (toUserId) must be a passenger of a confirmed booking.
      const booking = await Booking.findOne({ rideId, passengerId: toUserId, status: 'confirmed' })
      if (!booking) {
        return res.status(400).json({ message: 'The reviewed user was not a confirmed passenger on this ride.' })
      }
    } else {
      // Reviewer is a passenger. Reviewer must have a confirmed booking.
      const reviewerBooking = await Booking.findOne({ rideId, passengerId: fromUserId, status: 'confirmed' })
      if (!reviewerBooking) {
        return res.status(403).json({ message: 'You must be a confirmed participant of this ride to leave a review.' })
      }

      // Reviewer is passenger. Target (toUserId) must be the driver of this ride.
      if (!isToUserDriver) {
        return res.status(400).json({ message: 'Passengers can only leave reviews for the driver of the ride.' })
      }
    }

    // 5. Check if review already exists to prevent duplicate reviews
    const existingReview = await Review.findOne({ rideId, fromUserId, toUserId })
    if (existingReview) {
      return res.status(400).json({ message: 'You have already submitted a review for this user on this ride.' })
    }

    // 6. Create review
    const review = await Review.create({
      rideId,
      fromUserId,
      toUserId,
      rating: parsedRating,
      comment: comment || '',
    })

    // 7. Update target user's trustScore as a simple running average of all their received ratings
    const userReviews = await Review.find({ toUserId })
    const totalRating = userReviews.reduce((sum, r) => sum + r.rating, 0)
    const averageRating = userReviews.length > 0 ? (totalRating / userReviews.length) : 0

    const updatedUser = await User.findByIdAndUpdate(
      toUserId,
      { trustScore: Number(averageRating.toFixed(2)) },
      { returnDocument: 'after' }
    )

    console.log(`[REVIEW] Created successfully. Updated trustScore of ${updatedUser.name || 'User'} to ${updatedUser.trustScore}`)

    return res.status(201).json({
      message: 'Review submitted successfully.',
      review,
      targetUserScore: updatedUser.trustScore,
    })
  } catch (error) {
    console.error('Create Review Error:', error.message)
    return res.status(500).json({ message: 'Failed to submit review.' })
  }
}

/**
 * Gets all reviews left for a specific user (as driver/passenger).
 */
export const getUserReviews = async (req, res) => {
  const { userId } = req.params
  try {
    const reviews = await Review.find({ toUserId: userId })
      .populate('fromUserId', 'name profilePhoto')
      .sort({ createdAt: -1 })
    return res.status(200).json(reviews)
  } catch (error) {
    console.error('Get User Reviews Error:', error.message)
    return res.status(500).json({ message: 'Failed to retrieve reviews.' })
  }
}

