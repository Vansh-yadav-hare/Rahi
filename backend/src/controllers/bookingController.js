import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import Ride from '../models/Ride.js'

/**
 * Creates a new booking.
 * Enforces atomic checking and seat decrementing to prevent concurrent overbooking.
 */
export const createBooking = async (req, res) => {
  const { rideId, seatsBooked } = req.body
  const passengerId = req.user._id

  if (!rideId || !seatsBooked || seatsBooked <= 0) {
    return res.status(400).json({ message: 'rideId and a positive seatsBooked are required.' })
  }

  // Attempt using standard MongoDB transaction session
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    // Retrieve and lock the ride for this session
    const ride = await Ride.findById(rideId).session(session)
    if (!ride) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ message: 'Ride not found.' })
    }

    if (ride.seatsAvailable < seatsBooked) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({ message: 'Not enough seats available.' })
    }

    // Decrement available seats
    ride.seatsAvailable -= seatsBooked
    await ride.save({ session })

    // Create the booking
    const booking = await Booking.create(
      [
        {
          rideId,
          passengerId,
          seatsBooked,
          status: 'confirmed',
        },
      ],
      { session }
    )

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
      message: 'Booking created successfully (via Transaction)',
      booking: booking[0],
    })
  } catch (error) {
    // If the MongoDB deployment does not support transactions (e.g. standalone server), fallback
    // to a highly secure atomic Mongoose query findOneAndUpdate to prevent overbooking.
    if (error.codeName === 'CommandNotSupported' || error.message.includes('transaction') || error.message.includes('replica set')) {
      console.warn('[BOOKING] Standalone MongoDB detected. Falling back to atomic update check.')
      try {
        // Atomic search & decrement check
        const updatedRide = await Ride.findOneAndUpdate(
          {
            _id: rideId,
            seatsAvailable: { $gte: seatsBooked },
            status: 'active',
          },
          {
            $inc: { seatsAvailable: -seatsBooked },
          },
          {
            new: true,
          }
        )

        if (!updatedRide) {
          return res.status(400).json({ message: 'Not enough seats available or ride is inactive.' })
        }

        // Create the booking document atomically outside session
        const booking = await Booking.create({
          rideId,
          passengerId,
          seatsBooked,
          status: 'confirmed',
        })

        return res.status(201).json({
          message: 'Booking created successfully (via Atomic Fallback)',
          booking,
        })
      } catch (fallbackError) {
        console.error('Atomic Fallback Error:', fallbackError.message)
        return res.status(500).json({ message: 'Failed to process booking.' })
      }
    } else {
      console.error('Create Booking Transaction Error:', error.message)
      await session.abortTransaction()
      session.endSession()
      return res.status(500).json({ message: 'Failed to create booking.' })
    }
  }
}

/**
 * Cancels an existing booking.
 * Enforces late cancellation policy (no refund inside 2 hours of departure).
 */
export const cancelBooking = async (req, res) => {
  const { id } = req.params
  const userId = req.user._id

  try {
    const booking = await Booking.findById(id).populate('rideId')
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    // Ensure only the passenger who booked or the driver can cancel
    const isPassenger = booking.passengerId.toString() === userId.toString()
    const isDriver = booking.rideId.driverId.toString() === userId.toString()

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking.' })
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled.' })
    }

    const ride = booking.rideId
    const now = new Date()
    const departureTime = new Date(ride.dateTime)

    // Calculate time difference in milliseconds
    const diffMs = departureTime - now
    const diffHours = diffMs / (1000 * 60 * 60)

    let refundAmount = 0
    let refundIssued = false

    // Late cancellation policy check: no refund if departure is within 2 hours
    if (diffHours >= 2) {
      // Full refund calculation (assume user paid: seatsBooked * price per seat)
      refundAmount = booking.seatsBooked * ride.price
      refundIssued = true
    }

    // Update booking status and refund details
    booking.status = 'cancelled'
    booking.cancellationInfo = {
      reason: req.body.reason || 'User requested cancellation',
      cancelledAt: now,
      refundAmount,
    }
    await booking.save()

    // Restore available seats on the ride
    ride.seatsAvailable += booking.seatsBooked
    await ride.save()

    return res.status(200).json({
      message: 'Booking successfully cancelled.',
      refundIssued,
      refundAmount,
      booking,
    })
  } catch (error) {
    console.error('Cancel Booking Error:', error.message)
    return res.status(500).json({ message: 'Failed to cancel booking.' })
  }
}

/**
 * Retrieves booking history for the current authenticated passenger.
 */
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ passengerId: req.user._id })
      .populate({
        path: 'rideId',
        populate: {
          path: 'driverId',
          select: 'name phone trustScore isVerified profilePhoto',
        },
      })
      .sort({ createdAt: -1 })

    return res.status(200).json(bookings)
  } catch (error) {
    console.error('Get My Bookings Error:', error.message)
    return res.status(500).json({ message: 'Failed to retrieve your bookings.' })
  }
}
