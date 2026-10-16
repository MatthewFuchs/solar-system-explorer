import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { ShaderMaterial, Texture } from "three";
import { SUN_TEXTURE } from "./bodyAppearance";
import { sunShader } from "./shaders";
import { configureTextures } from "./textures";

/** Brightness multiplier; values above 1 are what the bloom pass picks up. */
const SUN_INTENSITY = 3.0;

interface SunBodyProps {
  x: number;
  y: number;
  r: number;
}

export function SunBody({ x, y, r }: SunBodyProps) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const map = useTexture(SUN_TEXTURE, configureTextures);
  const materialRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({ uMap: { value: null as Texture | null }, uIntensity: { value: SUN_INTENSITY } }),
    [],
  );

  useLayoutEffect(() => {
    const u = materialRef.current?.uniforms;
    if (!u) return;
    u.uMap.value = map;
    invalidate();
  }, [map, invalidate]);

  return (
    <mesh position={[x - size.width / 2, size.height / 2 - y, 0]} rotation={[0.25, 0.8, 0]}>
      <sphereGeometry args={[r, 96, 64]} />
      <shaderMaterial ref={materialRef} {...sunShader} uniforms={uniforms} />
    </mesh>
  );
}
