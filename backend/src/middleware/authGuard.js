import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token missing or invalid' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error(`Auth Guard Error: ${error.message}`)
    return res.status(401).json({ message: 'Authentication failed' })
  }
}

export default authGuard
export { authGuard }
