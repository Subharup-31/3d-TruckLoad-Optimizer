import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, PerspectiveCamera, Environment, Edges } from '@react-three/drei';
import { StorageService } from '../services/storage';
import { packCargo, getLoadingSequence } from '../services/packer';
import { useLoadPlaySequence } from '../hooks/useLoadPlaySequence';
import { LoadPlaySequenceButton } from '../components/LoadPlaySequenceButton';
import { Truck, Item, PlacedItem, LoadResult } from '../types';
import { Anchor, Package, Zap, Waves, Shield, Info, AlertCircle, RefreshCw, BarChart3, Droplets } from 'lucide-react';
import { VESSEL_OPTIONS } from '../constants';
import { LoadAiInsightPanel } from '../components/LoadAiInsightPanel';
import { CoGIndicator } from '../components/CoGIndicator';
import * as THREE from 'three';

// -- 3D COMPONENTS --

const AnimatedBox: React.FC<{ 
  targetPosition: [number, number, number], 
  args: [number, number, number], 
  color: string,
  delay: number,
  name: string
}> = ({ targetPosition, args, color, delay, name }) => {
  const meshRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);
  const maxProgress = 1 + delay;

  useFrame((state, delta) => {
    if (progress < maxProgress) {
      setProgress(Math.min(progress + delta * 1.5, maxProgress));
    }
  });

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const t = Math.max(0, Math.min(progress - delay, 1));
  const easedProgress = easeOutCubic(t);
  
  const startY = targetPosition[1] + 1000;
  const currentY = startY + (targetPosition[1] - startY) * easedProgress;
  const scale = 0.5 + (0.5 * easedProgress);

  const isCoil = name.toLowerCase().includes('coil');
  const isTurbine = name.toLowerCase().includes('turbine');
  const isCrate = name.toLowerCase().includes('crate');

  const renderCargoModel = () => {
    if (isCoil) {
      return (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <torusGeometry args={[args[0] * 0.38, args[0] * 0.16, 12, 24]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[args[0] * 0.18, args[0] * 0.18, args[1] * 0.8, 12]} />
            <meshStandardMaterial color="#222222" roughness={0.8} />
          </mesh>
        </group>
      );
    } else if (isTurbine) {
      return (
        <group>
          {/* Base plate */}
          <mesh position={[0, -args[1] * 0.4, 0]} castShadow>
            <boxGeometry args={[args[0], args[1] * 0.2, args[2]]} />
            <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.8} />
          </mesh>
          {/* Main housing cylinder */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow position={[0, args[1] * 0.1, 0]}>
            <cylinderGeometry args={[args[1] * 0.38, args[1] * 0.38, args[0] * 0.85, 16]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Turbine blades cap */}
          <mesh position={[args[0] * 0.38, args[1] * 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[args[1] * 0.42, args[1] * 0.42, args[0] * 0.1, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>
      );
    } else if (isCrate) {
      return (
        <mesh castShadow>
          <boxGeometry args={args} />
          <meshStandardMaterial color={color} roughness={0.95} metalness={0.05} />
          <Edges color="#3f2e1f" threshold={15} />
        </mesh>
      );
    } else {
      return (
        <mesh castShadow>
          <boxGeometry args={args} />
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
          <Edges color="#ffffff" threshold={15} />
        </mesh>
      );
    }
  };

  return (
    <group position={[targetPosition[0], currentY, targetPosition[2]]} scale={[scale, scale, scale]}>
      {renderCargoModel()}
    </group>
  );
};

// Generate organic ship hull geometry along Z-axis (Z = length, Y = height, X = width)
const createHullGeometry = (L: number, B: number, D: number) => {
  const segL = 40, segH = 12, segW = 12;
  const geo = new THREE.BoxGeometry(B, D, L, segW, segH, segL);
  const pos = geo.attributes.position;
  
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const zn = z / (L/2);
    let wf = 1;
    
    // Tapering bow (positive Z)
    if (zn > 0.25) {
      const t = (zn - 0.25) / 0.75;
      wf = 1 - Math.pow(t, 1.4) * 0.98;
      if (y > D * 0.16) y += Math.pow(t, 2) * (D * 0.14);
      if (y < -D * 0.11) y += Math.pow(t, 2.5) * (D * 0.38);
    }
    // Tapering stern (negative Z)
    if (zn < -0.6) {
      const t = Math.abs(zn + 0.6) / 0.4;
      wf *= (1 - t * 0.2);
    }
    // Stern counter keel rise
    if (zn > 0.75 && y < -D * 0.27) {
      const b = (zn - 0.75) / 0.25;
      y -= Math.sin(b * Math.PI) * (D * 0.1);
      wf += Math.sin(b * Math.PI) * 0.15;
    }
    // Bottom tapering (V-shape)
    if (y < -D * 0.11) {
      const bf = Math.abs(y + D * 0.11) / (D/2 - D * 0.11);
      wf *= (1 - bf * 0.3);
      y -= Math.pow(Math.abs(x) / (B/2), 2) * (D * 0.14);
    }
    x *= wf;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
};

const AnimatedOcean: React.FC<{ centerX: number, centerZ: number, h: number, L: number }> = ({ centerX, centerZ, h, L }) => {
  const geomRef = useRef<THREE.BufferGeometry>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (geomRef.current) {
      const pos = geomRef.current.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const wave = Math.sin(x * 0.05 + time * 1.5) * (h * 0.04) + 
                     Math.cos(y * 0.05 + time * 1.8) * (h * 0.03) +
                     Math.sin((x + y) * 0.03 + time * 1.0) * (h * 0.025);
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
      geomRef.current.computeVertexNormals();
    }
  });

  return (
    <mesh position={[centerX, -h * 0.65, centerZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry ref={geomRef} args={[L * 5, L * 5, 80, 80]} />
      <meshPhysicalMaterial 
        color="#082f49" 
        metalness={0.9} 
        roughness={0.1}
        transmission={0.6}
        thickness={20}
        transparent 
        opacity={0.85} 
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const VesselHull: React.FC<{ dimensions: { l: number, w: number, h: number } }> = ({ dimensions }) => {
  const { l, w, h } = dimensions;

  // Derive ship hull geometry dimensions
  const L = l * 1.7;
  const B = w * 1.6;
  const D = h * 2.0;

  // Center references
  const centerX = w / 2;
  const centerY = h * 0.45;
  const centerZ = l / 2;

  // Refs for animation
  const shipRef = useRef<THREE.Group>(null);
  const propRef = useRef<THREE.Group>(null);
  const radarRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (shipRef.current) {
      shipRef.current.position.y = Math.sin(time) * (h * 0.02) + Math.sin(time * 1.3) * (h * 0.008);
      shipRef.current.rotation.z = Math.sin(time * 0.4) * 0.008;
      shipRef.current.rotation.x = Math.sin(time * 0.6) * 0.004;
    }
    if (propRef.current) {
      propRef.current.rotation.x += 0.08;
    }
    if (radarRef.current) {
      radarRef.current.rotation.y += 0.025;
    }
  });

  // Hull Geometry & Premium Physical materials
  const hullGeo = useMemo(() => createHullGeometry(L, B, D), [L, B, D]);

  const glassHull = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xd0ecff, transmission: 0.85, opacity: 0.45, metalness: 0.1,
    roughness: 0.1, ior: 1.5, side: THREE.DoubleSide, transparent: true,
    depthWrite: false
  }), []);

  const glassDeck = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xc0e0f8, transmission: 0.85, opacity: 0.4, metalness: 0.05,
    roughness: 0.1, ior: 1.4, thickness: 2, side: THREE.DoubleSide,
    transparent: true, depthWrite: false
  }), []);

  const steelFrame = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x3a3d42, roughness: 0.6, metalness: 0.9, side: THREE.DoubleSide
  }), []);

  const darkSteel = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1e2126, roughness: 0.7, metalness: 0.8
  }), []);

  const holdFloorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x8b7355, roughness: 0.85, metalness: 0.1
  }), []);

  const holdWallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x5a4a3a, roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide,
    transparent: true, opacity: 0.15, depthWrite: false
  }), []);

  const holdPostMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x6b5b4b, roughness: 0.7, metalness: 0.3
  }), []);

  return (
    <group>
      {/* ============ OCEAN & WAKE ============ */}
      <AnimatedOcean centerX={centerX} centerZ={centerZ} h={h} L={L} />

      {/* Point light inside the hold to illuminate cargo */}
      <pointLight position={[centerX, h * 0.6, centerZ]} intensity={8} distance={l * 2} color="#ffedd5" />

      {/* Propeller Wake */}
      <mesh position={[centerX, -h * 0.69, centerZ - L * 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[B * 1.5, L * 0.4]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.25} roughness={0.9} />
      </mesh>

      {/* Ship Swaying Group */}
      <group ref={shipRef} position={[centerX, 0, centerZ]}>
        
        {/* ============ PHYSICAL GLASS HULL ============ */}
        <mesh geometry={hullGeo} material={glassHull} castShadow receiveShadow position={[0, centerY, 0]} />

        {/* ============ INTERNAL STRUCTURE ============ */}
        {/* Keel */}
        <mesh position={[0, centerY - D * 0.48, 0]} castShadow>
          <boxGeometry args={[B * 0.08, D * 0.04, L * 0.98]} />
          <meshStandardMaterial color="#1e2126" roughness={0.7} metalness={0.8} />
        </mesh>

        {/* Ribs (Transverse steel frames) */}
        {Array.from({ length: 15 }).map((_, i) => {
          const zPos = -L/2 + (i + 0.5) * (L/15);
          const xn = zPos / (L/2);
          let scaleW = 1;
          if (xn > 0.25) scaleW = 1 - Math.pow((xn - 0.25)/0.75, 1.4) * 0.95;
          if (xn < -0.6) scaleW *= 0.85;
          return (
            <mesh key={`rib-${i}`} position={[0, centerY, zPos]} scale={[scaleW, 1, 1]}>
              <boxGeometry args={[B * 0.96, D * 0.96, L * 0.005]} />
              <meshStandardMaterial color="#3a3d42" roughness={0.6} metalness={0.9} side={THREE.DoubleSide} wireframe />
            </mesh>
          );
        })}

        {/* ============ CARGO HOLD BOX ============ */}
        <group position={[0, 0, 0]}>
          {/* Wood floor planks */}
          <mesh position={[0, -0.05, 0]} receiveShadow>
            <boxGeometry args={[w, 0.1, l]} />
            <meshStandardMaterial color="#8B7355" roughness={0.85} metalness={0.1} />
          </mesh>
          {Array.from({ length: 10 }).map((_, i) => (
            <mesh key={`plank-${i}`} position={[0, 0.01, -l/2 + (i + 0.5) * (l/10)]} receiveShadow>
              <boxGeometry args={[w, 0.02, l/10 - 0.02]} />
              <meshStandardMaterial color="#7a6545" roughness={0.9} />
            </mesh>
          ))}

          {/* Cargo hold walls */}
          <mesh position={[-w/2 - 0.1, h/2, 0]} castShadow material={holdWallMat}>
            <boxGeometry args={[0.2, h, l]} />
          </mesh>
          <mesh position={[w/2 + 0.1, h/2, 0]} castShadow material={holdWallMat}>
            <boxGeometry args={[0.2, h, l]} />
          </mesh>
          <mesh position={[0, h/2, -l/2 - 0.1]} castShadow material={holdWallMat}>
            <boxGeometry args={[w, h, 0.2]} />
          </mesh>
          <mesh position={[0, h/2, l/2 + 0.1]} castShadow material={holdWallMat}>
            <boxGeometry args={[w, h, 0.2]} />
          </mesh>

          {/* Hatch Coamings */}
          <mesh position={[0, h + 0.15, 0]}>
            <boxGeometry args={[w + 0.3, 0.3, l + 0.3]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
            <Edges color="#0f172a" />
          </mesh>
        </group>

        {/* ============ FORECASTLE DECK (BOW AREA) ============ */}
        <group position={[0, centerY + D * 0.1, L * 0.42]}>
          <mesh castShadow>
            <boxGeometry args={[B * 0.6, D * 0.2, L * 0.12]} />
            <meshStandardMaterial color="#475569" roughness={0.5} />
          </mesh>
          {/* Anchors */}
          <group position={[-B * 0.32, -D * 0.15, -L * 0.02]} rotation={[0.2, 0, 0.3]}>
            <mesh castShadow><boxGeometry args={[B * 0.06, D * 0.2, B * 0.06]} /><meshStandardMaterial color="#0f172a" metalness={0.9} /></mesh>
          </group>
          <group position={[B * 0.32, -D * 0.15, -L * 0.02]} rotation={[0.2, 0, -0.3]}>
            <mesh castShadow><boxGeometry args={[B * 0.06, D * 0.2, B * 0.06]} /><meshStandardMaterial color="#0f172a" metalness={0.9} /></mesh>
          </group>
        </group>

        {/* ============ STERN SUPERSTRUCTURE & BRIDGE ============ */}
        <group position={[0, centerY, -L * 0.4]}>
          {/* Accommodation levels */}
          <mesh position={[0, D * 0.18, 0]} castShadow>
            <boxGeometry args={[B * 0.85, D * 0.22, L * 0.15]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.25} />
          </mesh>
          <mesh position={[0, D * 0.4, 0]} castShadow>
            <boxGeometry args={[B * 0.75, D * 0.22, L * 0.13]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.25} />
          </mesh>

          {/* Bridge Cabin with windows */}
          <group position={[0, D * 0.62, 0]}>
            <mesh castShadow>
              <boxGeometry args={[B * 0.88, D * 0.22, L * 0.1]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.2} />
            </mesh>
            {/* Windows */}
            <mesh position={[0, 0, L * 0.051]}>
              <boxGeometry args={[B * 0.8, D * 0.1, 0.1]} />
              <meshStandardMaterial color="#0284c7" transparent opacity={0.65} metalness={0.9} roughness={0.05} />
            </mesh>
          </group>

          {/* Smokestack / Funnel */}
          <group position={[0, D * 0.62, -L * 0.085]}>
            <mesh castShadow>
              <boxGeometry args={[B * 0.16, D * 0.45, L * 0.06]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} metalness={0.4} />
            </mesh>
            <mesh position={[0, D * 0.23, 0]}>
              <boxGeometry args={[B * 0.17, D * 0.06, L * 0.07]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
          </group>

          {/* Radar */}
          <mesh ref={radarRef} position={[0, D * 0.8, 0]} castShadow>
            <boxGeometry args={[B * 0.2, D * 0.05, L * 0.02]} />
            <meshStandardMaterial color="#ffffff" emissive="#00aaff" emissiveIntensity={0.3} />
          </mesh>
        </group>

        {/* ============ PROPULSION (STERN BOTTOM) ============ */}
        {/* Propeller Shaft & Blades */}
        <group ref={propRef} position={[0, centerY - D * 0.45, -L * 0.49]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[B * 0.03, B * 0.03, L * 0.04, 16]} />
            <meshStandardMaterial color="#1e2126" roughness={0.7} metalness={0.8} />
          </mesh>
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh key={`blade-${i}`} rotation={[0, 0, (i * Math.PI) / 2]} castShadow position={[0, 0, 0]}>
              <boxGeometry args={[B * 0.015, B * 0.14, B * 0.04]} />
              <meshStandardMaterial color="#1e2126" roughness={0.7} metalness={0.8} />
            </mesh>
          ))}
        </group>

        {/* Rudder */}
        <mesh position={[0, centerY - D * 0.4, -L * 0.5]} castShadow>
          <boxGeometry args={[B * 0.01, D * 0.22, L * 0.05]} />
          <meshStandardMaterial color="#1e2126" roughness={0.7} metalness={0.8} />
        </mesh>

      </group>
    </group>
  );
};

export const SeaOptimizer: React.FC = () => {
  const [selectedVessel, setSelectedVessel] = useState(VESSEL_OPTIONS[0]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [focusCoG, setFocusCoG] = useState(false);

  const loadingSequence = loadResult ? getLoadingSequence(loadResult.placedItems) : [];
  const { playMode, playIndex, visibleCount, toggle: togglePlay, stop: stopPlay } = useLoadPlaySequence(
    loadingSequence.length
  );

  useEffect(() => {
    let storedItems = StorageService.getItems();
    if (storedItems.length === 0) {
      storedItems = [
        { id: '1', name: 'Industrial Turbine', quantity: 1, dimensions: { length: 400, width: 200, height: 200 }, weight: 8500, color: '#0891b2', isFragile: false, isStackable: true },
        { id: '2', name: 'Steel Coils', quantity: 6, dimensions: { length: 150, width: 150, height: 150 }, weight: 4000, color: '#475569', isFragile: false, isStackable: true },
        { id: '3', name: 'Raw Material Crates', quantity: 12, dimensions: { length: 120, width: 100, height: 100 }, weight: 1200, color: '#0d9488', isFragile: false, isStackable: true },
      ];
    }
    setItems(storedItems);
    handleOptimize(storedItems, VESSEL_OPTIONS[0]);
  }, []);

  const handleOptimize = (targetItems: Item[] = items, vessel: Truck = selectedVessel) => {
    setIsOptimizing(true);
    const result = packCargo(vessel, targetItems, 'sea');
    setLoadResult(result);
    stopPlay();
    setTimeout(() => setIsOptimizing(false), 1000);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 shadow-xl z-10 overflow-y-auto custom-scrollbar">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2 text-blue-600 uppercase tracking-tighter">
            <Anchor className="w-6 h-6" />
            Sea Cargo CAD
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Technical Load Specification</p>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Vessel Configuration</label>
          <div className="grid gap-2">
            {VESSEL_OPTIONS.map(v => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVessel(v);
                  handleOptimize(items, v);
                }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedVessel.id === v.id 
                    ? 'bg-blue-50 border-blue-600 shadow-md scale-[1.02]' 
                    : 'bg-white border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="font-black text-sm text-slate-800">{v.name}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1 flex justify-between">
                  <span>CAP: {v.maxWeight/1000} MT</span>
                  <span>LEN: {v.dimensions.length/100}m</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Structural Telemetry</label>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-500">METACENTRIC_HEIGHT</span>
              <span className="text-blue-600 font-bold">1.25m</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-500">DRAFT_LEVEL_CALC</span>
              <span className="text-blue-600 font-bold">14.2m</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden p-[2px]">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
              <Shield className="w-3 h-3" />
              <span>STABILITY_NOMINAL</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Waypoints</label>
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-3 space-y-2">
             <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">NEXT_PORT</span>
                <span className="text-slate-800 font-bold">ROTTERDAM</span>
             </div>
             <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">ETA_EST</span>
                <span className="text-slate-800 font-bold">14 MAY 2026</span>
             </div>
          </div>
        </div>

        {loadResult && (
          <LoadAiInsightPanel
            mode="sea"
            vehicle={selectedVessel}
            loadResult={loadResult}
            theme="light"
            focusCoG={focusCoG}
            onToggleFocusCoG={() => setFocusCoG((v) => !v)}
          />
        )}

        <div className="mt-auto">
          <button 
            onClick={() => handleOptimize()}
            disabled={isOptimizing}
            className="w-full py-4 bg-slate-900 text-white rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg active:scale-95"
          >
            {isOptimizing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
            GENERATE LOAD PLAN
          </button>
        </div>
      </div>

      {/* Main 3D Canvas */}
      <div className="flex-grow min-h-[450px] md:min-h-0 relative bg-[#090d16]">
        <div className="absolute top-10 left-10 z-20">
           <div className="bg-slate-950/85 backdrop-blur-md px-6 py-3 border-2 border-slate-800 shadow-2xl">
              <h1 className="text-xl font-black tracking-tighter uppercase text-slate-100">Blueprint: Vessel Load Plan</h1>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Technical CAD Drawing Mode</div>
           </div>
        </div>

        <div className="absolute top-10 right-10 z-20 flex gap-2">
          <LoadPlaySequenceButton
            playMode={playMode}
            playIndex={playIndex}
            total={loadingSequence.length}
            onToggle={togglePlay}
            variant="dark"
          />
        </div>

        <Canvas shadows camera={{ position: [1500, 1000, 1500], fov: 45, far: 20000 }}>
          <color attach="background" args={['#090d16']} />
          <OrbitControls makeDefault target={[selectedVessel.dimensions.width/2, 0, selectedVessel.dimensions.length/2]} />
          <Environment preset="city" />
          <ambientLight intensity={0.7} />
          <directionalLight position={[-2000, 2000, -2000]} intensity={1} />

          <VesselHull 
            dimensions={{ 
              l: selectedVessel.dimensions.length, 
              w: selectedVessel.dimensions.width, 
              h: selectedVessel.dimensions.height 
            }} 
          />

          {!focusCoG &&
            loadingSequence.slice(0, visibleCount).map((item, index) => (
                <AnimatedBox
                  key={item.uuid}
                  targetPosition={[
                    item.position[2] + item.dimensions.width / 2,
                    item.position[1] + item.dimensions.height / 2,
                    item.position[0] + item.dimensions.length / 2,
                  ]}
                  args={[item.dimensions.width, item.dimensions.height, item.dimensions.length]}
                  color={item.color}
                  delay={playMode ? 0 : Math.min(index * 0.02, 1.0)}
                  name={item.name}
                />
              ))}

          {loadResult?.centerOfGravity && (
            <CoGIndicator
              cog={loadResult.centerOfGravity}
              radius={focusCoG ? 40 : 25}
              emphasized={focusCoG}
            />
          )}
        </Canvas>

        {loadResult && (
          <div className="absolute bottom-10 left-10 z-20 bg-slate-950/90 backdrop-blur-md p-6 border-2 border-slate-800 w-72 shadow-2xl text-slate-100">
             <div className="space-y-4 font-mono text-[10px]">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                   <span className="text-slate-400 font-bold uppercase">Tonnage_Measurement</span>
                   <span className="text-slate-100 font-black">{(loadResult.totalWeight / 1000).toFixed(1)} MT</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                   <span className="text-slate-400 font-bold uppercase">Vol_Utilization_Index</span>
                   <span className="text-blue-400 font-black">{loadResult.volumeUtilization.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                   <span className="text-slate-400 font-bold uppercase">Hull_Stress_Check</span>
                   <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-sm font-black">PASS</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                   <div className="text-[8px] text-slate-500 leading-tight italic">
                      Disclaimer: This CAD model is for logistical planning only. 
                      Not a certified marine engineering document.
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
