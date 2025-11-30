import { Item, Truck } from '../types';
import { DEFAULT_TRUCK, TRUCK_OPTIONS } from '../constants';

const KEYS = {
  ITEMS: 'cargolens_items',
  TRUCKS: 'cargolens_trucks',
};

export const StorageService = {
  getItems: (): Item[] => {
    try {
      const data = localStorage.getItem(KEYS.ITEMS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveItems: (items: Item[]) => {
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
  },

  getTrucks: (): Truck[] => {
    try {
      const data = localStorage.getItem(KEYS.TRUCKS);
      if (data) {
        const trucks = JSON.parse(data);
        // Ensure all trucks have proper structure
        return trucks.map((truck: any) => ({
          ...truck,
          dimensions: {
            length: truck.dimensions?.length || 0,
            width: truck.dimensions?.width || 0,
            height: truck.dimensions?.height || 0
          }
        }));
      }
      return [DEFAULT_TRUCK];
    } catch (e) {
      return [DEFAULT_TRUCK];
    }
  },

  saveTrucks: (trucks: Truck[]) => {
    localStorage.setItem(KEYS.TRUCKS, JSON.stringify(trucks));
  }
};