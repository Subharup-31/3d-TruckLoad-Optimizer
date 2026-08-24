import React, { useEffect, useRef, useState } from 'react';
import { RouteStop } from '../types';
import { MapPin, Navigation } from 'lucide-react';

interface RouteMapProps {
  stops: RouteStop[];
  geometry?: string;
  intermodalGeometry?: string;
  geometryPointCount?: number;
}

declare global {
  interface Window {
    L: any;
  }
}

export const RouteMap: React.FC<RouteMapProps> = ({
  stops,
  geometry,
  intermodalGeometry,
  geometryPointCount: geometryPointCountProp,
}) => {
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

  // Update map when stops or geometry change
  useEffect(() => {
    if (mapInstanceRef.current && window.L) {
      console.log('🔄 Updating map with new stops or geometry');
      updateMap();
    }
  }, [JSON.stringify(stops), geometry, intermodalGeometry]);

  const initializeMap = () => {
    if (!mapRef.current || !window.L) return;

    try {
      mapInstanceRef.current = window.L.map(mapRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: true
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      updateMap();
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  };

  const updateMap = async () => {
    if (!mapInstanceRef.current || !window.L) return;

    try {
    // Clear existing layers
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.Marker || layer instanceof window.L.Polyline) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    if (stops.length === 0) return;

    const bounds = window.L.latLngBounds();
    const routeCoordinates: [number, number][] = [];

    // 1. Process Geometry from OSRM if available
    let roadPath: [number, number][] = [];
    if (geometry) {
      try {
        const parsed = JSON.parse(geometry) as [number, number][];
        roadPath = parsed.filter(
          (c) =>
            Array.isArray(c) &&
            c.length >= 2 &&
            typeof c[0] === 'number' &&
            typeof c[1] === 'number' &&
            !isNaN(c[0]) &&
            !isNaN(c[1]) &&
            c[0] >= -90 &&
            c[0] <= 90
        );
      } catch (e) {
        console.error('Failed to parse route geometry');
      }
    }

    // 2. Add markers for each stop
    stops.forEach((stop, index) => {
      if (stop.lat && stop.lng) {
        const isFirst = index === 0;
        const isLast = index === stops.length - 1;
        
        let markerColor = '#0ea5e9'; // brand blue
        if (isFirst) markerColor = '#10b981'; // green
        if (isLast) markerColor = '#ef4444'; // red

        const markerIcon = window.L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background-color: ${markerColor};
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 14px;
              color: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
              ${index + 1}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const marker = window.L.marker([stop.lat, stop.lng], {
          icon: markerIcon
        }).addTo(mapInstanceRef.current);

        marker.bindPopup(`<b>${stop.city}</b><br/>${stop.address || ''}`);
        bounds.extend([stop.lat, stop.lng]);
        routeCoordinates.push([stop.lat, stop.lng]);
      }
    });

    // 3. Draw route line — must use OSRM geometry (thousands of points), not stop markers only
    const hasRoadGeometry = roadPath.length > stops.length * 3;
    const finalPath = hasRoadGeometry ? roadPath : routeCoordinates;

    if (finalPath.length > 1) {
      window.L.polyline(finalPath, {
        color: '#ff69b4',
        weight: 12,
        opacity: 0.3,
        smoothFactor: 0,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(mapInstanceRef.current);

      window.L.polyline(finalPath, {
        color: '#e91e63',
        weight: 6,
        opacity: 0.9,
        smoothFactor: 0,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(mapInstanceRef.current);

      console.log(
        `✅ ${hasRoadGeometry ? 'OSRM road' : 'Direct'} route drawn (${finalPath.length} points)`
      );
    }
    
    // 4. Draw Intermodal 'Last Mile' (Dashed)
    if (intermodalGeometry) {
      try {
        const lastMilePath = JSON.parse(intermodalGeometry);
        if (lastMilePath.length > 1) {
          // Dash line for Last Mile
          window.L.polyline(lastMilePath, {
            color: '#e91e63',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 15',
            smoothFactor: 1,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(mapInstanceRef.current);
          
          console.log('✅ Intermodal Last Mile drawn');
        }
      } catch (e) {
        console.error('Failed to parse intermodal geometry');
      }
    }

    // 5. Fit map to show all markers with padding
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
    } catch (error) {
      console.error('❌ Error updating map:', error);
    }
  };

  const legendPointCount =
    geometryPointCountProp ??
    (geometry && geometry.length < 100000
      ? (() => {
          try {
            return JSON.parse(geometry).length;
          } catch {
            return 0;
          }
        })()
      : 0);

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
          <span>{legendPointCount > stops.length * 3 ? 'OSRM Road Route' : 'Direct Route'}</span>
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
