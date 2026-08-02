import User from '../models/User.js'

// Get current user profile
export const getMe = async (req, res) => {
  try {
    // req.user is set by authGuard middleware
    const user = req.user
    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePhoto: user.profilePhoto,
      trustScore: user.trustScore,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error(`Get Profile Error: ${error.message}`)
    return res.status(500).json({ message: 'Failed to retrieve profile data' })
  }
}

// Update current user profile
export const updateMe = async (req, res) => {
  const { name, email, profilePhoto, role, fcmToken } = req.body

  try {
    const user = req.user

    if (name !== undefined) user.name = name
    if (email !== undefined) user.email = email
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto
    if (fcmToken !== undefined) user.fcmToken = fcmToken
    if (role !== undefined) {
      if (!['passenger', 'driver', 'both'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role assignment' })
      }
      user.role = role
    }

    await user.save()
    console.log(`[USER] Profile updated for user ${user._id}`)

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        trustScore: user.trustScore,
        isVerified: user.isVerified,
        fcmToken: user.fcmToken,
      },
    })
  } catch (error) {
    console.error(`Update Profile Error: ${error.message}`)
    // Handle uniqueness violations
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email is already registered to another account' })
    }
    return res.status(500).json({ message: 'Failed to update profile' })
  }
}

/**
 * Gets another user's public profile data.
 */
export const getPublicProfile = async (req, res) => {
  const { id } = req.params

  try {
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    return res.status(200).json({
      id: user._id,
      name: user.name,
      role: user.role,
      profilePhoto: user.profilePhoto,
      trustScore: user.trustScore,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error(`Get Public Profile Error: ${error.message}`)
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid user ID format.' })
    }
    return res.status(500).json({ message: 'Failed to retrieve public profile data.' })
  }
}
