import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  RingGeometry,
  TextureLoader,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type ShaderMaterial,
  type Texture,
} from "three";
import { isSurfacePOI, type POI } from "../data/solarSystem";
import type { BodyAppearance } from "./bodyAppearance";
import { atmosphereShader, planetShader, ringShader, sunShader } from "./shaders";
import { configureTextures } from "./textureSetup";
import { setUniform } from "./uniforms";
import {
  easeInOutCubic,
  faceRotation,
  lerp,
  nearestAngle,
  smoothstep,
  surfacePoint,
  zoomPlacement,
  type Placement,
  type Timeline,
  type ZoomFrame,
} from "./viewTransition";

/** Higher is snappier. Exponential damping eases out with no overshoot. */
const DAMPING = 14;
/** Atmosphere shell radius relative to the planet: soft at overview size, tight up close. */
const SHELL_SCALE = 1.08;
const SHELL_SCALE_CLOSE = 1.028;
/** How far a ringed planet's pole leans toward the viewer, so the rings read as an ellipse. */
const RING_VIEW_TILT = 0.38;
/** Markers fade out as they approach the limb and are hidden on the far side. */
const MARKER_LIMB = [0.12, 0.38] as const;

/** The Sun's brightness: values above 1 feed the bloom. Eased down up close so its surface reads. */
const SUN_GLOW = 3.0;
const SUN_GLOW_CLOSE = 0.95;

interface PlanetBodyProps {
  /** Render as the Sun: an emissive star with no atmosphere shell or sunlight shading. */
  star?: boolean;
  /** Overview placement in CSS pixels, origin top-left. */
  base: Placement;
  sun: Placement;
  appearance: BodyAppearance;
  active: boolean;
  dimmed: boolean;
  reducedMotion: boolean;
  zoom: Timeline;
  zoomFrame: ZoomFrame | null;
  /** This planet is the one being zoomed to or shown in planet view. */
  isFocus: boolean;
  /** Point of interest to turn toward; null lets the planet spin. */
  facing: POI | null;
  turnMs: number;
  /** The focused planet's POIs and their marker elements, positioned every frame. */
  pois?: POI[];
  markerEls?: Map<string, HTMLElement>;
}

interface Turn {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  start: number;
  ms: number;
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

const hdCache = new Map<string, Promise<Texture>>();
function loadHd(url: string) {
  let p = hdCache.get(url);
  if (!p) {
    p = new TextureLoader().loadAsync(url).then((t) => {
      configureTextures(t);
      return t;
    });
    hdCache.set(url, p);
  }
  return p;
}

const scratch = new Vector3();

export function PlanetBody({
  star = false,
  base,
  sun,
  appearance,
  active,
  dimmed,
  reducedMotion,
  zoom,
  zoomFrame,
  isFocus,
  facing,
  turnMs,
  pois,
  markerEls,
}: PlanetBodyProps) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const ring = appearance.ring;
  const textures = useTexture(ring ? [appearance.texture, ring.texture] : [appearance.texture], configureTextures);

  const groupRef = useRef<Group>(null);
  const sphereRef = useRef<Mesh>(null);
  const shellMeshRef = useRef<Mesh>(null);
  const planetRef = useRef<ShaderMaterial>(null);
  const shellRef = useRef<ShaderMaterial>(null);
  const ringRef = useRef<ShaderMaterial>(null);
  const rotRef = useRef({ x: 0, y: appearance.spin });
  const turnRef = useRef<Turn | null>(null);

  const planetUniforms = useMemo(
    () => ({
      uMap: { value: null as Texture | null },
      uSunPos: { value: new Vector3() },
      uIntensity: { value: SUN_GLOW },
      uAtmosphere: { value: new Color() },
      uRim: { value: 0 },
      uLight: { value: 0 },
      uDim: { value: 0 },
      uFade: { value: 0 },
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
      uFade: { value: 0 },
    }),
    [],
  );
  const ringUniforms = useMemo(
    () => ({
      uMap: { value: null as Texture | null },
      uLight: { value: 0 },
      uDim: { value: 0 },
      uFade: { value: 0 },
    }),
    [],
  );

  const ringGeometry = useMemo(
    () => (ring ? createRingGeometry(base.r * ring.inner, base.r * ring.outer) : null),
    [ring, base.r],
  );
  useEffect(() => () => ringGeometry?.dispose(), [ringGeometry]);

  useLayoutEffect(() => {
    const p = planetRef.current?.uniforms;
    const s = shellRef.current?.uniforms;
    if (!p) return;
    p.uMap.value = textures[0];
    p.uAtmosphere.value.set(appearance.atmosphere);
    p.uRim.value = appearance.rim;
    if (s) {
      s.uAtmosphere.value.set(appearance.atmosphere);
      s.uRim.value = appearance.rim;
    }
    const rg = ringRef.current?.uniforms;
    if (rg) rg.uMap.value = textures[1] ?? null;
    invalidate();
  }, [textures, appearance, invalidate]);

  // Swap in the full-size map once this planet is opened, without suspending the scene.
  useEffect(() => {
    if (!isFocus) return;
    let cancelled = false;
    loadHd(appearance.textureHd).then((hd) => {
      const p = planetRef.current?.uniforms;
      if (cancelled || !p) return;
      p.uMap.value = hd;
      invalidate();
    });
    return () => {
      cancelled = true;
    };
  }, [isFocus, appearance.textureHd, invalidate]);

  // Turn to face the requested surface POI, or level out again when released.
  // Orbit POIs (moons, rings, spacecraft) sit beside the planet, so it holds still for them.
  useEffect(() => {
    const rot = rotRef.current;
    const now = performance.now();
    if (isFocus && facing) {
      if (!isSurfacePOI(facing)) return;
      const [tx, ty] = faceRotation(facing.lat, facing.lon);
      turnRef.current = { fromX: rot.x, fromY: rot.y, toX: tx, toY: nearestAngle(ty, rot.y), start: now, ms: turnMs };
    } else if (rot.x !== 0) {
      turnRef.current = { fromX: rot.x, fromY: rot.y, toX: 0, toY: rot.y, start: now, ms: turnMs };
    }
    invalidate();
  }, [isFocus, facing, turnMs, invalidate]);

  // The canvas may render on demand; wake it when view or hover state changes.
  useEffect(() => invalidate(), [active, dimmed, zoomFrame, invalidate]);

  useFrame((state, rawDelta) => {
    const group = groupRef.current;
    const sphere = sphereRef.current;
    const current = planetRef.current?.uniforms;
    if (!group || !sphere || !current) return;
    const delta = Math.min(rawDelta, 1 / 30);
    const now = performance.now();
    const halfW = size.width / 2;
    const halfH = size.height / 2;

    // Placement through the zoom.
    const e = zoom.value(now);
    const me = zoomPlacement(base, zoomFrame, e, isFocus);
    const sunNow = zoomPlacement(sun, zoomFrame, e, false);
    group.position.set(me.x - halfW, halfH - me.y, 0);
    group.scale.setScalar(me.r / base.r);
    const fade = zoomFrame && !isFocus ? smoothstep(0, 0.55, e) : 0;
    if (star) setUniform(planetRef.current, "uIntensity", lerp(SUN_GLOW, SUN_GLOW_CLOSE, isFocus ? e : 0));
    group.visible = fade < 0.995;

    // Rotation: a timed turn toward a POI, otherwise the slow spin.
    const rot = rotRef.current;
    const turn = turnRef.current;
    if (turn) {
      const k = turn.ms <= 0 ? 1 : Math.min(1, (now - turn.start) / turn.ms);
      const s = easeInOutCubic(k);
      rot.x = lerp(turn.fromX, turn.toX, s);
      rot.y = lerp(turn.fromY, turn.toY, s);
      if (k >= 1) turnRef.current = null;
    } else if (!facing && !reducedMotion) {
      rot.y += delta * appearance.spinSpeed;
    }
    sphere.rotation.set(rot.x, rot.y, 0);

    // Light follows the Sun as it moves through the zoom.
    current.uSunPos.value.set(sunNow.x - halfW, halfH - sunNow.y, 0);
    shellUniforms.uSunDir.value.set(sunNow.x - me.x, me.y - sunNow.y).normalize();

    // A halo that suits a small disc reads as blur on a large one; tighten it as we zoom in.
    const shellScale = isFocus ? lerp(SHELL_SCALE, SHELL_SCALE_CLOSE, e) : SHELL_SCALE;
    shellMeshRef.current?.scale.setScalar(shellScale);
    setUniform(shellRef.current, "uInner", Math.sqrt(1 - 1 / (shellScale * shellScale)));

    // Hover brightening and dimming.
    const t = reducedMotion ? 1 : 1 - Math.exp(-delta * DAMPING);
    const targetLight = active ? 1 : 0;
    const targetDim = dimmed ? 1 : 0;
    const light = current.uLight.value + (targetLight - current.uLight.value) * t;
    const dim = current.uDim.value + (targetDim - current.uDim.value) * t;
    for (const m of [planetRef.current, shellRef.current, ringRef.current]) {
      setUniform(m, "uLight", light);
      setUniform(m, "uDim", dim);
      setUniform(m, "uFade", fade);
    }

    // POI markers: project each surface point to the screen and hide the far side;
    // orbit POIs float at a fixed angle and distance beside the planet.
    if (isFocus && pois && markerEls) {
      sphere.updateWorldMatrix(true, false);
      const arrived = smoothstep(0.8, 1, e);
      for (const poi of pois) {
        const el = markerEls.get(poi.id);
        if (!el) continue;
        let x: number;
        let y: number;
        let alpha: number;
        if (isSurfacePOI(poi)) {
          surfacePoint(poi.lat, poi.lon, scratch).multiplyScalar(base.r);
          sphere.localToWorld(scratch);
          x = scratch.x + halfW;
          y = halfH - scratch.y;
          alpha = arrived * smoothstep(MARKER_LIMB[0], MARKER_LIMB[1], scratch.z / me.r);
        } else {
          const a = (poi.orbit.angle * Math.PI) / 180;
          x = me.x + Math.cos(a) * poi.orbit.distance * me.r;
          y = me.y - Math.sin(a) * poi.orbit.distance * me.r;
          alpha = arrived;
        }
        const transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        if (el.style.transform !== transform) el.style.transform = transform;
        el.style.opacity = alpha.toFixed(3);
        el.style.visibility = alpha < 0.03 ? "hidden" : "visible";
      }
    }

    const settling = Math.abs(targetLight - light) > 0.002 || Math.abs(targetDim - dim) > 0.002;
    if (!zoom.done(now) || turnRef.current || settling) state.invalidate();
  });

  return (
    <group ref={groupRef} rotation={[0, 0, appearance.tilt]}>
      <group rotation={[ring ? RING_VIEW_TILT : 0, 0, 0]}>
        <mesh ref={sphereRef}>
          <sphereGeometry args={[base.r, 64, 48]} />
          <shaderMaterial ref={planetRef} {...(star ? sunShader : planetShader)} uniforms={planetUniforms} />
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
      {!star && (
        <mesh ref={shellMeshRef} scale={SHELL_SCALE} renderOrder={1}>
          <sphereGeometry args={[base.r, 48, 32]} />
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
      )}
    </group>
  );
}
