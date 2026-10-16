import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { Mesh, ShaderMaterial, Texture } from "three";
import { SUN_TEXTURE } from "./bodyAppearance";
import { sunShader } from "./shaders";
import { configureTextures } from "./textures";
import { setUniform } from "./uniforms";
import { smoothstep, zoomPlacement, type Placement, type Timeline, type ZoomFrame } from "./viewTransition";

/** Brightness multiplier; values above 1 are what the bloom pass picks up. */
const SUN_INTENSITY = 3.0;

interface SunBodyProps {
  base: Placement;
  zoom: Timeline;
  zoomFrame: ZoomFrame | null;
}

export function SunBody({ base, zoom, zoomFrame }: SunBodyProps) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const map = useTexture(SUN_TEXTURE, configureTextures);
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uMap: { value: null as Texture | null },
      uIntensity: { value: SUN_INTENSITY },
      uFade: { value: 0 },
    }),
    [],
  );

  useLayoutEffect(() => {
    const u = materialRef.current?.uniforms;
    if (!u) return;
    u.uMap.value = map;
    invalidate();
  }, [map, invalidate]);

  // Flies outward and fades with the other bodies when a planet is opened.
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const e = zoom.value(performance.now());
    const me = zoomPlacement(base, zoomFrame, e, false);
    mesh.position.set(me.x - size.width / 2, size.height / 2 - me.y, 0);
    mesh.scale.setScalar(me.r / base.r);
    const fade = zoomFrame ? smoothstep(0, 0.5, e) : 0;
    mesh.visible = fade < 0.995;
    setUniform(materialRef.current, "uFade", fade);
  });

  return (
    <mesh ref={meshRef} rotation={[0.25, 0.8, 0]}>
      <sphereGeometry args={[base.r, 96, 64]} />
      <shaderMaterial ref={materialRef} {...sunShader} uniforms={uniforms} />
    </mesh>
  );
}
