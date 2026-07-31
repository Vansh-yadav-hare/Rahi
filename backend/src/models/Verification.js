import mongoose from 'mongoose'

const verificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    govIdDoc: {
      type: String, // URL to uploaded document
      required: false,
    },
    faceMatchStatus: {
      type: String,
      enum: ['pending', 'matched', 'failed', 'none'],
      default: 'none',
    },
    vehicleDocs: {
      type: [String], // URLs to vehicle papers
      default: [],
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
