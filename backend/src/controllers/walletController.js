import crypto from 'crypto'
import Transaction from '../models/Transaction.js'
import User from '../models/User.js'

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

/**
 * Submits a simulated wallet balance withdrawal request.
 */
export const withdrawWallet = async (req, res) => {
  const { amount, upiId } = req.body
  const user = req.user

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'A positive withdrawal amount is required.' })
  }

  const parsedAmount = parseFloat(amount)
  if (user.walletBalance < parsedAmount) {
    return res.status(400).json({ message: 'Insufficient wallet balance for this withdrawal.' })
  }

  try {
    // Deduct from wallet
    user.walletBalance -= parsedAmount
    await user.save()

    // Create a payout ledger audit entry
    const transaction = await Transaction.create({
      userId: user._id,
      amount: parsedAmount,
      type: 'PAYOUT',
      status: 'SUCCESS',
      transactionId: 'WITHDRAW-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      description: `Withdrawal to UPI ID: ${upiId || 'Direct Settlement'}`,
    })

    return res.status(200).json({
      message: 'Withdrawal processed and settled successfully!',
      walletBalance: user.walletBalance,
      transaction,
    })
  } catch (error) {
    console.error('Wallet Withdrawal Error:', error.message)
    return res.status(500).json({ message: 'Failed to process balance withdrawal.' })
  }
}
