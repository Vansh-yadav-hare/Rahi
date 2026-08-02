import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'PAID_IN_ESCROW',
        'REFUND_INITIATED',
        'REFUNDED',
        'PARTIALLY_REFUNDED',
        'RELEASED_TO_DRIVER',
        'FAILED',
      ],
      default: 'PENDING',
    },
    razorpayPaymentId: {
      type: String,
      required: false,
    },
    razorpaySignature: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

const Payment = mongoose.model('Payment', paymentSchema)
export default Payment
