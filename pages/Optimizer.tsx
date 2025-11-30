import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { StorageService } from '../services/storage';
import { packTruck } from '../services/packer';
import { Truck, Item, PlacedItem, LoadResult } from '../types';
import { Box, AlertCircle, RefreshCw, Camera, RotateCw } from 'lucide-react';
import { TRUCK_OPTIONS } from '../constants';

// -- 3D COMPONENTS --

// Animated box that drops into place with professional motion
const AnimatedBox: React.FC<{
  targetPosition: [number, number, number],
  args: [number, number, number],
  color: string,
  delay: number,
  name: string
}> = ({ targetPosition, args, color, delay, name }) => {
  const meshRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);

  useFrame((state, delta) => {
    if (progress < 1) {
      setProgress(Math.min(progress + delta * 1.2, 1));
    }
  });

  // Professional easing - ease-out-cubic for smooth deceleration
  const easeOutCubic = (t: number) => {
    return 1 - Math.pow(1 - t, 3);
  };

  const adjustedProgress = Math.max(0, (progress - delay) / (1 - delay));
  const easedProgress = easeOutCubic(Math.min(adjustedProgress, 1));

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
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...args)]} />
          <lineBasicMaterial color="#000000" linewidth={2} opacity={easedProgress} transparent />
        </lineSegments>
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
          {name}
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
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...args)]} />
        <lineBasicMaterial color="black" linewidth={1} />
      </lineSegments>
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
  const [items] = useState<Item[]>(StorageService.getItems());
  const [selectedTruckId, setSelectedTruckId] = useState<string>(storedTrucks[0]?.id || TRUCK_OPTIONS[0].id);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [cameraView, setCameraView] = useState<'isometric' | 'top' | 'front' | 'side'>('isometric');
  const [autoRotate, setAutoRotate] = useState(true);
  const [animateItems, setAnimateItems] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

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

  const handleOptimize = () => {
    const truck = allTrucks.find(t => t.id === selectedTruckId);
    if (!truck || items.length === 0) return;

    setIsCalculating(true);
    // Simulate calculation delay for better UX
    setTimeout(() => {
      const res = packTruck(truck, items);
      setResult(res);
      setAnimateItems(true); // Trigger animation when recalculating
      setIsCalculating(false);
    }, 300);
  };

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
    if (allTrucks.length > 0 && items.length > 0) {
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
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">3D Load Visualization</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Transport Unit</label>
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
            onClick={handleOptimize}
            disabled={isCalculating}
            className="w-full bg-brand-600 dark:bg-brand-700 text-white py-3 rounded font-bold hover:bg-brand-700 dark:hover:bg-brand-600 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {isCalculating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Calculating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Re-Optimize Load
              </>
            )}
          </button>
        </div>

        {result && metrics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-800 font-semibold">Space Utilized</p>
                <div className="text-lg font-bold text-blue-600">{result.volumeUtilization.toFixed(1)}%</div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs text-green-800 font-semibold">Remaining Space</p>
                <div className="text-lg font-bold text-green-600">{metrics.remainingVolumeCubicFeet.toFixed(2)} ft³</div>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs text-purple-800 font-semibold">Items Placed</p>
                <div className="text-lg font-bold text-purple-600">{metrics.placedItemsCount}</div>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-xs text-orange-800 font-semibold">Items Unplaced</p>
                <div className="text-lg font-bold text-orange-600">{metrics.unplacedItemsCount}</div>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-xs text-indigo-800 font-semibold">Volume Occupied</p>
              <div className="text-lg font-bold text-indigo-600">{metrics.usedVolumeCubicFeet.toFixed(2)} ft³</div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">Unplaced Items ({result.unplacedItems.length})</h4>
              {result.unplacedItems.length > 0 ? (
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                  {result.unplacedItems.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
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
              <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">Loaded Manifest</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-40 overflow-y-auto">
                {result.placedItems.map((item) => (
                  <li key={item.uuid} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 bg-slate-900 dark:bg-black relative">
        {/* Camera View Controls */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
          <button
            onClick={() => setCameraView('isometric')}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${cameraView === 'isometric' ? 'bg-brand-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
              }`}
          >
            <Camera className="w-4 h-4 inline mr-1" /> Isometric
          </button>
          <button
            onClick={() => setCameraView('top')}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${cameraView === 'top' ? 'bg-brand-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
              }`}
          >
            Top View
          </button>
          <button
            onClick={() => setCameraView('front')}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${cameraView === 'front' ? 'bg-brand-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
              }`}
          >
            Front View
          </button>
          <button
            onClick={() => setCameraView('side')}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${cameraView === 'side' ? 'bg-brand-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
              }`}
          >
            Side View
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-2 rounded text-xs font-semibold transition ${autoRotate ? 'bg-green-600 text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800'
              }`}
            title="Toggle auto-rotation"
          >
            <RotateCw className="w-4 h-4 inline mr-1" /> Auto-Rotate
          </button>
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
                target={[selectedTruck.dimensions.width / 2, 30, selectedTruck.dimensions.length / 2]}
              />

              <OrbitControls
                target={[selectedTruck.dimensions.width / 2, 30, selectedTruck.dimensions.length / 2]}
                autoRotate={autoRotate && cameraView === 'isometric'}
                autoRotateSpeed={1.5}
                enableDamping
                dampingFactor={0.05}
                minDistance={400}
                maxDistance={2000}
              />

              {/* Truck Frame */}
              <TruckContainer dimensions={{ l: selectedTruck.dimensions.length, w: selectedTruck.dimensions.width, h: selectedTruck.dimensions.height }} />

              {/* Animated Items */}
              {animateItems ? (
                result.placedItems.map((item, index) => (
                  <AnimatedBox
                    key={item.uuid}
                    targetPosition={[
                      // Convert from packing algorithm coordinates to 3D scene coordinates
                      // Algorithm uses [length, height, width] -> 3D uses [x, y, z]
                      // But container is oriented with [width, height, length] in 3D space
                      // So we map: algorithm X (length) -> 3D Z, algorithm Y (height) -> 3D Y, algorithm Z (width) -> 3D X
                      item.position[2] + item.dimensions.width / 2,
                      // Add 30 to account for container floor height
                      item.position[1] + item.dimensions.height / 2 + 30,
                      // Map algorithm length to 3D Z coordinate
                      item.position[0] + item.dimensions.length / 2
                    ]}
                    args={[item.dimensions.width, item.dimensions.height, item.dimensions.length]}
                    color={item.color}
                    delay={index * 0.02}
                    name={item.name}
                  />
                ))
              ) : (
                result.placedItems.map((item) => (
                  <BoxMesh
                    key={item.uuid}
                    position={[
                      // Convert from packing algorithm coordinates to 3D scene coordinates
                      // Algorithm uses [length, height, width] -> 3D uses [x, y, z]
                      // But container is oriented with [width, height, length] in 3D space
                      // So we map: algorithm X (length) -> 3D Z, algorithm Y (height) -> 3D Y, algorithm Z (width) -> 3D X
                      item.position[2] + item.dimensions.width / 2,
                      // Add 30 to account for container floor height
                      item.position[1] + item.dimensions.height / 2 + 30,
                      // Map algorithm length to 3D Z coordinate
                      item.position[0] + item.dimensions.length / 2
                    ]}
                    args={[item.dimensions.width, item.dimensions.height, item.dimensions.length]}
                    color={item.color}
                  />
                ))
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
            <p>Processing volumetric optimization...</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center">
              <Box className="w-12 h-12 mx-auto mb-4" />
              <p>Select a transport unit and cargo to generate 3D load plan</p>
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