import '../config/env.js'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'

const deleteData = async () => {
  try {
    await connectDB()
    
    console.log('Deleting all rides...')
    const rideRes = await mongoose.connection.collection('rides').deleteMany({})
    console.log(`Deleted ${rideRes.deletedCount} rides.`)
    
    console.log('Deleting all bookings...')
    const bookingRes = await mongoose.connection.collection('bookings').deleteMany({})
    console.log(`Deleted ${bookingRes.deletedCount} bookings.`)

    console.log('Deleting all payments...')
    const paymentRes = await mongoose.connection.collection('payments').deleteMany({})
    console.log(`Deleted ${paymentRes.deletedCount} payments.`)
    
    console.log('Deleting all reviews...')
    const reviewRes = await mongoose.connection.collection('reviews').deleteMany({})
    console.log(`Deleted ${reviewRes.deletedCount} reviews.`)

    console.log('Deleting all messages...')
    const messageRes = await mongoose.connection.collection('messages').deleteMany({})
    console.log(`Deleted ${messageRes.deletedCount} messages.`)

    console.log('Deleting all sosalerts...')
    const sosRes = await mongoose.connection.collection('sosalerts').deleteMany({})
    console.log(`Deleted ${sosRes.deletedCount} sosalerts.`)

    console.log('All ride-related data cleared successfully!')
  } catch (error) {
    console.error('Error deleting data:', error)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

deleteData()
