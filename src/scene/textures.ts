import { SRGBColorSpace, type Texture } from "three";

/** Public URL for a file in public/textures (Solar System Scope, CC BY 4.0). */
export function textureUrl(file: string) {
  return `${import.meta.env.BASE_URL}textures/${file}`;
}

/** Color maps are sRGB; anisotropy keeps detail at the sphere's grazing edges. */
export function configureTextures(tex: Texture | Texture[]) {
  for (const t of Array.isArray(tex) ? tex : [tex]) {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
  }
}
