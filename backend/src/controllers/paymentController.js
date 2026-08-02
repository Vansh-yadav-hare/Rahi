import crypto from 'crypto'
import { Buffer } from 'buffer'
import Booking from '../models/Booking.js'
import Payment from '../models/Payment.js'
import Transaction from '../models/Transaction.js'
import { sendPush } from '../services/notificationService.js'

// Helper to generate unique transaction IDs
const generateTxnId = () => 'TXN-' + crypto.randomBytes(6).toString('hex').toUpperCase()

/**
 * Creates a Razorpay payment order for a booking.
 */
export const createPaymentOrder = async (req, res) => {
  const { bookingId } = req.body

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  // Ensure keys are present and not placeholders
  if (
    !keyId ||
    !keySecret ||
    keyId.includes('your_') ||
    keySecret.includes('your_') ||
    keyId === '' ||
    keySecret === ''
  ) {
    return res.status(500).json({
      message: 'Razorpay API credentials are not configured in backend/.env. Orders cannot be created.',
    })
  }

  if (!bookingId) {
    return res.status(400).json({ message: 'bookingId is required.' })
  }

  try {
    const booking = await Booking.findById(bookingId).populate('rideId')
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    // Calculate total price: (seatsBooked * ride.price) + 29 platform fee
    const pricePerSeat = booking.rideId.price
    const seats = booking.seatsBooked
    const subtotal = seats * pricePerSeat
    const bookingFee = 29 // fixed insurance/platform fee matching frontend
    const totalAmount = subtotal + bookingFee
    const amountInPaise = Math.round(totalAmount * 100) // Razorpay expects amount in paise

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

  if (!keySecret || keySecret.includes('your_') || keySecret === '') {
    return res.status(500).json({
      message: 'Razorpay API secret is missing. Signature cannot be verified.',
    })
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
    return res.status(400).json({
      message: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature, and bookingId are all required.',
    })
  }

  try {
    // Generate signature payload
    const body = razorpay_order_id + '|' + razorpay_payment_id

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex')

    const isSignatureValid = expectedSignature === razorpay_signature

    if (!isSignatureValid) {
      console.warn(`[PAYMENT] Invalid payment signature detected for order: ${razorpay_order_id}`)
      
      // Update Payment record to failed
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'FAILED' }
      )
      return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' })
    }

    console.log(`[PAYMENT] Payment signature verified successfully for order: ${razorpay_order_id}`)

    // 1. Update Payment status to PAID_IN_ESCROW
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: 'PAID_IN_ESCROW',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
      { new: true }
    )

    // 2. Confirm the Booking (status -> BOOKED, paymentStatus -> PAID_IN_ESCROW)
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: 'BOOKED',
        paymentStatus: 'PAID_IN_ESCROW',
        paymentId: razorpay_payment_id,
      },
      { new: true }
    ).populate('rideId')

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }

    // 3. Create a transaction ledger record
    await Transaction.create({
      bookingId: booking._id,
      userId: booking.passengerId,
      amount: payment.amount,
      type: 'PAYMENT',
      status: 'SUCCESS',
      transactionId: generateTxnId(),
      description: `Payment secured in escrow for ride from ${booking.rideId.origin?.address.split(',')[0]} to ${booking.rideId.destination?.address.split(',')[0]}`,
    })

    // Send push notification to passenger (non-blocking)
    sendPush(booking.passengerId, 'Booking Confirmed', 'Your payment was successful and your booking is confirmed in Escrow!')
    sendPush(booking.rideId.driverId, 'New Payment Secured', `Payment of ₹${payment.amount} has been secured in escrow for your upcoming ride.`)

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
