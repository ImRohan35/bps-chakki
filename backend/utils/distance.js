/**
 * Haversine formula to calculate distance between two coordinates in kilometers.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return 0;
  }
  const R = 6371; // Radius of Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal place
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Validates if the customer coordinate is within shop delivery radius.
 */
function validateDeliveryArea(shopLat, shopLon, custLat, custLon, maxRadiusKm = 15) {
  // If customer coordinates provided, use exact distance
  if (custLat && custLon && shopLat && shopLon) {
    const distanceKm = calculateDistanceKm(shopLat, shopLon, custLat, custLon);
    const isDeliverable = distanceKm <= maxRadiusKm;
    return {
      isDeliverable,
      distanceKm,
      maxRadiusKm,
      message: isDeliverable
        ? `Delivery available (${distanceKm} km from shop)`
        : `Sorry, delivery is currently available within ${maxRadiusKm} KM only.`
    };
  }

  // Fallback: If no GPS coords supplied, we allow standard order with simulated local distance
  return {
    isDeliverable: true,
    distanceKm: 4.5,
    maxRadiusKm,
    message: 'Delivery available'
  };
}

module.exports = {
  calculateDistanceKm,
  validateDeliveryArea
};
