import { RouteStop, RouteResult } from '../types';

// OSRM is FREE - no API key needed!
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Real OSRM API call (FREE!)
const callOSRMAPI = async (waypoints: RouteStop[]): Promise<RouteResult> => {
  try {
    // Build coordinates string for OSRM
    const coords = waypoints
      .filter(stop => stop.lat && stop.lng)
      .map(stop => `${stop.lng},${stop.lat}`)
      .join(';');
    
    if (!coords) {
      throw new Error('No valid coordinates found');
    }

    // OSRM API (FREE) - no API key needed!
    const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?overview=full&geometries=polyline&steps=true`;
    
    console.log('🚀 Calling FREE OSRM API...');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSRM API returned status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code !== 'Ok') {
      console.error('❌ OSRM API error:', data);
      throw new Error(`OSRM error: ${data.message || 'Unknown error'}`);
    }

    console.log('✅ OSRM Response received:', data);

    // Extract route info
    const trip = data.trips[0];
    
    // Update stops with optimized order while preserving coordinates
    const optimizedStops = [...waypoints];
    if (data.waypoints && data.waypoints.length === waypoints.length) {
      // Reorder stops based on OSRM optimization while preserving existing coordinates
      const orderedStops = data.waypoints.map((wp: any, idx: number) => {
        const originalStop = waypoints[wp.waypoint_index];
        return {
          ...originalStop,
          lat: wp.location[1],
          lng: wp.location[0]
        };
      });
      optimizedStops.splice(0, optimizedStops.length, ...orderedStops);
    }

    return {
      stops: optimizedStops,
      totalDistanceKm: Math.round(trip.distance / 1000),
      totalDurationMins: Math.round(trip.duration / 60),
      overviewPolyline: trip.geometry || ''
    };

  } catch (error: any) {
    console.error('❌ Error calling OSRM API:', error);
    throw error;
  }
};

// Mock route optimization (fallback)
const mockOptimizeRoute = async (stops: RouteStop[]): Promise<RouteResult> => {
  console.log('🎭 Using intelligent mock route optimization');
  
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Approximate city coordinates for realistic distance calculation
  const cityCoords: Record<string, {lat: number, lng: number}> = {
    'Mumbai, Maharashtra': {lat: 19.0760, lng: 72.8777},
    'Delhi, Delhi': {lat: 28.7041, lng: 77.1025},
    'Bangalore, Karnataka': {lat: 12.9716, lng: 77.5946},
    'Hyderabad, Telangana': {lat: 17.3850, lng: 78.4867},
    'Chennai, Tamil Nadu': {lat: 13.0827, lng: 80.2707},
    'Kolkata, West Bengal': {lat: 22.5726, lng: 88.3639},
    'Pune, Maharashtra': {lat: 18.5204, lng: 73.8567},
    'Ahmedabad, Gujarat': {lat: 23.0225, lng: 72.5714},
    'Jaipur, Rajasthan': {lat: 26.9124, lng: 75.7873},
    'Lucknow, Uttar Pradesh': {lat: 26.8467, lng: 80.9462}
  };

  // Calculate realistic distances using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  // Optimize by sorting stops to minimize total distance (nearest neighbor)
  const optimizedStops = [...stops];
  
  // Simple nearest neighbor optimization
  for (let i = 0; i < optimizedStops.length - 1; i++) {
    let minDist = Infinity;
    let minIdx = i + 1;
    
    const currentCoords = cityCoords[optimizedStops[i].city];
    if (!currentCoords) continue;
    
    for (let j = i + 1; j < optimizedStops.length; j++) {
      const nextCoords = cityCoords[optimizedStops[j].city];
      if (!nextCoords) continue;
      
      const dist = calculateDistance(
        currentCoords.lat, currentCoords.lng,
        nextCoords.lat, nextCoords.lng
      );
      
      if (dist < minDist) {
        minDist = dist;
        minIdx = j;
      }
    }
    
    // Swap to get nearest city next
    if (minIdx !== i + 1) {
      [optimizedStops[i + 1], optimizedStops[minIdx]] = [optimizedStops[minIdx], optimizedStops[i + 1]];
    }
  }

  // Calculate total distance based on optimized route
  let totalDistance = 0;
  for (let i = 0; i < optimizedStops.length - 1; i++) {
    const from = cityCoords[optimizedStops[i].city];
    const to = cityCoords[optimizedStops[i + 1].city];
    
    if (from && to) {
      totalDistance += calculateDistance(from.lat, from.lng, to.lat, to.lng);
    }
  }

  // Add coordinates to stops
  optimizedStops.forEach(stop => {
    const coords = cityCoords[stop.city];
    if (coords) {
      stop.lat = coords.lat;
      stop.lng = coords.lng;
    }
  });

  // Realistic duration: avg speed 60 km/h on highways
  const totalDuration = Math.round((totalDistance / 60) * 60); // in minutes

  return {
    stops: optimizedStops,
    totalDistanceKm: totalDistance,
    totalDurationMins: totalDuration,
    overviewPolyline: ''
  };
};

// Main function with automatic fallback
export const optimizeRoute = async (start: string, stops: RouteStop[]): Promise<RouteResult> => {
  console.log('🛣️ optimizeRoute called with stops:', stops);
  if (USE_MOCK) {
    console.log('🎭 Using mock optimization');
    return mockOptimizeRoute(stops);
  }
  
  try {
    console.log('🚀 Using live OSRM API');
    return await callOSRMAPI(stops);
  } catch (error: any) {
    console.error('❌ Live API failed, falling back to mock:', error.message);
    // Silent fallback - no alert, just use mock data
    return mockOptimizeRoute(stops);
  }
};

export const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  console.log('📍 geocodeAddress called with:', address);
  // Use Nominatim (OpenStreetMap) for free geocoding
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    
    console.log('📍 Geocoding address with FREE Nominatim:', address);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API returned status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.error('❌ Geocoding failed: No results');
      return null;
    }

    const location = data[0];
    console.log('✅ Geocoded to:', location);
    
    return {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lon)
    };

  } catch (error: any) {
    console.error('❌ Geocoding error:', error);
    return null;
  }
}