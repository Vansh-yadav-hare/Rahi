import Ride from '../models/Ride.js'
import Booking from '../models/Booking.js'
import { geocodeAddress } from '../services/geocodingService.js'

/**
 * Creates a new ride (Protected - Driver role only).
 */
export const createRide = async (req, res) => {
  const { origin, destination, route, stops, womenOnly, instantBook, dateTime, seatsAvailable, price } = req.body

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

    // Geocode intermediate stops sequentially
    const geocodedStops = []
    if (Array.isArray(stops) && stops.length > 0) {
      for (const stopAddress of stops) {
        if (stopAddress && stopAddress.trim()) {
          console.log(`[RIDE] Geocoding intermediate stop: "${stopAddress}"`)
          const geocodedStop = await geocodeAddress(stopAddress)
          if (geocodedStop) {
            geocodedStops.push({
              address: geocodedStop.displayName,
              location: {
                type: 'Point',
                coordinates: [geocodedStop.lon, geocodedStop.lat],
              },
            })
          } else {
            return res.status(400).json({
              message: `Intermediate stop "${stopAddress}" could not be verified. Please enter a valid address.`,
            })
          }
        }
      }
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
      stops: geocodedStops,
      womenOnly: womenOnly === true || womenOnly === 'true',
      instantBook: instantBook === true || instantBook === 'true',
      route: Array.isArray(route) ? route : [],
      dateTime: new Date(dateTime),
      seatsAvailable: parsedSeats,
      price: parsedPrice,
      status: 'active',
    })

    console.log(
      `[RIDE] Ride successfully created from "${newRide.origin.address}" to "${newRide.destination.address}"`
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
 * Supports segment matching and prorated pricing.
 */
export const searchRides = async (req, res) => {
  const originQuery = req.query.origin || req.query.from
  const destQuery = req.query.destination || req.query.to
  const dateQuery = req.query.date

  try {
    const filter = { status: 'active' }

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

    const matchedRides = []

    for (const ride of rides) {
      // Construct complete sequence of stops
      const stopsList = [
        ride.origin.address,
        ...ride.stops.map(s => s.address),
        ride.destination.address
      ]

      let startIdx = 0
      let endIdx = stopsList.length - 1

      if (originQuery && originQuery.trim()) {
        const cleanOrigin = originQuery.trim().toLowerCase()
        startIdx = stopsList.findIndex(addr => addr.toLowerCase().includes(cleanOrigin))
      }

      if (destQuery && destQuery.trim()) {
        const cleanDest = destQuery.trim().toLowerCase()
        endIdx = stopsList.findIndex(addr => addr.toLowerCase().includes(cleanDest))
      }

      // Check if both matched and are in correct order
      if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
        const legsCount = stopsList.length - 1
        
        // Calculate segment price
        const segmentPrice = Math.round(((endIdx - startIdx) / legsCount) * ride.price)

        // Calculate segment seat capacity checking active bookings
        const bookings = await Booking.find({
          rideId: ride._id,
          status: { $in: ['BOOKED', 'REQUESTED'] }
        })

        const occupied = Array(legsCount).fill(0)
        for (const b of bookings) {
          const bStart = stopsList.findIndex(addr => addr.toLowerCase().includes((b.pickup || ride.origin.address).toLowerCase()))
          const bEnd = stopsList.findIndex(addr => addr.toLowerCase().includes((b.dropoff || ride.destination.address).toLowerCase()))
          if (bStart !== -1 && bEnd !== -1 && bStart < bEnd) {
            for (let k = bStart; k < bEnd; k++) {
              occupied[k] += b.seatsBooked
            }
          }
        }

        let maxOccupiedOnSegment = 0
        for (let k = startIdx; k < endIdx; k++) {
          maxOccupiedOnSegment = Math.max(maxOccupiedOnSegment, occupied[k])
        }

        const seatsAvailableOnSegment = Math.max(0, ride.seatsAvailable - maxOccupiedOnSegment)

        // Return a customized object for this search segment
        const rideJson = ride.toJSON()
        rideJson.price = segmentPrice
        rideJson.seatsAvailable = seatsAvailableOnSegment
        
        matchedRides.push(rideJson)
      }
    }

    return res.status(200).json(matchedRides)
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

    // Determine current minimum seats available across any segment of the ride
    const stopsList = [
      ride.origin.address,
      ...ride.stops.map(s => s.address),
      ride.destination.address
    ]
    const legsCount = stopsList.length - 1

    const bookings = await Booking.find({
      rideId: ride._id,
      status: { $in: ['BOOKED', 'REQUESTED'] }
    })

    const occupied = Array(legsCount).fill(0)
    for (const b of bookings) {
      const bStart = stopsList.findIndex(addr => addr.toLowerCase().includes((b.pickup || ride.origin.address).toLowerCase()))
      const bEnd = stopsList.findIndex(addr => addr.toLowerCase().includes((b.dropoff || ride.destination.address).toLowerCase()))
      if (bStart !== -1 && bEnd !== -1 && bStart < bEnd) {
        for (let k = bStart; k < bEnd; k++) {
          occupied[k] += b.seatsBooked
        }
      }
    }

    const maxOccupiedAnywhere = Math.max(0, ...occupied)
    const minSeatsAvailable = Math.max(0, ride.seatsAvailable - maxOccupiedAnywhere)

    const rideJson = ride.toJSON()
    rideJson.seatsAvailable = minSeatsAvailable

    return res.status(200).json(rideJson)
  } catch (error) {
    console.error(`Get Ride By ID Error: ${error.message}`)
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Ride ID format.' })
    }
    return res.status(500).json({ message: 'Failed to retrieve ride details.' })
  }
}

/**
 * Marks a ride as completed (Protected - Driver of the ride only).
 */
export const completeRide = async (req, res) => {
  const { id } = req.params
  const driverId = req.user._id

  try {
    const ride = await Ride.findById(id)
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' })
    }

    if (ride.driverId.toString() !== driverId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to complete this ride.' })
    }

    if (ride.status === 'completed') {
      return res.status(400).json({ message: 'Ride is already completed.' })
    }

    if (ride.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot complete a cancelled ride.' })
    }

    ride.status = 'completed'
    await ride.save()

    console.log(`[RIDE] Ride ${ride._id} marked as completed by driver ${driverId}`)
    return res.status(200).json({
      message: 'Ride completed successfully.',
      ride,
    })
  } catch (error) {
    console.error(`Complete Ride Error: ${error.message}`)
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Ride ID format.' })
    }
    return res.status(500).json({ message: 'Failed to complete ride.' })
  }
}
