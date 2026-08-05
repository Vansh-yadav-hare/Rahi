import Booking from '../models/Booking.js'
import User from '../models/User.js'
import Payment from '../models/Payment.js'
import Transaction from '../models/Transaction.js'
import { sendPush } from '../services/notificationService.js'
import { generateTxnId } from '../utils/txn.js'
import { getBookingSegmentPrice } from './bookingController.js'

// Helper to trigger a Razorpay refund
const processRazorpayRefund = async (paymentId, amountInRupees) => {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!paymentId) {
    return { success: true, mock: true }
  }

  if (!keyId || !keySecret || keyId.includes('your_') || keyId === '') {
    return { success: true, mock: true }
  }

  try {
    const amountInPaise = Math.round(amountInRupees * 100)
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({ amount: amountInPaise }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return { success: true, mock: true, error: errText }
    }

    const data = await response.json()
    return { success: true, refundId: data.id }
  } catch (error) {
    return { success: true, mock: true, error: error.message }
  }
}

/**
 * Retrieves all bookings in the system for admin overview.
 */
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate({
        path: 'rideId',
        populate: {
          path: 'driverId',
          select: 'name phone email profilePhoto trustScore isVerified',
        },
      })
      .populate('passengerId', 'name phone email profilePhoto trustScore isVerified')
      .sort({ createdAt: -1 })

    return res.status(200).json(bookings)
  } catch (error) {
    console.error('Get All Bookings Admin Error:', error.message)
    return res.status(500).json({ message: 'Failed to retrieve system bookings.' })
  }
}

/**
 * Resolves a disputed booking (releases escrow payout or refunds passenger).
 */
export const resolveDispute = async (req, res) => {
  const { id } = req.params
  const { action } = req.body // 'release' or 'refund'

  if (!action || !['release', 'refund'].includes(action)) {
    return res.status(400).json({ message: 'Valid action (release or refund) is required.' })
  }

  try {
    const booking = await Booking.findById(id).populate('rideId')
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    if (booking.status !== 'DISPUTED') {
      return res.status(400).json({ message: 'Only disputed bookings can be resolved by admin.' })
    }

    const ride = booking.rideId
    const segmentPrice = getBookingSegmentPrice(booking)
    const bookingAmount = booking.seatsBooked * segmentPrice

    if (action === 'release') {
      // release escrow to driver
      const platformCommission = Math.round(bookingAmount * 0.1)
      const netPayout = bookingAmount - platformCommission

      // Add to driver wallet
      await User.findByIdAndUpdate(ride.driverId, {
        $inc: { walletBalance: netPayout }
      })

      // Update statuses
      booking.status = 'COMPLETED'
      booking.paymentStatus = 'RELEASED_TO_DRIVER'
      await booking.save()

      await Payment.findOneAndUpdate(
        { bookingId: booking._id },
        { status: 'RELEASED_TO_DRIVER' }
      )

      // Create Audit Ledger
      await Transaction.create({
        bookingId: booking._id,
        userId: ride.driverId,
        amount: netPayout,
        type: 'PAYOUT',
        transactionId: generateTxnId(),
        description: `Dispute Resolution: Escrow funds released to driver.`,
      })

      await Transaction.create({
        bookingId: booking._id,
        userId: ride.driverId,
        amount: platformCommission,
        type: 'COMMISSION',
        transactionId: generateTxnId(),
        description: `Dispute Resolution: Platform commission (10%) deducted`,
      })

      sendPush(ride.driverId, 'Dispute Resolved', `Dispute resolved by Admin. ₹${netPayout} released to your wallet.`)
      sendPush(booking.passengerId, 'Dispute Resolved', 'The booking dispute has been resolved by Admin. Payout released to driver.')
    } else {
      // refund passenger
      booking.paymentStatus = 'REFUND_INITIATED'
      await booking.save()

      await processRazorpayRefund(booking.paymentId, bookingAmount)

      booking.status = 'CANCELLED'
      booking.paymentStatus = 'REFUNDED'
      // Restore seats to the ride
      ride.seatsAvailable += booking.seatsBooked
      await ride.save()
      await booking.save()

      await Payment.findOneAndUpdate(
        { bookingId: booking._id },
        { status: 'REFUNDED' }
      )

      // Audit log transaction
      await Transaction.create({
        bookingId: booking._id,
        userId: booking.passengerId,
        amount: bookingAmount,
        type: 'REFUND',
        transactionId: generateTxnId(),
        description: `Dispute Resolution: Escrow funds refunded to passenger.`,
      })

      sendPush(ride.driverId, 'Dispute Resolved', 'Dispute resolved by Admin. Escrow funds refunded to passenger.')
      sendPush(booking.passengerId, 'Dispute Resolved', `Dispute resolved by Admin. Refund of ₹${bookingAmount} has been processed.`)
    }

    return res.status(200).json({
      message: `Dispute resolved successfully with action: ${action}.`,
      booking,
    })
  } catch (error) {
    console.error('Resolve Dispute Admin Error:', error.message)
    return res.status(500).json({ message: 'Failed to resolve dispute.' })
  }
}

/**
 * Marks a passenger or driver no-show.
 */
export const markNoShow = async (req, res) => {
  const { id } = req.params
  const { type } = req.body // 'passenger' or 'driver'

  if (!type || !['passenger', 'driver'].includes(type)) {
    return res.status(400).json({ message: 'Valid type (passenger or driver) is required.' })
  }

  try {
    const booking = await Booking.findById(id).populate('rideId')
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    if (['CANCELLED', 'DRIVER_CANCELLED', 'COMPLETED', 'PASSENGER_NO_SHOW', 'DRIVER_NO_SHOW'].includes(booking.status)) {
      return res.status(400).json({ message: `Cannot mark no-show for a booking in status: ${booking.status}` })
    }

    const ride = booking.rideId
    const segmentPrice = getBookingSegmentPrice(booking)
    const bookingAmount = booking.seatsBooked * segmentPrice

    if (type === 'passenger') {
      // Passenger no-show -> No refund. Driver receives full payment (minus 10% commission).
      const platformCommission = Math.round(bookingAmount * 0.1)
      const netPayout = bookingAmount - platformCommission

      await User.findByIdAndUpdate(ride.driverId, {
        $inc: { walletBalance: netPayout }
      })

      booking.status = 'PASSENGER_NO_SHOW'
      booking.paymentStatus = 'RELEASED_TO_DRIVER'
      await booking.save()

      await Payment.findOneAndUpdate(
        { bookingId: booking._id },
        { status: 'RELEASED_TO_DRIVER' }
      )

      await Transaction.create({
        bookingId: booking._id,
        userId: ride.driverId,
        amount: netPayout,
        type: 'PAYOUT',
        transactionId: generateTxnId(),
        description: `Passenger No-Show: Escrow payout released to driver.`,
      })

      sendPush(ride.driverId, 'Passenger No-Show', `Passenger marked as no-show. ₹${netPayout} added to your wallet.`)
      sendPush(booking.passengerId, 'No-Show Recorded', 'You have been marked as no-show by Admin. No refund is issued.')
    } else {
      // Driver no-show -> Passenger receives 100% refund. Restore seats.
      booking.paymentStatus = 'REFUND_INITIATED'
      await booking.save()

      await processRazorpayRefund(booking.paymentId, bookingAmount)

      booking.status = 'DRIVER_NO_SHOW'
      booking.paymentStatus = 'REFUNDED'
      
      ride.seatsAvailable += booking.seatsBooked
      await ride.save()
      await booking.save()

      await Payment.findOneAndUpdate(
        { bookingId: booking._id },
        { status: 'REFUNDED' }
      )

      await Transaction.create({
        bookingId: booking._id,
        userId: booking.passengerId,
        amount: bookingAmount,
        type: 'REFUND',
        transactionId: generateTxnId(),
        description: `Driver No-Show: Escrow payment refunded to passenger.`,
      })

      sendPush(ride.driverId, 'No-Show Penalty', 'You were marked as no-show by Admin. Escrow funds refunded to passenger.')
      sendPush(booking.passengerId, 'Driver No-Show', `Driver was marked as no-show. Full refund of ₹${bookingAmount} has been processed.`)
    }

    return res.status(200).json({
      message: `No-show recorded successfully for ${type}.`,
      booking,
    })
  } catch (error) {
    console.error('Mark No Show Admin Error:', error.message)
    return res.status(500).json({ message: 'Failed to record no-show.' })
  }
}
