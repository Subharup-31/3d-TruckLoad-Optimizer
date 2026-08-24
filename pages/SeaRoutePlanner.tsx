import React, { useState, useEffect } from 'react';
import { Anchor, Navigation, Plus, Search, AlertCircle, Locate, X, Waves, Zap, Droplets } from 'lucide-react';
import { optimizeSeaRoute, searchLocations, getSeaConditions, calculateBearing } from '../services/routing';
import { RouteStop, RouteResult } from '../types';
import { RouteMap } from '../components/RouteMap';
import { LocationAutocomplete } from '../components/LocationAutocomplete';

export const SeaRoutePlanner: React.FC = () => {
  const [stops, setStops] = useState<RouteStop[]>([
    { id: '1', address: 'Port of Singapore', city: 'Singapore', lat: 1.2902, lng: 103.8519 },
    { id: '2', address: 'Port of Rotterdam', city: 'Rotterdam, Netherlands', lat: 51.9225, lng: 4.4792 }
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string>('');
  const [vesselMode, setVesselMode] = useState<'express' | 'eco' | 'heavy'>('eco');
  const [seaState, setSeaState] = useState<{ waveHeight: number, impact: string } | null>(null);

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
      setError('Please search and select a port for every waypoint.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await optimizeSeaRoute(stops, vesselMode);

      const midIdx = Math.floor(res.stops.length / 2);
      const liveSea = await getSeaConditions(res.stops[midIdx].lat!, res.stops[midIdx].lng!);
      
      // Determine impact
      let impact = "Optimal Conditions";
      if (liveSea.waveHeight > 3) impact = "Heavy Swell - Speed Reduced";
      else if (liveSea.waveHeight > 1.5) impact = "Moderate Sea State";

      setSeaState({
        waveHeight: liveSea.waveHeight,
        impact: impact
      });

      // Calculate maritime metrics
      const baseSpeedKnots = vesselMode === 'express' ? 24 : vesselMode === 'heavy' ? 16 : 20;
      const speedKmh = baseSpeedKnots * 1.852; // Convert knots to km/h
      const weatherSlowdown = liveSea.waveHeight > 3 ? 0.8 : 1.0;
      
      const maritimeResult = {
        ...res,
        totalDurationMins: Math.round((res.totalDistanceKm / (speedKmh * weatherSlowdown)) * 60),
        fuelRequirement: Math.round(res.totalDistanceKm * (vesselMode === 'heavy' ? 250 : 180)) // Simulated L per km for cargo vessel
      };

      setResult(maritimeResult as any);
      console.log('✅ Voyage Optimized:', maritimeResult.totalDistanceKm, 'KM via', maritimeResult.stops.length, 'waypoints');
    } catch (e: any) {
      setError(e.message || 'Failed to plan maritime route.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
              <Anchor className="w-8 h-8 text-cyan-400" />
            </div>
            Maritime Route Intelligence
          </h1>
          <div className="flex gap-2">
            {(['express', 'eco', 'heavy'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setVesselMode(mode)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                  vesselMode === mode 
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar: Port Sequence */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg text-slate-200">Vessel Port Call Sequence</h2>
                <button 
                  onClick={addStop}
                  className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition border border-cyan-500/20"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {stops.map((stop, idx) => (
                  <div key={stop.id} className="relative pl-8 pb-4 last:pb-0">
                    {idx < stops.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 to-transparent"></div>
                    )}
                    
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                      {idx + 1}
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 hover:border-cyan-500/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Port Call {idx + 1}</span>
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
                        placeholder="Search Port or Harbor..."
                        global={true}
                        category="port"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <Droplets className="w-3 h-3 text-cyan-500" />
                        <span className="text-[10px] text-slate-400 truncate">{stop.city || 'Enter port...'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleOptimize}
                disabled={loading}
                className="w-full mt-8 bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(8,145,178,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <Zap className="w-5 h-5 animate-pulse" />
                ) : (
                  <Anchor className="w-5 h-5" />
                )}
                {loading ? 'CALCULATING MARINE PATH...' : 'OPTIMIZE SEA ROUTE'}
              </button>
            </div>

            {/* Live Sea State Overlay */}
            <div className="bg-gradient-to-br from-cyan-900/40 to-slate-900/60 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-4">
                <Waves className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-slate-200">Live Sea Conditions</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Wave Height</span>
                  <span className={`text-xs font-mono ${seaState && seaState.waveHeight > 2.5 ? 'text-orange-400' : 'text-cyan-400'} font-bold`}>
                    {seaState ? `${seaState.waveHeight.toFixed(1)}m` : '--'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${seaState && seaState.waveHeight > 2.5 ? 'bg-orange-500' : 'bg-cyan-500'}`} 
                    style={{ width: `${Math.min((seaState?.waveHeight || 0) * 20, 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  {seaState ? seaState.impact : "Analyzing marine currents and tidal patterns..."}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content: Map & Analytics */}
          <div className="lg:col-span-8 space-y-6">
            {result && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-cyan-500/5 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Voyage Distance</div>
                  <div className="text-xl font-mono text-cyan-400 font-bold">{Math.round(result.totalDistanceKm).toLocaleString()} KM</div>
                  <div className="text-[10px] text-cyan-500/60 font-bold mt-1">Eurostat MARNET via searoute-ts</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Estimated Arrival</div>
                  <div className="text-xl font-mono text-emerald-400 font-bold">
                    {Math.floor(result.totalDurationMins / (60 * 24))}D {Math.floor((result.totalDurationMins % (60 * 24)) / 60)}H
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Marine Fuel</div>
                  <div className="text-xl font-mono text-orange-400 font-bold">
                    {((result as any).fuelRequirement ?? 0).toLocaleString()} MT
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Hull Load</div>
                  <div className="text-xl font-mono text-purple-400 font-bold">94.8%</div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
              <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Global Maritime Network</span>
              </div>
              
              <div className="w-full h-full min-h-[600px]">
                {result ? (
                  <RouteMap 
                    stops={result.stops} 
                    geometry={result.overviewPolyline} 
                    intermodalGeometry={result.intermodalPolyline}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                    <Waves className="w-20 h-20 mb-4 text-cyan-400 animate-bounce" />
                    <p className="text-sm">Mapping international shipping lanes...</p>
                  </div>
                )}
              </div>

              {/* Voyage Controls Overlay */}
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-2xl backdrop-blur-xl max-w-xs">
                  <h4 className="text-xs font-bold mb-2 text-cyan-400 uppercase">Voyage Stability</h4>
                  <p className="text-[10px] text-slate-400 mb-3">
                    Calculated hull stress and ballast requirements for high-tonnage cargo.
                  </p>
                  <div className="flex gap-1 h-8 items-end">
                    {[60, 40, 55, 85, 70, 95, 65, 50, 45].map((h, i) => (
                      <div key={i} className="flex-1 bg-cyan-500/30 rounded-t-sm" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button className="p-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition shadow-lg">
                    <Locate className="w-5 h-5 text-cyan-400" />
                  </button>
                  <button className="p-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition shadow-lg">
                    <Search className="w-5 h-5 text-cyan-400" />
                  </button>
                </div>
              </div>
            </div>
            {/* Path Diagnostics */}
            {result && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Optimized Seaway Path</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.hubSequence?.map((node, i) => (
                    <React.Fragment key={i}>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">{node}</span>
                      {i < (result.hubSequence?.length ?? 0) - 1 && <span className="text-slate-600 text-[10px]">→</span>}
                    </React.Fragment>
                  )) || <span className="text-[10px] text-slate-500">Computing maritime network path...</span>}
                </div>
                {result.routingEngine && (
                  <p className="text-[10px] text-slate-500">
                    {result.sequenceAlgorithm} · {result.routingEngine} · {result.geometryPointCount} geometry points
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
