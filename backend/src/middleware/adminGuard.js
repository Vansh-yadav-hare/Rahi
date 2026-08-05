const adminGuard = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next()
  } else {
    res.status(403).json({ message: 'Forbidden. Admin privileges required.' })
  }
}

export default adminGuard
export { adminGuard }
