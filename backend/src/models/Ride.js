import mongoose from 'mongoose'

const rideSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: mongoose.Schema.Types.Mixed, // Flexible type to store route path waypoints / encoded polyline
    },
    dateTime: {
      type: Date,
      required: true,
    },
    seatsAvailable: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
)

const Ride = mongoose.model('Ride', rideSchema)

export default Ride
export { Ride }
