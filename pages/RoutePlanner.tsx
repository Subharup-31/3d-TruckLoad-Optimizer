import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Plus, Search, AlertCircle, Locate, X } from 'lucide-react';
import { MOCK_INDIA_CITIES } from '../constants';
import { optimizeRoute, geocodeAddress } from '../services/routing';
import { RouteStop, RouteResult } from '../types';
import { RouteMap } from '../components/RouteMap';

export const RoutePlanner: React.FC = () => {
  const [stops, setStops] = useState<RouteStop[]>([
    { id: '1', address: 'Nariman Point', city: 'Mumbai, Maharashtra' },
    { id: '2', address: 'Shivaji Nagar', city: 'Pune, Maharashtra' }
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string>('');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number, address: string } | null>(null);

  useEffect(() => {
    const hasKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true';
    setApiKeyMissing(!hasKey || useMock);

    if (!hasKey) {
      console.warn('⚠️ Google Maps API key not configured. Add VITE_GOOGLE_MAPS_API_KEY to .env file.');
    }

    // Auto-optimize on load to show demo
    handleOptimize();

    // Auto-detect user location on mount
    detectUserLocation();
  }, []);

  const addStop = () => {
    // Allow unlimited stops
    setStops([...stops, { id: Date.now().toString(), address: '', city: MOCK_INDIA_CITIES[0] }]);
  };

  const deleteStop = (index: number) => {
    const newStops = [...stops];
    newStops.splice(index, 1);
    setStops(newStops);
  };

  const updateStop = (index: number, field: keyof RouteStop, value: string) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setStops(newStops);
  };

  const handleOptimize = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('🛣️ Starting route optimization for', stops.length, 'stops...');

      // Geocode addresses before optimization
      const stopsWithCoords = await Promise.all(stops.map(async (stop) => {
        // If already has coordinates, use them
        if (stop.lat && stop.lng) {
          return stop;
        }

        // Otherwise, try to geocode the address
        const fullAddress = `${stop.address}, ${stop.city}`;
        console.log('📍 Geocoding address:', fullAddress);

        const coords = await geocodeAddress(fullAddress);
        if (coords) {
          return {
            ...stop,
            lat: coords.lat,
            lng: coords.lng
          };
        }

        // If geocoding fails, return stop without coordinates
        return stop;
      }));

      const res = await optimizeRoute("Start", stopsWithCoords);
      console.log('✅ Route optimization result:', res);
      setResult(res);
      console.log('✅ Route optimization complete:', res);
    } catch (e: any) {
      console.error('❌ Route optimization failed:', e);
      setError(e.message || 'Failed to optimize route');
    } finally {
      setLoading(false);
    }
  };

  const detectUserLocation = async () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    setDetectingLocation(true);
    console.log('📍 Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('✅ Location detected:', latitude, longitude);

        // Reverse geocode to get address
        try {
          const address = await reverseGeocode(latitude, longitude);
          setUserLocation({ lat: latitude, lng: longitude, address });
          console.log('✅ Address:', address);
        } catch (err) {
          console.error('Geocoding failed:', err);
          setUserLocation({
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          });
        }
        setDetectingLocation(false);
      },
      (error) => {
        console.error('❌ Location detection failed:', error.message);
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true, // Use GPS for high accuracy
        timeout: 10000,
        maximumAge: 0 // Don't use cached position
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Use Nominatim (OpenStreetMap) for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await response.json();

      if (data.address) {
        // Build a readable address
        const parts = [];
        if (data.address.road) parts.push(data.address.road);
        if (data.address.suburb) parts.push(data.address.suburb);
        if (data.address.city) parts.push(data.address.city);
        if (data.address.state) parts.push(data.address.state);
        if (data.address.country) parts.push(data.address.country);

        return parts.join(', ') || data.display_name;
      }

      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const useMyLocation = () => {
    if (!userLocation) {
      detectUserLocation();
      return;
    }

    // Add user's location as the first stop
    const newStops = [
      {
        id: Date.now().toString(),
        address: userLocation.address,
        city: userLocation.address.split(',').slice(-2).join(',').trim() || 'Current Location',
        lat: userLocation.lat,
        lng: userLocation.lng
      },
      ...stops
    ];

    setStops(newStops);
    console.log('✅ Added your location as starting point');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <Navigation className="w-6 h-6 text-brand-600 dark:text-brand-400" /> Intelligent Route Planning
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Inputs */}
        <div className="lg:col-span-1 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-200 text-sm mb-1">Error</h3>
                  <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Delivery Stops</h2>
              {userLocation && (
                <button
                  onClick={useMyLocation}
                  className="flex items-center gap-2 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition border border-green-200"
                  title="Add your current location"
                >
                  <Locate className="w-4 h-4" />
                  Use My Location
                </button>
              )}
            </div>

            {detectingLocation && (
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <span className="text-sm text-blue-800 dark:text-blue-200">Detecting your location...</span>
              </div>
            )}

            {userLocation && !detectingLocation && (
              <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-900 dark:text-green-200">Your Location Detected</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">{userLocation.address}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-mono">
                      {userLocation.lat.toFixed(6)}°, {userLocation.lng.toFixed(6)}°
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {stops.map((stop, idx) => (
                <div key={stop.id} className="flex flex-col gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500 dark:text-gray-400 font-bold">STOP {idx + 1}</label>
                    {stops.length > 1 && (
                      <button
                        onClick={() => deleteStop(idx)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete stop"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Address / Landmark"
                    className="border border-gray-300 rounded p-2 text-sm"
                    value={stop.address}
                    onChange={(e) => updateStop(idx, 'address', e.target.value)}
                  />
                  <select
                    className="border border-gray-300 rounded p-2 text-sm bg-white"
                    value={stop.city}
                    onChange={(e) => updateStop(idx, 'city', e.target.value)}
                  >
                    {MOCK_INDIA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={addStop}
              className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-brand-500 hover:text-brand-500 flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> Add Stop
            </button>

            <button
              onClick={handleOptimize}
              disabled={loading || stops.length === 0}
              className="mt-6 w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? "Optimizing..." : "Generate Optimal Route"}
            </button>
          </div>
        </div>

        {/* Right: Map & Result */}
        <div className="lg:col-span-2">
          {result ? (
            <div className="space-y-6">
              {/* Stats Strip */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 text-white p-4 rounded-lg text-center">
                  <p className="text-gray-400 text-sm uppercase">Total Distance</p>
                  <p className="text-2xl font-bold">{result.totalDistanceKm} km</p>
                </div>
                <div className="bg-slate-900 text-white p-4 rounded-lg text-center">
                  <p className="text-gray-400 text-sm uppercase">ETA</p>
                  <p className="text-2xl font-bold">{Math.floor(result.totalDurationMins / 60)}h {result.totalDurationMins % 60}m</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-lg mb-4">Optimized Sequence</h3>
                <div className="relative border-l-2 border-brand-200 ml-3 space-y-8 pl-6 py-2">
                  {result.stops.map((stop, idx) => (
                    <div key={stop.id} className="relative">
                      <div className="absolute -left-[33px] bg-brand-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-white">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{stop.city}</h4>
                        <p className="text-gray-600 text-sm">{stop.address || "City Center"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map Visualization */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-lg mb-4">Route Map</h3>
                <RouteMap stops={result.stops} />
              </div>
            </div>
          ) : (
            <div className="h-full bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
              <Search className="w-16 h-16 mb-4 opacity-50" />
              <p>Input delivery waypoints to generate AI-optimized path.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};