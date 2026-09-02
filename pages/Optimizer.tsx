import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Edges } from '@react-three/drei';
import { StorageService } from '../services/storage';
import { packTruck, getLoadingSequence } from '../services/packer';
import { useLoadPlaySequence } from '../hooks/useLoadPlaySequence';
import { LoadPlaySequenceButton } from '../components/LoadPlaySequenceButton';
import { runHybridOptimization } from '../services/hybridOptimizer';
import { OpenRouterService } from '../services/openrouter';
import { LoadAiInsightPanel } from '../components/LoadAiInsightPanel';
import { CoGIndicator } from '../components/CoGIndicator';
import { Truck, Item, PlacedItem, LoadResult, RouteStop } from '../types';
import { Box, AlertCircle, RefreshCw, Camera, RotateCw, Loader2, FileText, Download, FileCheck } from 'lucide-react';
import { TRUCK_OPTIONS } from '../constants';
import { PdfExportService } from '../services/pdfExport';

// -- 3D COMPONENTS --

// Animated box that drops into place with professional motion
const AnimatedBox: React.FC<{ 
  targetPosition: [number, number, number], 
  args: [number, number, number], 
  color: string,
  delay: number,
  name: string,
  city?: string
}> = ({ targetPosition, args, color, delay, name, city }) => {
  const meshRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);
  const maxProgress = 1 + delay;

  useFrame((state, delta) => {
    if (progress < maxProgress) {
      setProgress(Math.min(progress + delta * 1.5, maxProgress));
    }
  });

  // Professional easing - ease-out-cubic for smooth deceleration
  const easeOutCubic = (t: number) => {
    return 1 - Math.pow(1 - t, 3);
  };

  const t = Math.max(0, Math.min(progress - delay, 1));
  const easedProgress = easeOutCubic(t);
  
  // Smooth vertical descent
  const startY = targetPosition[1] + 350;
  const currentY = startY + (targetPosition[1] - startY) * easedProgress;
  
  // Subtle scale animation for polish
  const scale = 0.8 + (0.2 * easedProgress);

  return (
    <group>
      <mesh 
        ref={meshRef} 
        position={[targetPosition[0], currentY, targetPosition[2]]}
        scale={[scale, scale, scale]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={args} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={Math.min(easedProgress * 1.5, 0.92)}
          roughness={0.3}
          metalness={0.4}
        />
        <Edges color="#000000" threshold={15} />
      </mesh>
      
      {/* Item label */}
      {easedProgress > 0.95 && (
        <Text
          position={[targetPosition[0], targetPosition[1] + args[1] / 2 + 15, targetPosition[2]]}
          fontSize={10}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.5}
          outlineColor="#000000"
        >
          {name} {city ? `(${city})` : ''}
        </Text>
      )}
    </group>
  );
};

const BoxMesh: React.FC<{ position: [number, number, number], args: [number, number, number], color: string, opacity?: number }> = ({ position, args, color, opacity = 1 }) => {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} transparent opacity={opacity} />
      <Edges color="black" />
    </mesh>
  );
}

// Need to declare THREE global or import if environment allows, assume R3F context
import * as THREE from 'three';

// Camera setup component - ensures camera looks at the right target
const CameraSetup: React.FC<{ 
  view: string,
  target: [number, number, number]
}> = ({ view, target }) => {
  const { camera } = useThree();
  
  useEffect(() => {
    console.log('📷 CameraSetup - View:', view, 'Position:', camera.position, 'Target:', target);
    // Make camera look at target
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
    console.log('✅ Camera updated');
  }, [camera, view, target]);
  
  return null;
};

const TruckContainer: React.FC<{ dimensions: { l: number, w: number, h: number } }> = ({ dimensions }) => {
  const trailerLength = dimensions.l;
  const trailerWidth = dimensions.w;
  const trailerHeight = dimensions.h;
  
  return (
    <group>
      {/* Ground plane */}
      <mesh position={[0, -20, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>
      
      {/* ============ TRUCK CAB ============ */}
      <group position={[trailerWidth / 2, 0, -180]}>
        {/* Main cab body - realistic proportions */}
        <mesh position={[0, 90, 0]} castShadow receiveShadow>
          <boxGeometry args={[trailerWidth - 20, 180, 160]} />
          <meshStandardMaterial color="#dc2626" roughness={0.3} metalness={0.6} />
        </mesh>
        
        {/* Cab roof */}
        <mesh position={[0, 185, 10]} castShadow>
          <boxGeometry args={[trailerWidth - 20, 10, 140]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.3} metalness={0.6} />
        </mesh>
        
        {/* Windshield */}
        <mesh position={[0, 120, -78]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[trailerWidth - 25, 100, 4]} />
          <meshStandardMaterial 
            color="#1e3a8a" 
            transparent 
            opacity={0.4} 
            roughness={0.05} 
            metalness={0.9}
          />
        </mesh>
        
        {/* Side windows */}
        <mesh position={[-(trailerWidth / 2 - 10), 120, -20]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[80, 60, 4]} />
          <meshStandardMaterial color="#1e3a8a" transparent opacity={0.3} />
        </mesh>
        <mesh position={[trailerWidth / 2 - 10, 120, -20]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[80, 60, 4]} />
          <meshStandardMaterial color="#1e3a8a" transparent opacity={0.3} />
        </mesh>
        
        {/* Front grille */}
        <mesh position={[0, 50, -81]} castShadow>
          <boxGeometry args={[trailerWidth - 30, 80, 2]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.8} />
        </mesh>
        
        {/* Headlights */}
        <mesh position={[-trailerWidth / 3, 40, -82]}>
          <boxGeometry args={[25, 15, 2]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[trailerWidth / 3, 40, -82]}>
          <boxGeometry args={[25, 15, 2]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
        
        {/* Front bumper */}
        <mesh position={[0, 15, -85]} castShadow>
          <boxGeometry args={[trailerWidth - 10, 25, 8]} />
          <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>
      
      {/* ============ CHASSIS & WHEELS ============ */}
      {/* Chassis frame */}
      <mesh position={[trailerWidth / 2, 10, trailerLength / 2]} castShadow>
        <boxGeometry args={[trailerWidth - 40, 15, trailerLength + 160]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.8} />
      </mesh>
      
      {/* Front wheels (under cab) */}
      {[-1, 1].map((side, i) => (
        <group key={`front-wheel-${i}`} position={[trailerWidth / 2 + side * (trailerWidth / 2 + 10), 0, -140]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[30, 30, 20, 32]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[18, 18, 22, 32]} />
            <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.9} />
          </mesh>
        </group>
      ))}
      
      {/* Middle wheels (trailer front) */}
      {[-1, 1].map((side, i) => (
        <group key={`mid-wheel-${i}`} position={[trailerWidth / 2 + side * (trailerWidth / 2 + 10), 0, 80]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[30, 30, 20, 32]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[18, 18, 22, 32]} />
            <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.9} />
          </mesh>
        </group>
      ))}
      
      {/* Rear wheels (trailer back) */}
      {[-1, 1].map((side, i) => (
        <group key={`rear-wheel-${i}`} position={[trailerWidth / 2 + side * (trailerWidth / 2 + 10), 0, trailerLength - 80]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[30, 30, 20, 32]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[18, 18, 22, 32]} />
            <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.9} />
          </mesh>
        </group>
      ))}
      
      {/* ============ TRAILER CONTAINER ============ */}
      <group position={[0, 30, 0]}>
        {/* Container floor */}
        <mesh position={[trailerWidth / 2, 0, trailerLength / 2]} receiveShadow>
          <boxGeometry args={[trailerWidth, 8, trailerLength]} />
          <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.5} />
        </mesh>
        
        {/* Back wall - SOLID */}
        <mesh position={[trailerWidth / 2, trailerHeight / 2 + 4, trailerLength - 2]} castShadow receiveShadow>
          <boxGeometry args={[trailerWidth, trailerHeight, 4]} />
          <meshStandardMaterial color="#1e40af" roughness={0.4} metalness={0.6} />
        </mesh>
        
        {/* Left wall - semi-transparent to see cargo */}
        <mesh position={[2, trailerHeight / 2 + 4, trailerLength / 2]} castShadow receiveShadow>
          <boxGeometry args={[4, trailerHeight, trailerLength - 4]} />
          <meshStandardMaterial 
            color="#3b82f6" 
            transparent 
            opacity={0.25} 
            roughness={0.3} 
            metalness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Right wall - semi-transparent */}
        <mesh position={[trailerWidth - 2, trailerHeight / 2 + 4, trailerLength / 2]} castShadow receiveShadow>
          <boxGeometry args={[4, trailerHeight, trailerLength - 4]} />
          <meshStandardMaterial 
            color="#3b82f6" 
            transparent 
            opacity={0.25} 
            roughness={0.3} 
            metalness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Top roof - semi-transparent */}
        <mesh position={[trailerWidth / 2, trailerHeight + 4, trailerLength / 2]} receiveShadow>
          <boxGeometry args={[trailerWidth - 4, 4, trailerLength - 4]} />
          <meshStandardMaterial 
            color="#2563eb" 
            transparent 
            opacity={0.2} 
            roughness={0.3} 
            metalness={0.6}
          />
        </mesh>
        
        {/* Corner pillars - structural beams */}
        {[
          [8, 8],
          [trailerWidth - 8, 8],
          [8, trailerLength - 8],
          [trailerWidth - 8, trailerLength - 8],
        ].map((pos, i) => (
          <mesh key={`pillar-${i}`} position={[pos[0], trailerHeight / 2 + 4, pos[1]]} castShadow>
            <boxGeometry args={[8, trailerHeight, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
          </mesh>
        ))}
        
        {/* Door handles on back */}
        <mesh position={[trailerWidth * 0.3, trailerHeight / 2 + 4, trailerLength - 1]}>
          <boxGeometry args={[20, 8, 4]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[trailerWidth * 0.7, trailerHeight / 2 + 4, trailerLength - 1]}>
          <boxGeometry args={[20, 8, 4]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.2} metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export const Optimizer: React.FC = () => {
  const [storedTrucks] = useState<Truck[]>(StorageService.getTrucks());
  const [items, setItems] = useState<Item[]>(StorageService.getItems());
  const [selectedTruckId, setSelectedTruckId] = useState<string>(storedTrucks[0]?.id || TRUCK_OPTIONS[0].id);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [cameraView, setCameraView] = useState<'isometric' | 'top' | 'front' | 'side'>('isometric');
  const [autoRotate, setAutoRotate] = useState(true);
  const [animateItems, setAnimateItems] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [focusCoG, setFocusCoG] = useState(false);
  const [focusedItemUuid, setFocusedItemUuid] = useState<string | null>(null);
  const [selectedUnplacedItem, setSelectedUnplacedItem] = useState<{item: Item, index: number} | null>(null);
  const [selectedPlacedItem, setSelectedPlacedItem] = useState<PlacedItem | null>(null);
  // Play mode: step through items in loading order
  const loadingSequence = result ? getLoadingSequence(result.placedItems) : [];
  const { playMode, playIndex, visibleCount, toggle: togglePlay, stop: stopPlay } = useLoadPlaySequence(
    loadingSequence.length
  );
  // AI Stability description
  const [stabilityReport, setStabilityReport] = useState<string>('');
  const [stabilityLoading, setStabilityLoading] = useState(false);
  
  // Combine stored trucks with default options
  const allTrucks = useMemo(() => {
    // Start with default options
    const trucksMap = new Map<string, Truck>();
    
    // Add all default truck options
    TRUCK_OPTIONS.forEach(truck => {
      trucksMap.set(truck.id, truck);
    });
    
    // Override with stored trucks (which may have custom dimensions)
    storedTrucks.forEach(truck => {
      trucksMap.set(truck.id, truck);
    });
    
    return Array.from(trucksMap.values());
  }, [storedTrucks]);

  const handleOptimize = async (overrideItems?: Item[]) => {
    const truck = allTrucks.find(t => t.id === selectedTruckId);
    const activeItems = overrideItems || items;
    if (!truck || activeItems.length === 0) return;

    setIsCalculating(true);
    
    // Simulate calculation delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));

    // -- REAL-LIFE LOGIC: GROUP BY CITY --
    // Extract unique cities from items to create a route
    const cities = Array.from(new Set(activeItems.map(i => i.city).filter(Boolean))) as string[];
    
    if (cities.length > 1) {
      console.log('🔄 Hybrid Optimization: Routing for cities', cities);
      const stops: RouteStop[] = cities.map((city, idx) => ({
        id: `stop-${idx}`,
        address: `${city}, India`,
        city: city
      }));

      try {
        const hybridResult = await runHybridOptimization(truck, activeItems, stops, 'Bangalore, India');
        setResult(hybridResult.loadResult);
        // We can store more hybrid metrics if we want to show them later
      } catch (error) {
        console.error('Hybrid optimization failed, falling back to basic packing:', error);
        const res = packTruck(truck, activeItems);
        setResult(res);
      }
    } else {
      const res = packTruck(truck, activeItems);
      setResult(res);
    }
    
    setAnimateItems(true);
    setIsCalculating(false);
    stopPlay();
  };

  // Generate AI stability report when result changes
  useEffect(() => {
    if (!result || !selectedTruck) return;
    setStabilityReport('');
    if (!result.centerOfGravity) return;
    setStabilityLoading(true);
    OpenRouterService.generateStabilityReport({
      lateralOffsetCm: Math.abs(result.centerOfGravity.z - selectedTruck.dimensions.width / 2),
      truckWidthCm: selectedTruck.dimensions.width,
      cogHeightCm: result.centerOfGravity.y,
      truckHeightCm: selectedTruck.dimensions.height,
      volumeUtilization: result.volumeUtilization,
      weightUtilization: result.weightUtilization || 0,
      placedItems: result.placedItems.length,
      unplacedItems: result.unplacedItems.length,
      mode: 'truck'
    }).then(res => {
      setStabilityReport(res.text);
      setStabilityLoading(false);
    }).catch(() => setStabilityLoading(false));
  }, [result]);

  // Camera positions for different views
  const getCameraPosition = (): [number, number, number] => {
    const truck = selectedTruck;
    if (!truck) return [800, 500, 900];
    
    const l = truck.dimensions.length;
    const w = truck.dimensions.width;
    const h = truck.dimensions.height;
    
    let position: [number, number, number];
    
    switch (cameraView) {
      case 'top':
        // Top view - camera directly above the truck
        position = [w / 2, Math.max(l, w) * 2.5, l / 2];
        console.log('🎥 Top View Camera Position:', position);
        return position;
      case 'front':
        position = [w / 2, h * 1.2, -400];
        console.log('🎥 Front View Camera Position:', position);
        return position;
      case 'side':
        position = [w * 4, h * 1.2, l / 2];
        console.log('🎥 Side View Camera Position:', position);
        return position;
      case 'isometric':
      default:
        // Angled view showing full truck with trailer
        position = [w * 2.5, h * 2, l * 0.3];
        console.log('🎥 Isometric View Camera Position:', position);
        return position;
    }
  };

  // Initial run
  useEffect(() => {
    if(allTrucks.length > 0 && items.length > 0) {
        handleOptimize();
    }
  }, [selectedTruckId]);



  // Disable animation after items are loaded
  useEffect(() => {
    if (animateItems && result) {
      const timeout = setTimeout(() => {
        setAnimateItems(false);
      }, Math.min(result.placedItems.length * 20 + 500, 3000)); // Faster animation: max 3s
      return () => clearTimeout(timeout);
    }
  }, [animateItems, result]);

  const selectedTruck = allTrucks.find(t => t.id === selectedTruckId);

  // Calculate additional metrics
  const calculateMetrics = () => {
    if (!result || !selectedTruck) return null;
    
    const truck = selectedTruck;
    const truckVolume = truck.dimensions.length * truck.dimensions.width * truck.dimensions.height;
    const usedVolume = result.placedItems.reduce((sum, item) => 
      sum + (item.dimensions.length * item.dimensions.width * item.dimensions.height), 0);
    const remainingVolume = truckVolume - usedVolume;
    
    // Convert cm³ to cubic feet (1 cubic foot = 28316.8466 cubic centimeters)
    const truckVolumeCubicFeet = truckVolume / 28316.8466;
    const usedVolumeCubicFeet = usedVolume / 28316.8466;
    const remainingVolumeCubicFeet = remainingVolume / 28316.8466;
    
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const placedItemsCount = result.placedItems.length;
    const unplacedItemsCount = result.unplacedItems.length;
    
    return {
      truckVolume,
      usedVolume,
      remainingVolume,
      truckVolumeCubicFeet,
      usedVolumeCubicFeet,
      remainingVolumeCubicFeet,
      totalItems,
      placedItemsCount,
      unplacedItemsCount
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto z-10">
          {items.length > 0 && Array.from(new Set(items.map(i => i.city).filter(Boolean))).length > 1 && (
            <div className="mb-4 p-2 bg-indigo-600 rounded-lg flex items-center gap-2 text-white animate-pulse shadow-lg shadow-indigo-500/20">
              <RotateCw className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase leading-tight">Hybrid Mode Active</span>
                <span className="text-[9px] opacity-80 leading-tight">Route-Aware LIFO Packing</span>
              </div>
            </div>
          )}
          
          <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">3D Load Plan</h2>
        
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Truck</label>
            <select 
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
            >
                {allTrucks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
        </div>

        <div className="mb-6">
            <button 
                onClick={() => handleOptimize()}
                disabled={isCalculating}
                className="w-full bg-brand-600 dark:bg-brand-700 text-white py-3 rounded font-bold hover:bg-brand-700 dark:hover:bg-brand-600 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
                {isCalculating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Calculating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Recalculate
                  </>
                )}
            </button>
        </div>

        {result && metrics && (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/40">
                        <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold">Space Utilized</p>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{result.volumeUtilization.toFixed(1)}%</div>
                    </div>
                    
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">Remaining Space</p>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{metrics.remainingVolumeCubicFeet.toFixed(2)} ft³</div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/40">
                        <p className="text-xs text-purple-800 dark:text-purple-300 font-semibold">Items Placed</p>
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{metrics.placedItemsCount}</div>
                    </div>
                    
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/40">
                        <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">Items Unplaced</p>
                        <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{metrics.unplacedItemsCount}</div>
                    </div>
                </div>
                
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/40 mb-2">
                    <p className="text-xs text-indigo-800 dark:text-indigo-300 font-semibold">Volume Occupied</p>
                    <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{metrics.usedVolumeCubicFeet.toFixed(2)} ft³</div>
                </div>
                
                {result.weightUtilization !== undefined && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/40 mb-2">
                      <p className="text-xs text-rose-800 dark:text-rose-300 font-semibold">Weight Utilized ({result.totalWeight || 0}kg)</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-rose-200 dark:bg-rose-900/40 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${result.weightUtilization > 90 ? 'bg-red-500' : 'bg-rose-500'}`} 
                            style={{ width: `${Math.min(100, result.weightUtilization)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400">{result.weightUtilization.toFixed(1)}%</span>
                      </div>
                  </div>
                )}

                {/* Safety & Stability Analysis */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-brand-600" />
                        AI Stability Analysis
                    </h4>
                    
                    {result.centerOfGravity && (
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                                    <span>Lateral Balance (Z-axis)</span>
                                    <span className={Math.abs(result.centerOfGravity.z - selectedTruck.dimensions.width/2) < 20 ? 'text-green-600' : 'text-orange-600'}>
                                        {Math.abs(result.centerOfGravity.z - selectedTruck.dimensions.width/2).toFixed(1)}cm offset
                                    </span>
                                </div>
                                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full relative overflow-hidden">
                                    <div 
                                        className="absolute h-full bg-brand-500 transition-all duration-500"
                                        style={{ 
                                            left: '50%',
                                            width: `${Math.min(50, (Math.abs(result.centerOfGravity.z - selectedTruck.dimensions.width/2) / (selectedTruck.dimensions.width/2)) * 100)}%`,
                                            transform: (result.centerOfGravity.z - selectedTruck.dimensions.width/2) < 0 ? 'translateX(-100%)' : 'translateX(0)'
                                        }}
                                    ></div>
                                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50 z-10"></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                                    <span>Vertical Stability (Height)</span>
                                    <span className="text-brand-600">Low CoG</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-green-500 transition-all duration-500"
                                        style={{ width: `${Math.max(10, 100 - (result.centerOfGravity.y / selectedTruck.dimensions.height) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Safety Rating:</span>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                    result.centerOfGravity && Math.abs(result.centerOfGravity.z - selectedTruck!.dimensions.width/2) < 20
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : result.centerOfGravity && Math.abs(result.centerOfGravity.z - selectedTruck!.dimensions.width/2) < 40
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}>
                                    {result.centerOfGravity && Math.abs(result.centerOfGravity.z - selectedTruck!.dimensions.width/2) < 20 ? 'Optimal' : result.centerOfGravity && Math.abs(result.centerOfGravity.z - selectedTruck!.dimensions.width/2) < 40 ? 'Caution' : 'Rebalance'}
                                </span>
                            </div>

                            {/* AI Plain-English Description */}
                            <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">AI Summary</span>
                              </div>
                              {stabilityLoading ? (
                                <div className="flex items-center gap-2 text-xs text-indigo-500">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Analyzing load...
                                </div>
                              ) : (
                                <p className="text-[10px] leading-relaxed text-slate-700 dark:text-slate-300">
                                  {stabilityReport || 'Run optimization to generate AI analysis.'}
                                </p>
                              )}
                            </div>

                            {/* AI Load Insight */}
                            {selectedTruck && (
                              <LoadAiInsightPanel
                                mode="truck"
                                vehicle={selectedTruck}
                                loadResult={result}
                                showStability={false}
                                compact
                                className="mt-3 !p-3 !bg-violet-50 dark:!bg-violet-950/20 !border-violet-200 dark:!border-violet-800"
                              />
                            )}

                            <button
                                type="button"
                                onClick={() => setFocusCoG(!focusCoG)}
                                className={`w-full mt-3 py-2 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-2 ${
                                    focusCoG 
                                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' 
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                            >
                                <RefreshCw className={`w-3 h-3 ${focusCoG ? 'animate-spin' : ''}`} />
                                {focusCoG ? 'Exit Analysis Mode' : 'Analyze Center of Gravity'}
                            </button>
                        </div>
                    )}
                </div>

                {/* 1-Click PDF Export & Documentation Hub */}
                <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 to-blue-50/80 dark:from-indigo-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      Official Cargo Documentation
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold">
                      PDF Exports
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <button
                      onClick={() => selectedTruck && result && PdfExportService.generate3DLoadManifestPdf(selectedTruck, result, items, 'truck')}
                      className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      Download 3D Load Manifest (PDF)
                    </button>

                    <button
                      onClick={() => selectedTruck && PdfExportService.generateGstEWayBillPdf({
                        vehicleNo: `${selectedTruck.name} (${selectedTruck.id})`,
                        approxDistanceKm: 380,
                        totalValueInr: result.placedItems.length * 12500
                      })}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Generate GST e-Way Bill (PDF)
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white flex items-center justify-between">
                      Unplaced Items ({result.unplacedItems.length})
                      {selectedUnplacedItem && (
                        <button 
                          onClick={() => setSelectedUnplacedItem(null)}
                          className="text-[10px] text-brand-600 hover:underline"
                        >
                          Clear Selection
                        </button>
                      )}
                    </h4>
                    {result.unplacedItems.length > 0 ? (
                        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto pr-1">
                            {result.unplacedItems.map((item, idx) => (
                                <li 
                                  key={idx} 
                                  onClick={() => setSelectedUnplacedItem(selectedUnplacedItem?.index === idx ? null : {item, index: idx})}
                                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                                    selectedUnplacedItem?.index === idx 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' 
                                    : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                                  }`}
                                >
                                    <AlertCircle className="w-3 h-3" /> {item.name}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Box className="w-3 h-3" /> All items fitted!
                        </p>
                    )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Loaded Manifest</h4>
                      {selectedUnplacedItem && selectedPlacedItem && (
                        <button 
                          onClick={() => {
                            // 1. Remove the target item (the one already inside the truck)
                            const filtered = items.filter(i => i.id !== selectedPlacedItem.id);
                            
                            // 2. Ensure the unplaced item is at the VERY FRONT of the list 
                            // This gives it the highest priority in the next packing cycle
                            const itemToPrioritize = items.find(i => i.id === selectedUnplacedItem.item.id);
                            const finalItems = filtered.filter(i => i.id !== selectedUnplacedItem.item.id);
                            
                            if (itemToPrioritize) {
                                finalItems.unshift(itemToPrioritize);
                            }
                            
                            // 3. Update state and trigger re-optimization
                            setItems(finalItems);
                            handleOptimize(finalItems);
                            
                            // 4. Reset selections
                            setSelectedUnplacedItem(null);
                            setSelectedPlacedItem(null);
                          }}
                          className="px-2 py-1 bg-brand-600 text-white text-[10px] font-bold rounded uppercase hover:bg-brand-700 shadow-sm transition-all animate-pulse"
                        >
                          Confirm Replace
                        </button>
                      )}
                    </div>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-60 overflow-y-auto pr-1">
                        {result.placedItems.map((item) => (
                             <li 
                                key={item.uuid} 
                                onClick={() => {
                                  if (selectedUnplacedItem) {
                                    setSelectedPlacedItem(selectedPlacedItem?.uuid === item.uuid ? null : item);
                                  } else {
                                    setFocusedItemUuid(focusedItemUuid === item.uuid ? null : item.uuid);
                                    setFocusCoG(false);
                                  }
                                }}
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                                  (selectedUnplacedItem && selectedPlacedItem?.uuid === item.uuid) || (!selectedUnplacedItem && focusedItemUuid === item.uuid)
                                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 font-bold border border-brand-200' 
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                             >
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                                <span className="flex-1 truncate">{item.name}</span>
                                {item.city && <span className="text-[9px] opacity-60">({item.city})</span>}
                             </li>
                        ))}
                    </ul>
                </div>
            </div>
        )}
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 min-h-[450px] md:min-h-0 bg-slate-900 dark:bg-black relative">
        {/* Camera View Controls */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
          <button
            onClick={() => setCameraView('isometric')}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${
              cameraView === 'isometric' ? 'bg-brand-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            <Camera className="w-4 h-4 inline mr-1" /> Isometric
          </button>
          <button
            onClick={() => setCameraView('top')}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${
              cameraView === 'top' ? 'bg-brand-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            Top View
          </button>
          <button
            onClick={() => setCameraView('front')}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${
              cameraView === 'front' ? 'bg-brand-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            Front View
          </button>
          <button
            onClick={() => setCameraView('side')}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${
              cameraView === 'side' ? 'bg-brand-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            Side View
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${
              autoRotate ? 'bg-green-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
            }`}
            title="Toggle auto-rotation"
          >
            <RotateCw className="w-4 h-4 inline mr-1" /> Auto-Rotate
          </button>
          {result && (
            <LoadPlaySequenceButton
              playMode={playMode}
              playIndex={playIndex}
              total={loadingSequence.length}
              onToggle={togglePlay}
            />
          )}
        </div>
        {result && selectedTruck ? (
            <>
            <div className="absolute top-20 left-4 z-10 bg-black/70 text-white text-xs p-2 rounded">
              View: {cameraView} | Camera: {getCameraPosition().join(', ')}
            </div>
            <Canvas 
              key={cameraView}
              camera={{ 
                position: getCameraPosition(), 
                fov: 50,
                up: [0, 1, 0]
              }} 
              shadows
              gl={{ antialias: true, alpha: false }}
              onCreated={() => console.log('✅ Canvas created for view:', cameraView)}
            >
                {/* Clean white/light background */}
                <color attach="background" args={['#f1f5f9']} />
                
                {/* Professional lighting */}
                <ambientLight intensity={0.7} />
                
                {/* Main light from top-right */}
                <directionalLight 
                  position={[400, 600, 300]} 
                  intensity={1.8} 
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                  shadow-camera-far={2000}
                  shadow-camera-left={-800}
                  shadow-camera-right={800}
                  shadow-camera-top={800}
                  shadow-camera-bottom={-800}
                />
                
                {/* Fill light from left */}
                <directionalLight position={[-300, 400, 200]} intensity={0.6} />
                
                {/* Natural hemisphere light */}
                <hemisphereLight args={['#ffffff', '#94a3b8', 0.5]} />
                
                {/* Setup camera to look at target */}
                <CameraSetup 
                  view={cameraView}
                  target={[selectedTruck.dimensions.width/2, 30, selectedTruck.dimensions.length/2]}
                />
                
                <OrbitControls 
                  target={[selectedTruck.dimensions.width/2, 30, selectedTruck.dimensions.length/2]} 
                  autoRotate={autoRotate && cameraView === 'isometric'}
                  autoRotateSpeed={1.5}
                  enableDamping
                  dampingFactor={0.05}
                  minDistance={400}
                  maxDistance={2000}
                />
                
                {/* Truck Frame */}
                <TruckContainer dimensions={{ l: selectedTruck.dimensions.length, w: selectedTruck.dimensions.width, h: selectedTruck.dimensions.height }} />

                {/* Animated Items - Respect Focus Modes and Play Mode */}
                {!focusCoG && (
                  loadingSequence
                    .slice(0, visibleCount)
                    .filter(item => !focusedItemUuid || item.uuid === focusedItemUuid)
                    .map((item, index) => (
                      <AnimatedBox
                        key={item.uuid}
                        targetPosition={[
                          item.position[2] + item.dimensions.width / 2,
                          item.position[1] + item.dimensions.height / 2 + 34,
                          item.position[0] + item.dimensions.length / 2
                        ]}
                        args={[item.dimensions.width, item.dimensions.height, item.dimensions.length]}
                        color={item.color}
                        delay={playMode ? 0 : (animateItems ? index * 0.015 : 0)}
                        name={item.name}
                        city={item.city}
                      />
                    ))
                )}
                
                {/* Center of Gravity Indicator */}
                {result.centerOfGravity && (
                  <CoGIndicator
                    cog={result.centerOfGravity}
                    floorOffset={34}
                    radius={focusCoG ? 24 : 12}
                    emphasized={focusCoG}
                  />
                )}

                {/* Simple clean grid */}
                <gridHelper 
                  args={[2500, 50, '#cbd5e1', '#e2e8f0']} 
                  position={[0, -5, 0]} 
                />
            </Canvas>
            </>
        ) : isCalculating ? (
            <div className="flex flex-col items-center justify-center h-full text-white">
                <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                <p>Calculating optimal load plan...</p>
            </div>
        ) : (
            <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                    <Box className="w-12 h-12 mx-auto mb-4" />
                    <p>Select a truck and add items to visualize the load plan</p>
                </div>
            </div>
        )}
        
        <div className="absolute top-4 right-4 bg-black/50 dark:bg-black/70 text-white text-xs p-2 rounded backdrop-blur-sm">
            <p>Left Click: Rotate</p>
            <p>Right Click: Pan</p>
            <p>Scroll: Zoom</p>
        </div>
      </div>
    </div>
  );
};