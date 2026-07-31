import User from '../models/User.js'

/**
 * GET /api/users/me
 * Retrieves current authenticated user's profile
 */
export const getProfile = async (req, res) => {
  try {
    // req.user is already populated by authGuard and stripped of sensitive fields
    return res.status(200).json(req.user)
  } catch (error) {
    console.error('Error in getProfile:', error)
    return res.status(500).json({ error: 'Internal server error while fetching profile' })
  }
}

/**
 * PUT /api/users/me
 * Updates current authenticated user's profile fields
 * Accepts: { name, email, profilePhoto }
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, email, profilePhoto } = req.body
    const userId = req.user._id

    const updates = {}

    // Name validation and update assignment
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Name cannot be empty' })
      }
      updates.name = name.trim()
    }

    // Email validation, conflict check, and update assignment
    if (email !== undefined) {
      const sanitizedEmail = email.trim().toLowerCase()
      if (sanitizedEmail !== '') {
        // Simple regex check for email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(sanitizedEmail)) {
          return res.status(400).json({ error: 'Invalid email address format' })
        }

        // Check if email is already taken by another user
        const existingEmailUser = await User.findOne({
          email: sanitizedEmail,
          _id: { $ne: userId },
        })
        
        if (existingEmailUser) {
          return res.status(400).json({ error: 'This email is already in use by another user' })
        }
      }
      updates.email = sanitizedEmail === '' ? null : sanitizedEmail
    }

    // Profile photo assignment
    if (profilePhoto !== undefined) {
      updates.profilePhoto = typeof profilePhoto === 'string' ? profilePhoto.trim() : null
    }

    // Update user profile fields inside MongoDB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash')

    if (!updatedUser) {
      return res.status(404).json({ error: 'User account not found' })
    }

    console.log(`Successfully updated profile for user ID: ${userId}`)

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        role: updatedUser.role,
        trustScore: updatedUser.trustScore,
        isVerified: updatedUser.isVerified,
        profilePhoto: updatedUser.profilePhoto,
      },
    })
  } catch (error) {
    console.error('Error in updateProfile:', error)
    return res.status(500).json({ error: 'Internal server error while updating profile' })
  }
}
