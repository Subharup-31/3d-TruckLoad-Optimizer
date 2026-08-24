import React from 'react';

interface CoGIndicatorProps {
  cog: { x: number; y: number; z: number };
  floorOffset?: number;
  radius?: number;
  emphasized?: boolean;
}

/** Red glowing sphere marking the computed center of gravity in 3D load views. */
export const CoGIndicator: React.FC<CoGIndicatorProps> = ({
  cog,
  floorOffset = 0,
  radius = 12,
  emphasized = false,
}) => (
  <group position={[cog.z, cog.y + floorOffset, cog.x]}>
    <mesh>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color="#ef4444"
        emissive="#ef4444"
        emissiveIntensity={emphasized ? 1.4 : 0.8}
      />
    </mesh>
    <pointLight color="#ef4444" intensity={emphasized ? 5 : 2} distance={radius * 12} />
  </group>
);
