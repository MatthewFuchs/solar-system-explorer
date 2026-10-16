import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  RingGeometry,
  Vector2,
  Vector3,
  type ShaderMaterial,
  type Texture,
} from "three";
import type { BodyAppearance } from "./bodyAppearance";
import { atmosphereShader, planetShader, ringShader } from "./shaders";
import { configureTextures } from "./textures";

/** Higher is snappier. Exponential damping eases out with no overshoot. */
const DAMPING = 14;
/** Atmosphere shell radius relative to the planet. */
const SHELL_SCALE = 1.08;
/** How far a ringed planet's pole leans toward the viewer, so the rings read as an ellipse. */
const RING_VIEW_TILT = 0.38;

interface PlanetBodyProps {
  /** Center in CSS pixels, origin top-left. */
  x: number;
  y: number;
  r: number;
  sun: { x: number; y: number };
  appearance: BodyAppearance;
  active: boolean;
  dimmed: boolean;
  reducedMotion: boolean;
}

// Uniforms are written in place every animated frame, outside React's render cycle.
function setUniform(material: ShaderMaterial | null, name: string, value: number) {
  if (material) material.uniforms[name].value = value;
}

/** Ring geometry whose u coordinate runs radially, matching the ring texture strip. */
function createRingGeometry(inner: number, outer: number) {
  const g = new RingGeometry(inner, outer, 180, 1);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
  }
  return g;
}

export function PlanetBody({ x, y, r, sun, appearance, active, dimmed, reducedMotion }: PlanetBodyProps) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const ring = appearance.ring;
  const textures = useTexture(ring ? [appearance.texture, ring.texture] : [appearance.texture], configureTextures);

  const planetRef = useRef<ShaderMaterial>(null);
  const shellRef = useRef<ShaderMaterial>(null);
  const ringRef = useRef<ShaderMaterial>(null);

  const planetUniforms = useMemo(
    () => ({
      uMap: { value: null as Texture | null },
      uSunPos: { value: new Vector3() },
      uAtmosphere: { value: new Color() },
      uRim: { value: 0 },
      uLight: { value: 0 },
      uDim: { value: 0 },
    }),
    [],
  );
  const shellUniforms = useMemo(
    () => ({
      uSunDir: { value: new Vector2() },
      uAtmosphere: { value: new Color() },
      uRim: { value: 0 },
      uInner: { value: Math.sqrt(1 - 1 / (SHELL_SCALE * SHELL_SCALE)) },
      uLight: { value: 0 },
      uDim: { value: 0 },
    }),
    [],
  );
  const ringUniforms = useMemo(
    () => ({ uMap: { value: null as Texture | null }, uLight: { value: 0 }, uDim: { value: 0 } }),
    [],
  );

  const ringGeometry = useMemo(() => (ring ? createRingGeometry(r * ring.inner, r * ring.outer) : null), [ring, r]);
  useEffect(() => () => ringGeometry?.dispose(), [ringGeometry]);

  const wx = x - size.width / 2;
  const wy = size.height / 2 - y;
  const sunWx = sun.x - size.width / 2;
  const sunWy = size.height / 2 - sun.y;

  useLayoutEffect(() => {
    const p = planetRef.current?.uniforms;
    const s = shellRef.current?.uniforms;
    if (!p || !s) return;
    p.uMap.value = textures[0];
    p.uSunPos.value.set(sunWx, sunWy, 0);
    p.uAtmosphere.value.set(appearance.atmosphere);
    p.uRim.value = appearance.rim;
    s.uSunDir.value.set(sunWx - wx, sunWy - wy).normalize();
    s.uAtmosphere.value.set(appearance.atmosphere);
    s.uRim.value = appearance.rim;
    const rg = ringRef.current?.uniforms;
    if (rg) rg.uMap.value = textures[1] ?? null;
    invalidate();
  }, [textures, sunWx, sunWy, wx, wy, appearance, invalidate]);

  // The canvas renders on demand; wake it when hover state changes.
  useEffect(() => invalidate(), [active, dimmed, invalidate]);

  useFrame((state, rawDelta) => {
    const current = planetRef.current?.uniforms;
    if (!current) return;
    const delta = Math.min(rawDelta, 1 / 30);
    const t = reducedMotion ? 1 : 1 - Math.exp(-delta * DAMPING);
    const targetLight = active ? 1 : 0;
    const targetDim = dimmed ? 1 : 0;
    const light = current.uLight.value + (targetLight - current.uLight.value) * t;
    const dim = current.uDim.value + (targetDim - current.uDim.value) * t;
    for (const m of [planetRef.current, shellRef.current, ringRef.current]) {
      setUniform(m, "uLight", light);
      setUniform(m, "uDim", dim);
    }
    if (Math.abs(targetLight - light) > 0.002 || Math.abs(targetDim - dim) > 0.002) state.invalidate();
  });

  return (
    <group position={[wx, wy, 0]} rotation={[0, 0, appearance.tilt]}>
      <group rotation={[ring ? RING_VIEW_TILT : 0, 0, 0]}>
        <mesh rotation={[0, appearance.spin, 0]}>
          <sphereGeometry args={[r, 64, 48]} />
          <shaderMaterial ref={planetRef} {...planetShader} uniforms={planetUniforms} />
        </mesh>
        {ringGeometry && (
          <mesh geometry={ringGeometry} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
            <shaderMaterial
              ref={ringRef}
              {...ringShader}
              uniforms={ringUniforms}
              transparent
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        )}
      </group>
      <mesh scale={SHELL_SCALE} renderOrder={1}>
        <sphereGeometry args={[r, 48, 32]} />
        <shaderMaterial
          ref={shellRef}
          {...atmosphereShader}
          uniforms={shellUniforms}
          side={BackSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
