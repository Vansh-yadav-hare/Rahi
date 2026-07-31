import mongoose from 'mongoose'

const verificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    govIdDoc: {
      type: String, // Storing Cloudinary secure URL
    },
    faceMatchStatus: {
      type: String,
      enum: ['pending', 'matched', 'mismatched'],
      default: 'pending',
    },
    vehicleDocs: {
      registrationNumber: String,
      licenseNumber: String,
      insuranceDoc: String, // Cloudinary URL
      vehicleModel: String,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

const Verification = mongoose.model('Verification', verificationSchema)

export default Verification
export { Verification }
