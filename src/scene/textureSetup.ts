import { SRGBColorSpace, type Texture } from "three";

/** Color maps are sRGB; anisotropy keeps detail at the sphere's grazing edges. */
export function configureTextures(tex: Texture | Texture[]) {
  for (const t of Array.isArray(tex) ? tex : [tex]) {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
  }
}
