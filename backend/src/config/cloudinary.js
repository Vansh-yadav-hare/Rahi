import { v2 as cloudinary } from 'cloudinary'

const isCloudinaryConfigured = () => {
  const url = process.env.CLOUDINARY_URL
  return !!(url && url !== 'cloudinary://api_key:api_secret@cloud_name' && !url.includes('api_key'))
}

export { cloudinary, isCloudinaryConfigured }
