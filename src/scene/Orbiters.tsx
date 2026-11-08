import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DataTexture, SRGBColorSpace, TextureLoader, Vector3, type Mesh, type ShaderMaterial, type Texture } from "three";
import { isSurfacePOI, type POI } from "../data/solarSystem";
import { orbiterFor } from "./bodyAppearance";
import { featureKeepOut } from "./layout/screen";
import { planetShader } from "./shaders";
import { configureTextures } from "./textureSetup";
import { setUniform } from "./uniforms";
import { faceRotation, fitOrbitAngle, smoothstep, zoomPlacement, type Placement, type Timeline, type ZoomFrame } from "./viewTransition";

/** Higher is snappier. Exponential damping eases out with no overshoot. */
const DAMPING = 14;
/** Moons surface late in the zoom, as the planet arrives, and sink back early when leaving. */
const ARRIVE = [0.45, 0.95] as const;

interface OrbitersProps {
  /** The focused body's overview placement; moons are placed relative to it as it zooms. */
  base: Placement;
  sun: Placement;
  pois: POI[];
  zoom: Timeline;
  zoomFrame: ZoomFrame | null;
  /** The selected POI brightens its moon. */
  selectedId: string | null;
}

/**
 * The focused body's moons, as lit spheres beside it in the planet view. Each sits at its
 * POI's orbit angle and distance, sized in the planet's radii, so it grows in with the zoom.
 * The clickable part is the DOM marker over it (PoiMarkers); this is only what you see.
 */
export function Orbiters({ base, sun, pois, zoom, zoomFrame, selectedId }: OrbitersProps) {
  const moons = useMemo(
    () =>
      pois.flatMap((poi) => {
        const look = orbiterFor(poi.id);
        return !isSurfacePOI(poi) && look?.kind === "moon" ? [{ poi, look }] : [];
      }),
    [pois],
  );
  return (
    <>
      {moons.map(({ poi, look }) => (
        <Moon
          key={poi.id}
          base={base}
          sun={sun}
          zoom={zoom}
          zoomFrame={zoomFrame}
          angle={poi.orbit.angle}
          distance={poi.orbit.distance}
          radius={look.radius}
          face={look.face}
          faceLat={look.faceLat ?? 0}
          texture={look.texture}
          color={look.color}
          atmosphere={look.atmosphere}
          rim={look.rim ?? 0}
          selected={poi.id === selectedId}
        />
      ))}
    </>
  );
}

const cache = new Map<string, Promise<Texture>>();
function loadMap(url: string) {
  let p = cache.get(url);
  if (!p) {
    p = new TextureLoader().loadAsync(url).then(
      (t) => {
        configureTextures(t);
        return t;
      },
      (err: unknown) => {
        cache.delete(url); // let a later visit try again
        throw err;
      },
    );
    cache.set(url, p);
  }
  return p;
}

/** A one-pixel map, for a moon drawn as a flat colored haze. */
function flatMap(hex: string) {
  const c = new Color(hex);
  const t = new DataTexture(new Uint8Array([c.r * 255, c.g * 255, c.b * 255, 255]), 1, 1);
  t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

interface MoonProps {
  base: Placement;
  sun: Placement;
  zoom: Timeline;
  zoomFrame: ZoomFrame | null;
  angle: number;
  distance: number;
  radius: number;
  face: number;
  faceLat: number;
  texture?: string;
  color?: string;
  atmosphere?: string;
  rim: number;
  selected: boolean;
}

function Moon({ base, sun, zoom, zoomFrame, angle, distance, radius, face, faceLat, texture, color, atmosphere, rim, selected }: MoonProps) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uMap: { value: null as Texture | null },
      uSunPos: { value: new Vector3() },
      uAtmosphere: { value: new Color(atmosphere ?? "#ffffff") },
      uRim: { value: rim },
      uLight: { value: 0 },
      uDim: { value: 0 },
      uFade: { value: 1 },
    }),
    [atmosphere, rim],
  );

  // The map loads when the planet view opens, without suspending the scene; until then the moon stays hidden.
  useEffect(() => {
    let cancelled = false;
    let flat: DataTexture | null = null;
    const apply = (t: Texture) => {
      if (cancelled) return;
      setUniformMap(matRef.current, t);
      invalidate();
    };
    const applyFlat = () => {
      flat = flatMap(color ?? "#888888");
      apply(flat);
    };
    // If the map fails to load, the moon is still drawn, as a plain lit sphere.
    if (texture) void loadMap(texture).then(apply, applyFlat);
    else applyFlat();
    return () => {
      cancelled = true;
      flat?.dispose();
    };
  }, [texture, color, invalidate]);

  const [faceX, faceY] = useMemo(() => faceRotation(faceLat, face), [faceLat, face]);
  // Turned along its orbit if needed to stay on screen, as its marker is (PlanetBody).
  const fitted = useMemo(
    () => (zoomFrame ? fitOrbitAngle(angle, distance, radius * zoomFrame.to.r, zoomFrame.to, size.width, size.height, featureKeepOut(size.width, size.height)) : angle),
    [angle, distance, radius, zoomFrame, size.width, size.height],
  );
  const a = (fitted * Math.PI) / 180;

  useFrame((state, rawDelta) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const now = performance.now();
    const e = zoom.value(now);
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    const me = zoomPlacement(base, zoomFrame, e, true);
    const sunNow = zoomPlacement(sun, zoomFrame, e, false);
    const arrived = zoomFrame ? smoothstep(ARRIVE[0], ARRIVE[1], e) : 0;

    mesh.visible = arrived > 0.005 && mat.uniforms.uMap.value !== null;
    mesh.position.set(me.x + Math.cos(a) * distance * me.r - halfW, halfH - (me.y - Math.sin(a) * distance * me.r), 0);
    mesh.scale.setScalar(Math.max(radius * me.r, 0.01));
    mat.uniforms.uSunPos.value.set(sunNow.x - halfW, halfH - sunNow.y, 0);
    setUniform(mat, "uFade", 1 - arrived);

    const target = selected ? 1 : 0;
    const t = 1 - Math.exp(-Math.min(rawDelta, 1 / 30) * DAMPING);
    const light = mat.uniforms.uLight.value + (target - mat.uniforms.uLight.value) * t;
    setUniform(mat, "uLight", light);
    if (!zoom.done(now) || Math.abs(target - light) > 0.002) state.invalidate();
  });

  return (
    <mesh ref={meshRef} rotation={[faceX, faceY, 0]} visible={false}>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial ref={matRef} {...planetShader} uniforms={uniforms} />
    </mesh>
  );
}

function setUniformMap(material: ShaderMaterial | null, map: Texture) {
  if (material) material.uniforms.uMap.value = map;
}
