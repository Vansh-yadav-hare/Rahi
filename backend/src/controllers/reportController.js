import RideReport from '../models/RideReport.js'
import Ride from '../models/Ride.js'

// Submit a safety concern report for a ride
export const submitReport = async (req, res) => {
  const { rideId, category, details } = req.body
  const reporterId = req.user._id

  if (!rideId || !category || !details) {
    return res.status(400).json({ message: 'Ride ID, category, and details are required.' })
  }

  try {
    // 1. Verify the ride exists
    const ride = await Ride.findById(rideId)
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' })
    }

    // 2. Create the report
    const report = await RideReport.create({
      rideId,
      reporterId,
      category,
      details,
    })

    console.log(`[REPORT] User ${reporterId} filed a concern for Ride ${rideId}: [${category}]`)

    return res.status(201).json({
      message: 'Concern reported successfully. Our safety team has been notified.',
      report,
    })
  } catch (error) {
    console.error(`Submit Report Error: ${error.message}`)
    return res.status(500).json({ message: 'Failed to submit report. Please try again.' })
  }
}
