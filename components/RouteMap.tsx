import React, { useEffect, useRef, useState } from 'react';
import { RouteStop } from '../types';
import { MapPin, Navigation } from 'lucide-react';

interface RouteMapProps {
  stops: RouteStop[];
}

declare global {
  interface Window {
    L: any;
  }
}

export const RouteMap: React.FC<RouteMapProps> = ({ stops }) => {
  console.log('🗺️ RouteMap rendered with stops:', stops);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🗺️ RouteMap component mounted, stops:', stops.length);
    
    // Load Leaflet library
    if (!window.L) {
      console.log('📦 Loading Leaflet library...');
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Leaflet loaded successfully');
        setIsLoading(false);
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          initializeMap();
        }, 100);
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Leaflet');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    } else {
      console.log('✅ Leaflet already loaded');
      setIsLoading(false);
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initializeMap();
      }, 100);
    }
  }, []);

  // Update map when stops change, even if map wasn't ready initially
  useEffect(() => {
    if (stops.length > 0 && mapInstanceRef.current && window.L) {
      console.log('🔄 Updating map with new stops data');
      updateMap();
    }
  }, [JSON.stringify(stops)]);

  useEffect(() => {
    console.log('🔄 Stops updated, updating map...', stops.length);
    if (mapInstanceRef.current && window.L) {
      console.log('🗺️ Map instance exists, calling updateMap');
      updateMap();
    } else {
      console.log('⚠️ Map instance not ready yet');
    }
  }, [JSON.stringify(stops)]);

  // Log when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 RouteMap component unmounting');
    };
  }, []);

  const initializeMap = () => {
    console.log('🗺️ Initializing map, mapRef:', !!mapRef.current, 'window.L:', !!window.L);
    
    if (!mapRef.current || !window.L) {
      console.error('❌ Cannot initialize map - missing mapRef or Leaflet');
      return;
    }

    try {
      console.log('📍 Creating map instance...');
      
      // Initialize map centered on India
      mapInstanceRef.current = window.L.map(mapRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: true
      });

      console.log('✅ Map instance created');

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      console.log('✅ Map tiles added');

      console.log('🔄 Updating map with', stops.length, 'stops');
      updateMap();
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  };

  const updateMap = async () => {
    console.log('🔄 updateMap called with stops:', stops.length);
    if (!mapInstanceRef.current || !window.L) {
      console.log('⚠️ Map not ready for update');
      return;
    }

    // Clear existing layers
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.Marker || layer instanceof window.L.Polyline) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // If no stops, just return
    if (stops.length === 0) {
      console.log('ℹ️ No stops to display');
      return;
    }

    const bounds = window.L.latLngBounds();
    const routeCoordinates: [number, number][] = [];

    // Collect all coordinates
    stops.forEach((stop) => {
      if (stop.lat && stop.lng) {
        routeCoordinates.push([stop.lat, stop.lng]);
      }
    });

    console.log('📍 Collected coordinates:', routeCoordinates.length);

    // Get route from OSRM API (follows actual roads)
    let roadRouteCoordinates: [number, number][] = [];
    if (routeCoordinates.length >= 2) {
      try {
        // Build OSRM API request (OSRM expects [lng, lat])
        const coordinatesString = routeCoordinates.map(coord => `${coord[1]},${coord[0]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;
        
        console.log('🚗 Fetching road route from OSRM...');
        const response = await fetch(osrmUrl);
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          // Extract the route geometry (follows actual roads!)
          roadRouteCoordinates = data.routes[0].geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] // Convert back to [lat, lng]
          );
          console.log('✅ Road route loaded:', roadRouteCoordinates.length, 'points');
        } else {
          console.warn('⚠️ OSRM routing failed, using direct lines');
        }
      } catch (error) {
        console.error('❌ Error fetching route:', error);
      }
    }

    // Add markers for each stop
    stops.forEach((stop, index) => {
      if (stop.lat && stop.lng) {
        const isFirst = index === 0;
        const isLast = index === stops.length - 1;
        
        // Determine marker color
        let markerColor = '#0284c7'; // brand blue
        if (isFirst) markerColor = '#10b981'; // green
        if (isLast) markerColor = '#ef4444'; // red

        // Create custom icon with number
        const markerIcon = window.L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: 40px;
              height: 40px;
              background-color: ${markerColor};
              border: 4px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 16px;
              color: white;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            ">
              ${index + 1}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = window.L.marker([stop.lat, stop.lng], {
          icon: markerIcon
        }).addTo(mapInstanceRef.current);

        // Add popup with stop details
        const popupContent = `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b; font-size: 16px;">
              ${isFirst ? '🚀 Start: ' : isLast ? '🏁 End: ' : `📍 Stop ${index + 1}: `}${stop.city}
            </h3>
            <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px;">
              ${stop.address || 'City Center'}
            </p>
            <p style="margin: 0; color: #94a3b8; font-size: 12px; font-family: monospace;">
              ${stop.lat.toFixed(4)}°N, ${stop.lng.toFixed(4)}°E
            </p>
          </div>
        `;
        marker.bindPopup(popupContent);

        bounds.extend([stop.lat, stop.lng]);
      }
    });

    // Draw route line following actual roads
    if (roadRouteCoordinates.length > 1) {
      // Outer glow (wider, lighter pink)
      window.L.polyline(roadRouteCoordinates, {
        color: '#ff69b4',
        weight: 12,
        opacity: 0.3,
        smoothFactor: 1,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(mapInstanceRef.current);

      // Main route line (pink/magenta like your image)
      const routeLine = window.L.polyline(roadRouteCoordinates, {
        color: '#e91e63',
        weight: 6,
        opacity: 0.9,
        smoothFactor: 1,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(mapInstanceRef.current);

      // Add white border for better visibility
      window.L.polyline(roadRouteCoordinates, {
        color: '#ffffff',
        weight: 8,
        opacity: 0.6,
        smoothFactor: 1
      }).addTo(mapInstanceRef.current);

      console.log('✅ Route drawn on map');
    } else if (routeCoordinates.length > 1) {
      // Fallback: direct line if OSRM fails
      const fallbackCoords = stops
        .filter(s => s.lat && s.lng)
        .map(s => [s.lat!, s.lng!] as [number, number]);
      
      window.L.polyline(fallbackCoords, {
        color: '#e91e63',
        weight: 6,
        opacity: 0.8,
        dashArray: '10, 10',
        smoothFactor: 1
      }).addTo(mapInstanceRef.current);
    }

    // Add distance labels between stops
    for (let i = 0; i < stops.length - 1; i++) {
      const stop1 = stops[i];
      const stop2 = stops[i + 1];
      
      if (stop1.lat && stop1.lng && stop2.lat && stop2.lng) {
        // Calculate distance
        const R = 6371;
        const dLat = (stop2.lat - stop1.lat) * Math.PI / 180;
        const dLon = (stop2.lng - stop1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(stop1.lat * Math.PI / 180) * Math.cos(stop2.lat * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = Math.round(R * c);

        // Midpoint between two stops
        const midLat = (stop1.lat + stop2.lat) / 2;
        const midLng = (stop1.lng + stop2.lng) / 2;

        // Add distance label with pink styling
        const distanceIcon = window.L.divIcon({
          className: 'distance-label',
          html: `
            <div style="
              background: #e91e63;
              color: white;
              padding: 6px 14px;
              border-radius: 16px;
              font-size: 13px;
              font-weight: bold;
              white-space: nowrap;
              box-shadow: 0 3px 8px rgba(233, 30, 99, 0.4);
              border: 2px solid white;
            ">
              ${distance} km
            </div>
          `,
          iconSize: [70, 28],
          iconAnchor: [35, 14]
        });

        window.L.marker([midLat, midLng], {
          icon: distanceIcon,
          interactive: false
        }).addTo(mapInstanceRef.current);
      }
    }

    // Fit map to show all markers with padding
    if (stops.length > 0 && stops.some(s => s.lat && s.lng)) {
      stops.forEach(stop => {
        if (stop.lat && stop.lng) {
          bounds.extend([stop.lat, stop.lng]);
        }
      });
      
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 13
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-96 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Map Legend */}
      <div className="mb-4 bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
            <span className="text-sm text-gray-600">Start Point</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-brand-500 border-2 border-white shadow"></div>
            <span className="text-sm text-gray-600">Waypoints</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
            <span className="text-sm text-gray-600">Destination</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full shadow"></div>
          <span>Driving Route</span>
        </div>
      </div>
      
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full rounded-xl overflow-hidden shadow-lg border-2 border-gray-300"
        style={{ height: '500px', minHeight: '500px', backgroundColor: '#e5e7eb' }}
      />
    </div>
  );
};
