import { Item, PlacedItem, Truck, LoadResult } from '../types';

export type PackingMode = 'truck' | 'air' | 'sea';

type Point3 = { x: number; y: number; z: number };
type TruckDims = { l: number; w: number; h: number };

/**
 * Mode-aware cargo packing based on real loading practice:
 * - Truck: rear-to-front LIFO wall-fill (heavy floor, last stop deep / first stop at door)
 * - Air: wing-box center cluster (MAC ~40% length, heavy low, symmetric lateral)
 * - Sea: keel block stowage (heavy low center, port/starboard balance, tier up)
 */
export const packCargo = (
  truck: Truck,
  itemsToPack: Item[],
  mode: PackingMode = 'truck'
): LoadResult => {
  if (!truck?.dimensions) throw new Error('Invalid vehicle provided');
  const { length: truckL, width: truckW, height: truckH } = truck.dimensions;
  if (truckL <= 0 || truckW <= 0 || truckH <= 0) throw new Error('Invalid vehicle dimensions');

  const placedItems: PlacedItem[] = [];
  const unplacedItems: Item[] = [];

  const flatList: Item[] = [];
  itemsToPack.forEach((item) => {
    if (
      !item.dimensions ||
      item.dimensions.length <= 0 ||
      item.dimensions.width <= 0 ||
      item.dimensions.height <= 0
    ) {
      return;
    }
    const quantity = Math.max(1, item.quantity || 1);
    for (let i = 0; i < quantity; i++) {
      flatList.push({ ...item, weight: item.weight || 50 });
    }
  });

  sortItemsForMode(flatList, mode);

  const fitsAt = (
    item: Item,
    pos: Point3,
    placed: PlacedItem[],
    dims: TruckDims
  ): boolean => {
    const d = { l: item.dimensions.length, w: item.dimensions.width, h: item.dimensions.height };

    if (pos.x + d.l > dims.l || pos.y + d.h > dims.h || pos.z + d.w > dims.w) return false;

    if (pos.y > 0) {
      let supportedArea = 0;
      const totalArea = d.l * d.w;

      for (const other of placed) {
        const isUnderneath = Math.abs(pos.y - (other.position[1] + other.dimensions.height)) < 0.1;
        if (isUnderneath) {
          const overlapL =
            Math.min(pos.x + d.l, other.position[0] + other.dimensions.length) -
            Math.max(pos.x, other.position[0]);
          const overlapW =
            Math.min(pos.z + d.w, other.position[2] + other.dimensions.width) -
            Math.max(pos.z, other.position[2]);

          if (overlapL > 0 && overlapW > 0) {
            if (other.isStackable === false) return false;
            supportedArea += overlapL * overlapW;
          }
        }
      }
      if (supportedArea < totalArea * 0.7) return false;
    }

    for (const other of placed) {
      const ix =
        pos.x < other.position[0] + other.dimensions.length &&
        pos.x + d.l > other.position[0];
      const iy =
        pos.y < other.position[1] + other.dimensions.height &&
        pos.y + d.h > other.position[1];
      const iz =
        pos.z < other.position[2] + other.dimensions.width &&
        pos.z + d.w > other.position[2];
      if (ix && iy && iz) return false;
    }
    return true;
  };

  const truckDims: TruckDims = { l: truckL, w: truckW, h: truckH };
  let currentTotalWeight = 0;
  let sequenceOrder = 0;

  for (const item of flatList) {
    if (currentTotalWeight + (item.weight || 0) > truck.maxWeight) {
      unplacedItems.push(item);
      continue;
    }

    const dim = { l: item.dimensions.length, w: item.dimensions.width, h: item.dimensions.height };
    const candidates = generateCandidates(placedItems, dim, truckDims, mode);

    let best: Point3 | null = null;
    let bestScore = Infinity;

    for (const pt of candidates) {
      if (!fitsAt(item, pt, placedItems, truckDims)) continue;
      const score = scorePosition(pt, dim, placedItems, truckDims, mode);
      if (score < bestScore) {
        bestScore = score;
        best = pt;
      }
    }

    if (best) {
      placedItems.push({
        ...item,
        uuid: Math.random().toString(36).slice(2, 11),
        position: [best.x, best.y, best.z],
        rotation: [0, 0, 0],
        quantity: 1,
        sequenceOrder,
      });
      sequenceOrder += 1;
      currentTotalWeight += item.weight || 0;
    } else {
      unplacedItems.push(item);
    }
  }

  const totalTruckVol = truckL * truckW * truckH;
  const usedVol = placedItems.reduce(
    (acc, item) =>
      acc + item.dimensions.length * item.dimensions.width * item.dimensions.height,
    0
  );

  let sumWeightX = 0;
  let sumWeightY = 0;
  let sumWeightZ = 0;

  placedItems.forEach((item) => {
    const w = item.weight || 50;
    const cx = item.position[0] + item.dimensions.length / 2;
    const cy = item.position[1] + item.dimensions.height / 2;
    const cz = item.position[2] + item.dimensions.width / 2;
    sumWeightX += cx * w;
    sumWeightY += cy * w;
    sumWeightZ += cz * w;
  });

  const centerOfGravity =
    currentTotalWeight > 0
      ? {
          x: sumWeightX / currentTotalWeight,
          y: sumWeightY / currentTotalWeight,
          z: sumWeightZ / currentTotalWeight,
        }
      : { x: truckL / 2, y: 0, z: truckW / 2 };

  return {
    truckId: truck.id,
    placedItems,
    unplacedItems,
    volumeUtilization: (usedVol / totalTruckVol) * 100,
    weightUtilization: (currentTotalWeight / truck.maxWeight) * 100,
    centerOfGravity,
    totalWeight: currentTotalWeight,
  };
};

/** Backward-compatible truck-only entry */
export const packTruck = (truck: Truck, itemsToPack: Item[]): LoadResult =>
  packCargo(truck, itemsToPack, 'truck');

function sortItemsForMode(items: Item[], mode: PackingMode) {
  items.sort((a, b) => {
    if (a.isFragile !== b.isFragile) return a.isFragile ? 1 : -1;

    const wA = a.weight || 0;
    const wB = b.weight || 0;
    if (Math.abs(wB - wA) > 0.1) return wB - wA;

    const volA = a.dimensions.length * a.dimensions.width * a.dimensions.height;
    const volB = b.dimensions.length * b.dimensions.width * b.dimensions.height;
    return volB - volA;
  });

  // Air: load heavy keel pieces before light fill; sea similar
  if (mode === 'sea') {
    items.sort((a, b) => {
      const keelA = (a.weight || 0) / vol(a);
      const keelB = (b.weight || 0) / vol(b);
      return keelB - keelA;
    });
  }
}

function vol(item: Item) {
  return item.dimensions.length * item.dimensions.width * item.dimensions.height;
}

function generateCandidates(
  placed: PlacedItem[],
  dim: { l: number; w: number; h: number },
  dims: TruckDims,
  mode: PackingMode
): Point3[] {
  const points: Point3[] = [];
  const seen = new Set<string>();
  const add = (p: Point3) => {
    const key = `${Math.round(p.x)}|${Math.round(p.y)}|${Math.round(p.z)}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (p.x >= 0 && p.y >= 0 && p.z >= 0 && p.x + dim.l <= dims.l && p.y + dim.h <= dims.h && p.z + dim.w <= dims.w) {
      points.push(p);
    }
  };

  if (mode === 'air') {
    // Wing box / main deck zone (~28–58% length, centered width) — standard freighter CG band
    const xMin = dims.l * 0.28;
    const xMax = dims.l * 0.58 - dim.l;
    const zMin = dims.w * 0.12;
    const zMax = dims.w * 0.88 - dim.w;
    const step = Math.max(30, Math.min(dim.l, dim.w) * 0.5);

    for (let y = 0; y <= dims.h - dim.h; y += Math.max(20, dim.h)) {
      for (let x = xMin; x <= xMax; x += step) {
        for (let z = zMin; z <= zMax; z += step) {
          add({ x, y, z });
        }
      }
    }
  } else if (mode === 'sea') {
    // Tank-top grid: fill hold in blocks from centerline
    const step = Math.max(40, Math.min(dim.l, dim.w) * 0.6);
    for (let y = 0; y <= dims.h - dim.h; y += Math.max(25, dim.h)) {
      for (let x = 0; x <= dims.l - dim.l; x += step) {
        for (let z = 0; z <= dims.w - dim.w; z += step) {
          add({ x, y, z });
        }
      }
    }
  } else {
    // Truck: start at rear wall (x=0), fill across width then forward toward door
    add({ x: 0, y: 0, z: 0 });
    const stepZ = Math.max(20, dim.w);
    for (let z = 0; z <= dims.w - dim.w; z += stepZ) {
      add({ x: 0, y: 0, z });
    }
  }

  placed.forEach((p) => {
    add({ x: p.position[0] + p.dimensions.length, y: p.position[1], z: p.position[2] });
    add({ x: p.position[0], y: p.position[1] + p.dimensions.height, z: p.position[2] });
    add({ x: p.position[0], y: p.position[1], z: p.position[2] + p.dimensions.width });
  });

  return points;
}

function scorePosition(
  pt: Point3,
  dim: { l: number; w: number; h: number },
  placed: PlacedItem[],
  dims: TruckDims,
  mode: PackingMode
): number {
  const cx = pt.x + dim.l / 2;
  const cy = pt.y + dim.h / 2;
  const cz = pt.z + dim.w / 2;
  const centerZ = dims.w / 2;

  // Always prefer floor first
  let score = pt.y * 1_000_000;

  if (mode === 'truck') {
    // Rear-to-front LIFO: deep (low x) first, then toward door
    score += pt.x * 1_000;
    // Wall-to-wall: fill across width from sidewall, then next row forward
    score += pt.z * 6;
    if (placed.length > 0 && !isAdjacent(pt, dim, placed)) score += 500;
    return score;
  }

  if (mode === 'air') {
    const macX = dims.l * 0.42;
    const wingXMin = dims.l * 0.28;
    const wingXMax = dims.l * 0.58;

    const distMac = Math.hypot(cx - macX, cz - centerZ);
    score += distMac * 120;

    if (cx < wingXMin || cx > wingXMax) score += 50_000;

    // Penalize long thin runs along fuselage — cluster in wing box
    const runPenalty = isolatedAlongLength(pt, dim, placed, dims);
    score += runPenalty;

    // Symmetric lateral balance
    const portW = sideWeight(placed, dims.w, 'port');
    const starboardW = sideWeight(placed, dims.w, 'starboard');
    const onPort = cz < centerZ;
    score += onPort ? portW * 3 : starboardW * 3;

    if (!isAdjacent(pt, dim, placed) && placed.length > 0) score += 800;
    return score;
  }

  // Sea: keel stowage — heavy low, centerline, port/starboard balance
  const keelX = dims.l * 0.5;
  score += Math.abs(cx - keelX) * 15;
  score += Math.abs(cz - centerZ) * 12;

  const portW = sideWeight(placed, dims.w, 'port');
  const starboardW = sideWeight(placed, dims.w, 'starboard');
  const onPort = cz < centerZ;
  score += onPort ? portW * 4 : starboardW * 4;

  if (!isAdjacent(pt, dim, placed) && placed.length > 0) score += 600;
  return score;
}

function sideWeight(placed: PlacedItem[], truckW: number, side: 'port' | 'starboard'): number {
  const mid = truckW / 2;
  return placed.reduce((sum, p) => {
    const cz = p.position[2] + p.dimensions.width / 2;
    const onSide = side === 'port' ? cz < mid : cz >= mid;
    return onSide ? sum + (p.weight || 50) : sum;
  }, 0);
}

function isAdjacent(pt: Point3, dim: { l: number; w: number; h: number }, placed: PlacedItem[]): boolean {
  const tol = 2;
  for (const p of placed) {
    const touchX =
      Math.abs(pt.x + dim.l - p.position[0]) < tol ||
      Math.abs(pt.x - (p.position[0] + p.dimensions.length)) < tol;
    const touchY =
      Math.abs(pt.y + dim.h - p.position[1]) < tol ||
      Math.abs(pt.y - (p.position[1] + p.dimensions.height)) < tol;
    const touchZ =
      Math.abs(pt.z + dim.w - p.position[2]) < tol ||
      Math.abs(pt.z - (p.position[2] + p.dimensions.width)) < tol;
    const overlapX = pt.x < p.position[0] + p.dimensions.length && pt.x + dim.l > p.position[0];
    const overlapY = pt.y < p.position[1] + p.dimensions.height && pt.y + dim.h > p.position[1];
    const overlapZ = pt.z < p.position[2] + p.dimensions.width && pt.z + dim.w > p.position[2];
    if ((touchX && overlapY && overlapZ) || (touchY && overlapX && overlapZ) || (touchZ && overlapX && overlapY)) {
      return true;
    }
  }
  return false;
}

/** Penalize placements that extend a sparse line along fuselage instead of filling wing box */
function isolatedAlongLength(
  pt: Point3,
  dim: { l: number; w: number; h: number },
  placed: PlacedItem[],
  dims: TruckDims
): number {
  if (placed.length === 0) return 0;
  const cx = pt.x + dim.l / 2;
  const sameLayer = placed.filter(
    (p) => Math.abs(p.position[1] - pt.y) < 5 && Math.abs(p.position[2] + p.dimensions.width / 2 - (pt.z + dim.w / 2)) < dims.w * 0.35
  );
  if (sameLayer.length === 0) return 0;

  const xs = sameLayer.map((p) => p.position[0] + p.dimensions.length / 2);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = maxX - minX;
  // If new item extends span dramatically with little lateral fill, penalize
  if (span > dims.l * 0.35 && sameLayer.length < 4) return 15_000;
  if (cx < minX - dim.l || cx > maxX + dim.l) return 8_000;
  return 0;
}

/** Items sorted by physical loading order for play sequence UI */
export function getLoadingSequence(placed: PlacedItem[]): PlacedItem[] {
  return [...placed].sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0));
}
