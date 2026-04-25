"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Simplex noise (3-octave) aurora shader
const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uRedFactor;
  uniform float uGreenFactor;
  uniform float uBlueFactor;

  varying vec2 vUv;

  // Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
      value += amplitude * snoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 p = uv * aspect;

    // Mouse influence
    vec2 mouse = uMouse * aspect;
    float mouseDist = length(p - mouse);
    float mouseInfluence = smoothstep(1.5, 0.0, mouseDist) * 0.15;

    float t = uTime * 0.15;

    // 3 octaves of flowing noise
    float n1 = fbm(p * 1.5 + vec2(t, t * 0.7));
    float n2 = fbm(p * 2.0 + vec2(-t * 0.8, t * 0.5) + mouseInfluence);
    float n3 = fbm(p * 0.8 + vec2(t * 0.3, -t * 0.4));

    float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

    // Aurora color mixing - amber family (deep bronze → brand amber → pale honey)
    vec3 color1 = vec3(0.40 * uRedFactor, 0.22 * uGreenFactor, 0.08 * uBlueFactor); // deep bronze
    vec3 color2 = vec3(0.96 * uRedFactor, 0.72 * uGreenFactor, 0.25 * uBlueFactor); // brand amber
    vec3 color3 = vec3(0.98 * uRedFactor, 0.85 * uGreenFactor, 0.55 * uBlueFactor); // pale honey

    vec3 color = mix(color1, color2, smoothstep(-0.3, 0.3, noise));
    color = mix(color, color3, smoothstep(0.1, 0.6, n2));

    // Vertical fade - stronger at top
    float verticalFade = smoothstep(0.0, 0.7, uv.y);
    color *= verticalFade * 0.7 + 0.3;

    // Overall intensity
    float intensity = smoothstep(-0.5, 0.5, noise) * 0.85 + 0.15;
    color *= intensity;

    gl_FragColor = vec4(color, 1.0);
  }
`;

type AuroraBackgroundProps = {
  className?: string;
};

export function AuroraBackground({ className = "" }: AuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const frameRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = {
      x: e.clientX / window.innerWidth,
      y: 1.0 - e.clientY / window.innerHeight,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
    });
    const dpr = Math.min(2, window.devicePixelRatio);
    renderer.setPixelRatio(dpr);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRedFactor: { value: 1.0 },
      uGreenFactor: { value: 1.0 },
      uBlueFactor: { value: 1.0 },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });
    scene.add(new THREE.Mesh(geometry, material));

    // Use ResizeObserver to track the parent container size
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          renderer.setSize(width, height);
          uniforms.uResolution.value.set(width, height);
        }
      }
    });
    resizeObserver.observe(parent);

    window.addEventListener("mousemove", handleMouseMove);

    if (prefersReducedMotion) {
      uniforms.uTime.value = 5;
      renderer.render(scene, camera);
    } else {
      const clock = new THREE.Clock();
      function animate() {
        frameRef.current = requestAnimationFrame(animate);
        uniforms.uTime.value = clock.getElapsedTime();
        uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
        renderer.render(scene, camera);
      }
      animate();
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
