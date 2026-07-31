import jwt from 'jsonwebtoken'
import User from '../models/User.js'

/**
 * Express middleware to guard routes and authenticate requests using JWT tokens
 */
const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. Missing or invalid Authorization header' })
    }

    const token = authHeader.split(' ')[1]

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Look up user in database
      const user = await User.findById(decoded.id).select('-passwordHash')

      if (!user) {
        return res.status(401).json({ error: 'User associated with this token no longer exists' })
      }

      // Attach user information to request
      req.user = user
      next()
    } catch (err) {
      console.error('JWT Verification Error:', err.message)
      return res.status(401).json({ error: 'Access denied. Invalid or expired token' })
    }
  } catch (error) {
    console.error('AuthGuard Middleware Error:', error)
    return res.status(500).json({ error: 'Internal server error during authentication' })
  }
}

export default authGuard
export { authGuard }
