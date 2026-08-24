import { Item, Truck } from '../types';

export function computeSuggestedDimensions(vehicle: Truck, unplaced: Item[]) {
  if (unplaced.length === 0) return null;

  let maxL = 0;
  let maxW = 0;
  let maxH = 0;
  let totalVol = 0;
  let totalWeight = 0;

  for (const item of unplaced) {
    const qty = item.quantity || 1;
    maxL = Math.max(maxL, item.dimensions.length);
    maxW = Math.max(maxW, item.dimensions.width);
    maxH = Math.max(maxH, item.dimensions.height);
    totalVol +=
      item.dimensions.length * item.dimensions.width * item.dimensions.height * qty;
    totalWeight += (item.weight || 0) * qty;
  }

  const vehicleVol =
    vehicle.dimensions.length * vehicle.dimensions.width * vehicle.dimensions.height;
  const scale = Math.min(2.5, Math.cbrt((vehicleVol + totalVol) / vehicleVol));

  return {
    length: Math.ceil(Math.max(vehicle.dimensions.length * scale, maxL * 1.1)),
    width: Math.ceil(Math.max(vehicle.dimensions.width * scale, maxW * 1.1)),
    height: Math.ceil(Math.max(vehicle.dimensions.height * scale, maxH * 1.1)),
    extraWeightKg: totalWeight,
  };
}
