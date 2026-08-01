import Ride from '../models/Ride.js'
import { geocodeAddress } from '../services/geocodingService.js'

/**
 * Creates a new ride (Protected - Driver role only).
 */
export const createRide = async (req, res) => {
  const { origin, destination, route, dateTime, seatsAvailable, price } = req.body

  // 1. Role verification check
  const userRole = req.user.role
  if (userRole !== 'driver' && userRole !== 'both') {
    return res
      .status(403)
      .json({
        message: 'Only drivers are allowed to create rides. Please register as a driver first.',
      })
  }

  // 2. Validate basic input fields
  if (!origin || !destination || !dateTime || seatsAvailable === undefined || price === undefined) {
    return res
      .status(400)
      .json({
        message:
          'Missing required fields: origin, destination, dateTime, seatsAvailable, and price are all required.',
      })
  }

  const parsedSeats = parseInt(seatsAvailable, 10)
  const parsedPrice = parseFloat(price)

  if (isNaN(parsedSeats) || parsedSeats <= 0) {
    return res.status(400).json({ message: 'seatsAvailable must be a positive integer.' })
  }

  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ message: 'price cannot be negative.' })
  }

  try {
    // 3. Geocode and validate origin and destination via OpenStreetMap Nominatim
    console.log(`[RIDE] Validating origin: "${origin}" and destination: "${destination}"`)
    const geocodedOrigin = await geocodeAddress(origin)
    if (!geocodedOrigin) {
      return res
        .status(400)
        .json({
          message: `Origin location "${origin}" could not be verified. Please enter a valid address.`,
        })
    }

    const geocodedDest = await geocodeAddress(destination)
    if (!geocodedDest) {
      return res
        .status(400)
        .json({
          message: `Destination location "${destination}" could not be verified. Please enter a valid address.`,
        })
    }

    // 4. Create and save the new Ride
    const newRide = await Ride.create({
      driverId: req.user._id,
      origin: {
        address: geocodedOrigin.displayName,
        location: {
          type: 'Point',
          coordinates: [geocodedOrigin.lon, geocodedOrigin.lat],
        },
      },
      destination: {
        address: geocodedDest.displayName,
        location: {
          type: 'Point',
          coordinates: [geocodedDest.lon, geocodedDest.lat],
        },
      },
      route: Array.isArray(route) ? route : [],
      dateTime: new Date(dateTime),
      seatsAvailable: parsedSeats,
      price: parsedPrice,
      status: 'active',
    })

    console.log(
      `[RIDE] Ride successfully created from "${newRide.origin}" to "${newRide.destination}"`
    )
    return res.status(201).json({
      message: 'Ride created successfully',
      ride: newRide,
    })
  } catch (error) {
    console.error(`Create Ride Error: ${error.message}`)
    return res.status(500).json({ message: 'Failed to create ride.' })
  }
}

/**
 * Searches for active rides based on origin, destination, and date.
 */
export const searchRides = async (req, res) => {
  const originQuery = req.query.origin || req.query.from
  const destQuery = req.query.destination || req.query.to
  const dateQuery = req.query.date

  try {
    const filter = { status: 'active' }

    // Match origin location (case-insensitive substring of address)
    if (originQuery && originQuery.trim()) {
      filter['origin.address'] = { $regex: originQuery.trim(), $options: 'i' }
    }

    // Match destination location (case-insensitive substring of address)
    if (destQuery && destQuery.trim()) {
      filter['destination.address'] = { $regex: destQuery.trim(), $options: 'i' }
    }

    // Match exact date (start of day to end of day)
    if (dateQuery) {
      const parsedDate = new Date(dateQuery)
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate)
        startOfDay.setUTCHours(0, 0, 0, 0)

        const endOfDay = new Date(parsedDate)
        endOfDay.setUTCHours(23, 59, 59, 999)

        filter.dateTime = { $gte: startOfDay, $lte: endOfDay }
      }
    }

    // Find active rides sorting by dateTime ascending
    const rides = await Ride.find(filter)
      .populate('driverId', 'name phone profilePhoto trustScore isVerified')
      .sort({ dateTime: 1 })

    return res.status(200).json(rides)
  } catch (error) {
    console.error(`Search Rides Error: ${error.message}`)
    return res.status(500).json({ message: 'Failed to search rides.' })
  }
}

/**
 * Fetches full details for a specific ride by ID.
 */
export const getRideById = async (req, res) => {
  const { id } = req.params

  try {
    const ride = await Ride.findById(id).populate(
      'driverId',
      'name phone profilePhoto trustScore isVerified'
    )

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' })
    }

    return res.status(200).json(ride)
  } catch (error) {
    console.error(`Get Ride By ID Error: ${error.message}`)
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Ride ID format.' })
    }
    return res.status(500).json({ message: 'Failed to retrieve ride details.' })
  }
}
