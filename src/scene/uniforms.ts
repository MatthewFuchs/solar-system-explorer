import type { ShaderMaterial } from "three";

// Uniforms are written in place every animated frame, outside React's render cycle.
export function setUniform(material: ShaderMaterial | null, name: string, value: number) {
  if (material) material.uniforms[name].value = value;
}
