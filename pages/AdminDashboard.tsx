import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  Truck,
  MapPin,
  User,
  MessageSquare,
  LogOut,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  Clock,
  Navigation,
  FileSpreadsheet,
  Eye,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  ShieldCheck,
  Radio,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  Phone,
  Box,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AuthService, DeliveryData, DriverData, MessageData, BookingRequest } from '../services/auth';
import { TRUCK_OPTIONS } from '../constants';
import { DealerDashboard } from '../components/DealerDashboard';
import { wsTelemetryService } from '../services/websocket';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const AdminDashboard: React.FC = () => {
  const userRole = localStorage.getItem('userRole');

  if (userRole === 'dealer') {
    return <DealerDashboard />;
  }

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'deliveries' | 'drivers' | 'bookings' | 'map' | 'messages'>('overview');
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBookingItemsModal, setShowBookingItemsModal] = useState(false);
  const [selectedDriverIds, setSelectedDriverIds] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Filters and Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Driver management state
  const [showAddDriverForm, setShowAddDriverForm] = useState(false);
  const [showEditDriverForm, setShowEditDriverForm] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverData | null>(null);
  const [driverFormData, setDriverFormData] = useState({
    username: '',
    password: '',
    name: '',
    phone: '',
    licenseNumber: '',
    truckId: ''
  });

  // Form state for creating/editing deliveries
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    pickupLocation: '',
    dropLocation: '',
    packageWeight: 0,
    packageLength: 0,
    packageWidth: 0,
    packageHeight: 0,
    packageNotes: '',
    scheduledTime: ''
  });

  const [liveTelemetry, setLiveTelemetry] = useState<Array<{
    driver_id: string;
    driver_name: string;
    vehicle_id: string;
    lat: number;
    lng: number;
    accuracy: number;
    speed: number;
    heading: number;
    source: string;
    timestamp: number;
    status: string;
  }>>([]);

  // Load data on component mount and set up polling
  useEffect(() => {
    loadData();

    // Poll for new messages every 3 seconds when message modal is open
    const interval = setInterval(() => {
      if (showMessageModal && selectedDelivery) {
        const deliveryMessages = AuthService.getMessagesByDelivery(selectedDelivery.id);
        setMessages(deliveryMessages);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [showMessageModal, selectedDelivery]);

  // Subscribe to real-time WebSocket telemetry with HTTP polling fallback
  useEffect(() => {
    // 1. WebSocket zero-latency subscription
    const unsubWs = wsTelemetryService.subscribe((telemetryList) => {
      if (telemetryList && telemetryList.length > 0) {
        setLiveTelemetry(telemetryList);
      }
    });

    // 2. HTTP polling backup every 5 seconds
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/telemetry/live');
        if (res.ok) {
          const data = await res.json();
          if (data && data.telemetry) {
            setLiveTelemetry(data.telemetry);
          }
        }
      } catch (err) {
        // Silent catch
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => {
      unsubWs();
      clearInterval(interval);
    };
  }, []);

  const loadData = () => {
    setDeliveries(AuthService.getDeliveries());
    setDrivers(AuthService.getDrivers());
    setBookings(AuthService.getBookings());
  };

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('driverId');
    localStorage.removeItem('driverName');
    localStorage.removeItem('logiload_jwt_token');
    navigate('/login');
  };

  const handleCreateDelivery = () => {
    const newDelivery = AuthService.createDelivery({
      customerId: `customer-${Date.now()}`,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      pickupLocation: formData.pickupLocation,
      dropLocation: formData.dropLocation,
      packageWeight: formData.packageWeight,
      packageDimensions: {
        length: formData.packageLength,
        width: formData.packageWidth,
        height: formData.packageHeight
      },
      packageNotes: formData.packageNotes,
      scheduledTime: formData.scheduledTime
    });

    setDeliveries([...deliveries, newDelivery]);
    setShowCreateForm(false);
    resetForm();
  };

  const handleUpdateDelivery = () => {
    if (!selectedDelivery) return;

    const updatedDelivery = AuthService.updateDelivery(selectedDelivery.id, {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      pickupLocation: formData.pickupLocation,
      dropLocation: formData.dropLocation,
      packageWeight: formData.packageWeight,
      packageDimensions: {
        length: formData.packageLength,
        width: formData.packageWidth,
        height: formData.packageHeight
      },
      packageNotes: formData.packageNotes,
      scheduledTime: formData.scheduledTime
    });

    if (updatedDelivery) {
      setDeliveries(deliveries.map(d => d.id === selectedDelivery.id ? updatedDelivery : d));
    }

    setShowEditForm(false);
    resetForm();
  };

  const handleDeleteDelivery = (id: string) => {
    if (window.confirm('Are you sure you want to delete this delivery?')) {
      AuthService.deleteDelivery(id);
      setDeliveries(deliveries.filter(d => d.id !== id));
    }
  };

  const handleAssignDriver = (deliveryId: string, driverId: string) => {
    if (driverId) {
      const updatedDelivery = AuthService.assignDriver(deliveryId, driverId);
      if (updatedDelivery) {
        setDeliveries(deliveries.map(d => d.id === deliveryId ? updatedDelivery : d));
        setSelectedDriverIds(prev => ({ ...prev, [deliveryId]: '' }));
      }
    }
  };

  const handleDriverSelectChange = (deliveryId: string, driverId: string) => {
    setSelectedDriverIds(prev => ({ ...prev, [deliveryId]: driverId }));
  };

  const getSelectedDriverId = (deliveryId: string) => {
    return selectedDriverIds[deliveryId] || '';
  };

  const handleStatusChange = (deliveryId: string, status: DeliveryData['status']) => {
    const updatedDelivery = AuthService.updateDelivery(deliveryId, { status });
    if (updatedDelivery) {
      setDeliveries(deliveries.map(d => d.id === deliveryId ? updatedDelivery : d));
    }
  };

  const handleApproveBooking = (booking: BookingRequest) => {
    const totalWeight = booking.items && booking.items.length > 0
      ? booking.items.reduce((sum: number, item: any) => sum + (item.weight || 0), 0)
      : 150;

    const firstItemDims = booking.items && booking.items.length > 0 && booking.items[0].dimensions
      ? booking.items[0].dimensions
      : { length: 60, width: 60, height: 45 };

    const newDelivery = AuthService.createDelivery({
      customerId: `customer-${Date.now()}`,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
      packageWeight: totalWeight,
      packageDimensions: firstItemDims,
      packageNotes: `Dealer order: ${booking.items?.length || 0} items of type ${booking.items?.[0]?.name || 'cargo'}.`,
      scheduledTime: booking.scheduledTime
    });

    setDeliveries([...deliveries, newDelivery]);

    const updatedBooking = AuthService.updateBookingStatus(booking.id, 'approved');
    if (updatedBooking) {
      setBookings(bookings.map(b => b.id === booking.id ? updatedBooking : b));
    }
  };

  const handleRejectBooking = (id: string) => {
    if (window.confirm('Are you sure you want to reject this booking?')) {
      const updatedBooking = AuthService.updateBookingStatus(id, 'rejected');
      if (updatedBooking) {
        setBookings(bookings.map(b => b.id === id ? updatedBooking : b));
      }
    }
  };

  const openEditForm = (delivery: DeliveryData) => {
    setSelectedDelivery(delivery);
    setFormData({
      customerName: delivery.customerName,
      customerPhone: delivery.customerPhone,
      pickupLocation: delivery.pickupLocation,
      dropLocation: delivery.dropLocation,
      packageWeight: delivery.packageWeight,
      packageLength: delivery.packageDimensions.length,
      packageWidth: delivery.packageDimensions.width,
      packageHeight: delivery.packageDimensions.height,
      packageNotes: delivery.packageNotes,
      scheduledTime: delivery.scheduledTime
    });
    setShowEditForm(true);
  };

  const openMessageModal = (deliveryId: string) => {
    const deliveryMessages = AuthService.getMessagesByDelivery(deliveryId);
    setMessages(deliveryMessages);
    setSelectedDelivery(deliveries.find(d => d.id === deliveryId) || null);
    setShowMessageModal(true);
  };

  const openBookingItemsModal = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setShowBookingItemsModal(true);
  };

  const sendMessage = () => {
    if (selectedDelivery && newMessage.trim()) {
      const message = AuthService.sendMessage({
        deliveryId: selectedDelivery.id,
        senderId: 'admin',
        senderRole: 'admin',
        content: newMessage
      });
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      pickupLocation: '',
      dropLocation: '',
      packageWeight: 0,
      packageLength: 0,
      packageWidth: 0,
      packageHeight: 0,
      packageNotes: '',
      scheduledTime: ''
    });
    setSelectedDelivery(null);
  };

  const resetDriverForm = () => {
    setDriverFormData({
      username: '',
      password: '',
      name: '',
      phone: '',
      licenseNumber: '',
      truckId: ''
    });
    setSelectedDriver(null);
  };

  const handleAddDriver = () => {
    AuthService.addDriver({
      username: driverFormData.username,
      password: driverFormData.password,
      name: driverFormData.name,
      phone: driverFormData.phone,
      licenseNumber: driverFormData.licenseNumber,
      truckId: driverFormData.truckId || undefined
    });

    setDrivers(AuthService.getDrivers());
    setShowAddDriverForm(false);
    resetDriverForm();
  };

  const handleUpdateDriver = () => {
    if (!selectedDriver) return;

    AuthService.updateDriver(selectedDriver.id, {
      name: driverFormData.name,
      phone: driverFormData.phone,
      licenseNumber: driverFormData.licenseNumber,
      truckId: driverFormData.truckId || undefined
    });

    setDrivers(AuthService.getDrivers());
    setShowEditDriverForm(false);
    resetDriverForm();
  };

  const handleDeleteDriver = (id: string) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      AuthService.deleteDriver(id);
      setDrivers(drivers.filter(d => d.id !== id));
    }
  };

  const openAddDriverForm = () => {
    resetDriverForm();
    setShowAddDriverForm(true);
  };

  const openEditDriverForm = (driver: DriverData) => {
    setSelectedDriver(driver);
    setDriverFormData({
      username: driver.username,
      password: '',
      name: driver.name,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      truckId: driver.truckId || ''
    });
    setShowEditDriverForm(true);
  };

  const getStatusBadge = (status: DeliveryData['status']) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Pending</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Approved</span>;
      case 'assigned':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Assigned</span>;
      case 'in-progress':
      case 'on-the-way':
      case 'on-the-way-to-pickup':
      case 'picked-up':
      case 'loaded':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-pulse">In Transit</span>;
      case 'completed':
      case 'delivered':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">Completed</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  // Filtered Deliveries calculation
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(delivery => {
      const matchesSearch =
        delivery.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        delivery.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        delivery.dropLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        delivery.customerPhone.includes(searchQuery);

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') return delivery.status === 'pending';
      if (statusFilter === 'in-progress') return ['in-progress', 'on-the-way', 'picked-up', 'assigned'].includes(delivery.status);
      if (statusFilter === 'completed') return ['completed', 'delivered'].includes(delivery.status);
      if (statusFilter === 'cancelled') return delivery.status === 'cancelled';
      return true;
    });
  }, [deliveries, searchQuery, statusFilter]);

  // Executive Operational Metrics
  const activeCount = deliveries.filter(d => ['in-progress', 'on-the-way', 'picked-up', 'assigned'].includes(d.status)).length;
  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const completedCount = deliveries.filter(d => ['completed', 'delivered'].includes(d.status)).length;
  const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
  const assignedDriversCount = drivers.filter(d => deliveries.some(del => del.assignedDriverId === d.id && !['completed', 'cancelled'].includes(del.status))).length;
  const fleetUtilizationRate = drivers.length > 0 ? Math.round((assignedDriversCount / drivers.length) * 100) : 0;
  const unassignedDeliveries = deliveries.filter(d => !d.assignedDriverId && !['completed', 'cancelled'].includes(d.status));

  return (
    <div className="w-full space-y-6 text-slate-900 dark:text-slate-100">
      {/* Top Operations Header */}
      <header className="border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-600/10 dark:bg-brand-600/20 border border-brand-500/20 dark:border-brand-500/30 p-2.5 rounded-xl text-brand-600 dark:text-brand-400 shadow-inner">
                <Radio className="h-6 w-6 animate-pulse text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    Fleet Operations Center
                  </h1>
                  <span className="text-xs bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 font-medium px-2 py-0.5 rounded-md">
                    {userRole === 'manager' ? 'Operations Manager' : 'Enterprise Admin'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                  Real-Time Dispatch Engine Active • {deliveries.length} Total Shipments Tracked
                </p>
              </div>
            </div>

            {/* Quick Actions & Header Controls */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateForm(true);
                }}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-brand-600/20 transition"
              >
                <Plus className="h-4 w-4" />
                <span>New Dispatch</span>
              </button>

              <button
                onClick={openAddDriverForm}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-lg text-sm font-medium transition"
              >
                <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span>Add Driver</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1 border-t border-slate-200 dark:border-slate-800/60 overflow-x-auto pt-1">
            {[
              { id: 'overview', label: 'Executive Overview', icon: Activity },
              { id: 'deliveries', label: `Deliveries (${deliveries.length})`, icon: Package },
              { id: 'drivers', label: `Fleet & Drivers (${drivers.length})`, icon: Truck },
              { id: 'bookings', label: `Customer Bookings (${pendingBookingsCount} pending)`, icon: FileSpreadsheet, badge: pendingBookingsCount },
              { id: 'map', label: 'Live Operations Map', icon: MapPin },
              { id: 'messages', label: 'Dispatch Comms', icon: MessageSquare }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/5'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto space-y-6">

        {/* Level 1: Executive KPI Summary Strip (Always Visible or High-Level) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Active Dispatches</span>
              <Activity className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{activeCount}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{pendingCount} pending</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${deliveries.length > 0 ? (activeCount / deliveries.length) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Fleet Allocation</span>
              <Truck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{fleetUtilizationRate}%</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{assignedDriversCount}/{drivers.length} Drivers Active</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-brand-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${fleetUtilizationRate}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Pending Bookings</span>
              <FileSpreadsheet className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{pendingBookingsCount}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Require Approval</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pendingBookingsCount > 0 ? 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Completed Loads</span>
              <CheckCircle className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{completedCount}</span>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                {deliveries.length > 0 ? Math.round((completedCount / deliveries.length) * 100) : 100}% On-Time
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${deliveries.length > 0 ? (completedCount / deliveries.length) * 100 : 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Level 2 & 3: Needs Attention Alert Banner */}
        {unassignedDeliveries.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-200">
                  {unassignedDeliveries.length} Approved Dispatch{unassignedDeliveries.length > 1 ? 'es' : ''} Awaiting Driver Assignment
                </h4>
                <p className="text-xs text-amber-300/80">
                  Assign available commercial drivers to commence loading and avoid departure delays.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setStatusFilter('all');
                setActiveTab('deliveries');
              }}
              className="text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-lg transition whitespace-nowrap shadow-sm"
            >
              Assign Drivers
            </button>
          </div>
        )}

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Live Activity & Recent Deliveries */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Activity className="h-4 w-4 text-brand-400" />
                      Active Operations Feed
                    </h3>
                    <button
                      onClick={() => setActiveTab('deliveries')}
                      className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
                    >
                      View All Deliveries <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {deliveries.slice(0, 5).map(delivery => {
                      const driver = drivers.find(d => d.id === delivery.assignedDriverId);
                      return (
                        <div
                          key={delivery.id}
                          className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-white">{delivery.customerName}</span>
                              <span className="text-xs text-slate-500 font-mono">({delivery.id.slice(-6)})</span>
                              {getStatusBadge(delivery.status)}
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-slate-500" />
                              <span>{delivery.pickupLocation}</span>
                              <span className="text-slate-600">→</span>
                              <span className="text-slate-300">{delivery.dropLocation}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                            <div className="text-right">
                              <span className="block font-medium text-slate-300">{delivery.packageWeight} kg</span>
                              <span className="text-[11px] text-slate-500">{driver ? driver.name : 'Unassigned'}</span>
                            </div>
                            <button
                              onClick={() => openMessageModal(delivery.id)}
                              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="Chat with Driver"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Multi-Modal Optimizers Portal */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                  <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-400" />
                    Integrated Optimization Suites
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Link
                      to="/optimizer"
                      className="bg-slate-950/70 border border-slate-800 hover:border-brand-500/50 p-4 rounded-xl transition group flex flex-col justify-between"
                    >
                      <div>
                        <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg w-fit mb-2">
                          <Truck className="h-5 w-5" />
                        </div>
                        <h4 className="font-semibold text-sm text-white group-hover:text-brand-400 transition">3D Truck Load</h4>
                        <p className="text-xs text-slate-400 mt-1">Volumetric packing with Center of Gravity balancing.</p>
                      </div>
                      <span className="text-xs text-brand-400 font-medium flex items-center gap-1 mt-3">
                        Launch 3D <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </Link>

                    <Link
                      to="/air-optimizer"
                      className="bg-slate-950/70 border border-slate-800 hover:border-brand-500/50 p-4 rounded-xl transition group flex flex-col justify-between"
                    >
                      <div>
                        <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg w-fit mb-2">
                          <Box className="h-5 w-5" />
                        </div>
                        <h4 className="font-semibold text-sm text-white group-hover:text-brand-400 transition">Air Cargo ULD</h4>
                        <p className="text-xs text-slate-400 mt-1">Boeing 777-F and Airbus A330 unit load containerization.</p>
                      </div>
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-3">
                        Launch Air <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </Link>

                    <Link
                      to="/route"
                      className="bg-slate-950/70 border border-slate-800 hover:border-brand-500/50 p-4 rounded-xl transition group flex flex-col justify-between"
                    >
                      <div>
                        <div className="bg-purple-500/10 text-purple-400 p-2 rounded-lg w-fit mb-2">
                          <Navigation className="h-5 w-5" />
                        </div>
                        <h4 className="font-semibold text-sm text-white group-hover:text-brand-400 transition">GNN Route Planner</h4>
                        <p className="text-xs text-slate-400 mt-1">Reinforcement learning dynamic sequence solver.</p>
                      </div>
                      <span className="text-xs text-purple-400 font-medium flex items-center gap-1 mt-3">
                        Plan Routes <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Column: Fleet Status & Quick Bookings */}
              <div className="space-y-6">
                {/* Fleet Drivers Quick Status */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Truck className="h-4 w-4 text-brand-400" />
                      Fleet Roster
                    </h3>
                    <button
                      onClick={() => setActiveTab('drivers')}
                      className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
                    >
                      Manage ({drivers.length})
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {drivers.slice(0, 4).map(driver => {
                      const truck = TRUCK_OPTIONS.find(t => t.id === driver.truckId);
                      const isAssigned = deliveries.some(d => d.assignedDriverId === driver.id && !['completed', 'cancelled'].includes(d.status));
                      return (
                        <div key={driver.id} className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">
                              {driver.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{driver.name}</p>
                              <p className="text-[11px] text-slate-400">{truck ? truck.name : 'No truck assigned'}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isAssigned
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {isAssigned ? 'On Trip' : 'Available'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pending Customer Quote Requests */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-amber-400" />
                      Pending Requests
                    </h3>
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      View ({pendingBookingsCount})
                    </button>
                  </div>

                  {pendingBookingsCount === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">No pending quote requests.</p>
                  ) : (
                    <div className="space-y-2">
                      {bookings.filter(b => b.status === 'pending').slice(0, 3).map(b => (
                        <div key={b.id} className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white">{b.customerName}</p>
                            <p className="text-[11px] text-slate-400">{b.pickupLocation.split(',')[0]} → {b.dropLocation.split(',')[0]}</p>
                          </div>
                          <button
                            onClick={() => handleApproveBooking(b)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-1 rounded transition shadow-sm"
                          >
                            Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DELIVERIES HUB */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, pickup, or destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1 pl-1">
                  <Filter className="h-3.5 w-3.5" /> Filter:
                </span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'in-progress', label: 'In Transit' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'cancelled', label: 'Cancelled' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      statusFilter === f.id
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deliveries Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-950/80">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Customer & Order ID
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Route Corridor
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Payload Dims
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Assigned Driver
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                    {filteredDeliveries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-medium text-slate-400">No matching deliveries found</p>
                          <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search query or status filter.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDeliveries.map((delivery) => {
                        const driver = drivers.find(d => d.id === delivery.assignedDriverId);
                        const truck = driver?.truckId ? TRUCK_OPTIONS.find(t => t.id === driver.truckId) : null;

                        return (
                          <tr key={delivery.id} className="hover:bg-slate-800/40 transition">
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="font-semibold text-sm text-white">{delivery.customerName}</div>
                              <div className="text-xs text-slate-400 font-mono">{delivery.customerPhone}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{delivery.id}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-xs font-medium text-slate-200">{delivery.pickupLocation}</div>
                              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <span className="text-slate-500">→</span> {delivery.dropLocation}
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="text-xs font-bold text-white">{delivery.packageWeight} kg</div>
                              <div className="text-[11px] text-slate-400">
                                {delivery.packageDimensions.length} × {delivery.packageDimensions.width} × {delivery.packageDimensions.height} cm
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              {getStatusBadge(delivery.status)}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              {driver ? (
                                <div>
                                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <User className="h-3 w-3 text-brand-400" />
                                    {driver.name}
                                  </div>
                                  {truck && (
                                    <div className="text-[11px] text-slate-400">{truck.name}</div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={getSelectedDriverId(delivery.id)}
                                    onChange={(e) => handleDriverSelectChange(delivery.id, e.target.value)}
                                    className="text-xs bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-brand-500"
                                  >
                                    <option value="">Select Driver</option>
                                    {drivers.map(d => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleAssignDriver(delivery.id, getSelectedDriverId(delivery.id))}
                                    disabled={!getSelectedDriverId(delivery.id)}
                                    className="text-xs bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white px-2 py-1 rounded font-medium transition"
                                  >
                                    Assign
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                              <div className="flex items-center justify-end gap-1.5">
                                {delivery.status === 'pending' && (
                                  <button
                                    onClick={() => handleStatusChange(delivery.id, 'approved')}
                                    className="px-2 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded border border-emerald-500/30 transition font-medium"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => openMessageModal(delivery.id)}
                                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
                                  title="Dispatch Chat"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => openEditForm(delivery)}
                                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
                                  title="Edit Delivery"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDelivery(delivery.id)}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 rounded transition"
                                  title="Delete Delivery"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FLEET & DRIVERS */}
        {activeTab === 'drivers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Commercial Drivers & Fleet Roster</h3>
                <p className="text-xs text-slate-400">Manage verified CDL drivers and vehicle assignments.</p>
              </div>
              <button
                onClick={openAddDriverForm}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-brand-600/20 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Driver</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map((driver) => {
                const truck = TRUCK_OPTIONS.find(t => t.id === driver.truckId);
                const stats = AuthService.getDriverStats(driver.id);
                const activeTrips = deliveries.filter(d => d.assignedDriverId === driver.id && !['completed', 'cancelled'].includes(d.status));

                return (
                  <div key={driver.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center font-bold text-brand-400">
                            {driver.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">{driver.name}</h4>
                            <p className="text-xs text-slate-400 font-mono">@{driver.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditDriverForm(driver)}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                            title="Edit Driver"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(driver.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40 transition"
                            title="Delete Driver"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-1.5 text-xs text-slate-300 mb-4">
                        <p className="flex justify-between">
                          <span className="text-slate-500">Phone:</span>
                          <span className="font-mono">{driver.phone}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-500">License:</span>
                          <span className="font-mono">{driver.licenseNumber}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-500">Assigned Truck:</span>
                          <span className="font-medium text-brand-400">{truck ? truck.name : 'Unassigned'}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-500">Active Deliveries:</span>
                          <span className="font-semibold text-emerald-400">{activeTrips.length} Load(s)</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 text-center">
                      <div>
                        <p className="text-base font-bold text-white">{stats.totalJobs}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Jobs</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-emerald-400">{stats.completedJobs}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Done</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-brand-400">{stats.completionRate}%</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Rate</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: BOOKINGS REQUESTS */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Dealer & Customer Booking Requests</h3>
                <p className="text-xs text-slate-400">Review incoming freight reservation requests and approve into active dispatches.</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-950/80">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Customer Info
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Pickup & Drop Location
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Scheduled Window
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Cargo Items
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Decision
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                          <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-medium text-slate-400">No booking requests submitted yet</p>
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="font-semibold text-sm text-white">{booking.customerName}</div>
                            <div className="text-xs text-slate-400 font-mono">{booking.customerPhone}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-medium text-slate-200">{booking.pickupLocation}</div>
                            <div className="text-xs text-slate-400">→ {booking.dropLocation}</div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300">
                            {new Date(booking.scheduledTime).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <button
                              onClick={() => openBookingItemsModal(booking)}
                              className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-md transition font-medium"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{booking.items.length} Items</span>
                            </button>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              booking.status === 'approved'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                                : booking.status === 'rejected'
                                  ? 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                                  : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                            }`}>
                              {booking.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                            {booking.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveBooking(booking)}
                                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md font-semibold transition shadow-sm"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleRejectBooking(booking.id)}
                                  className="flex items-center gap-1 bg-slate-800 hover:bg-rose-900/60 text-rose-300 px-3 py-1.5 rounded-md font-medium border border-slate-700 transition"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LIVE OPERATIONS MAP */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
                  Live Regional Dispatch & Smartphone GPS Telemetry
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time GPS coordinates streamed directly from driver phones and fleet sensors.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  {liveTelemetry.length} Active Phone GPS Beacons
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map Display */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-[520px] shadow-sm relative z-0 transition-colors">
                <MapContainer
                  {...({
                    center: liveTelemetry.length > 0 ? [liveTelemetry[0].lat, liveTelemetry[0].lng] : [19.0760, 72.8777],
                    zoom: 11,
                    style: { height: '100%', width: '100%' }
                  } as any)}
                >
                  <TileLayer
                    {...({
                      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    } as any)}
                  />

                  {/* Live Smartphone GPS Telemetry Markers */}
                  {liveTelemetry.map((tel) => (
                    <Marker
                      key={`telemetry-${tel.driver_id}`}
                      position={[tel.lat, tel.lng]}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px] font-sans">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mb-1">
                            <Radio className="w-3.5 h-3.5" />
                            <span>LIVE SMARTPHONE GPS</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900">{tel.driver_name}</h4>
                          <p className="text-xs text-slate-500 font-mono">Vehicle: {tel.vehicle_id}</p>
                          <div className="mt-2 pt-2 border-t border-slate-200 text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Live Speed:</span>
                              <span className="font-bold text-blue-600">{tel.speed || 0} km/h</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">GPS Accuracy:</span>
                              <span className="font-semibold text-slate-700">±{Math.round(tel.accuracy || 10)}m</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Source:</span>
                              <span>{tel.source}</span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Scheduled Deliveries */}
                  {deliveries.filter(d => ['in-progress', 'on-the-way', 'picked-up', 'assigned'].includes(d.status)).map((delivery, idx) => (
                    <Marker
                      key={delivery.id}
                      position={[19.0760 + (idx * 0.02), 72.8777 + (idx * 0.02)]}
                    >
                      <Popup>
                        <div className="p-1">
                          <h4 className="font-bold text-slate-900">{delivery.customerName}</h4>
                          <p className="text-xs text-slate-600">{delivery.pickupLocation} → {delivery.dropLocation}</p>
                          <p className="text-xs font-semibold text-brand-600 mt-1">Status: {delivery.status}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Active Vehicles Side Inspector */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto h-[520px] space-y-3 transition-colors">
                {/* Live GPS Telemetry Broadcast Section */}
                {liveTelemetry.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Active Phone Transmitters ({liveTelemetry.length})
                    </h4>
                    {liveTelemetry.map((tel) => (
                      <div key={tel.driver_id} className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-xs text-slate-900 dark:text-white">{tel.driver_name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">ID: {tel.driver_id}</p>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white">
                            {tel.speed > 0 ? `${tel.speed} km/h` : 'Idling'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 flex justify-between">
                          <span>Lat: {tel.lat.toFixed(4)}</span>
                          <span>Lng: {tel.lng.toFixed(4)}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 italic truncate">
                          {tel.source} · Accuracy ±{Math.round(tel.accuracy)}m
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Active Dispatches ({deliveries.filter(d => ['in-progress', 'on-the-way', 'picked-up', 'assigned'].includes(d.status)).length})
                </h4>

                {deliveries.filter(d => ['in-progress', 'on-the-way', 'picked-up', 'assigned'].includes(d.status)).map(del => {
                  const driver = drivers.find(d => d.id === del.assignedDriverId);
                  return (
                    <div key={del.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{del.customerName}</p>
                          <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">{driver ? driver.name : 'Unassigned'}</p>
                        </div>
                        {getStatusBadge(del.status)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {del.pickupLocation} <span className="text-slate-400 dark:text-slate-600">→</span> {del.dropLocation}
                      </p>
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2">
                        <span>Payload: {del.packageWeight} kg</span>
                        <button
                          onClick={() => openMessageModal(del.id)}
                          className="text-brand-600 dark:text-brand-400 hover:text-brand-500 font-semibold"
                        >
                          Message Driver →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DISPATCH COMMUNICATIONS */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Dispatcher Communications Log</h3>
                <p className="text-xs text-slate-400">Live operational messaging stream with fleet drivers and customers.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveries.map(delivery => {
                const deliveryMessages = AuthService.getMessagesByDelivery(delivery.id);
                if (deliveryMessages.length === 0) return null;
                const driver = drivers.find(d => d.id === delivery.assignedDriverId);

                return (
                  <div key={delivery.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-start border-b border-slate-800 pb-2 mb-3">
                        <div>
                          <h4 className="font-bold text-sm text-white">{delivery.customerName}</h4>
                          <p className="text-xs text-slate-400">{driver ? `Driver: ${driver.name}` : 'No driver assigned'}</p>
                        </div>
                        <button
                          onClick={() => openMessageModal(delivery.id)}
                          className="text-xs bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 px-2.5 py-1 rounded-md border border-brand-500/20 font-medium transition"
                        >
                          Open Chat
                        </button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {deliveryMessages.slice(-3).map(msg => (
                          <div
                            key={msg.id}
                            className={`p-2.5 rounded-lg text-xs ${
                              msg.senderRole === 'admin'
                                ? 'bg-brand-600/10 text-brand-200 border border-brand-500/20 ml-4'
                                : 'bg-slate-950 text-slate-300 border border-slate-800 mr-4'
                            }`}
                          >
                            <div className="flex justify-between font-semibold text-[10px] text-slate-400 mb-1">
                              <span>{msg.senderRole === 'admin' ? 'Dispatcher' : 'Driver'}</span>
                              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p>{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* CREATE DELIVERY MODAL */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Create New Freight Dispatch</h3>
                <p className="text-xs text-slate-400">Enter customer details, route corridor, and cargo dimensions.</p>
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateDelivery();
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer / Consignee Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    placeholder="e.g. Acme Industrial Hub"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Contact Phone</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pickup Facility / Location</label>
                  <input
                    type="text"
                    value={formData.pickupLocation}
                    onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    placeholder="Bhiwandi Logistics Park, Mumbai"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Facility / City</label>
                  <input
                    type="text"
                    value={formData.dropLocation}
                    onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    placeholder="Chakan MIDC, Pune"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Payload Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.packageWeight || ''}
                    onChange={(e) => setFormData({ ...formData, packageWeight: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    placeholder="2500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Departure Time</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Dimensions (Length × Width × Height in cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="Length (cm)"
                    value={formData.packageLength || ''}
                    onChange={(e) => setFormData({ ...formData, packageLength: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Width (cm)"
                    value={formData.packageWidth || ''}
                    onChange={(e) => setFormData({ ...formData, packageWidth: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Height (cm)"
                    value={formData.packageHeight || ''}
                    onChange={(e) => setFormData({ ...formData, packageHeight: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Special Handling Instructions / Notes</label>
                <textarea
                  value={formData.packageNotes}
                  onChange={(e) => setFormData({ ...formData, packageNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  rows={2}
                  placeholder="e.g. Fragile auto parts, do not double-stack without pallet base."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-600/20 transition"
                >
                  Create Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DELIVERY MODAL */}
      {showEditForm && selectedDelivery && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Delivery Order</h3>
                <p className="text-xs text-slate-400">Modify dispatch parameters for {selectedDelivery.id}.</p>
              </div>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateDelivery();
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pickup Location</label>
                  <input
                    type="text"
                    value={formData.pickupLocation}
                    onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Drop Location</label>
                  <input
                    type="text"
                    value={formData.dropLocation}
                    onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.packageWeight || ''}
                    onChange={(e) => setFormData({ ...formData, packageWeight: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Time</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dimensions (L × W × H in cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={formData.packageLength || ''}
                    onChange={(e) => setFormData({ ...formData, packageLength: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                  <input
                    type="number"
                    value={formData.packageWidth || ''}
                    onChange={(e) => setFormData({ ...formData, packageWidth: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                  <input
                    type="number"
                    value={formData.packageHeight || ''}
                    onChange={(e) => setFormData({ ...formData, packageHeight: Number(e.target.value) })}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <textarea
                  value={formData.packageNotes}
                  onChange={(e) => setFormData({ ...formData, packageNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-600/20 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH MESSAGE CHAT MODAL */}
      {showMessageModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full h-[580px] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-xs">
                  {selectedDelivery.customerName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedDelivery.customerName}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Trip #{selectedDelivery.id.slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 py-12 text-xs">
                  <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-30" />
                  No message history yet. Send a direct operational update below.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-xl p-3 text-xs leading-relaxed ${
                        message.senderRole === 'admin'
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-sm'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${
                        message.senderRole === 'admin' ? 'text-brand-200' : 'text-slate-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 border-t border-slate-800 bg-slate-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type an operational update..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-lg transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT DRIVER MODAL */}
      {(showAddDriverForm || showEditDriverForm) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {showAddDriverForm ? 'Register Commercial Driver' : 'Update Driver Profile'}
                </h3>
                <p className="text-xs text-slate-400">Set up credentials and assign default fleet vehicle.</p>
              </div>
              <button
                onClick={() => {
                  setShowAddDriverForm(false);
                  setShowEditDriverForm(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              showAddDriverForm ? handleAddDriver() : handleUpdateDriver();
            }} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={driverFormData.name}
                  onChange={(e) => setDriverFormData({ ...driverFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Ramesh Patil"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={driverFormData.username}
                  onChange={(e) => setDriverFormData({ ...driverFormData, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="driver_ramesh"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password {showEditDriverForm && '(Leave blank to keep unchanged)'}
                </label>
                <input
                  type="password"
                  value={driverFormData.password}
                  onChange={(e) => setDriverFormData({ ...driverFormData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="••••••••"
                  required={showAddDriverForm}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={driverFormData.phone}
                  onChange={(e) => setDriverFormData({ ...driverFormData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="+91 98200 11223"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Commercial Driver License (CDL)</label>
                <input
                  type="text"
                  value={driverFormData.licenseNumber}
                  onChange={(e) => setDriverFormData({ ...driverFormData, licenseNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="MH-04-20210048291"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Commercial Truck</label>
                <select
                  value={driverFormData.truckId}
                  onChange={(e) => setDriverFormData({ ...driverFormData, truckId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select a truck model</option>
                  {TRUCK_OPTIONS.map(truck => (
                    <option key={truck.id} value={truck.id}>
                      {truck.name} ({truck.maxWeight} kg payload)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDriverForm(false);
                    setShowEditDriverForm(false);
                  }}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-600/20 transition"
                >
                  {showAddDriverForm ? 'Register Driver' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOKING ITEMS MODAL */}
      {showBookingItemsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
              <div>
                <h3 className="text-base font-bold text-white">Cargo Manifest Inspection</h3>
                <p className="text-xs text-slate-400">
                  Quote request from {selectedBooking.customerName} ({selectedBooking.items.length} unit items)
                </p>
              </div>
              <button
                onClick={() => setShowBookingItemsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-950">
                    <tr>
                      {selectedBooking.items.length > 0 && Object.keys(selectedBooking.items[0]).map((key) => (
                        <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900">
                    {selectedBooking.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        {Object.values(item).map((value: any, i) => (
                          <td key={i} className="px-4 py-3 text-xs text-slate-300 font-mono">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
              <button
                onClick={() => setShowBookingItemsModal(false)}
                className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition"
              >
                Close
              </button>
              {selectedBooking.status === 'pending' && (
                <button
                  onClick={() => {
                    handleApproveBooking(selectedBooking);
                    setShowBookingItemsModal(false);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition shadow-sm"
                >
                  Approve and Create Dispatch
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};