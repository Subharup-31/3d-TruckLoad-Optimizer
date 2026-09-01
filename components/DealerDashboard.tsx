import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  MapPin,
  Calendar,
  Thermometer,
  Droplets,
  MessageSquare,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  Sparkles,
  LogOut,
  Send,
  Building,
  RefreshCw,
  Search,
  Bell,
  User,
  Truck
} from 'lucide-react';
import {
  AuthService,
  DeliveryData,
  DealershipData,
  DemandForecast,
  TrackingMilestone,
  MessageData
} from '../services/auth';
import { ApiClient } from '../services/apiClient';

export const DealerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dealership, setDealership] = useState<DealershipData | null>(null);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [milestones, setMilestones] = useState<TrackingMilestone[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'shipments' | 'forecast' | 'bookings'>('shipments');
  
  // Booking creation form state
  const [bookingForm, setBookingForm] = useState({
    pickupLocation: 'Main Distribution Center, Mumbai',
    dropLocation: '',
    scheduledTime: '',
    itemName: 'Auto Parts Box',
    quantity: 10,
    weight: 200,
    length: 60,
    width: 60,
    height: 45
  });
  
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const loadForecastsFromBackend = async (dealerId: string) => {
    try {
      const items = ['Auto Parts Box', 'Steel Coils', 'Laptop Box', 'Electronics Crate'];
      const results = await Promise.all(
        items.map(it => ApiClient.forecastDemand(dealerId, it, 7).catch(() => null))
      );
      
      const realForecasts: DemandForecast[] = results
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r, idx) => ({
          id: `lstm-forecast-${idx + 1}`,
          dealershipId: r.dealership_id,
          itemName: r.item_name,
          historicalAvg: Math.round(r.historical_avg_daily * 30),
          predictedDemand: Math.round(r.total_forecast_qty * (30 / r.horizon_days)),
          confidenceScore: Math.round(r.confidence_score),
          reasoning: `${r.reasoning} (Model: ${r.model_name})`,
          recommendedOrderQty: Math.max(0, Math.round(r.total_forecast_qty * 0.4))
        }));

      if (realForecasts.length > 0) {
        setForecasts(realForecasts);
        return;
      }
    } catch (e) {
      console.warn('Backend LSTM call failed, using fallback forecasts:', e);
    }
    const f = AuthService.getDemandForecasts(dealerId);
    setForecasts(f);
  };

  useEffect(() => {
    // Load dealer data
    const dealershipsList = AuthService.getDealerships();
    const currentDealer = dealershipsList[0];
    setDealership(currentDealer);

    if (currentDealer) {
      loadForecastsFromBackend(currentDealer.id);

      // Load deliveries destined for this dealer's city or matching drop location
      const allDeliveries = AuthService.getDeliveries();
      const dealerDeliveries = allDeliveries.filter(
        d => d.dropLocation.toLowerCase().includes(currentDealer.city.split(',')[0].toLowerCase()) ||
             d.dropLocation.toLowerCase().includes('mumbai')
      );
      setDeliveries(dealerDeliveries);
      if (dealerDeliveries.length > 0) {
        setSelectedDelivery(dealerDeliveries[0]);
        setMilestones(AuthService.getTrackingMilestones(dealerDeliveries[0].id));
        setMessages(AuthService.getMessagesByDelivery(dealerDeliveries[0].id));
      }
      
      setBookingForm(prev => ({
        ...prev,
        dropLocation: currentDealer.location
      }));
    }
  }, []);

  // Poll for messages and updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedDelivery) {
        setMessages(AuthService.getMessagesByDelivery(selectedDelivery.id));
        setMilestones(AuthService.getTrackingMilestones(selectedDelivery.id));
      }
      
      // Sync deliveries list
      if (dealership) {
        const allDeliveries = AuthService.getDeliveries();
        const dealerDeliveries = allDeliveries.filter(
          d => d.dropLocation.toLowerCase().includes(dealership.city.split(',')[0].toLowerCase()) ||
               d.dropLocation.toLowerCase().includes('mumbai')
        );
        setDeliveries(dealerDeliveries);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedDelivery, dealership]);

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('driverId');
    localStorage.removeItem('driverName');
    localStorage.removeItem('logiload_jwt_token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const handleSelectDelivery = (delivery: DeliveryData) => {
    setSelectedDelivery(delivery);
    setMilestones(AuthService.getTrackingMilestones(delivery.id));
    setMessages(AuthService.getMessagesByDelivery(delivery.id));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery || !newMessageText.trim()) return;

    const newMsg = AuthService.sendMessage({
      deliveryId: selectedDelivery.id,
      senderId: 'dealer-1',
      senderRole: 'dealer',
      content: newMessageText.trim()
    });

    setMessages([...messages, newMsg]);
    setNewMessageText('');
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create an item list for this booking request
    const items = Array.from({ length: bookingForm.quantity }).map((_, i) => ({
      id: `bi-${Date.now()}-${i}`,
      name: bookingForm.itemName,
      dimensions: {
        length: Number(bookingForm.length),
        width: Number(bookingForm.width),
        height: Number(bookingForm.height)
      },
      weight: Number(bookingForm.weight),
      color: '#4f46e5',
      isFragile: false,
      isStackable: true
    }));

    AuthService.createBooking({
      customerName: dealership?.name || 'Dealership Customer',
      customerPhone: dealership?.phone || '+91 99999 99999',
      pickupLocation: bookingForm.pickupLocation,
      dropLocation: bookingForm.dropLocation,
      scheduledTime: bookingForm.scheduledTime || new Date(Date.now() + 24*60*60*1000).toISOString().slice(0, 16),
      items
    });

    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setActiveSubTab('shipments');
    }, 2000);

    // Reset form fields
    setBookingForm(prev => ({
      ...prev,
      quantity: 10,
      scheduledTime: ''
    }));
  };

  const triggerOrderFromForecast = (forecast: DemandForecast) => {
    setBookingForm({
      pickupLocation: 'Main Distribution Center, Mumbai',
      dropLocation: dealership?.location || '',
      scheduledTime: new Date(Date.now() + 48*60*60*1000).toISOString().slice(0, 16),
      itemName: forecast.itemName,
      quantity: forecast.recommendedOrderQty || 15,
      weight: forecast.itemName === 'Steel Coils' ? 1200 : 250,
      length: forecast.itemName === 'Steel Coils' ? 120 : 60,
      width: forecast.itemName === 'Steel Coils' ? 80 : 60,
      height: forecast.itemName === 'Steel Coils' ? 80 : 45
    });
    setActiveSubTab('bookings');
  };

  return (
    <div className="w-full space-y-6 text-slate-900 dark:text-slate-100">
      {/* Top Operations Header */}
      <header className="border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/10 dark:bg-purple-600/20 border border-purple-500/20 dark:border-purple-500/30 p-2.5 rounded-xl text-purple-600 dark:text-purple-400 shadow-inner">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {dealership?.name || 'Dealership Hub'}
                </h1>
                <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium px-2 py-0.5 rounded-md">
                  Authorized Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                Inbound Telematics Connected • ID: {dealership?.id || 'DL-MUM-01'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setActiveSubTab('bookings')}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-purple-600/20 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Restock Order</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800/60 overflow-x-auto">
          <nav className="flex space-x-1 pt-1">
            {[
              { id: 'shipments', label: `Inbound Shipments (${deliveries.length})`, icon: Clock },
              { id: 'inventory', label: 'Local Stock Levels', icon: Package },
              { id: 'forecast', label: 'AI Demand Forecast (LSTM)', icon: TrendingUp },
              { id: 'bookings', label: 'Order Restock Transport', icon: Plus }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/5'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto space-y-6">
        
        {/* SUBTAB: Inbound Shipments */}
        {activeSubTab === 'shipments' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Shipments List */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col h-[600px]">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Inbound Dealership Shipments</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Live dispatches en route to your local hub.</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {deliveries.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <Package className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold">No active shipments</p>
                    <p className="text-xs mt-1">Submit a restock booking to initiate transport.</p>
                  </div>
                ) : (
                  deliveries.map(delivery => (
                    <div
                      key={delivery.id}
                      onClick={() => handleSelectDelivery(delivery)}
                      className={`p-4 rounded-xl border cursor-pointer transition shadow-sm ${
                        selectedDelivery?.id === delivery.id
                          ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-500'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:border-purple-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-bold">{delivery.id.toUpperCase()}</p>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{delivery.customerName}</h4>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          delivery.status === 'completed' || delivery.status === 'delivered'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : ['in-progress', 'on-the-way', 'loaded'].includes(delivery.status)
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {delivery.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">From: {delivery.pickupLocation}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                        <span className="truncate">To: {delivery.dropLocation}</span>
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        <span>Payload: {delivery.packageWeight} kg</span>
                        <span className="font-medium">Scheduled: {new Date(delivery.scheduledTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tracking Details & Live Telemetry */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[600px]">
              {selectedDelivery ? (
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Live Telemetry Timeline</p>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{selectedDelivery.id.toUpperCase()}</h3>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                      Telemetry Stream Active
                    </span>
                  </div>

                  {/* Milestones Flow */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-[10px] ${
                            m.status === 'completed'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                              : m.status === 'current'
                              ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 animate-pulse'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                          }`}>
                            {m.status === 'completed' ? '✓' : i + 1}
                          </div>
                          {i < milestones.length - 1 && (
                            <div className={`w-0.5 flex-1 my-1 ${m.status === 'completed' ? 'bg-emerald-500/50' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                          )}
                        </div>
                        
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 p-3 rounded-xl">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs">{m.title}</h4>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{m.time}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">{m.description}</p>
                          
                          {m.location && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {m.location}
                            </p>
                          )}

                          {m.status === 'current' && m.temperature && (
                            <div className="mt-2.5 flex gap-4 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                                <span>Cabin Temp: <strong className="text-slate-900 dark:text-white">{m.temperature}°C</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                                <span>Humidity: <strong className="text-slate-900 dark:text-white">{m.humidity}%</strong></span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat with Dispatch */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Live Dispatch Communications
                    </h4>
                    
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 h-28 overflow-y-auto space-y-2 text-xs border border-slate-200 dark:border-slate-800">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.senderRole === 'dealer' ? 'items-end' : 'items-start'}`}>
                          <span className="text-slate-400 text-[9px] font-semibold mb-0.5">
                            {msg.senderRole === 'dealer' ? 'You (Dealer)' : 'Dispatch'}
                          </span>
                          <div className={`p-2 rounded-lg max-w-[85%] ${
                            msg.senderRole === 'dealer'
                              ? 'bg-purple-600 text-white rounded-tr-none'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        placeholder="Message central dispatch..."
                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 shadow-sm"
                      />
                      <button
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <Clock className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold">Select a shipment to track</p>
                  <p className="text-xs mt-1">Select an inbound trip on the left to inspect real-time milestones and chat with dispatch.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* SUBTAB: Dealership Stock Levels */}
        {activeSubTab === 'inventory' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dealership Warehouse Stock Levels</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time status of cargo inventory housed at your local dealership facility.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {dealership?.currentStock.map((stock, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{stock.item}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{stock.qty}</span>
                    <span className="text-xs text-slate-500 font-medium">units</span>
                  </div>
                  <div className="mt-4 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (stock.qty / 150) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    <span>Capacity: {stock.qty} / 150</span>
                    <span>{Math.round((stock.qty / 150) * 100)}% Utilized</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-purple-900 dark:text-purple-300 text-xs">AI Smart Suggestion</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Predictive LSTM models forecast high automotive spare part demands over the next 14 days. Use the <strong className="text-purple-600 dark:text-purple-400 cursor-pointer underline" onClick={() => setActiveSubTab('forecast')}>Demand Forecast</strong> tab to trigger 1-click replenishment dispatches.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: Predictive Intelligence */}
        {activeSubTab === 'forecast' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  AI Predictive Demand Forecasting (PyTorch LSTM)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Trained on 4.5M retail orders to project local regional inventory needs.</p>
              </div>
              <button 
                onClick={() => dealership && loadForecastsFromBackend(dealership.id)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Forecasts
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {forecasts.map(forecast => (
                <div key={forecast.id} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-purple-300 dark:hover:border-purple-500/40 transition shadow-sm">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{forecast.itemName}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        forecast.confidenceScore >= 90
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}>
                        {forecast.confidenceScore}% AI Confidence
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{forecast.reasoning}</p>
                  </div>

                  <div className="flex gap-6 items-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700/60 pt-3 md:pt-0 md:pl-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Historical Avg</span>
                      <span className="text-lg font-bold text-slate-600 dark:text-slate-400 block">{forecast.historicalAvg} u/mo</span>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold tracking-wider block flex items-center gap-1 justify-center">
                        <TrendingUp className="w-3 h-3 text-purple-500" /> Projected
                      </span>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400 block">{forecast.predictedDemand} u/mo</span>
                    </div>

                    <div>
                      {forecast.recommendedOrderQty > 0 ? (
                        <button
                          onClick={() => triggerOrderFromForecast(forecast)}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-md shadow-purple-600/20 flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Order +{forecast.recommendedOrderQty}
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 block text-center whitespace-nowrap">
                          Stock Optimal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB: Order Shipment */}
        {activeSubTab === 'bookings' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Order Shipment Restock</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Submit freight dispatch requests directly to the central logistics planning team.</p>
            </div>

            {bookingSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle className="w-5 h-5" />
                <span>Booking request submitted successfully! Central dispatch will review and assign a truck.</span>
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Origin */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Pickup Location</label>
                <input
                  type="text"
                  value={bookingForm.pickupLocation}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Drop Location (Dealership)</label>
                <input
                  type="text"
                  value={bookingForm.dropLocation}
                  onChange={(e) => setBookingForm({ ...bookingForm, dropLocation: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 outline-none shadow-sm"
                />
              </div>

              {/* Cargo Item type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cargo Item Type</label>
                <select
                  value={bookingForm.itemName}
                  onChange={(e) => {
                    const val = e.target.value;
                    let dimensions = { weight: 200, length: 60, width: 60, height: 45 };
                    if (val === 'Steel Coils') {
                      dimensions = { weight: 1200, length: 120, width: 80, height: 80 };
                    } else if (val === 'Electronics Crate') {
                      dimensions = { weight: 120, length: 60, width: 50, height: 40 };
                    }
                    setBookingForm({ ...bookingForm, itemName: val, ...dimensions });
                  }}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 outline-none shadow-sm"
                >
                  <option value="Auto Parts Box">Auto Parts Box</option>
                  <option value="Steel Coils">Steel Coils</option>
                  <option value="Electronics Crate">Electronics Crate</option>
                </select>
              </div>

              {/* Order quantity */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Quantity (Units)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bookingForm.quantity}
                  onChange={(e) => setBookingForm({ ...bookingForm, quantity: Math.max(1, Number(e.target.value)) })}
                  required
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 outline-none shadow-sm"
                />
              </div>

              {/* Scheduled Dispatch Date */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Preferred Arrival Date & Time</label>
                <input
                  type="datetime-local"
                  value={bookingForm.scheduledTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, scheduledTime: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 outline-none shadow-sm"
                />
              </div>

              <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  * 3D container packing and weight distribution will be automatically calculated upon dispatch approval.
                </p>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition shadow-md shadow-purple-600/20"
                >
                  Submit Restock Booking
                </button>
              </div>

            </form>
          </div>
        )}

      </main>
    </div>
  );
};
