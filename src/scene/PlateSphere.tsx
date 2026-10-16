import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Vector3, type ShaderMaterial } from "three";
import type { RGB } from "../lib/color";
import { halftoneFragment, halftoneVertex } from "./halftoneShader";

/** Higher is snappier. Exponential damping gives an ease-out with no overshoot. */
const DAMPING = 7;

// Uniforms are mutated in place every animated frame, outside React's render cycle.
function setUniform(uniforms: ShaderMaterial["uniforms"], name: string, value: number) {
  uniforms[name].value = value;
}

interface PlateSphereProps {
  /** Center in CSS pixels, origin top-left. */
  x: number;
  y: number;
  radius: number;
  color: RGB;
  ink: RGB;
  /** Light direction in view space (x right, y up, z toward the viewer). */
  lightDir: [number, number, number];
  /** Halftone cell size in CSS pixels. */
  cell: number;
  active?: boolean;
  dimmed?: boolean;
  reducedMotion: boolean;
}

export function PlateSphere({
  x,
  y,
  radius,
  color,
  ink,
  lightDir,
  cell,
  active = false,
  dimmed = false,
  reducedMotion,
}: PlateSphereProps) {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const invalidate = useThree((s) => s.invalidate);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new Vector3() },
      uInk: { value: new Vector3() },
      uLightDir: { value: new Vector3() },
      uCell: { value: 1 },
      uLight: { value: 0 },
      uDim: { value: 0 },
    }),
    [],
  );

  const materialRef = useRef<ShaderMaterial>(null);

  useLayoutEffect(() => {
    const u = materialRef.current?.uniforms;
    if (!u) return;
    u.uColor.value.set(...color);
    u.uInk.value.set(...ink);
    u.uLightDir.value.set(...lightDir);
    u.uCell.value = cell * dpr;
    invalidate();
  }, [color, ink, lightDir, cell, dpr, invalidate]);

  // The canvas only renders on demand; wake it when hover state changes.
  useEffect(() => invalidate(), [active, dimmed, invalidate]);

  useFrame((state, rawDelta) => {
    const u = materialRef.current?.uniforms;
    if (!u) return;
    const delta = Math.min(rawDelta, 1 / 30);
    const t = reducedMotion ? 1 : 1 - Math.exp(-delta * DAMPING);
    const targetLight = active ? 1 : 0;
    const targetDim = dimmed ? 1 : 0;
    const light = u.uLight.value + (targetLight - u.uLight.value) * t;
    const dim = u.uDim.value + (targetDim - u.uDim.value) * t;
    setUniform(u, "uLight", light);
    setUniform(u, "uDim", dim);

    const settled =
      Math.abs(targetLight - light) < 0.002 &&
      Math.abs(targetDim - dim) < 0.002;
    if (!settled) state.invalidate();
  });

  return (
    <mesh position={[x - size.width / 2, size.height / 2 - y, 0]}>
      <sphereGeometry args={[radius, 64, 48]} />
      <shaderMaterial
        vertexShader={halftoneVertex}
        fragmentShader={halftoneFragment}
        ref={materialRef}
        uniforms={uniforms}
      />
    </mesh>
  );
}
