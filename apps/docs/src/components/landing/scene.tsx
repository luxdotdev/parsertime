"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";

/**
 * Read the active theme from the `.dark` class on <html> that next-themes
 * (via fumadocs's RootProvider) sets. Avoids adding next-themes as a direct
 * dependency and survives system-theme changes by listening to mutations on
 * the root element's class list.
 */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    function read() {
      setIsDark(root.classList.contains("dark"));
    }
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

const AMBER = "#e8a23a";
const BASE_SPIN = 0.5; // rad/s, the resting auto-rotation speed

// Per DESIGN.md, the foreground hue in each mode. We mirror those for the
// silhouette so it always reads as the page's content color.
const SILHOUETTE = {
  dark: "#ffffff",
  light: "#1f2024", // near-black with the cool tint of foreground-light
} as const;

type VelocityRef = MutableRefObject<number>;

/**
 * Bake the source PNG into a canvas where the logo silhouette is opaque
 * white and everything else is fully transparent. Continuous alpha at the
 * edges so the material's alphaToCoverage can hand the AA work to MSAA.
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function useSilhouetteTexture(src: string, colorHex: string): THREE.Texture {
  const raw = useLoader(THREE.TextureLoader, src);

  return useMemo(() => {
    const img = raw.image as HTMLImageElement | undefined;
    if (!img) return raw;

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;

    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const [cr, cg, cb] = hexToRgb(colorHex);
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i] ?? 0;
      const g = px[i + 1] ?? 0;
      const b = px[i + 2] ?? 0;
      const a = px[i + 3] ?? 0;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const coverage = a / 255;
      const darkness = 1 - lum / 255;
      const alpha = Math.pow(darkness, 1.4) * coverage;
      px[i] = cr;
      px[i + 1] = cg;
      px[i + 2] = cb;
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
  }, [raw, colorHex]);
}

function LogoSlab({
  velocityRef,
  silhouette,
}: {
  velocityRef: VelocityRef;
  silhouette: string;
}) {
  const tex = useSilhouetteTexture("/parsertime-logo.png", silhouette);
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
      Array.from(
        { length: LAYERS },
        (_, i) => (i / (LAYERS - 1) - 0.5) * THICKNESS
      ),
    []
  );

  return (
    <group ref={group}>
      {offsets.map((z, i) => {
        const t = Math.abs(i - (LAYERS - 1) / 2) / ((LAYERS - 1) / 2);
        const isFace = t > 0.95;
        return (
          <mesh key={z} position={[0, 0, z]}>
            <planeGeometry args={[SIZE, SIZE]} />
            <meshStandardMaterial
              map={tex}
              transparent
              alphaToCoverage
              alphaTest={0.08}
              color={silhouette}
              emissive={isFace ? silhouette : AMBER}
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
    function rand() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    }
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

function Sigil({
  velocityRef,
  silhouette,
}: {
  velocityRef: VelocityRef;
  silhouette: string;
}) {
  return (
    <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.3}>
      <group scale={1.05}>
        <LogoSlab velocityRef={velocityRef} silhouette={silhouette} />
      </group>
    </Float>
  );
}

export function LandingScene() {
  const isDark = useIsDark();
  const silhouette = isDark ? SILHOUETTE.dark : SILHOUETTE.light;
  // In light mode the white key light blows out the dark silhouette; dim it
  // so the form reads as a solid mark rather than a glare patch.
  const isLight = !isDark;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  // React synthetic onPointerDown to start the drag (always fires regardless
  // of what R3F is doing internally), then window-level move/up so the gesture
  // keeps working even if the pointer leaves the canvas region.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    if (wrapperRef.current) wrapperRef.current.style.cursor = "grabbing";

    function onMove(ev: PointerEvent) {
      if (!draggingRef.current) return;
      const dx = ev.clientX - lastXRef.current;
      lastXRef.current = ev.clientX;
      velocityRef.current = THREE.MathUtils.clamp(
        velocityRef.current + dx * 0.03,
        -15,
        15
      );
    }
    function onUp() {
      draggingRef.current = false;
      if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <div
      ref={wrapperRef}
      className="h-full w-full cursor-grab select-none"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
    >
      <Canvas
        camera={{ position: [0, 0, 4.4], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        {/* No <color> or <fog>: the canvas stays transparent so the page
            background (--color-fd-background) reads through edge-to-edge. */}
        <ambientLight intensity={isLight ? 0.85 : 0.45} />
        <directionalLight
          position={[3, 4, 5]}
          intensity={isLight ? 0.5 : 1.4}
          color="#ffffff"
        />
        <pointLight
          position={[-3, 1, 1]}
          intensity={isLight ? 1.2 : 1.6}
          color={AMBER}
        />
        <pointLight
          position={[3, -1, 1]}
          intensity={isLight ? 0.5 : 0.8}
          color={AMBER}
        />

        <Suspense fallback={null}>
          <Sigil velocityRef={velocityRef} silhouette={silhouette} />
          <Particles />
        </Suspense>
      </Canvas>
    </div>
  );
}
