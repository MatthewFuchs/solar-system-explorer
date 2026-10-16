import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { starShader } from "./shaders";

interface StarfieldProps {
  width: number;
  height: number;
}

/** One star per this many square CSS pixels: fine and sparse. */
const AREA_PER_STAR = 6500;

/** Seeded so the star field is identical on every load and resize. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Starfield({ width, height }: StarfieldProps) {
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rand = mulberry32(1977);
    const count = Math.round((width * height) / AREA_PER_STAR);
    const positions: number[] = [];
    const sizes: number[] = [];
    const alphas: number[] = [];
    const colors: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push((rand() - 0.5) * width, (rand() - 0.5) * height, 0);
      sizes.push(1 + Math.pow(rand(), 4) * 2.2);
      alphas.push(0.2 + Math.pow(rand(), 2) * 0.75);
      // Mostly white, a few cool blue and a few warm stars.
      const tint = rand();
      colors.push(...(tint < 0.12 ? [0.75, 0.85, 1] : tint > 0.94 ? [1, 0.88, 0.72] : [0.95, 0.96, 1]));
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("aSize", new Float32BufferAttribute(sizes, 1));
    g.setAttribute("aAlpha", new Float32BufferAttribute(alphas, 1));
    g.setAttribute("aColor", new Float32BufferAttribute(colors, 3));
    return g;
  }, [width, height]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({ uDpr: { value: dpr } }), [dpr]);

  return (
    <points geometry={geometry} position={[0, 0, -900]}>
      <shaderMaterial {...starShader} uniforms={uniforms} transparent depthWrite={false} />
    </points>
  );
}
