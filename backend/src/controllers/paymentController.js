import crypto from 'crypto'
import { Buffer } from 'buffer'
import Booking from '../models/Booking.js'
import Payment from '../models/Payment.js'
import Transaction from '../models/Transaction.js'
import { sendPush } from '../services/notificationService.js'
import { generateTxnId } from '../utils/txn.js'
import { getBookingSegmentPrice } from './bookingController.js'

/**
 * Creates a Razorpay payment order for a booking.
 */
export const createPaymentOrder = async (req, res) => {
  const { bookingId } = req.body

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  // Check if Razorpay keys are actually configured in env
  const isMock = !keyId || !keySecret || keyId.includes('your_') || keySecret.includes('your_') || keyId === '' || keySecret === ''

  if (!bookingId) {
    return res.status(400).json({ message: 'bookingId is required.' })
  }

  try {
    const booking = await Booking.findById(bookingId).populate('rideId')
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    // Calculate total price based on segment-prorated pricing + 29 platform fee
    const pricePerSeat = getBookingSegmentPrice(booking)
    const seats = booking.seatsBooked
    const subtotal = seats * pricePerSeat
    const bookingFee = 29 // fixed insurance/platform fee matching frontend
    const totalAmount = subtotal + bookingFee
    const amountInPaise = Math.round(totalAmount * 100) // Razorpay expects amount in paise

    // Fallback Mock Order generation for local development without credentials
    if (isMock) {
      console.log(`[PAYMENT] Mock order created for Booking: ${bookingId}, Amount: ₹${totalAmount}`)
      const mockOrderId = 'order_mock_' + crypto.randomBytes(6).toString('hex')
      const payment = await Payment.create({
        bookingId,
        amount: totalAmount,
        razorpayOrderId: mockOrderId,
        status: 'PENDING',
      })
      return res.status(201).json({
        message: 'Payment order created successfully (Mock Mode).',
        keyId: 'rzp_test_mock',
        orderId: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
        paymentId: payment._id,
      })
    }

    // Call Razorpay API using direct fetch
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    console.log(`[PAYMENT] Creating order for Booking: ${bookingId}, Amount: ₹${totalAmount} (${amountInPaise} paise)`)
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_booking_${bookingId}`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[PAYMENT] Razorpay order creation failed: ${errorText}`)
      return res.status(500).json({ message: 'Failed to create order with Razorpay.' })
    }

    const orderData = await response.json()

    // Create the Payment record in MongoDB
    const payment = await Payment.create({
      bookingId,
      amount: totalAmount,
      razorpayOrderId: orderData.id,
      status: 'PENDING',
    })

    return res.status(201).json({
      message: 'Payment order created successfully.',
      keyId, // client needs the key ID to trigger Razorpay checkout modal
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      paymentId: payment._id,
    })
  } catch (error) {
    console.error('Payment order creation error:', error.message)
    return res.status(500).json({ message: 'Internal server error during payment checkout setup.' })
  }
}

/**
 * Verifies Razorpay payment signature server-side.
 * Confirms Booking and Payment documents and moves status to PAID_IN_ESCROW.
 */
export const verifyPaymentSignature = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body

  const keySecret = process.env.RAZORPAY_KEY_SECRET

  // Detect local mock checkouts
  const isMock = razorpay_order_id && razorpay_order_id.startsWith('order_mock_')

  if (!isMock) {
    if (!keySecret || keySecret.includes('your_') || keySecret === '') {
      return res.status(500).json({
        message: 'Razorpay API secret is missing. Signature cannot be verified.',
      })
    }
  }

  if (!razorpay_order_id || !razorpay_payment_id || !bookingId) {
    return res.status(400).json({
      message: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and bookingId are all required.',
    })
  }

  try {
    // 1. If not mock, verify expected signature
    if (!isMock) {
      const body = razorpay_order_id + '|' + razorpay_payment_id
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body.toString())
        .digest('hex')

      const isSignatureValid = expectedSignature === razorpay_signature

      if (!isSignatureValid) {
        console.warn(`[PAYMENT] Invalid payment signature detected for order: ${razorpay_order_id}`)
        
        await Payment.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          { status: 'FAILED' }
        )
        return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' })
      }
    }

    console.log(`[PAYMENT] Payment verified successfully for order: ${razorpay_order_id}`)

    // 2. Update Payment status to PAID_IN_ESCROW
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: 'PAID_IN_ESCROW',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature || 'mock_signature',
      },
      { returnDocument: 'after' }
    )

    // 3. Confirm the Booking (status -> BOOKED, paymentStatus -> PAID_IN_ESCROW)
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: 'BOOKED',
        paymentStatus: 'PAID_IN_ESCROW',
        paymentId: razorpay_payment_id,
      },
      { returnDocument: 'after' }
    ).populate('rideId')

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    // 4. Create a transaction ledger record
    await Transaction.create({
      bookingId: booking._id,
      userId: booking.passengerId,
      amount: payment ? payment.amount : 0,
      type: 'PAYMENT',
      status: 'SUCCESS',
      transactionId: generateTxnId(),
      description: `Payment secured in escrow for ride segment from ${booking.pickup?.split(',')[0]} to ${booking.dropoff?.split(',')[0]}`,
    })

    // Send push notifications (non-blocking)
    sendPush(booking.passengerId, 'Booking Confirmed', 'Your payment was successful and your booking is confirmed in Escrow!')
    sendPush(booking.rideId.driverId, 'New Payment Secured', `Payment of ₹${payment ? payment.amount : 0} has been secured in escrow for your upcoming ride.`)

    return res.status(200).json({
      message: 'Payment verified and booking confirmed in Escrow.',
      booking,
      payment,
    })
  } catch (error) {
    console.error('Payment signature verification error:', error.message)
    return res.status(500).json({ message: 'Internal server error during signature verification.' })
  }
}
