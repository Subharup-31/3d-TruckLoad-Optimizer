export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
  dimensions: Dimensions;
  color: string;
  weight?: number;
  isFragile: boolean;
  isStackable: boolean;
}

export interface Truck {
  id: string;
  name: string;
  dimensions: Dimensions;
  maxWeight: number;
}

export interface PlacedItem extends Item {
  position: [number, number, number]; // x, y, z relative to truck origin
  rotation: [number, number, number];
  uuid: string; // Unique ID for this specific instance
}

export interface LoadResult {
  truckId: string;
  placedItems: PlacedItem[];
  unplacedItems: Item[];
  volumeUtilization: number; // 0 to 100
}

export interface RouteStop {
  id: string;
  address: string;
  city: string; // Restricted to India context
  lat?: number;
  lng?: number;
}

export interface RouteResult {
  stops: RouteStop[];
  totalDistanceKm: number;
  totalDurationMins: number;
  overviewPolyline: string;
}

// Driver interface
export interface Driver {
  id: string;
  username: string;
  name: string;
  phone: string;
  truckId?: string;
  licenseNumber: string;
}

// Delivery interface
export type DeliveryStatus = 
  'pending' | 'approved' | 'assigned' | 'in-progress' | 'delivered' | 
  'cancelled' | 'on-the-way-to-pickup' | 'reached-pickup' | 'picked-up' | 
  'loaded' | 'on-the-way' | 'completed';

export interface Delivery {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropLocation: string;
  packageWeight: number;
  packageDimensions: Dimensions;
  packageNotes: string;
  scheduledTime: string;
  status: DeliveryStatus;
  assignedDriverId?: string;
  createdAt: string;
  updatedAt: string;
}

// Message interface
export interface Message {
  id: string;
  deliveryId: string;
  senderId: string;
  senderRole: 'admin' | 'driver';
  content: string;
  timestamp: string;
  read: boolean;
}