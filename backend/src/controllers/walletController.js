import Transaction from '../models/Transaction.js'

/**
 * Retrieves the current authenticated user's wallet balance and detailed transaction logs.
 */
export const getMyWallet = async (req, res) => {
  try {
    const user = req.user
    const transactions = await Transaction.find({ userId: user._id })
      .populate('bookingId')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      walletBalance: user.walletBalance || 0,
      transactions,
    })
  } catch (error) {
    console.error('Get My Wallet Error:', error.message)
    return res.status(500).json({ message: 'Failed to retrieve wallet information.' })
  }
}
