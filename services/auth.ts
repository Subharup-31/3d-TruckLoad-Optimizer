import { Driver, Delivery, Message } from '../types';

// Admin credentials (in a real app, this would be securely stored on the server)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'cargolensxr2024' // In a real app, this would be hashed
};

// Driver data structure
export interface DriverData {
  id: string;
  username: string;
  password: string; // In a real app, this would be hashed
  name: string;
  phone: string;
  truckId?: string;
  licenseNumber: string;
}

// Delivery status enum
export type DeliveryStatus = 
  'pending' | 'approved' | 'assigned' | 'in-progress' | 'delivered' | 
  'cancelled' | 'on-the-way-to-pickup' | 'reached-pickup' | 'picked-up' | 
  'loaded' | 'on-the-way' | 'completed';

// Delivery data structure
export interface DeliveryData {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropLocation: string;
  packageWeight: number;
  packageDimensions: { length: number; width: number; height: number };
  packageNotes: string;
  scheduledTime: string;
  status: DeliveryStatus;
  assignedDriverId?: string;
  createdAt: string;
  updatedAt: string;
}

// Message data structure
export interface MessageData {
  id: string;
  deliveryId: string;
  senderId: string;
  senderRole: 'admin' | 'driver';
  content: string;
  timestamp: string;
  read: boolean;
}

// Mock driver data (in a real app, this would be in a database)
let MOCK_DRIVERS: DriverData[] = [
  {
    id: 'driver-1',
    username: 'driver1',
    password: 'driver123',
    name: 'Raj Kumar',
    phone: '+91 98765 43210',
    truckId: 'tata-1109',
    licenseNumber: 'DL-2024-001'
  },
  {
    id: 'driver-2',
    username: 'driver2',
    password: 'driver123',
    name: 'Amit Sharma',
    phone: '+91 98765 43211',
    truckId: 'eicher-12ft',
    licenseNumber: 'DL-2024-002'
  },
  {
    id: 'driver-3',
    username: 'driver3',
    password: 'driver123',
    name: 'Suresh Patel',
    phone: '+91 98765 43212',
    truckId: 'bharatbenz-1623r',
    licenseNumber: 'DL-2024-003'
  }
];

// Mock delivery data
let MOCK_DELIVERIES: DeliveryData[] = [
  {
    id: 'delivery-1',
    customerId: 'customer-1',
    customerName: 'ABC Electronics',
    customerPhone: '+91 98765 00001',
    pickupLocation: 'Nariman Point, Mumbai, Maharashtra',
    dropLocation: 'Shivaji Nagar, Pune, Maharashtra',
    packageWeight: 50,
    packageDimensions: { length: 60, width: 40, height: 30 },
    packageNotes: 'Fragile electronics',
    scheduledTime: '2024-06-15T09:00:00',
    status: 'assigned',
    assignedDriverId: 'driver-1',
    createdAt: '2024-06-10T10:00:00',
    updatedAt: '2024-06-10T10:00:00'
  },
  {
    id: 'delivery-2',
    customerId: 'customer-2',
    customerName: 'XYZ Furniture',
    customerPhone: '+91 98765 00002',
    pickupLocation: 'MG Road, Bangalore, Karnataka',
    dropLocation: 'HITEC City, Hyderabad, Telangana',
    packageWeight: 120,
    packageDimensions: { length: 120, width: 80, height: 60 },
    packageNotes: 'Large furniture items',
    scheduledTime: '2024-06-16T14:00:00',
    status: 'pending',
    createdAt: '2024-06-11T11:00:00',
    updatedAt: '2024-06-11T11:00:00'
  }
];

// Mock messages
let MOCK_MESSAGES: MessageData[] = [
  {
    id: 'msg-1',
    deliveryId: 'delivery-1',
    senderId: 'admin',
    senderRole: 'admin',
    content: 'Please ensure the electronics are handled with care',
    timestamp: '2024-06-10T11:00:00',
    read: false
  },
  {
    id: 'msg-2',
    deliveryId: 'delivery-1',
    senderId: 'driver-1',
    senderRole: 'driver',
    content: 'Understood, will take extra care with this delivery',
    timestamp: '2024-06-10T11:15:00',
    read: false
  }
];

// Authentication service
export const AuthService = {
  // Admin login
  loginAdmin: (username: string, password: string): boolean => {
    return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
  },

  // Driver login
  loginDriver: (username: string, password: string): DriverData | null => {
    const driver = MOCK_DRIVERS.find(d => d.username === username && d.password === password);
    return driver || null;
  },

  // Get all drivers
  getDrivers: (): DriverData[] => {
    return MOCK_DRIVERS;
  },

  // Get driver by ID
  getDriverById: (id: string): DriverData | undefined => {
    return MOCK_DRIVERS.find(d => d.id === id);
  },

  // Add new driver
  addDriver: (driver: Omit<DriverData, 'id'>): DriverData => {
    const newDriver: DriverData = {
      ...driver,
      id: `driver-${Date.now()}`
    };
    MOCK_DRIVERS.push(newDriver);
    return newDriver;
  },

  // Update driver
  updateDriver: (id: string, updates: Partial<DriverData>): DriverData | null => {
    const index = MOCK_DRIVERS.findIndex(d => d.id === id);
    if (index === -1) return null;
    
    MOCK_DRIVERS[index] = {
      ...MOCK_DRIVERS[index],
      ...updates
    };
    
    return MOCK_DRIVERS[index];
  },

  // Delete driver
  deleteDriver: (id: string): boolean => {
    const initialLength = MOCK_DRIVERS.length;
    MOCK_DRIVERS = MOCK_DRIVERS.filter(d => d.id !== id);
    return MOCK_DRIVERS.length < initialLength;
  },

  // Get deliveries
  getDeliveries: (): DeliveryData[] => {
    return MOCK_DELIVERIES;
  },

  // Get delivery by ID
  getDeliveryById: (id: string): DeliveryData | undefined => {
    return MOCK_DELIVERIES.find(d => d.id === id);
  },

  // Create new delivery
  createDelivery: (delivery: Omit<DeliveryData, 'id' | 'createdAt' | 'updatedAt' | 'status'>): DeliveryData => {
    const newDelivery: DeliveryData = {
      ...delivery,
      id: `delivery-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    MOCK_DELIVERIES.push(newDelivery);
    return newDelivery;
  },

  // Update delivery
  updateDelivery: (id: string, updates: Partial<DeliveryData>): DeliveryData | null => {
    const index = MOCK_DELIVERIES.findIndex(d => d.id === id);
    if (index === -1) return null;
    
    MOCK_DELIVERIES[index] = {
      ...MOCK_DELIVERIES[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return MOCK_DELIVERIES[index];
  },

  // Delete delivery
  deleteDelivery: (id: string): boolean => {
    const initialLength = MOCK_DELIVERIES.length;
    MOCK_DELIVERIES = MOCK_DELIVERIES.filter(d => d.id !== id);
    return MOCK_DELIVERIES.length < initialLength;
  },

  // Assign driver to delivery
  assignDriver: (deliveryId: string, driverId: string): DeliveryData | null => {
    return AuthService.updateDelivery(deliveryId, { assignedDriverId: driverId, status: 'assigned' });
  },

  // Get messages for a delivery
  getMessagesByDelivery: (deliveryId: string): MessageData[] => {
    return MOCK_MESSAGES.filter(m => m.deliveryId === deliveryId);
  },

  // Send message
  sendMessage: (message: Omit<MessageData, 'id' | 'timestamp' | 'read'>): MessageData => {
    const newMessage: MessageData = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    MOCK_MESSAGES.push(newMessage);
    return newMessage;
  },

  // Mark message as read
  markMessageAsRead: (id: string): boolean => {
    const message = MOCK_MESSAGES.find(m => m.id === id);
    if (message) {
      message.read = true;
      return true;
    }
    return false;
  },

  // Get driver performance stats
  getDriverStats: (driverId: string): any => {
    const driverDeliveries = MOCK_DELIVERIES.filter(d => d.assignedDriverId === driverId);
    const completedDeliveries = driverDeliveries.filter(d => d.status === 'completed');
    const cancelledDeliveries = driverDeliveries.filter(d => d.status === 'cancelled');
    
    return {
      totalJobs: driverDeliveries.length,
      completedJobs: completedDeliveries.length,
      cancelledJobs: cancelledDeliveries.length,
      completionRate: driverDeliveries.length > 0 
        ? Math.round((completedDeliveries.length / driverDeliveries.length) * 100) 
        : 0
    };
  }
};