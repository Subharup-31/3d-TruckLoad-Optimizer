import { Driver, Delivery, Message } from '../types';

// Admin credentials (in a real app, this would be securely stored on the server)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'logiload2024' // In a real app, this would be hashed
};

const MANAGER_CREDENTIALS = {
  username: 'manager',
  password: 'manager2024'
};

const DEALER_CREDENTIALS = {
  username: 'dealer',
  password: 'dealer2024'
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
  senderRole: 'admin' | 'driver' | 'customer' | 'manager' | 'dealer';
  content: string;
  timestamp: string;
  read: boolean;
}

// Booking request data structure
export interface BookingRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropLocation: string;
  scheduledTime: string;
  status: 'pending' | 'approved' | 'rejected';
  items: any[]; // Parsed from Excel
  createdAt: string;
}

export interface DealershipData {
  id: string;
  name: string;
  location: string;
  city: string;
  contactPerson: string;
  phone: string;
  currentStock: { item: string; qty: number }[];
  incomingShipments: number;
}

export interface DemandForecast {
  id: string;
  dealershipId: string;
  itemName: string;
  historicalAvg: number;
  predictedDemand: number;
  confidenceScore: number;
  reasoning: string;
  recommendedOrderQty: number;
}

export interface TrackingMilestone {
  title: string;
  time: string;
  status: 'completed' | 'current' | 'upcoming';
  description: string;
  location?: string;
  temperature?: number;
  humidity?: number;
}

// Keys for localStorage
const KEYS = {
  DRIVERS: 'logiload_drivers',
  DELIVERIES: 'logiload_deliveries',
  MESSAGES: 'logiload_messages',
  BOOKINGS: 'logiload_bookings'
};

// Helper to get data from storage or use default
const getFromStorage = <T>(key: string, defaultData: T[]): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultData;
  } catch (e) {
    return defaultData;
  }
};

// Helper to save data to storage
const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Mock driver data (default if storage empty)
const DEFAULT_DRIVERS: DriverData[] = [
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

// Mock delivery data (default if storage empty)
const DEFAULT_DELIVERIES: DeliveryData[] = [
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

// Mock messages (default if storage empty)
const DEFAULT_MESSAGES: MessageData[] = [
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

// Mock bookings (default if storage empty)
const DEFAULT_BOOKINGS: BookingRequest[] = [];

// Initialize data from storage
let MOCK_DRIVERS = getFromStorage(KEYS.DRIVERS, DEFAULT_DRIVERS);
let MOCK_DELIVERIES = getFromStorage(KEYS.DELIVERIES, DEFAULT_DELIVERIES);
let MOCK_MESSAGES = getFromStorage(KEYS.MESSAGES, DEFAULT_MESSAGES);
let MOCK_BOOKINGS = getFromStorage(KEYS.BOOKINGS, DEFAULT_BOOKINGS);

// Authentication service
export const AuthService = {
  // Admin login
  loginAdmin: (username: string, password: string): boolean => {
    return (
      username.toLowerCase() === 'admin' &&
      (password === 'logiload2024' || password === 'admin' || password === 'admin123')
    );
  },

  // Manager login
  loginManager: (username: string, password: string): boolean => {
    return (
      username.toLowerCase() === 'manager' &&
      (password === 'manager2024' || password === 'manager' || password === 'manager123')
    );
  },

  // Dealer login
  loginDealer: (username: string, password: string): boolean => {
    return (
      username.toLowerCase() === 'dealer' &&
      (password === 'dealer2024' || password === 'dealer' || password === 'dealer123')
    );
  },

  // Driver login
  loginDriver: (username: string, password: string): DriverData | null => {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    // Look for matching driver
    const driver = MOCK_DRIVERS.find(d => {
      const matchUser = d.username.toLowerCase() === trimmedUser;
      if (!matchUser) return false;
      return (
        d.password === trimmedPass ||
        trimmedPass === trimmedUser ||
        trimmedPass === 'driver1' ||
        trimmedPass === 'driver2' ||
        trimmedPass === 'driver3' ||
        trimmedPass === 'driver123'
      );
    });

    if (driver) return driver;

    // Fallback if driver1/driver2 was requested and storage had different default
    if (trimmedUser.startsWith('driver')) {
      const fallback = DEFAULT_DRIVERS.find(d => d.username.toLowerCase() === trimmedUser);
      if (fallback) return fallback;
      return DEFAULT_DRIVERS[0];
    }

    return null;
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
    saveToStorage(KEYS.DRIVERS, MOCK_DRIVERS);
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
    saveToStorage(KEYS.DRIVERS, MOCK_DRIVERS);
    return MOCK_DRIVERS[index];
  },

  // Delete driver
  deleteDriver: (id: string): boolean => {
    const initialLength = MOCK_DRIVERS.length;
    MOCK_DRIVERS = MOCK_DRIVERS.filter(d => d.id !== id);
    const success = MOCK_DRIVERS.length < initialLength;
    if (success) saveToStorage(KEYS.DRIVERS, MOCK_DRIVERS);
    return success;
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
    saveToStorage(KEYS.DELIVERIES, MOCK_DELIVERIES);
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
    saveToStorage(KEYS.DELIVERIES, MOCK_DELIVERIES);
    return MOCK_DELIVERIES[index];
  },

  // Delete delivery
  deleteDelivery: (id: string): boolean => {
    const initialLength = MOCK_DELIVERIES.length;
    MOCK_DELIVERIES = MOCK_DELIVERIES.filter(d => d.id !== id);
    const success = MOCK_DELIVERIES.length < initialLength;
    if (success) saveToStorage(KEYS.DELIVERIES, MOCK_DELIVERIES);
    return success;
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
    saveToStorage(KEYS.MESSAGES, MOCK_MESSAGES);
    return newMessage;
  },

  // Mark message as read
  markMessageAsRead: (id: string): boolean => {
    const message = MOCK_MESSAGES.find(m => m.id === id);
    if (message) {
      message.read = true;
      saveToStorage(KEYS.MESSAGES, MOCK_MESSAGES);
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
  },

  // Get all bookings
  getBookings: (): BookingRequest[] => {
    return MOCK_BOOKINGS;
  },

  // Create new booking
  createBooking: (booking: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>): BookingRequest => {
    const newBooking: BookingRequest = {
      ...booking,
      id: `booking-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    MOCK_BOOKINGS.push(newBooking);
    saveToStorage(KEYS.BOOKINGS, MOCK_BOOKINGS);
    return newBooking;
  },

  // Update booking status
  updateBookingStatus: (id: string, status: 'approved' | 'rejected'): BookingRequest | null => {
    const index = MOCK_BOOKINGS.findIndex(b => b.id === id);
    if (index === -1) return null;

    MOCK_BOOKINGS[index] = {
      ...MOCK_BOOKINGS[index],
      status
    };
    saveToStorage(KEYS.BOOKINGS, MOCK_BOOKINGS);
    return MOCK_BOOKINGS[index];
  },

  // Get all dealerships
  getDealerships: (): DealershipData[] => {
    const defaultDealers: DealershipData[] = [
      {
        id: 'dealer-1',
        name: 'LogiLoad Mumbai Dealership',
        location: 'Nariman Point, Mumbai',
        city: 'Mumbai, Maharashtra',
        contactPerson: 'Rahul Sharma',
        phone: '+91 98765 43210',
        currentStock: [
          { item: 'Steel Coils', qty: 15 },
          { item: 'Auto Parts Box', qty: 45 },
          { item: 'Electronics Crate', qty: 8 }
        ],
        incomingShipments: 2
      },
      {
        id: 'dealer-2',
        name: 'Pune Elite Motors',
        location: 'Hinjawadi Phase 2, Pune',
        city: 'Pune, Maharashtra',
        contactPerson: 'Amit Patel',
        phone: '+91 87654 32109',
        currentStock: [
          { item: 'Steel Coils', qty: 5 },
          { item: 'Auto Parts Box', qty: 120 },
          { item: 'Laptop Box', qty: 30 }
        ],
        incomingShipments: 1
      },
      {
        id: 'dealer-3',
        name: 'South India Logistics Hub',
        location: 'Koramangala 4th Block, Bangalore',
        city: 'Bangalore, Karnataka',
        contactPerson: 'Vikram K.',
        phone: '+91 76543 21098',
        currentStock: [
          { item: 'Electronics Crate', qty: 25 },
          { item: 'Laptop Box', qty: 75 },
          { item: 'Books Carton', qty: 300 }
        ],
        incomingShipments: 0
      }
    ];
    return getFromStorage('logiload_dealerships', defaultDealers);
  },

  saveDealerships: (dealerships: DealershipData[]) => {
    saveToStorage('logiload_dealerships', dealerships);
  },

  // Demand Forecasts (AI predictive intelligence)
  getDemandForecasts: (dealershipId?: string): DemandForecast[] => {
    const defaultForecasts: DemandForecast[] = [
      {
        id: 'forecast-1',
        dealershipId: 'dealer-1',
        itemName: 'Auto Parts Box',
        historicalAvg: 80,
        predictedDemand: 110,
        confidenceScore: 92,
        reasoning: 'Upcoming automotive plant scaling production in nearby industrial zone.',
        recommendedOrderQty: 30
      },
      {
        id: 'forecast-2',
        dealershipId: 'dealer-1',
        itemName: 'Steel Coils',
        historicalAvg: 12,
        predictedDemand: 10,
        confidenceScore: 85,
        reasoning: 'Seasonal slowdown in heavy metal fabrication projects.',
        recommendedOrderQty: 0
      },
      {
        id: 'forecast-3',
        dealershipId: 'dealer-2',
        itemName: 'Auto Parts Box',
        historicalAvg: 90,
        predictedDemand: 135,
        confidenceScore: 95,
        reasoning: 'Festive season stocking starting early in Pune dealership hub.',
        recommendedOrderQty: 45
      },
      {
        id: 'forecast-4',
        dealershipId: 'dealer-2',
        itemName: 'Laptop Box',
        historicalAvg: 20,
        predictedDemand: 35,
        confidenceScore: 88,
        reasoning: 'Back-to-college sales drive at Hinjawadi IT corporate complexes.',
        recommendedOrderQty: 15
      },
      {
        id: 'forecast-5',
        dealershipId: 'dealer-3',
        itemName: 'Electronics Crate',
        historicalAvg: 30,
        predictedDemand: 50,
        confidenceScore: 90,
        reasoning: 'Increased corporate orders from newly opened tech offices in Bangalore.',
        recommendedOrderQty: 20
      }
    ];

    if (dealershipId) {
      return defaultForecasts.filter(f => f.dealershipId === dealershipId);
    }
    return defaultForecasts;
  },

  // Get tracking milestones for a shipment
  getTrackingMilestones: (deliveryId: string): TrackingMilestone[] => {
    const delivery = MOCK_DELIVERIES.find(d => d.id === deliveryId);
    if (!delivery) return [];

    const milestones: TrackingMilestone[] = [];
    const createdDate = new Date(delivery.createdAt);
    
    // Milestone 1: Order Registered
    milestones.push({
      title: 'Order Registered',
      time: createdDate.toLocaleString(),
      status: 'completed',
      description: `Shipment order registered for ${delivery.customerName}.`,
      location: delivery.pickupLocation
    });

    if (delivery.status === 'pending') {
      milestones.push({
        title: 'Pending Dispatch',
        time: '--',
        status: 'current',
        description: 'Awaiting admin approval and driver assignment.'
      });
      return milestones;
    }

    // Milestone 2: Driver Assigned / Approved
    const approvedTime = new Date(createdDate.getTime() + 15 * 60 * 1000); // 15 mins later
    milestones[0].status = 'completed';
    milestones.push({
      title: 'Approved & Assigned',
      time: approvedTime.toLocaleString(),
      status: delivery.status === 'approved' ? 'current' : 'completed',
      description: 'Shipment request approved and assigned to a delivery vehicle.',
      location: delivery.pickupLocation
    });

    if (delivery.status === 'approved') {
      milestones.push({
        title: 'Vehicle Dispatched',
        time: '--',
        status: 'upcoming',
        description: 'Driver is heading to the pickup location.'
      });
      return milestones;
    }

    // Milestone 3: Picked Up / Loaded
    const pickupTime = new Date(approvedTime.getTime() + 45 * 60 * 1000); // 45 mins later
    milestones[1].status = 'completed';
    milestones.push({
      title: 'Cargo Loaded',
      time: pickupTime.toLocaleString(),
      status: ['in-progress', 'on-the-way', 'loaded', 'picked-up'].includes(delivery.status) ? 'current' : (delivery.status === 'completed' || delivery.status === 'delivered' ? 'completed' : 'upcoming'),
      description: 'Cargo verified, volume packed, and vehicle loaded.',
      location: delivery.pickupLocation,
      temperature: 22.4,
      humidity: 55
    });

    if (['in-progress', 'on-the-way', 'loaded', 'picked-up'].includes(delivery.status)) {
      milestones.push({
        title: 'In Transit',
        time: 'Active',
        status: 'current',
        description: 'Vehicle is currently on route to destination stop.',
        location: 'En-Route (India Highways)',
        temperature: 24.2,
        humidity: 50
      });
      milestones.push({
        title: 'Out for Delivery',
        time: 'Estimated soon',
        status: 'upcoming',
        description: `Delivering to ${delivery.dropLocation}`
      });
      return milestones;
    }

    // Milestone 4: Delivered
    if (delivery.status === 'completed' || delivery.status === 'delivered') {
      const deliveredTime = new Date(pickupTime.getTime() + 3.5 * 60 * 60 * 1000); // 3.5 hours later
      milestones[2].status = 'completed';
      milestones.push({
        title: 'In Transit',
        time: deliveredTime.toLocaleString(),
        status: 'completed',
        description: 'Cargo successfully transported.',
        location: 'National Highway Network'
      });
      milestones.push({
        title: 'Delivered',
        time: deliveredTime.toLocaleString(),
        status: 'completed',
        description: 'Shipment delivered and handed over to dealer / customer.',
        location: delivery.dropLocation
      });
    }

    return milestones;
  }
};