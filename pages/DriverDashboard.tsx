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
  Flag
} from 'lucide-react';
import { AuthService, DeliveryData, MessageData } from '../services/auth';
import { TRUCK_OPTIONS } from '../constants';

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
  const navigate = useNavigate();

  // Get driver info from localStorage
  const driverId = localStorage.getItem('driverId') || '';
  const driverName = localStorage.getItem('driverName') || '';

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
    }
  };

  const getStatusColor = (status: DeliveryData['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'in-progress': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'on-the-way-to-pickup': return 'bg-blue-100 text-blue-800';
      case 'reached-pickup': return 'bg-yellow-100 text-yellow-800';
      case 'picked-up': return 'bg-orange-100 text-orange-800';
      case 'loaded': return 'bg-purple-100 text-purple-800';
      case 'on-the-way': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: DeliveryData['status']) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'assigned': return 'Assigned';
      case 'in-progress': return 'In Progress';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'on-the-way-to-pickup': return 'On the Way to Pickup';
      case 'reached-pickup': return 'Reached Pickup';
      case 'picked-up': return 'Picked Up';
      case 'loaded': return 'Loaded';
      case 'on-the-way': return 'On the Way';
      default: return status;
    }
  };

  const getDriverTruck = () => {
    const driver = AuthService.getDriverById(driverId);
    return driver?.truckId ? TRUCK_OPTIONS.find(t => t.id === driver.truckId) : null;
  };

  const truck = getDriverTruck();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">Driver Command Center</h1>
              <span className="ml-4 text-sm text-gray-600">Welcome, {driverName}</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('deliveries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'deliveries'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Package className="inline-block h-4 w-4 mr-2" />
              Active Manifest
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'map'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <MapPin className="inline-block h-4 w-4 mr-2" />
              Real-time Telemetry
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'messages'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <MessageSquare className="inline-block h-4 w-4 mr-2" />
              Dispatch Comms
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Active Manifest</h2>
              {truck && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">My Truck:</span> {truck.name}
                  </p>
                  <p className="text-xs text-blue-600">
                    Capacity: {truck.dimensions.length}×{truck.dimensions.width}×{truck.dimensions.height}cm
                  </p>
                </div>
              )}
            </div>

            {/* Deliveries Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Package
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scheduled Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{delivery.customerName}</div>
                          <div className="text-sm text-gray-500">{delivery.customerPhone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{delivery.pickupLocation}</div>
                          <div className="text-sm text-gray-500">to {delivery.dropLocation}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {delivery.packageWeight}kg
                          </div>
                          <div className="text-sm text-gray-500">
                            {delivery.packageDimensions.length}×{delivery.packageDimensions.width}×{delivery.packageDimensions.height}cm
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                            {getStatusText(delivery.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(delivery.scheduledTime).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-wrap gap-2">
                            {delivery.status === 'assigned' && (
                              <button
                                onClick={() => handleStatusChange(delivery.id, 'on-the-way-to-pickup')}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                              >
                                Start Job
                              </button>
                            )}

                            {delivery.status === 'on-the-way-to-pickup' && (
                              <button
                                onClick={() => handleStatusChange(delivery.id, 'reached-pickup')}
                                className="text-xs bg-yellow-600 text-white px-2 py-1 rounded"
                              >
                                Reached Pickup
                              </button>
                            )}

                            {delivery.status === 'reached-pickup' && (
                              <button
                                onClick={() => handleStatusChange(delivery.id, 'picked-up')}
                                className="text-xs bg-orange-600 text-white px-2 py-1 rounded"
                              >
                                Picked Up
                              </button>
                            )}

                            {delivery.status === 'picked-up' && (
                              <button
                                onClick={() => handleStatusChange(delivery.id, 'loaded')}
                                className="text-xs bg-purple-600 text-white px-2 py-1 rounded"
                              >
                                Loaded
                              </button>
                            )}

                            {delivery.status === 'loaded' && (
                              <button
                                onClick={() => handleStatusChange(delivery.id, 'on-the-way')}
                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded"
                              >
                                On the Way
                              </button>
                            )}

                            {delivery.status === 'on-the-way' && (
                              <button
                                onClick={() => handleStatusChange(delivery.id, 'delivered')}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                              >
                                Delivered
                              </button>
                            )}

                            {delivery.status === 'delivered' && (
                              <button
                                onClick={() => handleStatusChange(delivery.id, 'completed')}
                                className="text-xs bg-green-800 text-white px-2 py-1 rounded"
                              >
                                Complete Job
                              </button>
                            )}

                            <button
                              onClick={() => openMessageModal(delivery.id)}
                              className="text-xs bg-gray-600 text-white px-2 py-1 rounded"
                            >
                              Message
                            </button>

                            <button
                              onClick={() => openIssueModal(delivery.id)}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                            >
                              Report Issue
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {deliveries.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No deliveries assigned</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You don't have any deliveries assigned to you yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Map Tab */}
        {activeTab === 'map' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Real-time Telemetry</h2>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Live Location Tracking</h3>
                  <p className="text-gray-500">
                    Your live location would be shared with the admin and customers.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Requires browser location permissions.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Active Deliveries</h3>
                <div className="space-y-4">
                  {deliveries.filter(d => d.status !== 'completed' && d.status !== 'cancelled').map(delivery => (
                    <div key={delivery.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{delivery.customerName}</h4>
                          <p className="text-sm text-gray-500">{delivery.pickupLocation} → {delivery.dropLocation}</p>
                        </div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                          {getStatusText(delivery.status)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>Scheduled: {new Date(delivery.scheduledTime).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dispatch Comms</h2>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="space-y-4">
                {deliveries.map(delivery => {
                  const deliveryMessages = AuthService.getMessagesByDelivery(delivery.id);
                  if (deliveryMessages.length === 0) return null;

                  return (
                    <div key={delivery.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900">{delivery.customerName}</h3>
                      <p className="text-sm text-gray-500">{delivery.pickupLocation} → {delivery.dropLocation}</p>

                      <div className="mt-3 space-y-3">
                        {deliveryMessages.map(message => (
                          <div
                            key={message.id}
                            className={`p-3 rounded-lg ${message.senderRole === 'driver'
                                ? 'bg-blue-50 ml-8'
                                : 'bg-gray-50 mr-8'
                              }`}
                          >
                            <div className="flex justify-between text-xs">
                              <span className={`font-medium ${message.senderRole === 'driver' ? 'text-blue-700' : 'text-gray-700'
                                }`}>
                                {message.senderRole === 'driver' ? 'Me' : 'Admin'}
                              </span>
                              <span className="text-gray-500">
                                {new Date(message.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-800">{message.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {deliveries.every(d => AuthService.getMessagesByDelivery(d.id).length === 0) && (
                  <div className="text-center py-12">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You don't have any messages yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Message Modal */}
      {showMessageModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Messages - {selectedDelivery.customerName}
                </h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${message.senderRole === 'driver'
                            ? 'bg-blue-50 ml-8'
                            : 'bg-gray-50 mr-8'
                          }`}
                      >
                        <div className="flex justify-between text-xs">
                          <span className={`font-medium ${message.senderRole === 'driver' ? 'text-blue-700' : 'text-gray-700'
                            }`}>
                            {message.senderRole === 'driver' ? 'Me' : 'Admin'}
                          </span>
                          <span className="text-gray-500">
                            {new Date(message.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-800">{message.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No messages yet
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newMessage.trim()) {
                      sendMessage();
                    }
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Report Modal */}
      {showIssueModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Report Issue - {selectedDelivery.customerName}
                </h3>
                <button
                  onClick={() => setShowIssueModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Type
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="">Select an issue</option>
                    <option value="Vehicle breakdown">Vehicle breakdown</option>
                    <option value="Traffic delay">Traffic delay</option>
                    <option value="Wrong address">Wrong address</option>
                    <option value="Customer not available">Customer not available</option>
                    <option value="Package damaged">Package damaged</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    rows={3}
                    placeholder="Provide additional details about the issue..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={reportIssue}
                    disabled={!issueType}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Report Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};