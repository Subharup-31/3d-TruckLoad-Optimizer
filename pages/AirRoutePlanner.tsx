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

      const rad = (liveWind.direction - bearing) * (Math.PI / 180);
      const tailwindKmh = Math.round(liveWind.speed * Math.cos(rad));
      setWindData({ tailwind: tailwindKmh, speed: liveWind.speed, direction: liveWind.direction });

      const baseSpeedKmh = 880;
      const effectiveSpeed = Math.max(500, baseSpeedKmh + tailwindKmh);
      const fuelRate = optimizerMode === 'eco'
        ? Math.max(8.0, 10.0 - (tailwindKmh / 100))
        : 11.5;

      const flightResult: RouteResult = {
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
    <div className="w-full space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
          <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl border border-blue-500/20 dark:border-blue-500/30">
            <Plane className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          Global Air Route Optimizer
        </h1>
        <div className="flex gap-2">
          {(['fastest', 'eco'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setOptimizerMode(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                optimizerMode === mode 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Flight Sequence */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-200">Flight Leg Sequence</h2>
              <button 
                onClick={addStop}
                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition border border-blue-500/20"
                title="Add Airport Waypoint"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {stops.map((stop, idx) => (
                <div key={stop.id} className="relative pl-7 pb-3 last:pb-0">
                  {/* Vertical connector */}
                  {idx < stops.length - 1 && (
                    <div className="absolute left-[10px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-transparent"></div>
                  )}
                  
                  <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-blue-500 flex items-center justify-center text-[9px] font-bold text-blue-600 dark:text-blue-400">
                    {idx + 1}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Waypoint {idx + 1}</span>
                      {stops.length > 2 && (
                        <button onClick={() => deleteStop(idx)} className="text-slate-400 hover:text-red-500 transition">
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
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{stop.city || 'Enter destination...'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleOptimize}
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Zap className="w-4 h-4 animate-pulse" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              {loading ? 'CALCULATING FLIGHT PATH...' : 'OPTIMIZE FLIGHT PATH'}
            </button>
          </div>

          {/* Weather Overlay Card */}
          <div className="bg-white dark:bg-slate-900/60 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <Wind className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">Jet Stream Conditions</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Tailwind Factor</span>
                <span className={`text-xs font-mono font-bold ${(windData?.tailwind || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {(windData?.tailwind || 0) >= 0 ? '+' : ''}{windData?.tailwind || 0} km/h
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${(windData?.tailwind || 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                  style={{ width: `${Math.min(Math.abs((windData?.tailwind || 0) / 2), 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {windData 
                  ? `Live wind from ${windData.direction}° at ${windData.speed} km/h along your route midpoint.`
                  : "Fetching cruise-altitude wind data for eco route planning."}
              </p>
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Atmospheric Data</p>
                <p className="text-[9px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Live data from Open-Meteo at 250 hPa (~34,000 ft cruise altitude). Tailwind component saves fuel in Eco mode.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: Map & Analytics */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top Stats Dashboard */}
          {result && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Distance</div>
                <div className="text-lg font-mono text-blue-600 dark:text-blue-400 font-bold">{result.totalDistanceKm.toFixed(2)} KM</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total ETE</div>
                <div className="text-lg font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {Math.floor(result.totalDurationMins / 60)}H {result.totalDurationMins % 60}M
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Fuel Consumption</div>
                <div className="text-lg font-mono text-amber-600 dark:text-orange-400 font-bold">
                  {((result as any).fuelRequirement ?? 0).toLocaleString()} L
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Stability Index</div>
                <div className="text-lg font-mono text-purple-600 dark:text-purple-400 font-bold">99.4%</div>
              </div>
            </div>
          )}

          {/* Main Flight Path Map */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative min-h-[550px]">
            <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Live Airspace Optimization</span>
            </div>
            
            <div className="w-full h-full min-h-[550px]">
              {result ? (
                <RouteMap stops={result.stops} geometry={result.overviewPolyline} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                  <Cloud className="w-16 h-16 mb-2" />
                  <p className="text-xs font-medium">Initializing global flight network...</p>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Flight Path Algorithm</h3>
              <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">{result.sequenceAlgorithm}</p>
              <p className="text-[10px] text-slate-500">{result.routingEngine}</p>
              {result.hubSequence && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.hubSequence.map((node, i) => (
                    <React.Fragment key={i}>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{node}</span>
                      {i < result.hubSequence!.length - 1 && <span className="text-slate-400 text-[10px]">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
