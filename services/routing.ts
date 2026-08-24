import { RouteStop, RouteResult, RouteAlgorithmStep } from '../types';
import {
  geocodeAddress,
  searchLocations,
  reverseGeocodeAddress,
} from './geocoding';

export { geocodeAddress, searchLocations, reverseGeocodeAddress };

/**
 * Service to handle intelligent multi-stop route planning.
 * Road: OSRM (free public server)
 * Sea: searoute-ts (Eurostat maritime network, Dijkstra)
 * Air: Great-circle geodesic + Open-Meteo jet-stream optimization
 */

interface RouteGeometry {
  coordinates: [number, number][];
  distance: number;
  duration: number;
}

/**
 * Fetches a single road leg between two points via OSRM.
 */
async function fetchRoadLeg(
  from: [number, number],
  to: [number, number],
  goal: 'fastest' | 'eco' = 'fastest'
): Promise<RouteGeometry> {
  const coordsString = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const base = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&alternatives=false`;

  const urls =
    goal === 'eco'
      ? [`${base}&exclude=motorway`, base]
      : [base];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) continue;

      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map(
        (c: number[]) => [c[1], c[0]] as [number, number]
      );
      if (coordinates.length < 2) continue;

      return {
        coordinates,
        distance: route.distance / 1000,
        duration: route.duration / 60,
      };
    } catch {
      // try next URL variant
    }
  }

  return {
    coordinates: [from, to],
    distance: getDistance(from, to),
    duration: getDistance(from, to) * 1.5,
  };
}

/**
 * Builds full road geometry by routing each leg separately (most reliable for OSRM).
 */
async function buildRoadGeometryFromLegs(
  waypoints: [number, number][],
  goal: 'fastest' | 'eco' = 'fastest'
): Promise<RouteGeometry> {
  if (waypoints.length < 2) {
    return { coordinates: waypoints, distance: 0, duration: 0 };
  }

  const allCoords: [number, number][] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const leg = await fetchRoadLeg(waypoints[i], waypoints[i + 1], goal);
    const coords = [...leg.coordinates];
    if (i > 0 && coords.length > 0) coords.shift();
    allCoords.push(...coords);
    totalDistance += leg.distance;
    totalDuration += leg.duration;
  }

  return {
    coordinates: allCoords.length >= 2 ? allCoords : waypoints,
    distance: totalDistance,
    duration: totalDuration,
  };
}

/**
 * Fetches real road-aware routing between ordered waypoints using OSRM.
 */
export async function getRoadRoute(
  waypoints: [number, number][],
  goal: 'fastest' | 'eco' = 'fastest'
): Promise<RouteGeometry> {
  return buildRoadGeometryFromLegs(waypoints, goal);
}

/**
 * OSRM Trip API — optimizes stop order + returns road geometry (real TSP on road network).
 */
async function getOptimizedRoadTrip(
  waypoints: [number, number][],
  goal: 'fastest' | 'eco' = 'fastest'
): Promise<{
  coordinates: [number, number][];
  distance: number;
  duration: number;
  orderedIndices: number[];
}> {
  if (waypoints.length < 2) {
    return { coordinates: waypoints, distance: 0, duration: 0, orderedIndices: [0] };
  }

  const coordsString = waypoints.map((w) => `${w[1]},${w[0]}`).join(';');
  // Never pass exclude=motorway on multi-waypoint trip — OSRM returns InvalidValue for long India routes
  const url = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=false&source=first&destination=last&overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM Trip API Error');

    const data = await response.json();
    if (data.code !== 'Ok' || !data.trips?.[0]) throw new Error(data.message || 'No trip found');

    const trip = data.trips[0];
    const orderedIndices = (data.waypoints || [])
      .map((wp: { waypoint_index: number }, inputIdx: number) => ({
        inputIdx,
        tripPos: wp.waypoint_index,
      }))
      .sort((a: { tripPos: number }, b: { tripPos: number }) => a.tripPos - b.tripPos)
      .map((x: { inputIdx: number }) => x.inputIdx);

    return {
      coordinates: trip.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
      distance: trip.distance / 1000,
      duration: trip.duration / 60,
      orderedIndices,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Ensure every stop has lat/lng via free geocoding APIs.
 */
export async function resolveStopCoordinates(stops: RouteStop[]): Promise<RouteStop[]> {
  return Promise.all(
    stops.map(async (stop, idx) => {
      if (
        typeof stop.lat === 'number' &&
        typeof stop.lng === 'number' &&
        !isNaN(stop.lat) &&
        !isNaN(stop.lng)
      ) {
        return { ...stop };
      }

      const query = [stop.address, stop.city].filter(Boolean).join(', ');
      if (!query.trim()) {
        throw new Error(`Stop ${idx + 1} has no location — search and select a place from suggestions.`);
      }

      const coord = await geocodeAddress(query);
      if (!coord) {
        throw new Error(`Could not find location: "${query}". Try a more specific search.`);
      }

      return { ...stop, lat: coord.lat, lng: coord.lng };
    })
  );
}

const labelFor = (stop: RouteStop) =>
  stop.address ? `${stop.address} (${stop.city || ''})`.replace(/\s*\(\s*\)/, '') : stop.city || 'Unknown';

/**
 * Intelligent Multi-Stop Road Optimizer
 * Uses OSRM Trip API for stop sequencing on the real road network.
 */
export const optimizeRoute = async (
  origin: string,
  stops: RouteStop[],
  goal: 'fastest' | 'eco' = 'fastest'
): Promise<RouteResult> => {
  console.log('🛣️ Optimizing road route for', stops.length, 'stops');

  if (stops.length === 0) {
    throw new Error('No stops provided for optimization');
  }

  const stopsWithCoords = await resolveStopCoordinates(stops);
  const algorithmTrace: RouteAlgorithmStep[] = [];

  if (stopsWithCoords.length === 1) {
    const s = stopsWithCoords[0];
    const hubSequence = [labelFor(s)];
    return {
      stops: stopsWithCoords,
      totalDistanceKm: 0,
      totalDurationMins: 0,
      overviewPolyline: JSON.stringify([[s.lat!, s.lng!]]),
      hubSequence,
      sequenceAlgorithm: 'Single stop — no route leg',
      routingEngine: 'OSRM',
      algorithmTrace: [],
      geometryPointCount: 1,
      usedRoadNetwork: false,
    };
  }

  const waypoints = stopsWithCoords.map((s) => [s.lat!, s.lng!] as [number, number]);

  let sequence = stopsWithCoords;
  let orderedWaypoints = waypoints;

  try {
    const trip = await getOptimizedRoadTrip(waypoints, goal);
    orderedWaypoints = trip.orderedIndices.map((i) => waypoints[i]);
    sequence = trip.orderedIndices.map((i) => stopsWithCoords[i]);
  } catch (error) {
    console.warn('OSRM Trip ordering failed, using input order:', error);
  }

  // Always build geometry leg-by-leg — reliable full road paths on the map
  const roadData = await buildRoadGeometryFromLegs(orderedWaypoints, goal);
  const hubSequence = sequence.map((s) => labelFor(s));
  const usedRoadNetwork = roadData.coordinates.length > orderedWaypoints.length * 3;

  for (let i = 0; i < sequence.length - 1; i++) {
    algorithmTrace.push({
      step: i + 1,
      from: labelFor(sequence[i]),
      to: labelFor(sequence[i + 1]),
      distanceKm: Math.round(
        getDistance(
          [sequence[i].lat!, sequence[i].lng!],
          [sequence[i + 1].lat!, sequence[i + 1].lng!]
        ) * 10
      ) / 10,
      reason: 'OSRM road leg (snapped to highway network)',
    });
  }

  algorithmTrace.push({
    step: algorithmTrace.length + 1,
    from: hubSequence[0],
    to: hubSequence[hubSequence.length - 1],
    distanceKm: Math.round(roadData.distance * 10) / 10,
    reason: `Full road geometry — ${roadData.coordinates.length} OSRM points`,
  });

  return {
    stops: sequence,
    totalDistanceKm: Math.round(roadData.distance * 10) / 10,
    totalDurationMins: Math.round(roadData.duration),
    overviewPolyline: JSON.stringify(roadData.coordinates),
    hubSequence,
    sequenceAlgorithm: 'OSRM Trip Optimizer + per-leg road geometry',
    routingEngine: usedRoadNetwork
      ? 'OSRM (Open Source Routing Machine)'
      : 'Partial OSRM — some legs unavailable',
    algorithmTrace,
    geometryPointCount: roadData.coordinates.length,
    usedRoadNetwork,
  };
};

/**
 * Aviation Routing — Great-circle geodesic paths with live jet-stream optimization.
 */
export const optimizeAirRoute = async (
  stops: RouteStop[],
  mode: 'fastest' | 'eco' = 'eco'
): Promise<RouteResult> => {
  console.log('✈️ Optimizing flight path for', stops.length, 'waypoints, mode:', mode);

  if (stops.length < 2) {
    throw new Error('At least 2 points are required for a flight path');
  }

  const resolved = await resolveStopCoordinates(stops);
  const waypoints = resolved.map((s) => [s.lat!, s.lng!] as [number, number]);
  const algorithmTrace: RouteAlgorithmStep[] = [];
  const curvedGeometry: [number, number][] = [];
  let totalDist = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const legDist = getDistance(start, end);
    totalDist += legDist;

    let legPath: [number, number][];

    if (mode === 'eco') {
      // Wind-optimized: sample jet stream and bend the great circle toward favorable winds
      const midLat = (start[0] + end[0]) / 2;
      const midLng = (start[1] + end[1]) / 2;
      const wind = await getJetStreamData(midLat, midLng);
      const bearing = calculateBearing(start, end);

      // Perpendicular offset weighted by wind strength (max ~4° shift)
      const windRad = (wind.direction * Math.PI) / 180;
      const perpBearing = bearing + 90;
      const perpRad = (perpBearing * Math.PI) / 180;
      const windAlign = Math.cos(windRad - perpRad);
      const offsetDeg = Math.min(wind.speed / 40, 4) * windAlign;

      const detour: [number, number] = [
        midLat + offsetDeg * Math.cos(perpRad),
        midLng + offsetDeg * Math.sin(perpRad) / Math.cos((midLat * Math.PI) / 180),
      ];

      legPath = [];
      for (let j = 0; j <= 30; j++) legPath.push(interpolateGreatCircle(start, detour, j / 30));
      for (let j = 1; j <= 30; j++) legPath.push(interpolateGreatCircle(detour, end, j / 30));

      algorithmTrace.push({
        step: i + 1,
        from: labelFor(resolved[i]),
        to: labelFor(resolved[i + 1]),
        distanceKm: Math.round(legDist * 10) / 10,
        reason: `Jet-stream optimized arc (wind ${wind.speed} km/h from ${wind.direction}°)`,
      });
    } else {
      legPath = [];
      for (let j = 0; j <= 60; j++) {
        legPath.push(interpolateGreatCircle(start, end, j / 60));
      }
      algorithmTrace.push({
        step: i + 1,
        from: labelFor(resolved[i]),
        to: labelFor(resolved[i + 1]),
        distanceKm: Math.round(legDist * 10) / 10,
        reason: 'Great-circle geodesic (shortest air distance)',
      });
    }

    if (i > 0 && curvedGeometry.length > 0) legPath.shift();
    curvedGeometry.push(...legPath);
  }

  const hubSequence = resolved.map((s) => labelFor(s));

  return {
    stops: resolved,
    totalDistanceKm: Math.round(totalDist * 10) / 10,
    totalDurationMins: Math.round((totalDist / 850) * 60),
    overviewPolyline: JSON.stringify(curvedGeometry),
    hubSequence,
    sequenceAlgorithm:
      mode === 'eco'
        ? 'Great-Circle + Jet-Stream Optimization (Open-Meteo)'
        : 'Great-Circle Geodesic',
    routingEngine: 'WGS84 Geodesic + Open-Meteo 250hPa winds',
    algorithmTrace,
    geometryPointCount: curvedGeometry.length,
    usedRoadNetwork: true,
  };
};

function interpolateGreatCircle(c1: [number, number], c2: [number, number], fraction: number): [number, number] {
  const lat1 = c1[0] * Math.PI / 180;
  const lon1 = c1[1] * Math.PI / 180;
  const lat2 = c2[0] * Math.PI / 180;
  const lon2 = c2[1] * Math.PI / 180;

  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)
  ));

  if (d === 0) return c1;

  const A = Math.sin((1 - fraction) * d) / Math.sin(d);
  const B = Math.sin(fraction * d) / Math.sin(d);

  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);

  return [lat * 180 / Math.PI, lon * 180 / Math.PI];
}

/**
 * Fetches real-time wind data at jet-cruise altitudes (approx 34,000 ft / 250hPa)
 * using the free Open-Meteo API.
 */
export const getJetStreamData = async (lat: number, lng: number): Promise<{ speed: number, direction: number }> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_250hPa,wind_direction_250hPa&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    
    // Get current hour's data
    const hourIdx = new Date().getHours();
    const speed = data.hourly.wind_speed_250hPa[hourIdx] || 100;
    const direction = data.hourly.wind_direction_250hPa[hourIdx] || 270;
    
    return { speed, direction };
  } catch (e) {
    console.warn('Weather API failed, using standard jet stream defaults');
    return { speed: 120, direction: 270 }; // Default West-to-East jet stream
  }
}

/**
 * Calculates the bearing between two coordinates in degrees.
 */
export function calculateBearing(c1: [number, number], c2: [number, number]): number {
  const lat1 = c1[0] * Math.PI / 180;
  const lon1 = c1[1] * Math.PI / 180;
  const lat2 = c2[0] * Math.PI / 180;
  const lon2 = c2[1] * Math.PI / 180;

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Marine Intelligence Engine
 * Fetches real-time wave and current data using Open-Meteo Marine API.
 */
export const getSeaConditions = async (lat: number, lng: number): Promise<{ waveHeight: number, waveDirection: number }> => {
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_direction`;
    const res = await fetch(url);
    const data = await res.json();
    
    return {
      waveHeight: data.current.wave_height || 1.2,
      waveDirection: data.current.wave_direction || 180
    };
  } catch (e) {
    console.warn('Marine API failed, using standard sea state defaults');
    return { waveHeight: 1.5, waveDirection: 180 };
  }
}

/**
 * Maritime Routing — searoute-ts (Eurostat 2025 maritime network, Dijkstra shortest path).
 */
export const optimizeSeaRoute = async (
  stops: RouteStop[],
  mode: 'express' | 'eco' | 'heavy' = 'eco'
): Promise<RouteResult> => {
  console.log('🚢 Maritime routing via searoute-ts Eurostat network. Mode:', mode);

  // Lazy-load maritime engine so road planner doesn't bundle searoute-ts
  const { seaRoute, seaRouteMulti } = await import('searoute-ts');

  const resolved = await resolveStopCoordinates(stops);
  const algorithmTrace: RouteAlgorithmStep[] = [];

  const speedKnots = mode === 'express' ? 24 : mode === 'heavy' ? 16 : 20;
  const restrictions: Array<'suez' | 'babelmandeb'> = [];
  if (mode === 'heavy') {
    restrictions.push('suez', 'babelmandeb');
  }

  const points = resolved.map((s) => [s.lng!, s.lat!] as [number, number]);

  const options = {
    units: 'kilometers' as const,
    speedKnots,
    returnPassages: true,
    appendOriginDestination: true,
    antimeridian: 'unwrap' as const,
    restrictions: restrictions.length > 0 ? restrictions : undefined,
    vesselDraftMeters: mode === 'heavy' ? 16 : undefined,
  };

  let routeFeature;
  try {
    routeFeature =
      points.length > 2
        ? seaRouteMulti(points, options)
        : seaRoute(points[0], points[points.length - 1], options);
  } catch (err) {
    console.warn('Sea route with restrictions failed, retrying unrestricted:', err);
    routeFeature = seaRoute(points[0], points[points.length - 1], {
      ...options,
      restrictions: undefined,
    });
  }

  const seaCoords: [number, number][] = routeFeature.geometry.coordinates.map(
    (c) => [c[1], c[0]] as [number, number]
  );

  const passages = routeFeature.properties.passages || [];
  const hubSequence = [
    ...passages.map((p: string) => p.replace(/_/g, ' ').toUpperCase()),
    labelFor(resolved[resolved.length - 1]),
  ];

  for (let i = 0; i < resolved.length - 1; i++) {
    const dist = getDistance(
      [resolved[i].lat!, resolved[i].lng!],
      [resolved[i + 1].lat!, resolved[i + 1].lng!]
    );
    algorithmTrace.push({
      step: i + 1,
      from: labelFor(resolved[i]),
      to: labelFor(resolved[i + 1]),
      distanceKm: Math.round(dist * 10) / 10,
      reason: `Maritime leg via Eurostat marnet (Dijkstra)`,
    });
  }

  if (passages.length > 0) {
    algorithmTrace.push({
      step: algorithmTrace.length + 1,
      from: labelFor(resolved[0]),
      to: labelFor(resolved[resolved.length - 1]),
      distanceKm: Math.round(routeFeature.properties.length * 10) / 10,
      reason: `Passages: ${passages.join(' → ')} | ${seaCoords.length} network points`,
    });
  }

  const durationHours =
    routeFeature.properties.durationHours ??
    routeFeature.properties.length / (speedKnots * 1.852);

  // Last-mile dashed line from snapped port to exact destination coordinate
  const lastStop = resolved[resolved.length - 1];
  const snapEnd = seaCoords[seaCoords.length - 1];
  const lastMile: [number, number][] = [snapEnd, [lastStop.lat!, lastStop.lng!]];
  const snapDist = getDistance(snapEnd, [lastStop.lat!, lastStop.lng!]);

  return {
    stops: resolved,
    totalDistanceKm: Math.round((routeFeature.properties.length + snapDist) * 10) / 10,
    totalDurationMins: Math.round(durationHours * 60),
    overviewPolyline: JSON.stringify(seaCoords),
    intermodalPolyline: snapDist > 1 ? JSON.stringify(lastMile) : undefined,
    hubSequence,
    sequenceAlgorithm: 'Dijkstra on Eurostat Maritime Network (searoute-ts)',
    routingEngine: 'searoute-ts / Eurostat MARNET 2025',
    algorithmTrace,
    geometryPointCount: seaCoords.length,
    usedRoadNetwork: true,
  };
};

// ── Utilities ────────────────────────────────────────────────────────

async function geocodeCity(city: string): Promise<[number, number]> {
  const cached = await geocodeAddress(city);
  if (cached) return [cached.lat, cached.lng];
  throw new Error(`Could not geocode: ${city}`);
}

function getDistance(c1: [number, number], c2: [number, number]): number {
  if (!c1 || !c2 || typeof c1[0] !== 'number' || typeof c2[0] !== 'number') return 0;
  const R = 6371;
  const dLat = (c2[0] - c1[0]) * Math.PI / 180;
  const dLon = (c2[1] - c1[1]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(c1[0] * Math.PI / 180) * Math.cos(c2[0] * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateTotalDistance(coords: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += getDistance(coords[i], coords[i+1]);
  }
  return total;
}