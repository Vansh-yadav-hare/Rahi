import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import redisClient from '../config/redis.js'
import User from '../models/User.js'

const googleClient = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID)

// Send OTP function
export const sendOTP = async (req, res) => {
  const { phone } = req.body

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' })
  }

  try {
    const rateLimitKey = `rate_limit:${phone}`
    const otpKey = `otp:${phone}`

    // 1. Rate limit check (60s)
    const rateLimitExists = await redisClient.get(rateLimitKey)
    if (rateLimitExists) {
      return res.status(429).json({ message: 'Please wait 60 seconds between OTP requests' })
    }

    // 2. Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // 3. Store OTP (5-minute TTL) and set rate limit key (60-second TTL)
    await redisClient.set(otpKey, otp, { EX: 300 })
    await redisClient.set(rateLimitKey, 'true', { EX: 60 })

    // Log the OTP to console (demo environment)
    console.log(`[AUTH] Generated OTP for ${phone}: ${otp}`)

    return res.status(200).json({ message: 'OTP sent successfully (check server logs)' })
  } catch (error) {
    console.error(`Send OTP Error: ${error.message}`)
    return res.status(500).json({ message: 'Failed to send OTP' })
  }
}

// Verify OTP function
export const verifyOTP = async (req, res) => {
  const { phone, otp } = req.body

  if (!phone || !otp) {
    return res.status(400).json({ message: 'Phone number and OTP are required' })
  }

  try {
    const otpKey = `otp:${phone}`
    const savedOtp = await redisClient.get(otpKey)

    if (!savedOtp || savedOtp !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' })
    }

    // Clear the OTP key on success
    await redisClient.del(otpKey)

    // Find or create the user
    let user = await User.findOne({ phone })
    if (!user) {
      user = await User.create({ phone, role: 'passenger' })
      console.log(`[AUTH] Created new user for phone ${phone}`)
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        trustScore: user.trustScore,
        isVerified: user.isVerified,
      },
      token,
    })
  } catch (error) {
    console.error(`Verify OTP Error: ${error.message}`)
    return res.status(500).json({ message: 'Failed to verify OTP' })
  }
}

// Google OAuth Login
export const googleLogin = async (req, res) => {
  const { idToken } = req.body

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID token is required' })
  }

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID) {
    return res.status(500).json({
      message: 'GOOGLE_OAUTH_CLIENT_ID is not configured in the backend environment variables',
    })
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    const oauthId = payload['sub']
    const email = payload['email']
    const name = payload['name']
    const picture = payload['picture']

    // Find or create User by oauthId
    let user = await User.findOne({ oauthId })

    if (!user) {
      // Check if user with this email already exists
      if (email) {
        user = await User.findOne({ email })
      }

      if (user) {
        // Link Google ID to existing email account
        user.oauthId = oauthId
        if (!user.profilePhoto) user.profilePhoto = picture
        await user.save()
        console.log(`[AUTH] Linked Google credentials to user ${email}`)
      } else {
        // Create new user
        user = await User.create({
          name,
          email,
          oauthId,
          profilePhoto: picture,
          role: 'passenger',
        })
        console.log(`[AUTH] Created new Google user: ${email}`)
      }
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    return res.status(200).json({
      message: 'Google login successful',
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        trustScore: user.trustScore,
        isVerified: user.isVerified,
      },
      token,
    })
  } catch (error) {
    console.error(`Google Login Error: ${error.message}`)
    return res.status(401).json({ message: 'Google OAuth token verification failed' })
  }
}
