import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Truck,
  MapPin,
  User,
  MessageSquare,
  LogOut,
  CheckCircle,
  XCircle,
  Send,
  Clock,
  Navigation,
  AlertTriangle,
  Flag,
  Play,
  Check,
  Phone,
  Shield,
  Radio,
  ArrowRight
} from 'lucide-react';
import { AuthService, DeliveryData, MessageData } from '../services/auth';
import { TRUCK_OPTIONS } from '../constants';
import { wsTelemetryService } from '../services/websocket';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const DriverDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'map' | 'messages'>('deliveries');
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [issueType, setIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [activeStep, setActiveStep] = useState<string>('');
  
  // Real-time Smartphone GPS Telemetry State
  const [isGpsStreaming, setIsGpsStreaming] = useState(false);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number; accuracy: number; speed: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  const navigate = useNavigate();

  // Get driver info from localStorage
  const driverId = localStorage.getItem('driverId') || 'driver-1';
  const driverName = localStorage.getItem('driverName') || 'Raj Kumar';

  // Listen for WebSocket connection status
  useEffect(() => {
    const unsub = wsTelemetryService.subscribeStatus(setWsConnected);
    return unsub;
  }, []);

  // HTML5 Live Smartphone GPS Transmitter via WebSockets
  useEffect(() => {
    let watchId: number | null = null;
    if (isGpsStreaming && 'geolocation' in navigator) {
      wsTelemetryService.connect();
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, speed, heading } = position.coords;
          const currentSpeedKmh = speed !== null && speed > 0 ? Math.round(speed * 3.6) : 0;
          setLiveCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy), speed: currentSpeedKmh });
          setGpsError(null);
          
          // Transmit zero-latency telemetry packet over WebSocket
          wsTelemetryService.sendGpsPing({
            driver_id: driverId,
            driver_name: driverName,
            vehicle_id: 'tata-1109',
            lat: latitude,
            lng: longitude,
            accuracy: accuracy || 10.0,
            speed: currentSpeedKmh,
            heading: heading || 0.0
          });
        },
        (err) => {
          console.warn('Phone GPS error:', err.message);
          setGpsError(err.message);
        },
        { enableHighAccuracy: true, maximumAge: 1500, timeout: 8000 }
      );
    }
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isGpsStreaming, driverId, driverName]);

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

  const loadData = () => {
    const allDeliveries = AuthService.getDeliveries();
    const driverDeliveries = allDeliveries.filter(d => d.assignedDriverId === driverId);
    setDeliveries(driverDeliveries);
  };

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('driverId');
    localStorage.removeItem('driverName');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('logiload_jwt_token');
    navigate('/login');
  };

  const handleStatusChange = (deliveryId: string, status: DeliveryData['status']) => {
    const updatedDelivery = AuthService.updateDelivery(deliveryId, { status });
    if (updatedDelivery) {
      setDeliveries(deliveries.map(d => d.id === deliveryId ? updatedDelivery : d));
      if (selectedDelivery && selectedDelivery.id === deliveryId) {
        setSelectedDelivery(updatedDelivery);
      }
    }
  };

  const openMessageModal = (deliveryId: string) => {
    const deliveryMessages = AuthService.getMessagesByDelivery(deliveryId);
    setMessages(deliveryMessages);
    setSelectedDelivery(deliveries.find(d => d.id === deliveryId) || null);
    setShowMessageModal(true);
  };

  const sendMessage = () => {
    if (selectedDelivery && newMessage.trim()) {
      const message = AuthService.sendMessage({
        deliveryId: selectedDelivery.id,
        senderId: driverId,
        senderRole: 'driver',
        content: newMessage
      });
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const openIssueModal = (deliveryId: string) => {
    setSelectedDelivery(deliveries.find(d => d.id === deliveryId) || null);
    setShowIssueModal(true);
  };

  const reportIssue = () => {
    if (selectedDelivery && issueType) {
      const issueMessage = `ISSUE REPORTED: ${issueType}${issueDescription ? ` - ${issueDescription}` : ''}`;
      AuthService.sendMessage({
        deliveryId: selectedDelivery.id,
        senderId: driverId,
        senderRole: 'driver',
        content: issueMessage
      });
      setShowIssueModal(false);
      setIssueType('');
      setIssueDescription('');
      alert('Issue reported to dispatch!');
    }
  };

  const getStatusBadge = (status: DeliveryData['status']) => {
    switch (status) {
      case 'assigned':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-900/40 text-purple-300 border border-purple-800">Assigned</span>;
      case 'on-the-way-to-pickup':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-300 border border-blue-800">En Route to Pickup</span>;
      case 'reached-pickup':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-300 border border-amber-800">At Pickup</span>;
      case 'picked-up':
      case 'loaded':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-900/40 text-orange-300 border border-orange-800">Cargo Loaded</span>;
      case 'on-the-way':
      case 'in-progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-800 animate-pulse">On Transit Route</span>;
      case 'delivered':
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  const getDriverTruck = () => {
    const driver = AuthService.getDriverById(driverId);
    return driver?.truckId ? TRUCK_OPTIONS.find(t => t.id === driver.truckId) : null;
  };

  const truck = getDriverTruck();
  const activeTrips = deliveries.filter(d => !['completed', 'cancelled'].includes(d.status));
  const completedTrips = deliveries.filter(d => ['completed', 'delivered'].includes(d.status));

  return (
    <div className="w-full space-y-6 text-slate-900 dark:text-slate-100 pb-12">
      {/* Top Header */}
      <header className="border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600/10 dark:bg-brand-600/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Driver Mobile Console
                  <span className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                    On Duty
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Welcome, {driverName || 'Commercial Operator'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {truck && (
                <div className="hidden sm:block text-right bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-sm">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{truck.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{truck.maxWeight} kg Max Payload</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-2 border-t border-slate-200 dark:border-slate-800/80 mt-3 pt-2">
            {[
              { id: 'deliveries', label: `My Deliveries (${deliveries.length})`, icon: Package },
              { id: 'map', label: 'Live GPS Route', icon: MapPin },
              { id: 'messages', label: 'Dispatch Comms', icon: MessageSquare }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-lg transition ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto space-y-6">

        {/* Live Smartphone GPS Transmitter Banner */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isGpsStreaming 
            ? 'bg-gradient-to-r from-emerald-500/10 via-white to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border-emerald-500/40 shadow-sm' 
            : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                isGpsStreaming 
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 animate-pulse' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Smartphone Real-Time GPS Tracking</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isGpsStreaming
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {isGpsStreaming ? 'LIVE TRANSMITTING' : 'STANDBY'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isGpsStreaming && liveCoords 
                    ? `GPS: ${liveCoords.lat.toFixed(4)}, ${liveCoords.lng.toFixed(4)} | Speed: ${liveCoords.speed} km/h (±${liveCoords.accuracy}m)`
                    : 'Stream real-time truck location directly from your phone browser to the Command Center without external OBD dongles.'}
                </p>
                {gpsError && (
                  <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">⚠️ {gpsError}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsGpsStreaming(!isGpsStreaming)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
                isGpsStreaming
                  ? 'bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 hover:scale-[1.02]'
              }`}
            >
              <Radio className={`w-4 h-4 ${isGpsStreaming ? 'animate-spin' : ''}`} />
              {isGpsStreaming ? 'Pause GPS Stream' : 'Start Trip & Stream Phone GPS'}
            </button>
          </div>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
            <p className="text-xl font-bold text-white">{activeTrips.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active Loads</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
            <p className="text-xl font-bold text-emerald-400">{completedTrips.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Delivered</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
            <p className="text-xl font-bold text-brand-400">
              {deliveries.length > 0 ? Math.round((completedTrips.length / deliveries.length) * 100) : 100}%
            </p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Completion</p>
          </div>
        </div>

        {/* TAB 1: DELIVERIES */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">Assigned Freight Manifests</h2>

            {deliveries.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <h3 className="text-sm font-semibold text-slate-300">No shipments currently assigned</h3>
                <p className="text-xs text-slate-500 mt-1">Stand by for new trip dispatches from the operations center.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map(delivery => (
                  <div
                    key={delivery.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm space-y-4 transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">{delivery.customerName}</h3>
                          <span className="text-xs text-slate-500 font-mono">Trip #{delivery.id.slice(-6)}</span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-brand-400" />
                          <span className="font-mono">{delivery.customerPhone}</span>
                        </p>
                      </div>
                      <div>{getStatusBadge(delivery.status)}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-lg">
                      <div>
                        <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Pickup Location</p>
                        <p className="font-medium text-slate-200 mt-0.5">{delivery.pickupLocation}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Destination</p>
                        <p className="font-medium text-slate-200 mt-0.5">{delivery.dropLocation}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Cargo Payload</p>
                        <p className="font-medium text-white mt-0.5">
                          {delivery.packageWeight} kg ({delivery.packageDimensions.length}×{delivery.packageDimensions.width}×{delivery.packageDimensions.height} cm)
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Scheduled Window</p>
                        <p className="font-medium text-slate-200 mt-0.5">
                          {new Date(delivery.scheduledTime).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Step-by-Step Milestone Action Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <div className="flex flex-wrap gap-2">
                        {delivery.status === 'assigned' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'on-the-way-to-pickup')}
                            className="text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Play className="h-3.5 w-3.5" /> Start Trip to Pickup
                          </button>
                        )}
                        {delivery.status === 'on-the-way-to-pickup' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'reached-pickup')}
                            className="text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            Arrived at Pickup Facility
                          </button>
                        )}
                        {delivery.status === 'reached-pickup' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'picked-up')}
                            className="text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            Verify Cargo Picked Up
                          </button>
                        )}
                        {delivery.status === 'picked-up' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'loaded')}
                            className="text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            Confirm Loaded in Truck
                          </button>
                        )}
                        {delivery.status === 'loaded' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'on-the-way')}
                            className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            Depart on Highway Corridor
                          </button>
                        )}
                        {delivery.status === 'on-the-way' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'delivered')}
                            className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            Delivered at Consignee
                          </button>
                        )}
                        {delivery.status === 'delivered' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'completed')}
                            className="text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-400" /> Close Job
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openMessageModal(delivery.id)}
                          className="text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-brand-400" />
                          <span>Chat</span>
                        </button>
                        <button
                          onClick={() => openIssueModal(delivery.id)}
                          className="text-xs font-medium text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Report Issue</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE MAP */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">Live Tracking & Route Corridors</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-[450px] shadow-sm relative z-0">
              <MapContainer
                {...({
                  center: [19.0760, 72.8777],
                  zoom: 13,
                  style: { height: '100%', width: '100%' }
                } as any)}
              >
                <TileLayer
                  {...({
                    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  } as any)}
                />
                <Marker position={[19.0760, 72.8777]}>
                  <Popup>
                    <div className="p-1 font-sans">
                      <p className="font-bold text-slate-900">Your Vehicle Position</p>
                      <p className="text-xs text-slate-600">Mumbai Operations Sector</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}

        {/* TAB 3: MESSAGES */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">Dispatcher Messaging Stream</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deliveries.map(delivery => {
                const deliveryMessages = AuthService.getMessagesByDelivery(delivery.id);
                return (
                  <div key={delivery.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div className="border-b border-slate-800 pb-2">
                      <h4 className="font-bold text-sm text-white">{delivery.customerName}</h4>
                      <p className="text-xs text-slate-400">{delivery.pickupLocation} → {delivery.dropLocation}</p>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {deliveryMessages.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No chat history for this delivery.</p>
                      ) : (
                        deliveryMessages.map(msg => (
                          <div
                            key={msg.id}
                            className={`p-2.5 rounded-lg text-xs ${
                              msg.senderRole === 'driver'
                                ? 'bg-brand-600 text-white ml-6 shadow-sm'
                                : 'bg-slate-950 text-slate-300 border border-slate-800 mr-6'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p className={`text-[10px] mt-1 text-right ${msg.senderRole === 'driver' ? 'text-brand-200' : 'text-slate-500'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => openMessageModal(delivery.id)}
                      className="w-full text-xs font-semibold bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 border border-brand-500/30 py-2 rounded-lg transition"
                    >
                      Open Chat Thread
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* DISPATCH MESSAGE MODAL */}
      {showMessageModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full h-[540px] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-white">{selectedDelivery.customerName}</h3>
                <p className="text-[11px] text-slate-400">Dispatcher Communications</p>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderRole === 'driver' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-xl p-3 text-xs ${
                      message.senderRole === 'driver'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-sm'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`text-[10px] mt-1 text-right ${
                      message.senderRole === 'driver' ? 'text-brand-200' : 'text-slate-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 border-t border-slate-800 bg-slate-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type message to dispatcher..."
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

      {/* REPORT ISSUE MODAL */}
      {showIssueModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  Report Trip Exception
                </h3>
                <p className="text-xs text-slate-400">Alert dispatch regarding road incidents or delays.</p>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                >
                  <option value="">Select an exception type</option>
                  <option value="TRAFFIC_GRIDLOCK">Severe Highway Traffic / Roadblock</option>
                  <option value="MECHANICAL_FAILURE">Vehicle Breakdown / Tire Puncture</option>
                  <option value="WEATHER_HAZARD">Monsoon Waterlogging / Flooding</option>
                  <option value="CARGO_DAMAGE">Damaged Cargo Box Detected</option>
                  <option value="CONSIGNEE_UNAVAILABLE">Customer Facility Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Incident Notes</label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Provide details for operations team..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={reportIssue}
                  disabled={!issueType}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                >
                  Transmit Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};