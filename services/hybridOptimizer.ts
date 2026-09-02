import { Item, PlacedItem, Truck, LoadResult, RouteStop, RouteResult } from '../types';
import { packTruck } from './packer';
import { optimizeRoute } from './routing';

/**
 * Hybrid Intelligent Optimization Framework
 * 
 * Synchronizes route optimization (TSP) with LIFO-based cargo packing.
 * Items destined for the FIRST delivery stop are loaded LAST (nearest the truck door),
 * ensuring fast unloading at each stop without rearranging the cargo.
 * 
 * Architecture:
 *  1. Optimize route order (nearest neighbor TSP)
 *  2. Group items by delivery stop
 *  3. Reverse-sort groups (LIFO: last stop loaded first → deep in truck)
 *  4. Run weight-aware packing per group in LIFO order
 *  5. Merge results and compute unified safety metrics
 */

export interface StopItemAssignment {
  stop: RouteStop;
  items: Item[];
}

export interface HybridResult {
  routeResult: RouteResult;
  loadResult: LoadResult;
  stopAssignments: StopItemAssignment[];
  lifoScore: number;         // 0-100, how well LIFO ordering was achieved
  overallEfficiency: number; // 0-100, combined route+pack efficiency
  estimatedFuelLiters: number;
  estimatedCostINR: number;
  benchmarks: {
    routeOptimizationMs: number;
    packingMs: number;
    totalMs: number;
  };
}

/**
 * Calculate Haversine distance between two lat/lng points in km.
 */
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Assign items to stops using a round-robin with weight balancing.
 * If items already have a `stopId` property, use that. Otherwise distribute evenly.
 */
const assignItemsToStops = (items: Item[], stops: RouteStop[]): StopItemAssignment[] => {
  if (stops.length === 0) return [];
  
  const assignments: StopItemAssignment[] = stops.map(stop => ({
    stop,
    items: []
  }));

  // Group items by their city if possible, fallback to round-robin
  items.forEach((item, idx) => {
    const targetCity = item.city || (item as any).destination || '';
    const matchIdx = assignments.findIndex(a => 
      a.stop.city.toLowerCase().includes(targetCity.toLowerCase()) || 
      targetCity.toLowerCase().includes(a.stop.city.toLowerCase())
    );

    if (matchIdx !== -1) {
      assignments[matchIdx].items.push(item);
    } else {
      // Fallback to round-robin if city doesn't match
      const fallbackIdx = idx % stops.length;
      assignments[fallbackIdx].items.push(item);
    }
  });

  return assignments;
};

/**
 * Score how well the LIFO ordering was achieved.
 * Items for earlier stops should have higher X positions (closer to truck door = end of truck).
 */
const calculateLifoScore = (
  placedItems: PlacedItem[],
  stopAssignments: StopItemAssignment[],
  truckLength: number
): number => {
  if (placedItems.length === 0 || stopAssignments.length <= 1) return 100;

  let correctOrderCount = 0;
  let totalComparisons = 0;

  // For each pair of stops, check that later-stop items are deeper (lower X)
  // and earlier-stop items are nearer the door (higher X)
  for (let i = 0; i < stopAssignments.length; i++) {
    for (let j = i + 1; j < stopAssignments.length; j++) {
      const earlyStopItems = stopAssignments[i].items;
      const laterStopItems = stopAssignments[j].items;

      earlyStopItems.forEach(eItem => {
        const ePlaced = placedItems.find(p => p.id === eItem.id);
        if (!ePlaced) return;

        laterStopItems.forEach(lItem => {
          const lPlaced = placedItems.find(p => p.id === lItem.id);
          if (!lPlaced) return;

          totalComparisons++;
          // Earlier stop item should be closer to door (higher X position in truck)
          if (ePlaced.position[0] >= lPlaced.position[0]) {
            correctOrderCount++;
          }
        });
      });
    }
  }

  return totalComparisons > 0 ? (correctOrderCount / totalComparisons) * 100 : 100;
};

/**
 * Main hybrid optimization entry point.
 */
export const runHybridOptimization = async (
  truck: Truck,
  items: Item[],
  stops: RouteStop[],
  startLocation: string
): Promise<HybridResult> => {
  const totalStart = performance.now();

  // ────────────────────────────────────────────────
  // PHASE 1: Optimize Route (TSP)
  // ────────────────────────────────────────────────
  const routeStart = performance.now();
  const routeResult = await optimizeRoute(startLocation, stops);
  const routeMs = performance.now() - routeStart;

  // ────────────────────────────────────────────────
  // PHASE 2: Assign items to optimized stops
  // ────────────────────────────────────────────────
  const stopAssignments = assignItemsToStops(items, routeResult.stops);

  // ────────────────────────────────────────────────
  // PHASE 3: LIFO-ordered packing
  // Reverse the stop order so that the LAST stop's items are packed FIRST
  // (they go deepest into the truck). The FIRST stop's items are packed LAST
  // (nearest the door for immediate unloading).
  // ────────────────────────────────────────────────
  const packStart = performance.now();

  const lifoOrderedItems: Item[] = [];
  // Reverse: last stop → first packed (deep), first stop → last packed (door)
  for (let i = stopAssignments.length - 1; i >= 0; i--) {
    lifoOrderedItems.push(...stopAssignments[i].items);
  }

  // Pack with LIFO-ordered items using the weight-aware packer
  const loadResult = packTruck(truck, lifoOrderedItems);
  const packMs = performance.now() - packStart;

  // ────────────────────────────────────────────────
  // PHASE 4: Calculate LIFO score
  // ────────────────────────────────────────────────
  const lifoScore = calculateLifoScore(
    loadResult.placedItems,
    stopAssignments,
    truck.dimensions.length
  );

  // ────────────────────────────────────────────────
  // PHASE 5: Compute efficiency & cost metrics
  // ────────────────────────────────────────────────
  const totalDistKm = routeResult.totalDistanceKm;
  
  // Fuel estimation: base 0.35 L/km for loaded truck, adjusted by weight utilization
  const weightFactor = 1 + ((loadResult.weightUtilization || 50) / 100) * 0.3;
  const estimatedFuelLiters = Math.round(totalDistKm * 0.35 * weightFactor * 10) / 10;
  
  // Cost: diesel ₹90/L + toll approximation ₹2/km
  const estimatedCostINR = Math.round(estimatedFuelLiters * 90 + totalDistKm * 2);

  // Overall efficiency: weighted combination of route, volume, weight, and LIFO
  const routeEfficiency = Math.max(0, 100 - (totalDistKm / 50)); // penalize longer routes
  const volumeEff = loadResult.volumeUtilization;
  const weightEff = loadResult.weightUtilization || 0;
  const overallEfficiency = Math.round(
    volumeEff * 0.3 + weightEff * 0.2 + lifoScore * 0.3 + Math.min(100, routeEfficiency) * 0.2
  );

  const totalMs = performance.now() - totalStart;

  return {
    routeResult,
    loadResult,
    stopAssignments,
    lifoScore: Math.round(lifoScore * 10) / 10,
    overallEfficiency,
    estimatedFuelLiters,
    estimatedCostINR,
    benchmarks: {
      routeOptimizationMs: Math.round(routeMs),
      packingMs: Math.round(packMs),
      totalMs: Math.round(totalMs)
    }
  };
};
