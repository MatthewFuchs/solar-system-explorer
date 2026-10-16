import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry, Float32BufferAttribute, type ShaderMaterial } from "three";
import type { BeltShape } from "./plateLayout";
import { setUniform } from "./uniforms";
import { lerp, smoothstep, type Timeline, type ZoomFrame } from "./viewTransition";

interface BeltFieldProps {
  belts: BeltShape[];
  width: number;
  height: number;
  zoom: Timeline;
  zoomFrame: ZoomFrame | null;
}

/** Seeded so the stipple is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform vec2 uHalf;
  uniform vec2 uFrom;
  uniform vec2 uCenter;
  uniform float uScale;
  uniform float uDpr;
  varying float vAlpha;
  void main() {
    // Positions are CSS pixels (y down); the zoom scales them outward from the focused planet.
    vec2 p = uCenter + (position.xy - uFrom) * uScale;
    vAlpha = aAlpha;
    gl_PointSize = aSize * uDpr;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x - uHalf.x, uHalf.y - p.y, -500.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uFade;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.15, d) * vAlpha * (1.0 - uFade);
    gl_FragColor = vec4(vec3(0.84, 0.74, 0.56) * a, a);
    #include <colorspace_fragment>
  }
`;

/**
 * The asteroid and Kuiper belts as static stipple. Dots are generated once, in screen
 * pixels, denser toward the middle of each band and thinning at its ends.
 */
export function BeltField({ belts, width, height, zoom, zoomFrame }: BeltFieldProps) {
  const dpr = useThree((s) => s.viewport.dpr);
  const materialRef = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const rand = mulberry32(2006);
    const positions: number[] = [];
    const sizes: number[] = [];
    const alphas: number[] = [];
    for (const b of belts) {
      const span = b.a1 - b.a0;
      const area = 0.5 * (b.outer * b.outer - b.inner * b.inner) * span;
      const count = Math.round((area / 10000) * b.belt.density);
      for (let i = 0; i < count; i++) {
        // Two uniform draws averaged: a band that is densest along its middle.
        const t = (rand() + rand()) / 2;
        const r = b.inner + t * (b.outer - b.inner);
        const k = rand();
        const a = b.a0 + k * span;
        const x = b.cx + Math.cos(a) * r;
        const y = b.cy + Math.sin(a) * r;
        if (x < -4 || y < -4 || x > width + 4 || y > height + 4) continue;
        const ends = smoothstep(0, 0.18, k) * smoothstep(1, 0.82, k);
        positions.push(x, y, 0);
        sizes.push(0.9 + Math.pow(rand(), 3) * 1.6);
        alphas.push((0.22 + rand() * 0.5) * ends);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("aSize", new Float32BufferAttribute(sizes, 1));
    g.setAttribute("aAlpha", new Float32BufferAttribute(alphas, 1));
    return g;
  }, [belts, width, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uHalf: { value: [0, 0] as [number, number] },
      uFrom: { value: [0, 0] as [number, number] },
      uCenter: { value: [0, 0] as [number, number] },
      uScale: { value: 1 },
      uDpr: { value: 1 },
      uFade: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    const e = zoom.value(performance.now());
    m.uniforms.uHalf.value = [width / 2, height / 2];
    if (zoomFrame && e > 0) {
      const scale = Math.exp(Math.log(zoomFrame.to.r / zoomFrame.from.r) * e);
      m.uniforms.uFrom.value = [zoomFrame.from.x, zoomFrame.from.y];
      m.uniforms.uCenter.value = [lerp(zoomFrame.from.x, zoomFrame.to.x, e), lerp(zoomFrame.from.y, zoomFrame.to.y, e)];
      setUniform(m, "uScale", scale);
    } else {
      m.uniforms.uFrom.value = [0, 0];
      m.uniforms.uCenter.value = [0, 0];
      setUniform(m, "uScale", 1);
    }
    setUniform(m, "uDpr", dpr);
    setUniform(m, "uFade", zoomFrame ? smoothstep(0, 0.5, e) : 0);
  });

  return (
    <points geometry={geometry} renderOrder={-1}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
