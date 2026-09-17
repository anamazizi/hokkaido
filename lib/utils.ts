/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate delivery fee based on distance.
 * Base fee RM 3.00 for 0–2 km, then RM 1.50 per additional km.
 * Amount is rounded to nearest whole Ringgit (no sen).
 */
export function calculateDeliveryFee(distanceKm: number): number {
  const baseFee = 3.0
  const baseDistance = 2.0
  const perKmRate = 1.50

  if (distanceKm <= baseDistance) {
    return Math.round(baseFee)
  }
  const rawFee = baseFee + (distanceKm - baseDistance) * perKmRate
  // Round to nearest whole Ringgit (no sen)
  return Math.round(rawFee)
}

/**
 * Get product details by type.
 */
export function getProductDetails(productType: string) {
  const products = {
    solo_sweet: {
      name: 'Hokkaido Inti Jebok - Set Solo Sweet (3 pcs)',
      price: 5.0,
      cogs: 3.0,
      profit: 2.0,
    },
    family_box: {
      name: 'Hokkaido Inti Jebok - Set Family Box (12 pcs)',
      price: 18.0,
      cogs: 14.0,
      profit: 4.0,
    },
    mega_craving: {
      name: 'Hokkaido Inti Jebok - Set Mega Craving (25 pcs)',
      price: 30.0,
      cogs: 25.0,
      profit: 5.0,
    },
  }
  return products[productType as keyof typeof products] || products.solo_sweet
}

/**
 * Format currency in Malaysian Ringgit (RM).
 */
export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`
}

/**
 * Sanitize phone number to Malaysian international format (601XXXXXXXX).
 * Removes all non-digits, strips leading zeros, ensures starts with '601'.
 */
export function sanitizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  // If already starts with 601, return as is
  if (digits.startsWith('601')) return digits
  // Remove leading zeros
  const withoutLeadingZero = digits.replace(/^0+/, '')
  // Ensure starts with '1' (local Malaysian number)
  const normalized = withoutLeadingZero.startsWith('1') ? withoutLeadingZero : '1' + withoutLeadingZero
  // Add country code '60'
  return '60' + normalized
}

/**
 * Extract only digits from input, removing any non-digit characters.
 */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '')
}