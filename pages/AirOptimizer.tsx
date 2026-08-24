import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, PerspectiveCamera, Environment, Edges } from '@react-three/drei';
import { StorageService } from '../services/storage';
import { packCargo, getLoadingSequence } from '../services/packer';
import { useLoadPlaySequence } from '../hooks/useLoadPlaySequence';
import { LoadPlaySequenceButton } from '../components/LoadPlaySequenceButton';
import { Truck, Item, PlacedItem, LoadResult } from '../types';
import { Plane, Package, Zap, Wind, Shield, Info, AlertCircle, RefreshCw, BarChart3, Cloud, Anchor } from 'lucide-react';
import { AIRCRAFT_OPTIONS } from '../constants';
import { LoadAiInsightPanel } from '../components/LoadAiInsightPanel';
import { CoGIndicator } from '../components/CoGIndicator';
import * as THREE from 'three';

// -- 3D COMPONENTS --

const AMJContainer: React.FC<{ args: [number, number, number], color: string }> = ({ args, color }) => {
  const [w, h, d] = args;
  return (
    <group>
      {/* Main Box Body */}
      <mesh castShadow position={[-w * 0.1, 0, 0]}>
        <boxGeometry args={[w * 0.8, h, d]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Cylinder transition */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[w * 0.3, 0, 0]} castShadow>
        <cylinderGeometry args={[h / 2, h / 2, w * 0.1, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Sphere Nose Cap */}
      <mesh rotation={[0, 0, -Math.PI / 2]} position={[w * 0.35, 0, 0]} castShadow>
        <sphereGeometry args={[h / 2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Label Text */}
      <Text
        position={[0, 0, d / 2 + 0.02]}
        fontSize={h * 0.22}
        color="#333333"
        anchorX="center"
        anchorY="middle"
      >
        AMJ
      </Text>
    </group>
  );
};

const NetPallet: React.FC<{ args: [number, number, number], color: string }> = ({ args, color }) => {
  const [w, h, d] = args;
  return (
    <group>
      {/* Wood Base */}
      <mesh position={[0, -h / 2 + 0.075, 0]} castShadow>
        <boxGeometry args={[w, 0.15, d]} />
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </mesh>
      {/* Cargo Block */}
      <mesh position={[0, 0.075, 0]} castShadow>
        <boxGeometry args={[w * 0.85, h - 0.15, d * 0.85]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Net Grid overlay */}
      <mesh position={[0, 0.075, 0]}>
        <boxGeometry args={[w * 0.9, h - 0.12, d * 0.9]} />
        <meshStandardMaterial 
          color="#22aa44" 
          wireframe 
          transparent 
          opacity={0.4} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
};

const BlueVehicle: React.FC<{ args: [number, number, number] }> = ({ args }) => {
  const [w, h, d] = args;
  return (
    <group>
      {/* Main chassis */}
      <mesh position={[0, -h * 0.1, 0]} castShadow>
        <boxGeometry args={[w, h * 0.5, d]} />
        <meshStandardMaterial color="#2244cc" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Cabin */}
      <mesh position={[w * 0.2, h * 0.25, 0]} castShadow>
        <boxGeometry args={[w * 0.4, h * 0.4, d * 0.9]} />
        <meshStandardMaterial color="#2244cc" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Windshield */}
      <mesh position={[w * 0.405, h * 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d * 0.8, h * 0.35]} />
        <meshStandardMaterial color="#88ccff" roughness={0.1} metalness={0.9} transparent opacity={0.7} />
      </mesh>
      {/* Wheels */}
      {[-w * 0.3, w * 0.3].map((x, i) =>
        [-d * 0.5, d * 0.5].map((z, j) => (
          <mesh 
            key={`wheel-${i}-${j}`} 
            position={[x, -h * 0.3, z]} 
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[h * 0.2, h * 0.2, d * 0.15, 16]} />
            <meshStandardMaterial color="#222222" roughness={0.9} />
          </mesh>
        ))
      )}
      {/* Yellow beacon */}
      <mesh position={[-w * 0.1, h * 0.45, 0]}>
        <sphereGeometry args={[h * 0.08, 8, 8]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={1} />
      </mesh>
    </group>
  );
};

const AvionicsRack: React.FC<{ args: [number, number, number], color: string }> = ({ args, color }) => {
  const [w, h, d] = args;
  return (
    <group>
      {/* Metal Frame */}
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Glowing panels / server units */}
      {Array.from({ length: 4 }).map((_, idx) => (
        <mesh key={`panel-${idx}`} position={[w/2 + 0.02, h * 0.3 - idx * (h * 0.2), 0]}>
          <planeGeometry args={[d * 0.8, h * 0.12]} rotation={[0, Math.PI/2, 0]} />
          <meshStandardMaterial color="#111" emissive={idx % 2 === 0 ? "#00ff66" : "#00aaff"} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

const AnimatedBox: React.FC<{ 
  targetPosition: [number, number, number], 
  args: [number, number, number], 
  color: string,
  delay: number,
  name: string
}> = ({ targetPosition, args, color, delay, name }) => {
  const groupRef = useRef<any>(null);
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
  
  const startY = targetPosition[1] + 500;
  const currentY = startY + (targetPosition[1] - startY) * easedProgress;
  const scale = 0.5 + (0.5 * easedProgress);

  const renderCargoModel = () => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('amj')) {
      return <AMJContainer args={args} color={color} />;
    } else if (nameLower.includes('parts') || nameLower.includes('engine') || nameLower.includes('satellite') || nameLower.includes('avionics')) {
      return <AvionicsRack args={args} color={color} />;
    } else if (nameLower.includes('vehicle') || nameLower.includes('car') || nameLower.includes('truck')) {
      return <BlueVehicle args={args} />;
    } else if (nameLower.includes('pallet') || nameLower.includes('net') || nameLower.includes('supplies') || nameLower.includes('pkg')) {
      return <NetPallet args={args} color={color} />;
    } else {
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={args} />
            <meshStandardMaterial 
              color={color} 
              transparent 
              opacity={0.9}
              roughness={0.2}
              metalness={0.5}
            />
            <Edges color="#ffffff" threshold={15} />
          </mesh>
          <Text
            position={[0, args[1] / 2 + 1, 0]}
            fontSize={args[1] * 0.15 || 8}
            color="white"
            anchorX="center"
            outlineWidth={0.2}
            outlineColor="black"
          >
            {name}
          </Text>
        </group>
      );
    }
  };

  return (
    <group 
      ref={groupRef}
      position={[targetPosition[0], currentY, targetPosition[2]]}
      scale={[scale, scale, scale]}
    >
      {renderCargoModel()}
    </group>
  );
};

const Engine: React.FC<{ position: [number, number, number], rotationZ?: number }> = ({ position, rotationZ = 0 }) => {
  const cowlGeo = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const r = 1.2 * Math.sin(t * Math.PI) * 0.9 + 0.3;
      points.push(new THREE.Vector2(r, t * 5));
    }
    const geo = new THREE.LatheGeometry(points, 24);
    geo.rotateZ(Math.PI / 2);
    return geo;
  }, []);

  return (
    <group position={position} rotation={[0, 0, rotationZ]}>
      {/* Cowl */}
      <mesh geometry={cowlGeo}>
        <meshStandardMaterial color="#cccccc" roughness={0.3} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Intake ring */}
      <mesh position={[2.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.1, 0.15, 12, 24]} />
        <meshStandardMaterial color="#333344" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Exhaust cone */}
      <mesh position={[-2.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.9, 1.5, 24, 1, true]} />
        <meshStandardMaterial color="#553322" roughness={0.9} emissive="#ff4400" emissiveIntensity={0.4} />
      </mesh>
      {/* Pylon */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.5, 0.25, 0.6]} />
        <meshStandardMaterial color="#888899" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
};

const PlaneContainer: React.FC<{ dimensions: { l: number, w: number, h: number } }> = ({ dimensions }) => {
  const { l, w, h } = dimensions;

  // Wing Geometry with dynamic Airfoil curves
  const wingGeo = useMemo(() => {
    const span = 26;
    const rootChord = 8;
    const tipChord = 2.5;
    const sweepAngle = 0.5; // radians
    const dihedral = 0.15; // radians

    const geo = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    
    const segments = 20;
    const airfoilPoints = 12;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const z = t * span;
      const chord = rootChord * (1 - t * 0.7);
      const sweep = t * span * Math.tan(sweepAngle) * 0.6;
      const y = t * span * Math.tan(dihedral) * 0.25;
      const thickness = 0.5 * (1 - t * 0.5);
      
      for (let j = 0; j <= airfoilPoints; j++) {
        const u = j / airfoilPoints;
        const x = u * chord - sweep;
        let airfoilY;
        if (u < 0.5) {
          airfoilY = thickness * 4 * u * (1 - u) * (1 + 0.2 * Math.sin(u * Math.PI * 2));
        } else {
          airfoilY = -thickness * 0.3 * 4 * u * (1 - u);
        }
        vertices.push(x, y + airfoilY, z);
      }
    }
    
    const cols = airfoilPoints + 1;
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < airfoilPoints; j++) {
        const a = i * cols + j;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const wingletGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.3, 1.5);
    shape.lineTo(0.1, 1.5);
    shape.lineTo(-0.2, 0);
    shape.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
  }, []);

  const vStabGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, 9);
    shape.bezierCurveTo(2, 8.5, 4, 7, 5.5, 5);
    shape.lineTo(5, 0);
    shape.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
  }, []);

  const hStabGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(5, 0.3, 14);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const t = Math.abs(z) / 7;
      pos.setX(i, x - t * 3);
      pos.setY(i, pos.getY(i) * (1 - t * 0.5));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const noseGeo = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const r = 3.0 * Math.pow(1 - t, 0.7);
      const x = t * 7;
      points.push(new THREE.Vector2(r, x));
    }
    const geo = new THREE.LatheGeometry(points, 32);
    geo.rotateZ(-Math.PI / 2);
    return geo;
  }, []);

  const tailConeGeo = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 15; i++) {
      const t = i / 15;
      const r = 3.0 * (1 - t * 0.85);
      const x = t * 10;
      points.push(new THREE.Vector2(r, x));
    }
    const geo = new THREE.LatheGeometry(points, 32);
    geo.rotateZ(-Math.PI / 2);
    return geo;
  }, []);

  // Standard aircraft materials
  const fuselageGlassMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xffeedd,
    transmission: 0.55,
    opacity: 0.45,
    transparent: true,
    roughness: 0.2,
    metalness: 0.1,
    ior: 1.4,
    thickness: 2,
    side: THREE.DoubleSide,
    clearcoat: 0.8,
    depthWrite: false
  }), []);

  const whitePaintMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf8fafc, roughness: 0.2, metalness: 0.1, side: THREE.DoubleSide
  }), []);

  const darkMetalMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x333344, roughness: 0.5, metalness: 0.7
  }), []);

  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xaaaaaa, roughness: 0.7, metalness: 0.3
  }), []);

  // Calculate scaling to stretch deck to fill packed area dimensions (X->Z, Z->X)
  const scaleX = l / 46;
  const scaleY = h / 3.25;
  const scaleZ = w / 5.6;

  return (
    <group>
      {/* Sunset Ground / Runway */}
      <mesh position={[w / 2, -100, l / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20000, 20000]} />
        <meshStandardMaterial color="#331100" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Main Aircraft Group */}
      <group position={[w / 2, -0.925 * scaleY, l / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <group scale={[scaleX, scaleY, scaleZ]} position={[-2, 0, 0]}>
          
          {/* Main Fuselage Body */}
          <mesh position={[0, 3.0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[3.0, 3.0, 55, 32, 1, true]} />
            <primitive object={fuselageGlassMat} attach="material" />
          </mesh>

          {/* Pointed Nose */}
          <mesh geometry={noseGeo} position={[55 / 2, 3.0, 0]} castShadow>
            <primitive object={fuselageGlassMat} attach="material" />
          </mesh>

          {/* Cockpit Window */}
          <mesh position={[55 / 2 + 2.5, 3.8, 0]} castShadow>
            <boxGeometry args={[1.8, 1.0, 2.4]} />
            <meshStandardMaterial color="#111122" roughness={0.05} metalness={0.95} />
          </mesh>

          {/* Tail Cone */}
          <mesh geometry={tailConeGeo} position={[-55 / 2, 3.0, 0]} castShadow>
            <primitive object={fuselageGlassMat} attach="material" />
          </mesh>

          {/* Wings */}
          {/* Right Wing */}
          <mesh geometry={wingGeo} material={whitePaintMat} position={[2, 2, 3.0]} castShadow />
          {/* Left Wing */}
          <mesh geometry={wingGeo} material={whitePaintMat} position={[2, 2, -3.0]} scale={[1, 1, -1]} castShadow />

          {/* Winglets */}
          {/* Right Winglet */}
          <mesh geometry={wingletGeo} material={whitePaintMat} position={[-12, 5.5, 29.0]} rotation={[0.3, 0, 0]} castShadow />
          {/* Left Winglet */}
          <mesh geometry={wingletGeo} material={whitePaintMat} position={[-12, 5.5, -29.0]} rotation={[0.3, Math.PI, 0]} castShadow />

          {/* Vertical Stabilizer */}
          <mesh geometry={vStabGeo} material={whitePaintMat} position={[-55 / 2 + 1, 5, -0.2]} castShadow />

          {/* Logo on tail */}
          <mesh position={[-55 / 2 + 3.5, 10, 0.21]} rotation={[0, 0, 0]} castShadow>
            <circleGeometry args={[1.2, 32]} />
            <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={0.3} />
          </mesh>

          {/* Horizontal Stabilizer */}
          <mesh geometry={hStabGeo} material={whitePaintMat} position={[-55 / 2 + 3.5, 13.5, 0]} castShadow />

          {/* Engines */}
          <Engine position={[-18, 1.5, 4.2]} />
          <Engine position={[-18, 1.5, -4.2]} />
          <Engine position={[-24, 4.5, 0]} rotationZ={-0.3} />

          {/* Cargo Deck Floor */}
          <mesh position={[2, 0.8, 0]} receiveShadow>
            <boxGeometry args={[46, 0.25, 5.6]} />
            <primitive object={floorMat} attach="material" />
          </mesh>

          {/* Roller Tracks */}
          {Array.from({ length: 21 }, (_, i) => {
            const x = -20 + i * 2;
            return (
              <mesh key={`roller-${x}`} position={[x, 1.0, 0]}>
                <boxGeometry args={[0.08, 0.12, 5.4]} />
                <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.8} />
              </mesh>
            );
          })}

          {/* Interior Walls (Semi-transparent to show cargo clearly) */}
          {[-1, 1].map((side, i) => (
            <mesh key={`intWall-${i}`} position={[2, 2.2, side * 2.8]}>
              <boxGeometry args={[46, 3, 0.15]} />
              <meshStandardMaterial color="#666677" roughness={0.8} transparent opacity={0.15} depthWrite={false} />
            </mesh>
          ))}

          {/* Ceiling (Semi-transparent) */}
          <mesh position={[2, 4.2, 0]}>
            <boxGeometry args={[46, 0.15, 5.6]} />
            <meshStandardMaterial color="#555566" roughness={0.9} transparent opacity={0.15} depthWrite={false} />
          </mesh>

        </group>
      </group>
    </group>
  );
};

export const AirOptimizer: React.FC = () => {
  const [selectedPlane, setSelectedPlane] = useState(AIRCRAFT_OPTIONS[0]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | 'stats'>('3d');
  const [focusCoG, setFocusCoG] = useState(false);

  const loadingSequence = loadResult ? getLoadingSequence(loadResult.placedItems) : [];
  const { playMode, playIndex, visibleCount, toggle: togglePlay, stop: stopPlay } = useLoadPlaySequence(
    loadingSequence.length
  );

  useEffect(() => {
    let storedItems = StorageService.getItems();
    
    // If no items, add some high-tech demo items
    if (storedItems.length === 0) {
      storedItems = [
        { id: '1', name: 'Jet Engine Parts', quantity: 2, dimensions: { length: 200, width: 200, height: 200 }, weight: 2500, color: '#3b82f6', isFragile: false, isStackable: true },
        { id: '2', name: 'Avionics Rack', quantity: 4, dimensions: { length: 120, width: 80, height: 180 }, weight: 450, color: '#8b5cf6', isFragile: true, isStackable: false },
        { id: '3', name: 'Satellite Component', quantity: 1, dimensions: { length: 300, width: 250, height: 220 }, weight: 1200, color: '#ec4899', isFragile: true, isStackable: false },
        { id: '4', name: 'Medical Supplies', quantity: 10, dimensions: { length: 80, width: 60, height: 60 }, weight: 45, color: '#10b981', isFragile: false, isStackable: true },
      ];
    }
    
    setItems(storedItems);
    handleOptimize(storedItems, AIRCRAFT_OPTIONS[0]);
  }, []);

  const handleOptimize = (targetItems: Item[] = items, truck: Truck = selectedPlane) => {
    setIsOptimizing(true);
    // Use the same packer - physics is the same, just bigger dimensions
    const result = packCargo(truck, targetItems, 'air');
    setLoadResult(result);
    stopPlay();
    setTimeout(() => setIsOptimizing(false), 800);
  };

  const handlePlaneChange = (planeId: string) => {
    const plane = AIRCRAFT_OPTIONS.find(p => p.id === planeId) || AIRCRAFT_OPTIONS[0];
    setSelectedPlane(plane);
    handleOptimize(items, plane);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-950 text-white overflow-hidden">
      {/* Left Control Panel */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10 min-h-0">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 custom-scrollbar">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400">
            <Plane className="w-6 h-6" />
            Air Cargo Intel
          </h2>
          <p className="text-slate-400 text-xs mt-1">Global Aviation Logistics Engine</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-300">Select Aircraft</label>
          <div className="grid gap-2">
            {AIRCRAFT_OPTIONS.map(plane => (
              <button
                key={plane.id}
                onClick={() => handlePlaneChange(plane.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedPlane.id === plane.id 
                    ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                    : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-sm">{plane.name}</div>
                <div className="text-[10px] text-slate-400 flex justify-between mt-1">
                  <span>Cap: {plane.maxWeight/1000} Tons</span>
                  <span>{plane.dimensions.length/100}m Long</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Stability — prominent, same as truck sidebar */}
        {loadResult ? (
          <LoadAiInsightPanel
            mode="air"
            vehicle={selectedPlane}
            loadResult={loadResult}
            theme="dark"
            focusCoG={focusCoG}
            onToggleFocusCoG={() => setFocusCoG((v) => !v)}
          />
        ) : (
          <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 text-center text-xs text-slate-400">
            Run <span className="text-blue-400 font-semibold">Calculate Flight Load</span> to see AI Stability Analysis.
          </div>
        )}

        {loadResult && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Utilization</h3>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Volume</span>
                <span className="text-blue-400 font-bold">{loadResult.volumeUtilization.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${loadResult.volumeUtilization}%` }}></div>
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Weight & Balance</span>
                <span className={loadResult.weightUtilization > 95 ? 'text-red-400' : 'text-green-400'}>
                  {loadResult.weightUtilization.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${loadResult.weightUtilization > 95 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${loadResult.weightUtilization}%` }}></div>
              </div>
            </div>
          </div>
        )}
        </div>

        <div className="p-6 pt-4 border-t border-slate-800 shrink-0">
        <button 
          onClick={() => handleOptimize()}
          disabled={isOptimizing}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
        >
          {isOptimizing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
          CALCULATE FLIGHT LOAD
        </button>
        </div>
      </div>

      {/* Main 3D Canvas */}
      <div className="flex-grow min-h-[450px] md:min-h-0 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <div className="absolute top-6 left-6 z-10 flex gap-2">
          <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-slate-300">Ready for Boarding</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <span className="text-blue-400 font-mono">36° N, 140° E</span>
          </div>
        </div>

        <div className="absolute top-6 right-6 z-10 flex gap-2">
          <LoadPlaySequenceButton
            playMode={playMode}
            playIndex={playIndex}
            total={loadingSequence.length}
            onToggle={togglePlay}
            variant="dark"
          />
          <button 
            onClick={() => setViewMode('3d')}
            className={`p-2 rounded-lg border transition-all ${viewMode === '3d' ? 'bg-blue-600 border-blue-500' : 'bg-slate-900/80 border-slate-700'}`}
          >
            <Plane className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode('stats')}
            className={`p-2 rounded-lg border transition-all ${viewMode === 'stats' ? 'bg-blue-600 border-blue-500' : 'bg-slate-900/80 border-slate-700'}`}
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>

        {viewMode === '3d' ? (
          <Canvas shadows camera={{ position: [-5000, 3000, 2000], fov: 40, far: 50000 }}>
            <color attach="background" args={['#cc5500']} />
            <fogExp2 attach="fog" args={['#cc5500', 0.00005]} />
            <PerspectiveCamera makeDefault position={[-5000, 3500, 2500]} far={50000} />
            <OrbitControls 
              makeDefault 
              target={[selectedPlane.dimensions.width/2, 200, selectedPlane.dimensions.length/2]}
            />
            <ambientLight intensity={0.4} color="#ff8844" />
            <directionalLight 
              position={[-6000, 4000, -8000]} 
              intensity={2.5} 
              color="#ffaa44" 
              castShadow 
              shadow-mapSize-width={2048} 
              shadow-mapSize-height={2048} 
            />
            <directionalLight position={[5000, 2000, 5000]} intensity={0.4} color="#4488ff" />
            <hemisphereLight args={['#ff8844', '#221100', 0.5]} />
            
            <PlaneContainer dimensions={{ l: selectedPlane.dimensions.length, w: selectedPlane.dimensions.width, h: selectedPlane.dimensions.height }} />
            
            {!focusCoG &&
              loadingSequence.slice(0, visibleCount).map((item, index) => (
                <AnimatedBox
                  key={item.uuid}
                  targetPosition={[
                    item.position[2] + item.dimensions.width / 2,
                    item.position[1] + item.dimensions.height / 2 + 5,
                    item.position[0] + item.dimensions.length / 2,
                  ]}
                  args={[item.dimensions.width, item.dimensions.height, item.dimensions.length]}
                  color={item.color}
                  delay={playMode ? 0 : index * 0.02}
                  name={item.name}
                />
              ))}

            {loadResult?.centerOfGravity && (
              <CoGIndicator
                cog={loadResult.centerOfGravity}
                floorOffset={5}
                radius={focusCoG ? 60 : 35}
                emphasized={focusCoG}
              />
            )}
          </Canvas>
        ) : (
          <div className="p-10 h-full overflow-auto">
             <h2 className="text-2xl font-bold mb-6 text-blue-400">Flight Manifest Details</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                   <div className="text-slate-400 text-sm mb-2">Total Weight</div>
                   <div className="text-4xl font-bold">{(loadResult?.totalWeight || 0).toLocaleString()} <span className="text-lg text-slate-500 font-light">kg</span></div>
                   <div className="text-xs text-blue-400 mt-2">Max allowed: {selectedPlane.maxWeight.toLocaleString()} kg</div>
                </div>
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                   <div className="text-slate-400 text-sm mb-2">Loaded Items</div>
                   <div className="text-4xl font-bold">{loadResult?.placedItems.length || 0}</div>
                   <div className="text-xs text-red-400 mt-2">{loadResult?.unplacedItems.length || 0} items rejected due to size/weight</div>
                </div>
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                   <div className="text-slate-400 text-sm mb-2">Estimated Fuel Burn</div>
                   <div className="text-4xl font-bold text-orange-400">{((loadResult?.totalWeight || 0) * 0.12).toFixed(1)} <span className="text-lg text-slate-500 font-light">L/hr</span></div>
                </div>
             </div>
          </div>
        )}

        {/* Load Plan HUD Overlay */}
        <div className="absolute top-24 left-6 z-20">
           <div className="bg-black/60 backdrop-blur-md px-6 py-3 border-l-4 border-orange-500 shadow-2xl">
              <h1 className="text-xl font-black tracking-tighter uppercase text-orange-400">✈️ Cargo Aircraft Loading System</h1>
           </div>
        </div>

        {loadResult && (
          <div className="absolute bottom-10 left-10 z-20 bg-black/60 backdrop-blur-md p-6 rounded-sm border border-white/10 w-64 shadow-2xl">
             <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center">
                   <span className="text-slate-300">Space Utilized</span>
                   <span className="text-white font-bold">{loadResult.volumeUtilization.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-slate-300">Items Loaded</span>
                   <span className="text-white font-bold">{loadResult.placedItems.length}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-slate-300">Remaining Space</span>
                   <span className="text-white font-bold">{(100 - loadResult.volumeUtilization).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                   <span className="text-slate-300">Volume Occupied</span>
                   <span className="text-blue-400 font-bold">{(loadResult.totalWeight * 0.8).toFixed(2)} ft³</span>
                </div>
             </div>
          </div>
        )}

        {loadResult && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-20 pointer-events-none w-[360px]">
            {/* Slider 1: CG Limits */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                <span>Center of Gravity (CG)</span>
                <span className="text-orange-400 font-mono">{(loadResult.centerOfGravity.x / 100).toFixed(2)}m</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-mono">aftLimit</span>
                <div className="flex-grow h-2.5 bg-red-600/40 rounded-sm relative">
                  {/* Green Safe Zone: 30% to 60% */}
                  <div className="absolute left-[30%] right-[40%] top-0 bottom-0 bg-green-500/80 rounded-sm"></div>
                  {/* CG Marker */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full border border-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    style={{ left: `${Math.max(5, Math.min(95, (loadResult.centerOfGravity.x / selectedPlane.dimensions.length) * 100))}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">fwdLimit</span>
              </div>
            </div>

            <div className="h-px bg-white/10 w-full"></div>

            {/* Slider 2: Optimal Trim */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                <span>Trim Adjustment</span>
                <span className="text-emerald-400 font-mono">
                  {Math.abs((loadResult.centerOfGravity.x / selectedPlane.dimensions.length) * 100 - 45) < 15 ? 'IN BALANCE' : 'WARN: UNBALANCED'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-mono">aftLimit</span>
                <div className="flex-grow h-2.5 bg-red-600/40 rounded-sm relative">
                  {/* Green Safe Zone: 30% to 60% */}
                  <div className="absolute left-[30%] right-[40%] top-0 bottom-0 bg-green-500/80 rounded-sm"></div>
                  {/* Optimal Trim Point (Triangle Arrow at 45%) */}
                  <div className="absolute bottom-[-10px] left-[45%] -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-white w-0 h-0"></div>
                  {/* CG Marker */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full border border-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    style={{ left: `${Math.max(5, Math.min(95, (loadResult.centerOfGravity.x / selectedPlane.dimensions.length) * 100))}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">fwdLimit</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
