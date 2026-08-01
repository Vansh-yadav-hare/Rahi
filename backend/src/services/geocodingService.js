/**
 * Validates and geocodes an address string using OpenStreetMap's Nominatim API.
 *
 * @param {string} address - The address/location string to geocode.
 * @returns {Promise<{lat: number, lon: number, displayName: string} | null>} The coordinates and location display name, or null.
 */
export const geocodeAddress = async (address) => {
  if (!address || typeof address !== 'string' || !address.trim()) {
    return null
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.trim())}&format=json&limit=1`

    // OpenStreetMap Nominatim requires a descriptive User-Agent header to comply with usage policy
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Rahi-RideSharingApp/1.0',
      },
    })

    if (!response.ok) {
      console.error(`[GEOCODING] API returned HTTP error status ${response.status}`)
      return null
    }

    const data = await response.json()

    if (Array.isArray(data) && data.length > 0) {
      const location = data[0]
      return {
        lat: parseFloat(location.lat),
        lon: parseFloat(location.lon),
        displayName: location.display_name,
      }
    }

    return null
  } catch (error) {
    console.error(`[GEOCODING] Error resolving address "${address}": ${error.message}`)
    return null
  }
}
