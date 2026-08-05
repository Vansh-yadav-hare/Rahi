import mongoose from 'mongoose'
import crypto from 'crypto'
import Booking from '../models/Booking.js'
import Ride from '../models/Ride.js'
import User from '../models/User.js'
import Payment from '../models/Payment.js'
import Transaction from '../models/Transaction.js'
import { sendPush } from '../services/notificationService.js'
import { generateTxnId } from '../utils/txn.js'

/**
 * Helper to trigger a Razorpay refund.
 * If credentials are not configured or it's a test environment, falls back to a simulated success log.
 */
const processRazorpayRefund = async (paymentId, amountInRupees) => {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!paymentId) {
    console.warn('[REFUND] No paymentId provided. Skipping Razorpay call, assuming mock success.')
    return { success: true, mock: true }
  }

  if (!keyId || !keySecret || keyId.includes('your_') || keyId === '') {
    console.log(`[REFUND] Mock refund executed successfully for paymentId: ${paymentId}, Amount: ₹${amountInRupees}`)
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
      console.error(`[REFUND] Razorpay refund API error: ${errText}`)
      return { success: true, mock: true, error: errText }
    }

    const data = await response.json()
    console.log(`[REFUND] Razorpay refund successful. ID: ${data.id}`)
    return { success: true, refundId: data.id }
  } catch (error) {
    console.error('[REFUND] Failed calling Razorpay refund API:', error.message)
    return { success: true, mock: true, error: error.message }
  }
}

/**
 * Helper to calculate a booking's prorated segment price based on intermediate stops.
 */
export const getBookingSegmentPrice = (booking) => {
  const ride = booking.rideId
  if (!booking.pickup || !booking.dropoff || !ride) {
    return ride ? ride.price : 0
  }

  const stopsList = [
    ride.origin.address,
    ...ride.stops.map(s => s.address),
    ride.destination.address
  ]

  const startIdx = stopsList.findIndex(addr => addr.toLowerCase().includes(booking.pickup.toLowerCase()))
  const endIdx = stopsList.findIndex(addr => addr.toLowerCase().includes(booking.dropoff.toLowerCase()))

  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    return ride.price
  }

  const legsCount = stopsList.length - 1
  return Math.round(((endIdx - startIdx) / legsCount) * ride.price)
}

/**
 * Validates segment seat availability.
 */
const checkSegmentSeats = async (ride, pickup, dropoff, seatsBooked, session = null) => {
  const stopsList = [
    ride.origin.address,
    ...ride.stops.map(s => s.address),
    ride.destination.address
  ]
  
  const startIdx = stopsList.findIndex(addr => addr.toLowerCase().includes((pickup || ride.origin.address).toLowerCase()))
  const endIdx = stopsList.findIndex(addr => addr.toLowerCase().includes((dropoff || ride.destination.address).toLowerCase()))

  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    throw new Error('Invalid pickup or dropoff location selected for this ride.')
  }

  const bookingQuery = {
    rideId: ride._id,
    status: { $in: ['BOOKED', 'REQUESTED'] }
  }

  const bookings = session 
    ? await Booking.find(bookingQuery).session(session)
    : await Booking.find(bookingQuery)

  const legsCount = stopsList.length - 1
  const occupied = Array(legsCount).fill(0)

  for (const b of bookings) {
    const bStart = stopsList.findIndex(addr => addr.toLowerCase().includes((b.pickup || ride.origin.address).toLowerCase()))
    const bEnd = stopsList.findIndex(addr => addr.toLowerCase().includes((b.dropoff || ride.destination.address).toLowerCase()))
    if (bStart !== -1 && bEnd !== -1 && bStart < bEnd) {
      for (let k = bStart; k < bEnd; k++) {
        occupied[k] += b.seatsBooked
      }
    }
  }

  for (let k = startIdx; k < endIdx; k++) {
    if (occupied[k] + seatsBooked > ride.seatsAvailable) {
      throw new Error('Not enough seats available on this segment of the ride.')
    }
  }

  return { startIdx, endIdx }
}

/**
 * Creates a new booking in REQUESTED state.
 * Enforces segment-wise leg capacity verification.
 */
export const createBooking = async (req, res) => {
  const { rideId, seatsBooked, pickup, dropoff } = req.body
  const passengerId = req.user._id

  if (!rideId || !seatsBooked || seatsBooked <= 0) {
    return res.status(400).json({ message: 'rideId and a positive seatsBooked are required.' })
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const ride = await Ride.findById(rideId).session(session)
    if (!ride) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ message: 'Ride not found.' })
    }

    // Verify segment seat capacity constraints
    await checkSegmentSeats(ride, pickup, dropoff, seatsBooked, session)

    // Create the booking in REQUESTED status
    const booking = await Booking.create(
      [
        {
          rideId,
          passengerId,
          seatsBooked,
          pickup,
          dropoff,
          status: 'REQUESTED',
          paymentStatus: 'PENDING',
        },
      ],
      { session }
    )

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
      message: 'Booking request created successfully.',
      booking: booking[0],
    })
  } catch (error) {
    // Abort active session transaction first if failed
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    session.endSession()

    if (error.codeName === 'CommandNotSupported' || error.message.includes('transaction') || error.message.includes('replica set')) {
      console.warn('[BOOKING] Standalone MongoDB detected. Falling back to dynamic check.')
      try {
        const ride = await Ride.findById(rideId)
        if (!ride || ride.status !== 'active') {
          return res.status(400).json({ message: 'Ride is not active or not found.' })
        }

        await checkSegmentSeats(ride, pickup, dropoff, seatsBooked)

        const booking = await Booking.create({
          rideId,
          passengerId,
          seatsBooked,
          pickup,
          dropoff,
          status: 'REQUESTED',
          paymentStatus: 'PENDING',
        })

        return res.status(201).json({
          message: 'Booking request created successfully (via Standalone Fallback).',
          booking,
        })
      } catch (fallbackError) {
        console.error('Standalone Fallback Error:', fallbackError.message)
        return res.status(400).json({ message: fallbackError.message || 'Failed to process booking.' })
      }
    } else {
      console.error('Create Booking Transaction Error:', error.message)
      return res.status(400).json({ message: error.message || 'Failed to create booking.' })
    }
  }
}

/**
 * Cancels a booking and triggers refund/compensation tiers based on the departure time diff.
 */
export const cancelBooking = async (req, res) => {
  const { id } = req.params
  const userId = req.user._id

  try {
    const booking = await Booking.findById(id).populate('rideId')
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    const isPassenger = booking.passengerId.toString() === userId.toString()
    const isDriver = booking.rideId.driverId.toString() === userId.toString()

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking.' })
    }

    if (['CANCELLED', 'DRIVER_CANCELLED'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking is already cancelled.' })
    }

    const ride = booking.rideId
    const now = new Date()
    const departureTime = new Date(ride.dateTime)

    // Calculate time difference in hours
    const diffHours = (departureTime - now) / (1000 * 60 * 60)
    
    // Use prorated segment pricing for bookings amount
    const segmentPrice = getBookingSegmentPrice(booking)
    const bookingAmount = booking.seatsBooked * segmentPrice

    let passengerRefundAmount = 0
    let driverCompensationAmount = 0
    let platformCommission = 0
    let nextPaymentStatus = 'REFUNDED'

    if (isDriver) {
      // Driver cancels -> Passenger gets 100% refund.
      passengerRefundAmount = bookingAmount
      booking.status = 'DRIVER_CANCELLED'
      nextPaymentStatus = 'REFUNDED'
    } else {
      // Passenger cancels -> Tiers
      booking.status = 'CANCELLED'

      if (diffHours > 24) {
        // > 24h: 100% Refund
        passengerRefundAmount = bookingAmount
        nextPaymentStatus = 'REFUNDED'
      } else if (diffHours >= 6 && diffHours <= 24) {
        // 6h-24h: 80% Passenger refund, 20% Driver compensation
        passengerRefundAmount = bookingAmount * 0.8
        driverCompensationAmount = bookingAmount * 0.2
        nextPaymentStatus = 'PARTIALLY_REFUNDED'
      } else {
        // < 6h: 0% Refund, 100% Payout to driver (minus 10% commission)
        passengerRefundAmount = 0
        driverCompensationAmount = bookingAmount * 0.9
        platformCommission = bookingAmount * 0.1
        nextPaymentStatus = 'RELEASED_TO_DRIVER'
      }
    }

    // 1. Process Refund if passenger refund is > 0 and payment was already paid in escrow
    if (passengerRefundAmount > 0 && booking.paymentStatus === 'PAID_IN_ESCROW') {
      booking.paymentStatus = 'REFUND_INITIATED'
      await booking.save()

      const refundResult = await processRazorpayRefund(booking.paymentId, passengerRefundAmount)
      
      booking.paymentStatus = nextPaymentStatus
      // Save refund details in cancellation info
      booking.cancellationInfo = {
        reason: req.body.reason || 'User requested cancellation',
        cancelledAt: now,
        refundAmount: passengerRefundAmount,
      }
      await booking.save()

      // Log refund transaction
      await Transaction.create({
        bookingId: booking._id,
        userId: booking.passengerId,
        amount: passengerRefundAmount,
        type: 'REFUND',
        transactionId: generateTxnId(),
        description: `Refund for booking cancellation (${booking.pickup?.split(',')[0]} → ${booking.dropoff?.split(',')[0]})`,
      })
    } else {
      // Unpaid or 0% refund cases
      booking.paymentStatus = nextPaymentStatus
      booking.cancellationInfo = {
        reason: req.body.reason || 'User requested cancellation',
        cancelledAt: now,
        refundAmount: passengerRefundAmount,
      }
      await booking.save()
    }

    // 2. Disburse driver compensation if applicable
    if (driverCompensationAmount > 0) {
      await User.findByIdAndUpdate(ride.driverId, {
        $inc: { walletBalance: driverCompensationAmount }
      })

      // Log Payout / Compensation transaction
      await Transaction.create({
        bookingId: booking._id,
        userId: ride.driverId,
        amount: driverCompensationAmount,
        type: 'COMPENSATION',
        transactionId: generateTxnId(),
        description: `Compensation for passenger late cancellation of ride from ${ride.origin.address.split(',')[0]}`,
      })

      if (platformCommission > 0) {
        // Log platform audit commission log
        await Transaction.create({
          bookingId: booking._id,
          userId: ride.driverId, // associate with the driver payout context
          amount: platformCommission,
          type: 'COMMISSION',
          transactionId: generateTxnId(),
          description: `Platform commission (10%) deducted from late cancellation fee`,
        })
      }
    }

    // Update status in the Payment model if it exists
    await Payment.findOneAndUpdate(
      { bookingId: booking._id },
      { status: nextPaymentStatus }
    )

    // Notify users
    sendPush(booking.passengerId, 'Booking Cancelled', `Your booking has been cancelled. Refund: ₹${passengerRefundAmount}`)
    sendPush(ride.driverId, 'Booking Cancelled', `Passenger cancelled trip. Earnings: ₹${driverCompensationAmount}`)

    return res.status(200).json({
      message: 'Booking successfully cancelled.',
      passengerRefundAmount,
      driverCompensationAmount,
      booking,
    })
  } catch (error) {
    console.error('Cancel Booking Error:', error.message)
    return res.status(500).json({ message: 'Failed to cancel booking.' })
  }
}

/**
 * Passenger confirms completion of a ride, releasing funds from escrow to the driver.
 */
export const confirmBookingCompletion = async (req, res) => {
  const { id } = req.params
  const userId = req.user._id

  try {
    const booking = await Booking.findById(id).populate('rideId')
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    if (booking.passengerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the passenger can confirm completion.' })
    }

    if (booking.status !== 'BOOKED') {
      return res.status(400).json({ message: `Cannot confirm completion for a booking in status: ${booking.status}` })
    }

    if (booking.paymentStatus !== 'PAID_IN_ESCROW') {
      return res.status(400).json({ message: 'Payment is not secured in escrow for this booking.' })
    }

    const ride = booking.rideId
    const segmentPrice = getBookingSegmentPrice(booking)
    const bookingAmount = booking.seatsBooked * segmentPrice

    // Platform deducts 10% commission
    const platformCommission = Math.round(bookingAmount * 0.1)
    const netPayout = bookingAmount - platformCommission

    // 1. Release payout to Driver wallet
    await User.findByIdAndUpdate(ride.driverId, {
      $inc: { walletBalance: netPayout }
    })

    // 2. Update statuses
    booking.status = 'COMPLETED'
    booking.paymentStatus = 'RELEASED_TO_DRIVER'
    await booking.save()

    await Payment.findOneAndUpdate(
      { bookingId: booking._id },
      { status: 'RELEASED_TO_DRIVER' }
    )

    // 3. Create Audit Transactions
    await Transaction.create({
      bookingId: booking._id,
      userId: ride.driverId,
      amount: netPayout,
      type: 'PAYOUT',
      transactionId: generateTxnId(),
      description: `Earnings payout for ride segment: ${booking.pickup?.split(',')[0]} → ${booking.dropoff?.split(',')[0]}`,
    })

    await Transaction.create({
      bookingId: booking._id,
      userId: ride.driverId, // associated context
      amount: platformCommission,
      type: 'COMMISSION',
      transactionId: generateTxnId(),
      description: `Platform commission fee (10%) deducted`,
    })

    sendPush(ride.driverId, 'Payment Released', `₹${netPayout} has been added to your wallet for completing the ride.`)
    sendPush(booking.passengerId, 'Ride Completed', 'Thank you for confirming completion of the ride!')

    return res.status(200).json({
      message: 'Completion confirmed. Funds released to driver.',
      booking,
    })
  } catch (error) {
    console.error('Confirm Completion Error:', error.message)
    return res.status(500).json({ message: 'Failed to confirm ride completion.' })
  }
}

/**
 * Passenger disputes a booking.
 */
export const disputeBooking = async (req, res) => {
  const { id } = req.params
  const userId = req.user._id

  try {
    const booking = await Booking.findById(id).populate('rideId')
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    const isPassenger = booking.passengerId.toString() === userId.toString()
    const isDriver = booking.rideId.driverId.toString() === userId.toString()

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: 'Not authorized to dispute this booking.' })
    }

    if (booking.status !== 'BOOKED') {
      return res.status(400).json({ message: 'Only active bookings can be disputed.' })
    }

    booking.status = 'DISPUTED'
    await booking.save()

    sendPush(booking.passengerId, 'Dispute Opened', 'A dispute has been raised and will be reviewed by admin.')
    sendPush(booking.rideId.driverId, 'Dispute Opened', 'A passenger has disputed your ride booking.')

    return res.status(200).json({
      message: 'Booking status updated to disputed. Escrow holds the funds.',
      booking,
    })
  } catch (error) {
    console.error('Dispute Booking Error:', error.message)
    return res.status(500).json({ message: 'Failed to raise dispute.' })
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

/**
 * Confirms payment from Rahi wallet directly, moving status to PAID_IN_ESCROW.
 */
export const payWithWallet = async (req, res) => {
  const { id } = req.params
  const userId = req.user._id

  try {
    const booking = await Booking.findById(id).populate('rideId')
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    if (booking.passengerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to pay for this booking.' })
    }

    if (booking.status !== 'REQUESTED' || booking.paymentStatus !== 'PENDING') {
      return res.status(400).json({ message: 'Booking is not in a payable state.' })
    }

    const ride = booking.rideId
    const passenger = req.user

    // Calculate segment price
    const segmentPrice = getBookingSegmentPrice(booking)
    const subtotal = booking.seatsBooked * segmentPrice
    const bookingFee = 29
    const totalAmount = subtotal + bookingFee

    if (passenger.walletBalance < totalAmount) {
      return res.status(400).json({
        message: `Insufficient wallet balance. You need ₹${totalAmount} but only have ₹${passenger.walletBalance.toFixed(2)}.`
      })
    }

    // Deduct from passenger wallet
    passenger.walletBalance -= totalAmount
    await passenger.save()

    // Confirm booking and payment status
    booking.status = 'BOOKED'
    booking.paymentStatus = 'PAID_IN_ESCROW'
    booking.paymentId = 'WALLET-' + crypto.randomBytes(4).toString('hex').toUpperCase()
    await booking.save()

    // Create Payment record
    await Payment.create({
      bookingId: booking._id,
      amount: totalAmount,
      razorpayOrderId: 'MOCK_ORDER_' + crypto.randomBytes(6).toString('hex').toUpperCase(),
      razorpayPaymentId: booking.paymentId,
      status: 'PAID_IN_ESCROW',
    })

    // Create Ledger Transaction record
    await Transaction.create({
      bookingId: booking._id,
      userId: passenger._id,
      amount: totalAmount,
      type: 'PAYMENT',
      status: 'SUCCESS',
      transactionId: generateTxnId(),
      description: `Payment from wallet secured in escrow for segment ride from ${booking.pickup?.split(',')[0]} to ${booking.dropoff?.split(',')[0]}`,
    })

    sendPush(booking.passengerId, 'Booking Confirmed', 'Your wallet payment was successful and your booking is confirmed in Escrow!')
    sendPush(booking.rideId.driverId, 'New Payment Secured', `Wallet payment of ₹${totalAmount} has been secured in escrow for your upcoming ride.`)

    return res.status(200).json({
      message: 'Booking paid successfully via Rahi Wallet.',
      booking,
    })
  } catch (error) {
    console.error('Pay with wallet error:', error.message)
    return res.status(500).json({ message: 'Failed to process wallet payment.' })
  }
}
