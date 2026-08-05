import mongoose from 'mongoose'

const rideReportSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['reckless_driving', 'vehicle_condition', 'inappropriate_behavior', 'payment_fare', 'other'],
      required: true,
    },
    details: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

const RideReport = mongoose.model('RideReport', rideReportSchema)
export default RideReport
