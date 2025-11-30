import { Item, PlacedItem, Truck, LoadResult } from '../types';

/**
 * A simplified "Bottom-Left-Back" greedy heuristic for bin packing.
 * It tries to place the largest volume items first.
 */
export const packTruck = (truck: Truck, itemsToPack: Item[]): LoadResult => {
  // Validate inputs
  if (!truck || !itemsToPack || !truck.dimensions) {
    throw new Error('Invalid truck or items provided');
  }
  
  // Validate dimensions
  if (truck.dimensions.length <= 0 || truck.dimensions.width <= 0 || truck.dimensions.height <= 0) {
    throw new Error('Invalid truck dimensions');
  }
  
  const placedItems: PlacedItem[] = [];
  const unplacedItems: Item[] = [];
  
  // Expand items based on quantity and sort by volume descending
  const flatList: Item[] = [];
  itemsToPack.forEach(item => {
    // Validate item dimensions
    if (!item.dimensions || item.dimensions.length <= 0 || item.dimensions.width <= 0 || item.dimensions.height <= 0) {
      console.warn('Skipping item with invalid dimensions:', item.name);
      return;
    }
    
    // Validate quantity
    const quantity = Math.max(1, item.quantity || 1);
    
    for (let i = 0; i < quantity; i++) {
      flatList.push({ ...item });
    }
  });

  // Sort: Largest volume first, then largest height
  flatList.sort((a, b) => {
    const volA = a.dimensions.length * a.dimensions.width * a.dimensions.height;
    const volB = b.dimensions.length * b.dimensions.width * b.dimensions.height;
    if (volB !== volA) return volB - volA;
    return b.dimensions.height - a.dimensions.height;
  });

  // Track occupied space using a simplified collision check against existing boxes
  // For a production app, we would use a 3D matrix or an Interval Tree
  
  const fitsAt = (
    dims: { l: number; w: number; h: number },
    pos: { x: number; y: number; z: number },
    placed: PlacedItem[],
    truckDims: { l: number; w: number; h: number }
  ): boolean => {
    // Check boundaries
    if (pos.x + dims.l > truckDims.l) return false;
    if (pos.y + dims.h > truckDims.h) return false; // Y is up in 3D viz usually, but here we treat H as Y
    if (pos.z + dims.w > truckDims.w) return false;

    // Check collision with other boxes
    for (const other of placed) {
      const intersectX = pos.x < other.position[0] + other.dimensions.length && pos.x + dims.l > other.position[0];
      const intersectY = pos.y < other.position[1] + other.dimensions.height && pos.y + dims.h > other.position[1];
      const intersectZ = pos.z < other.position[2] + other.dimensions.width && pos.z + dims.w > other.position[2];

      if (intersectX && intersectY && intersectZ) return false;
    }

    return true;
  };

  // Step size for scanning (smaller = more precise but slower)
  // Optimization: Try to align with corners of existing items
  
  const truckL = truck.dimensions.length;
  const truckW = truck.dimensions.width;
  const truckH = truck.dimensions.height;

  for (const item of flatList) {
    let placed = false;
    const dim = { l: item.dimensions.length, w: item.dimensions.width, h: item.dimensions.height };

    // Candidates coordinates: Start at (0,0,0) and corner points of existing items
    // We try to place "Deep", then "Wide", then "High" (Z, X, Y) or similar logic.
    // For this MVP, we scan systematically.
    
    // Potential anchor points: (0,0,0) plus top-right-back of every placed item projected to axes
    // This is the "Candidate Point" strategy
    const potentialPoints: { x: number, y: number, z: number }[] = [{ x: 0, y: 0, z: 0 }];
    
    placedItems.forEach(p => {
      potentialPoints.push({ x: p.position[0] + p.dimensions.length, y: p.position[1], z: p.position[2] }); // Right
      potentialPoints.push({ x: p.position[0], y: p.position[1] + p.dimensions.height, z: p.position[2] }); // Top
      potentialPoints.push({ x: p.position[0], y: p.position[1], z: p.position[2] + p.dimensions.width }); // Front
    });

    // Sort points to prefer bottom-back-left
    potentialPoints.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y; // Lowest first
      if (a.z !== b.z) return a.z - b.z; // Back first
      return a.x - b.x; // Left first
    });

    for (const pt of potentialPoints) {
        if (fitsAt(dim, pt, placedItems, { l: truckL, w: truckW, h: truckH })) {
            placedItems.push({
                ...item,
                uuid: Math.random().toString(36).substr(2, 9),
                position: [pt.x, pt.y, pt.z],
                rotation: [0, 0, 0],
                quantity: 1
            });
            placed = true;
            break;
        }
    }

    if (!placed) {
      unplacedItems.push(item);
    }
  }

  // Calculate volume stats
  const totalTruckVol = truckL * truckW * truckH;
  const usedVol = placedItems.reduce((acc, item) => acc + (item.dimensions.length * item.dimensions.width * item.dimensions.height), 0);

  return {
    truckId: truck.id,
    placedItems,
    unplacedItems,
    volumeUtilization: (usedVol / totalTruckVol) * 100
  };
};