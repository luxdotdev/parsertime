'use client';

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';

const AMBER = '#e8a23a';
const BASE_SPIN = 0.5; // rad/s, the resting auto-rotation speed

type VelocityRef = MutableRefObject<number>;

/**
 * Bake the source PNG into a canvas where the logo silhouette is opaque
 * white and everything else is fully transparent. Continuous alpha at the
 * edges so the material's alphaToCoverage can hand the AA work to MSAA.
 */
function useSilhouetteTexture(src: string): THREE.Texture {
  const raw = useLoader(THREE.TextureLoader, src);

  return useMemo(() => {
    const img = raw.image as HTMLImageElement | undefined;
    if (!img) return raw;

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;

    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i] ?? 0;
      const g = px[i + 1] ?? 0;
      const b = px[i + 2] ?? 0;
      const a = px[i + 3] ?? 0;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const coverage = a / 255;
      const darkness = 1 - lum / 255;
      const alpha = Math.pow(darkness, 1.4) * coverage;
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = Math.round(Math.min(1, alpha) * 255);
    }
    ctx.putImageData(data, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [raw]);
}

function LogoSlab({ velocityRef }: { velocityRef: VelocityRef }) {
  const tex = useSilhouetteTexture('/parsertime-logo.png');
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += (BASE_SPIN + velocityRef.current) * dt;
    // Exponential decay back to baseline. tau≈0.33s feels snappy without
    // killing the flick before the user sees the wind-down.
    velocityRef.current *= Math.exp(-dt * 3);
  });

  const LAYERS = 32;
  const THICKNESS = 0.18;
  const SIZE = 2.4;

  const offsets = useMemo(
    () =>
      Array.from({ length: LAYERS }, (_, i) =>
        (i / (LAYERS - 1) - 0.5) * THICKNESS,
      ),
    [],
  );

  return (
    <group ref={group}>
      {offsets.map((z, i) => {
        const t = Math.abs(i - (LAYERS - 1) / 2) / ((LAYERS - 1) / 2);
        const isFace = t > 0.95;
        return (
          <mesh key={i} position={[0, 0, z]}>
            <planeGeometry args={[SIZE, SIZE]} />
            <meshStandardMaterial
              map={tex}
              transparent
              alphaToCoverage
              alphaTest={0.08}
              color="#ffffff"
              emissive={isFace ? '#ffffff' : AMBER}
              emissiveIntensity={isFace ? 0.1 : 0.22}
              metalness={0.18}
              roughness={0.42}
              side={THREE.DoubleSide}
              depthWrite
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const COUNT = 64;
    const arr = new Float32Array(COUNT * 3);
    let s = 0x5f70ce82;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    for (let i = 0; i < COUNT; i++) {
      const r = 2.2 + rand() * 1.6;
      const theta = rand() * Math.PI * 2;
      const phi = (rand() - 0.5) * Math.PI * 0.6;
      arr[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
      arr[i * 3 + 1] = Math.sin(phi) * r;
      arr[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y -= dt * 0.08;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={AMBER}
        size={0.025}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  );
}

function Sigil({ velocityRef }: { velocityRef: VelocityRef }) {
  return (
    <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.3}>
      <group scale={1.05}>
        <LogoSlab velocityRef={velocityRef} />
      </group>
    </Float>
  );
}

export function LandingScene() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  // React synthetic onPointerDown to start the drag (always fires regardless
  // of what R3F is doing internally), then window-level move/up so the gesture
  // keeps working even if the pointer leaves the canvas region.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing';

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - lastXRef.current;
      lastXRef.current = ev.clientX;
      velocityRef.current = THREE.MathUtils.clamp(
        velocityRef.current + dx * 0.03,
        -15,
        15,
      );
    };
    const onUp = () => {
      draggingRef.current = false;
      if (wrapperRef.current) wrapperRef.current.style.cursor = 'grab';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div
      ref={wrapperRef}
      className="h-full w-full cursor-grab select-none"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
    >
      <Canvas
        camera={{ position: [0, 0, 4.4], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        {/* No <color> or <fog>: the canvas stays transparent so the page
            background (--color-fd-background) reads through edge-to-edge. */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} color="#ffffff" />
        <pointLight position={[-3, 1, 1]} intensity={1.6} color={AMBER} />
        <pointLight position={[3, -1, 1]} intensity={0.8} color={AMBER} />

        <Suspense fallback={null}>
          <Sigil velocityRef={velocityRef} />
          <Particles />
        </Suspense>
      </Canvas>
    </div>
  );
}
