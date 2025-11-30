export const MOCK_INDIA_CITIES = [
  "Mumbai, Maharashtra",
  "Delhi, Delhi",
  "Bangalore, Karnataka",
  "Hyderabad, Telangana",
  "Chennai, Tamil Nadu",
  "Kolkata, West Bengal",
  "Pune, Maharashtra",
  "Ahmedabad, Gujarat",
  "Jaipur, Rajasthan",
  "Lucknow, Uttar Pradesh"
];

// Default Truck: Tata LPT 1613 inspired dimensions (approx internal)
export const DEFAULT_TRUCK = {
  id: 'default-truck-1',
  name: 'Tata LPT 1613 Container',
  dimensions: {
    length: 600, // cm
    width: 240,  // cm
    height: 240  // cm
  },
  maxWeight: 16000 // kg
};

// Additional truck options commonly used in India
export const TRUCK_OPTIONS = [
  DEFAULT_TRUCK,
  {
    id: 'tata-1109',
    name: 'Tata 1109 Cabin Chassis',
    dimensions: {
      length: 450, // cm
      width: 220,  // cm
      height: 220  // cm
    },
    maxWeight: 11000 // kg
  },
  {
    id: 'eicher-12ft',
    name: 'Eicher 12 Ft Single Axle',
    dimensions: {
      length: 360, // cm
      width: 180,  // cm
      height: 180  // cm
    },
    maxWeight: 7500 // kg
  },
  {
    id: 'bharatbenz-1623r',
    name: 'BharatBenz 1623R Tipper',
    dimensions: {
      length: 550, // cm
      width: 230,  // cm
      height: 150  // cm
    },
    maxWeight: 16000 // kg
  },
  {
    id: 'ashok-1616',
    name: 'Ashok Leyland 1616 HD',
    dimensions: {
      length: 650, // cm
      width: 240,  // cm
      height: 240  // cm
    },
    maxWeight: 16000 // kg
  },
  {
    id: 'mahindra-blazo',
    name: 'Mahindra Blazo 25 HP Tipper',
    dimensions: {
      length: 480, // cm
      width: 210,  // cm
      height: 160  // cm
    },
    maxWeight: 25000 // kg
  },
  {
    id: 'tata-407',
    name: 'Tata 407 Gold SFC',
    dimensions: {
      length: 320, // cm
      width: 170,  // cm
      height: 170  // cm
    },
    maxWeight: 4000 // kg
  },
  {
    id: 'eicher-pro-2049',
    name: 'Eicher Pro 2049',
    dimensions: {
      length: 580, // cm
      width: 230,  // cm
      height: 230  // cm
    },
    maxWeight: 20000 // kg
  },
  {
    id: 'ashok-leyland-dost',
    name: 'Ashok Leyland Dost+',
    dimensions: {
      length: 280, // cm
      width: 160,  // cm
      height: 160  // cm
    },
    maxWeight: 1900 // kg
  },
  {
    id: 'mahindra-furio',
    name: 'Mahindra Furio 17',
    dimensions: {
      length: 520, // cm
      width: 220,  // cm
      height: 220  // cm
    },
    maxWeight: 17000 // kg
  },
  {
    id: 'tata-signa-4825',
    name: 'Tata Signa 4825.TK',
    dimensions: {
      length: 700, // cm
      width: 250,  // cm
      height: 250  // cm
    },
    maxWeight: 48000 // kg
  }
];

export const ITEM_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
];