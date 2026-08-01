import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { JWT } from 'google-auth-library'
import User from '../models/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper to find service account file in the workspace
const findServiceAccount = () => {
  try {
    // 1. Check if custom path is configured in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const customPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      if (fs.existsSync(customPath)) {
        return JSON.parse(fs.readFileSync(customPath, 'utf8'))
      }
    }

    // 2. Scan root and backend directories for any *firebase-adminsdk*.json file
    const rootDir = path.resolve(__dirname, '../../../')
    const backendDir = path.resolve(__dirname, '../../')

    const searchDirs = [rootDir, backendDir]
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
        const sdkFile = files.find(f => f.endsWith('.json') && f.includes('firebase-adminsdk'))
        if (sdkFile) {
          const filePath = path.join(dir, sdkFile)
          return JSON.parse(fs.readFileSync(filePath, 'utf8'))
        }
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION] Error loading Firebase service account:', error.message)
  }
  return null
}

/**
 * Sends a push notification to a user via Firebase Cloud Messaging (FCM).
 * Supports both modern HTTP v1 API (using service account) and legacy API (using server key).
 *
 * @param {string} userId - The MongoDB ID of the user to notify.
 * @param {string} title - The notification title.
 * @param {string} body - The notification body content.
 */
export const sendPush = async (userId, title, body) => {
  const serviceAccount = findServiceAccount()
  const serverKey = process.env.FIREBASE_SERVER_KEY
  const hasServerKey = serverKey && !serverKey.includes('your_') && serverKey.trim() !== ''

  // Validate we have at least one valid authentication method configured
  if (!serviceAccount && !hasServerKey) {
    console.warn('[NOTIFICATION] Firebase messaging not configured. Please supply a service account JSON or configure FIREBASE_SERVER_KEY in backend/.env. Skipping push notification.')
    return
  }

  try {
    // Retrieve the user from the database to check for FCM token
    const user = await User.findById(userId)
    if (!user) {
      console.warn(`[NOTIFICATION] User with ID ${userId} not found in database. Skipping push.`)
      return
    }

    if (!user.fcmToken) {
      console.warn(`[NOTIFICATION] User "${user.name || userId}" does not have an fcmToken registered. Skipping push.`)
      return
    }

    console.log(`[NOTIFICATION] Attempting to send push notification to user ${userId} (${user.name || 'unnamed'}): "${title}" - "${body}"`)

    if (serviceAccount) {
      // Use modern FCM HTTP v1 API
      const jwtClient = new JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      })

      const credentials = await jwtClient.getAccessToken()
      const accessToken = credentials.token

      if (!accessToken) {
        throw new Error('Failed to obtain OAuth2 access token for Firebase Messaging.')
      }

      const projectId = serviceAccount.project_id
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: user.fcmToken,
            notification: {
              title,
              body,
            },
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`FCM HTTP v1 push request failed: ${errorText}`)
      }

      const resData = await response.json()
      console.log(`[NOTIFICATION] FCM HTTP v1 push notification successfully sent:`, resData)
    } else {
      // Fallback: Call legacy FCM endpoint using global fetch
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: user.fcmToken,
          notification: {
            title,
            body,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Legacy FCM push request failed: ${errorText}`)
      }

      const resData = await response.json()
      console.log(`[NOTIFICATION] Legacy FCM push notification successfully sent:`, resData)
    }
  } catch (error) {
    // Catch errors to prevent crashing the request calling sendPush
    console.error(`[NOTIFICATION] Error occurred while sending push notification: ${error.message}`)
  }
}
