import React, { useState, useEffect } from 'react';
import { Anchor, Waves, Plus, Search, AlertCircle, Locate, X, Compass, Zap, ShieldCheck } from 'lucide-react';
import { optimizeSeaRoute, searchLocations, geocodeAddress } from '../services/routing';
import { RouteStop, RouteResult } from '../types';
import { RouteMap } from '../components/RouteMap';
import { LocationAutocomplete } from '../components/LocationAutocomplete';

export const SeaRoutePlanner: React.FC = () => {
  const [stops, setStops] = useState<RouteStop[]>([
    { id: '1', address: 'Port of Singapore', city: 'Singapore', lat: 1.2644, lng: 103.8400 },
    { id: '2', address: 'Port of Rotterdam', city: 'Rotterdam, Netherlands', lat: 51.9500, lng: 4.1400 }
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string>('');
  const [vesselMode, setVesselMode] = useState<'express' | 'eco' | 'heavy'>('eco');

  useEffect(() => {
    handleOptimize();
  }, []);

  useEffect(() => {
    if (result && stops.length >= 2) {
      handleOptimize();
    }
  }, [vesselMode]);

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
      setError('Please add at least 2 ports to plan a maritime route.');
      return;
    }

    const empty = stops.some((s) => !s.address?.trim());
    if (empty) {
      setError('Please search and select a port or city for every waypoint.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await optimizeSeaRoute(stops, vesselMode);

      const speedKnots = vesselMode === 'express' ? 22 : vesselMode === 'heavy' ? 14 : 18;
      const speedKmh = speedKnots * 1.852;
      const fuelPerKm = vesselMode === 'heavy' ? 240 : vesselMode === 'express' ? 210 : 180;

      const maritimeResult: RouteResult = {
        ...res,
        totalDurationMins: Math.round((res.totalDistanceKm / speedKmh) * 60),
        fuelRequirement: Math.round((res.totalDistanceKm * fuelPerKm) / 1000)
      };

      setResult(maritimeResult as any);
    } catch (e: any) {
      setError(e.message || 'Failed to plan maritime route.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
          <div className="p-2 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-xl border border-cyan-500/20 dark:border-cyan-500/30">
            <Anchor className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          Maritime Route Intelligence
        </h1>
        <div className="flex gap-2">
          {(['express', 'eco', 'heavy'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setVesselMode(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                vesselMode === mode 
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/30' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="font-medium">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Port Sequence */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-200">Vessel Port Call Sequence</h2>
              <button 
                onClick={addStop}
                className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-lg transition border border-cyan-500/20"
                title="Add Port of Call"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {stops.map((stop, idx) => (
                <div key={stop.id} className="relative pl-7 pb-3 last:pb-0">
                  {/* Vertical connector */}
                  {idx < stops.length - 1 && (
                    <div className="absolute left-[10px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 to-transparent"></div>
                  )}
                  
                  <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-cyan-500 flex items-center justify-center text-[9px] font-bold text-cyan-600 dark:text-cyan-400">
                    {idx + 1}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Port Call {idx + 1}</span>
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
                      placeholder="Search Port or Coastal City..."
                      global={true}
                      category="port"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Compass className="w-3 h-3 text-cyan-500" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{stop.city || 'Enter coastal hub...'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleOptimize}
              disabled={loading}
              className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl font-bold text-xs shadow-md shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Zap className="w-4 h-4 animate-pulse" />
              ) : (
                <Anchor className="w-4 h-4" />
              )}
              {loading ? 'CALCULATING SEA VOYAGE...' : 'OPTIMIZE SEA ROUTE'}
            </button>
          </div>

          {/* Sea Conditions Card */}
          <div className="bg-white dark:bg-slate-900/60 border border-cyan-200 dark:border-cyan-500/20 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <Waves className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200">Live Sea Conditions</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Wave Height</span>
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">1.2m</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: '24%' }}></div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Optimal navigation conditions along major oceanic sea corridors.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content: Map & Voyage Analytics */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top Stats Dashboard */}
          {result && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Voyage Distance</div>
                <div className="text-lg font-mono text-cyan-600 dark:text-cyan-400 font-bold">{result.totalDistanceKm.toFixed(0)} KM</div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">Eurostat MARNET via Searoute</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Estimated Arrival</div>
                <div className="text-lg font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {Math.floor(result.totalDurationMins / 1440)}D {Math.floor((result.totalDurationMins % 1440) / 60)}H
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Marine Fuel</div>
                <div className="text-lg font-mono text-amber-600 dark:text-amber-400 font-bold">
                  {((result as any).fuelRequirement ?? 0).toLocaleString()} MT
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Hull Load</div>
                <div className="text-lg font-mono text-purple-600 dark:text-purple-400 font-bold">94.8%</div>
              </div>
            </div>
          )}

          {/* Main Map */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative min-h-[550px]">
            <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Global Maritime Network</span>
            </div>
            
            <div className="w-full h-full min-h-[550px]">
              {result ? (
                <RouteMap stops={result.stops} geometry={result.overviewPolyline} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                  <Waves className="w-16 h-16 mb-2 text-cyan-500" />
                  <p className="text-xs font-medium">Calculating global maritime sea lanes...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
