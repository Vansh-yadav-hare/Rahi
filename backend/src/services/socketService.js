import { Server } from 'socket.io'
import Message from '../models/Message.js'

let io = null

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  // 1. Live Geolocation Tracking Namespace
  const trackingNamespace = io.of('/tracking')
  trackingNamespace.on('connection', (socket) => {
    console.log(`Socket connected to tracking: ${socket.id}`)

    // Client joins a specific ride room
    socket.on('join_ride', ({ rideId }) => {
      socket.join(`ride:${rideId}`)
      console.log(`Socket ${socket.id} joined tracking room: ride:${rideId}`)
    })

    // Driver emits coordinate updates
    socket.on('update_location', ({ rideId, latitude, longitude, speed, heading }) => {
      trackingNamespace.to(`ride:${rideId}`).emit('location_updated', {
        rideId,
        latitude,
        longitude,
        speed,
        heading,
        timestamp: new Date(),
      })
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected from tracking: ${socket.id}`)
    })
  })

  // 2. Chat Namespace
  const chatNamespace = io.of('/chat')
  chatNamespace.on('connection', (socket) => {
    console.log(`Socket connected to chat: ${socket.id}`)

    // Client joins chat room for the ride
    socket.on('join_chat', async ({ rideId }) => {
      socket.join(`chat:${rideId}`)
      console.log(`Socket ${socket.id} joined chat room: chat:${rideId}`)

      // Retrieve last 50 messages to show chat history
      try {
        const messages = await Message.find({ rideId })
          .sort({ createdAt: 1 })
          .limit(50)
        socket.emit('message_history', messages)
      } catch (err) {
        console.error('Error fetching message history:', err.message)
      }
    })

    // Send and save message
    socket.on('send_message', async (data) => {
      console.log('[SOCKET] Received send_message payload:', data)
      const { rideId, senderId, senderName, text } = data
      try {
        const newMessage = new Message({
          rideId,
          senderId,
          senderName,
          text,
        })
        await newMessage.save()

        // Broadcast to everyone in this chat room
        chatNamespace.to(`chat:${rideId}`).emit('receive_message', newMessage)
      } catch (err) {
        console.error('Error sending message:', err.message)
      }
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected from chat: ${socket.id}`)
    })
  })

  // 3. Root Namespace for Live Push Notifications
  io.on('connection', (socket) => {
    console.log(`Socket connected to root: ${socket.id}`)

    socket.on('join_user', ({ userId }) => {
      socket.join(`user:${userId}`)
      console.log(`User ${userId} joined notification room: user:${userId}`)
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected from root: ${socket.id}`)
    })
  })

  return io
}

export const getIO = () => {
  if (!io) throw new Error('Socket.IO has not been initialized!')
  return io
}
