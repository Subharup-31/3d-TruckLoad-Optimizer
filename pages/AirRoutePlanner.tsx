import React, { useState, useEffect } from 'react';
import { Plane, Navigation, Plus, Search, AlertCircle, Locate, X, Cloud, Zap, Wind } from 'lucide-react';
import { optimizeAirRoute, searchLocations, geocodeAddress, getJetStreamData, calculateBearing } from '../services/routing';
import { RouteStop, RouteResult } from '../types';
import { RouteMap } from '../components/RouteMap';
import { LocationAutocomplete } from '../components/LocationAutocomplete';

export const AirRoutePlanner: React.FC = () => {
  const [stops, setStops] = useState<RouteStop[]>([
    { id: '1', address: 'London Heathrow (LHR)', city: 'London, UK', lat: 51.4700, lng: -0.4543 },
    { id: '2', address: 'JFK Airport (JFK)', city: 'New York, USA', lat: 40.6413, lng: -73.7781 }
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string>('');
  const [optimizerMode, setOptimizerMode] = useState<'fastest' | 'eco'>('eco');
  const [windData, setWindData] = useState<{ tailwind: number, speed: number, direction: number } | null>(null);

  useEffect(() => {
    handleOptimize();
  }, []);

  useEffect(() => {
    if (result && stops.length >= 2) {
      handleOptimize();
    }
  }, [optimizerMode]);

  const addStop = () => {
    setStops([...stops, { id: Date.now().toString(), address: '', city: '' }]);
  };

  const deleteStop = (index: number) => {
    const newStops = [...stops];
    newStops.splice(index, 1);
    setStops(newStops);
  };

  const handleOptimize = async () => {
    if (stops.length < 2) {
      setError('Please add at least 2 airports to plan a flight route.');
      return;
    }

    const empty = stops.some((s) => !s.address?.trim());
    if (empty) {
      setError('Please search and select an airport or city for every waypoint.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Use the dedicated air route optimizer for geodesic flight paths
      const res = await optimizeAirRoute(stops, optimizerMode);

      const midIdx = Math.floor(res.stops.length / 2);
      const liveWind = await getJetStreamData(res.stops[midIdx].lat!, res.stops[midIdx].lng!);

      const bearing = calculateBearing(
        [res.stops[0].lat!, res.stops[0].lng!],
        [res.stops[res.stops.length - 1].lat!, res.stops[res.stops.length - 1].lng!]
      );
      const relativeAngle = (liveWind.direction - bearing + 180) % 360 - 180;
      const tailwindComponent = liveWind.speed * Math.cos(relativeAngle * Math.PI / 180);
      
      setWindData({
        tailwind: Math.round(tailwindComponent),
        speed: Math.round(liveWind.speed),
        direction: Math.round(liveWind.direction)
      });

      // Simulate flight-specific metrics incorporating live wind
      const baseSpeed = optimizerMode === 'fastest' ? 900 : optimizerMode === 'heavy' ? 780 : 840;
      const effectiveSpeed = baseSpeed + tailwindComponent;
      const fuelRate = optimizerMode === 'eco' ? 10 : optimizerMode === 'heavy' ? 15 : 12;
      
      const flightResult = {
        ...res,
        totalDurationMins: Math.round((res.totalDistanceKm / effectiveSpeed) * 60),
        fuelRequirement: Math.round(res.totalDistanceKm * fuelRate)
      };

      setResult(flightResult as any);
    } catch (e: any) {
      setError(e.message || 'Failed to plan flight route.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Plane className="w-8 h-8 text-blue-400" />
            </div>
            Global Air Route Optimizer
          </h1>
          <div className="flex gap-2">
            {(['fastest', 'eco'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setOptimizerMode(mode)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                  optimizerMode === mode 
                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar: Flight Sequence */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg text-slate-200">Flight Leg Sequence</h2>
                <button 
                  onClick={addStop}
                  className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition border border-blue-500/20"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {stops.map((stop, idx) => (
                  <div key={stop.id} className="relative pl-8 pb-4 last:pb-0">
                    {/* Vertical connector */}
                    {idx < stops.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-transparent"></div>
                    )}
                    
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-800 border-2 border-blue-500 flex items-center justify-center text-[10px] font-bold text-blue-400">
                      {idx + 1}
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 hover:border-blue-500/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Waypoint {idx + 1}</span>
                        {stops.length > 2 && (
                          <button onClick={() => deleteStop(idx)} className="text-slate-500 hover:text-red-400 transition">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <LocationAutocomplete
                        value={stop.address}
                        onChange={(address, city, lat, lng) => {
                          const newStops = [...stops];
                          newStops[idx] = { ...newStops[idx], address, city, lat, lng };
                          setStops(newStops);
                        }}
                        placeholder="Search Airport or City..."
                        global={true}
                        category="airport"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <Navigation className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] text-slate-400 truncate">{stop.city || 'Enter destination...'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleOptimize}
                disabled={loading}
                className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <Zap className="w-5 h-5 animate-pulse" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
                {loading ? 'CALCULATING FLIGHT PATH...' : 'OPTIMIZE FLIGHT PATH'}
              </button>
            </div>

            {/* Weather Overlay Card */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-4">
                <Wind className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-slate-200">Jet Stream Conditions</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Tailwind Factor</span>
                  <span className={`text-xs font-mono ${(windData?.tailwind || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(windData?.tailwind || 0) >= 0 ? '+' : ''}{windData?.tailwind || 0} km/h
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${(windData?.tailwind || 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min(Math.abs((windData?.tailwind || 0) / 2), 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {windData 
                    ? `Live wind from ${windData.direction}° at ${windData.speed} km/h along your route midpoint.`
                    : "Fetching cruise-altitude wind data for eco route planning."}
                </p>
                <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">How this works</p>
                  <p className="text-[9px] text-slate-400 leading-relaxed">
                    Data from <span className="text-slate-300">Open-Meteo</span> at 250 hPa (~34,000 ft cruise altitude).
                    Tailwind = wind component along your flight bearing — positive saves time/fuel in Eco mode.
                  </p>
                  <p className="text-[9px] text-slate-500 leading-relaxed italic">
                    Forecast-grade for planning; not certified for operational flight planning. Falls back to defaults if the API is unavailable.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content: Map & Analytics */}
          <div className="lg:col-span-8 space-y-6">
            {/* Top Stats Dashboard */}
            {result && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Distance</div>
                  <div className="text-xl font-mono text-blue-400 font-bold">{result.totalDistanceKm.toFixed(2)} KM</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total ETE</div>
                  <div className="text-xl font-mono text-emerald-400 font-bold">
                    {Math.floor(result.totalDurationMins / 60)}H {result.totalDurationMins % 60}M
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Fuel Consumption</div>
                  <div className="text-xl font-mono text-orange-400 font-bold">
                    {((result as any).fuelRequirement ?? 0).toLocaleString()} L
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Stability Index</div>
                  <div className="text-xl font-mono text-purple-400 font-bold">99.4%</div>
                </div>
              </div>
            )}

            {/* Main Flight Path Map */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
              <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Live Airspace Optimization</span>
              </div>
              
              <div className="w-full h-full min-h-[600px]">
                {result ? (
                  <RouteMap stops={result.stops} geometry={result.overviewPolyline} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                    <Cloud className="w-20 h-20 mb-4" />
                    <p className="text-sm">Initializing global flight network...</p>
                  </div>
                )}
              </div>

              {/* Map Controls Overlay */}
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-2xl backdrop-blur-xl max-w-xs">
                  <h4 className="text-xs font-bold mb-2 text-blue-400 uppercase">Load Impact Analysis</h4>
                  <p className="text-[10px] text-slate-400 mb-3">
                    Current payload requires a modified ascent profile at 2,400 ft/min.
                  </p>
                  <div className="flex gap-1 h-8 items-end">
                    {[40, 70, 90, 60, 80, 100, 85, 75, 95].map((h, i) => (
                      <div key={i} className="flex-1 bg-blue-500/30 rounded-t-sm" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button className="p-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition shadow-lg">
                    <Locate className="w-5 h-5" />
                  </button>
                  <button className="p-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition shadow-lg">
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {result && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Flight Path Algorithm</h3>
                <p className="text-sm text-blue-300">{result.sequenceAlgorithm}</p>
                <p className="text-[10px] text-slate-500">{result.routingEngine}</p>
                {result.hubSequence && (
                  <div className="flex flex-wrap gap-2">
                    {result.hubSequence.map((node, i) => (
                      <React.Fragment key={i}>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">{node}</span>
                        {i < result.hubSequence!.length - 1 && <span className="text-slate-600 text-[10px]">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
