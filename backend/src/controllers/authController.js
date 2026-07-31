import { redisClient } from '../config/redis.js'
import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'

/**
 * Generate a 6-digit numeric OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * POST /api/auth/otp/send
 * Accepts: { phoneNumber }
 */
export const sendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body

    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
      return res.status(400).json({ error: 'Valid phone number is required' })
    }

    const sanitizedPhone = phoneNumber.trim()
    const rateLimitKey = `otp:rate:${sanitizedPhone}`
    const otpKey = `otp:${sanitizedPhone}`

    // Check rate limit: 1 request per phone number per 60 seconds
    const isRateLimited = await redisClient.get(rateLimitKey)
    if (isRateLimited) {
      return res.status(429).json({
        error: 'Too many requests. Please wait 60 seconds before requesting another OTP.',
      })
    }

    // Generate and store OTP
    const otp = generateOTP()

    // Store OTP in Redis for 5 minutes (300 seconds)
    await redisClient.set(otpKey, otp, { EX: 300 })

    // Set rate limit cooldown for 60 seconds
    await redisClient.set(rateLimitKey, '1', { EX: 60 })

    // Log the OTP to the console instead of sending SMS (Phase 1 rule)
    console.log(`\n========================================\n[SMS OTP] To: ${sanitizedPhone}\nOTP: ${otp}\n========================================\n`)

    return res.status(200).json({ message: 'OTP sent successfully' })
  } catch (error) {
    console.error('Error in sendOTP:', error)
    return res.status(500).json({ error: 'Internal server error while sending OTP' })
  }
}

/**
 * POST /api/auth/otp/verify
 * Accepts: { phoneNumber, otp }
 */
export const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body

    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' })
    }

    const sanitizedPhone = phoneNumber.trim()
    const sanitizedOtp = otp.trim()
    const otpKey = `otp:${sanitizedPhone}`

    // Retrieve cached OTP from Redis
    const cachedOtp = await redisClient.get(otpKey)

    if (!cachedOtp) {
      return res.status(400).json({ error: 'OTP has expired or does not exist' })
    }

    if (cachedOtp !== sanitizedOtp) {
      return res.status(400).json({ error: 'Invalid OTP code provided' })
    }

    // OTP verified successfully -> clear it from Redis
    await redisClient.del(otpKey)

    // Find or create the user in MongoDB
    let user = await User.findOne({ phone: sanitizedPhone })
    let isNewUser = false

    if (!user) {
      isNewUser = true
      // Generate a default name since 'name' is required in User schema
      const lastFour = sanitizedPhone.slice(-4) || 'User'
      const defaultName = `User_${lastFour}`

      user = new User({
        name: defaultName,
        phone: sanitizedPhone,
        role: 'passenger', // Default role
      })

      await user.save()
      console.log(`Successfully created new user: ${defaultName} (Phone: ${sanitizedPhone})`)
    }

    // Generate signed JWT token
    const tokenPayload = {
      id: user._id,
      phone: user.phone,
      role: user.role,
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '7d', // 7 days token expiration
    })

    return res.status(200).json({
      message: isNewUser ? 'User registered successfully' : 'User verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        trustScore: user.trustScore,
        isVerified: user.isVerified,
        profilePhoto: user.profilePhoto,
      },
    })
  } catch (error) {
    console.error('Error in verifyOTP:', error)
    return res.status(500).json({ error: 'Internal server error while verifying OTP' })
  }
}

/**
 * POST /api/auth/google
 * Accepts: { idToken }
 */
export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken is required' })
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
    if (!clientId) {
      console.error('Error: GOOGLE_OAUTH_CLIENT_ID environment variable is missing')
      return res.status(500).json({
        error: 'Server authentication configuration error. Missing GOOGLE_OAUTH_CLIENT_ID.',
      })
    }

    // Verify token with Google's OAuth client library
    const client = new OAuth2Client(clientId)
    let payload
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      })
      payload = ticket.getPayload()
    } catch (verifyErr) {
      console.error('Google ID Token verification failed:', verifyErr.message)
      return res.status(400).json({ error: 'Invalid Google ID token' })
    }

    const oauthId = payload.sub
    const email = payload.email
    const name = payload.name
    const profilePhoto = payload.picture

    // Find or create matching user by oauthId
    let user = await User.findOne({ oauthId })
    let isNewUser = false

    if (!user && email) {
      // Check if user exists with the same email
      user = await User.findOne({ email })
      if (user) {
        user.oauthId = oauthId
        if (!user.profilePhoto) user.profilePhoto = profilePhoto
        await user.save()
        console.log(`Linked existing email account (${email}) with Google OAuthId: ${oauthId}`)
      }
    }

    if (!user) {
      isNewUser = true
      user = new User({
        name,
        email,
        oauthId,
        profilePhoto,
        role: 'passenger',
      })
      await user.save()
      console.log(`Successfully created new OAuth user: ${name} (Email: ${email})`)
    }

    // Generate signed JWT token
    const tokenPayload = {
      id: user._id,
      phone: user.phone,
      role: user.role,
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    return res.status(200).json({
      message: isNewUser ? 'User registered successfully' : 'User verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        trustScore: user.trustScore,
        isVerified: user.isVerified,
        profilePhoto: user.profilePhoto,
      },
    })
  } catch (error) {
    console.error('Error in googleLogin:', error)
    return res.status(500).json({ error: 'Internal server error while executing Google login' })
  }
}

