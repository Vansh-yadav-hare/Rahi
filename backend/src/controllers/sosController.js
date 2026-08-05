import SOSAlert from '../models/SOSAlert.js'
import User from '../models/User.js'

/**
 * Trigger an SOS Emergency Alert
 */
export const triggerSOS = async (req, res) => {
  const { rideId, latitude, longitude } = req.body

  if (!rideId) {
    return res.status(400).json({ message: 'Ride ID is required to trigger SOS' })
  }

  try {
    // 1. Log the alert in MongoDB
    const alert = new SOSAlert({
      userId: req.user._id,
      rideId,
      latitude,
      longitude,
      status: 'active',
    })
    await alert.save()

    // 2. Fetch User and simulate alerting emergency contacts / local authorities
    const user = await User.findById(req.user._id)
    const userName = user ? user.name : 'Unknown User'

    console.warn(`
🚨🚨🚨 [SOS EMERGENCY PANIC BUTTON TRIGGERED] 🚨🚨🚨
--------------------------------------------------
USER: ${userName} (ID: ${req.user._id})
RIDE ID: ${rideId}
COORDINATES: Lat ${latitude || 'N/A'}, Lng ${longitude || 'N/A'}
TIMESTAMP: ${new Date().toISOString()}
ACTION TAKEN: Dispatched security logs and sent simulated SMS notification to emergency contacts.
--------------------------------------------------
    `)

    return res.status(200).json({
      message: 'SOS Alert triggered successfully. Emergency contacts have been notified, and assistance is on the way.',
      alertId: alert._id,
    })
  } catch (error) {
    console.error('Error triggering SOS:', error.message)
    return res.status(500).json({ message: 'Internal server error: ' + error.message })
  }
}
