import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seatsBooked: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'BOOKED',
        'ONGOING',
        'COMPLETED',
        'CANCELLED',
        'DRIVER_CANCELLED',
        'PASSENGER_NO_SHOW',
        'DRIVER_NO_SHOW',
        'DISPUTED',
      ],
      default: 'REQUESTED',
    },
    paymentStatus: {
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
    paymentId: {
      type: String,
      required: false,
    },
    cancellationInfo: {
      reason: String,
      cancelledAt: Date,
      refundAmount: Number,
    },
  },
  {
    timestamps: true,
  }
)

const Booking = mongoose.model('Booking', bookingSchema)
export default Booking
