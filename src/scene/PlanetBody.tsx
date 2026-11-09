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
import { applyStage, IDENTITY_STAGE, type StageRef } from "./voyage";
import { DEEP_SKY_FORMS, DEEP_SKY_SPREAD, glowWidthPx, orbiterFor, type BodyAppearance } from "./bodyAppearance";
import { featureKeepOut } from "./layout/screen";
import { atmosphereShader, deepSkyShader, planetShader, ringShader, starGlowShader, sunShader } from "./shaders";
import { PALETTE } from "../lib/palette";
import { configureTextures } from "./textureSetup";
import { setUniform } from "./uniforms";
import {
  easeInOutCubic,
  faceRotation,
  fitOrbitAngle,
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
/** The radius of the object a marker stands for: a moon (in planet radii), a spacecraft drawing, or a plain marker. */
function objectRadius(poi: POI, planetR: number) {
  const look = orbiterFor(poi.id);
  return look?.kind === "moon" ? look.radius * planetR : look?.kind === "craft" ? look.size / 2 : 18;
}

/** Room a marker's name needs beside it before it moves to the other side. */
const LABEL_ROOM = 210;

/** The Sun's brightness: above 1, so its heart burns white. Eased down up close so its surface reads. */
const SUN_GLOW = 3.0;
const SUN_GLOW_CLOSE = 0.95;
/** A star's drawn glow (starGlowShader; its width, glowWidthPx). Up close it fades to GLOW_CLOSE of its strength, so the surface reads. */
const GLOW_STRENGTH = 0.6;
const GLOW_CLOSE = 0.2;
/** How many glow widths the glow's square reaches past the disc. */
const GLOW_REACH = 6;
/**
 * A black hole's photon ring glows too: warm white light spilling over its shadow (drawn on
 * top, from HOLE_GLOW_R of its radius, just inside the shadow's edge), gone up close.
 */
const HOLE_GLOW = "#FFE6BE";
const HOLE_GLOW_R = 0.3;
/**
 * Other stars, up close: bright enough that their centre just glows, whatever their colour.
 * A white star (Sirius) needs far less than a red dwarf, so the
 * brightness is set from the star's own luminance, aiming its centre at this level.
 */
const STAR_PEAK_CLOSE = 1.2;
function starGlowClose(tint: string) {
  const c = new Color(tint);
  const luminance = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  // 1.2 is the recoloured surface's typical brightness (0.6 + 0.75 × the map's luminance, in shaders.ts).
  return Math.min(3, Math.max(1, STAR_PEAK_CLOSE / (luminance * 1.2)));
}

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
  /** The voyage between scales: scales and fades the whole plate (identity otherwise). */
  stage?: StageRef;
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
    p = new TextureLoader().loadAsync(url).then(
      (t) => {
        configureTextures(t);
        return t;
      },
      (err: unknown) => {
        hdCache.delete(url); // let a later visit try again
        throw err;
      },
    );
    hdCache.set(url, p);
  }
  return p;
}

const scratch = new Vector3();

export function PlanetBody({
  stage,
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
  const glowMeshRef = useRef<Mesh>(null);
  const glowRef = useRef<ShaderMaterial>(null);
  const ringRef = useRef<ShaderMaterial>(null);
  const rotRef = useRef({ x: 0, y: appearance.spin });
  const closeGlow = useMemo(() => (appearance.tint ? starGlowClose(appearance.tint) : SUN_GLOW_CLOSE), [appearance.tint]);
  const turnRef = useRef<Turn | null>(null);

  const planetUniforms = useMemo(
    () => ({
      uMap: { value: null as Texture | null },
      uSunPos: { value: new Vector3() },
      uIntensity: { value: SUN_GLOW },
      uTint: { value: new Color() },
      uTintMix: { value: 0 },
      uAtmosphere: { value: new Color() },
      uRim: { value: 0 },
      uLight: { value: 0 },
      uDim: { value: 0 },
      uFade: { value: 0 },
      // Deep-sky objects only (deepSkyShader).
      uForm: { value: 0 },
      uColA: { value: new Color() },
      uColB: { value: new Color() },
      uSeed: { value: 0 },
      uSpread: { value: 1 },
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
  const glowUniforms = useMemo(
    () => ({
      uColor: { value: new Color(appearance.deepSky ? HOLE_GLOW : (appearance.tint ?? PALETTE.ember)) },
      uR: { value: appearance.deepSky ? base.r * HOLE_GLOW_R : base.r },
      uW: { value: glowWidthPx(base.r) },
      uEdge: { value: base.r + GLOW_REACH * glowWidthPx(base.r) },
      uStrength: { value: GLOW_STRENGTH },
      uLight: { value: 0 },
      uDim: { value: 0 },
      uFade: { value: 0 },
    }),
    [appearance.deepSky, appearance.tint, base.r],
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
    p.uTint.value.set(appearance.tint ?? "#ffffff");
    p.uTintMix.value = appearance.tint ? 1 : 0;
    const look = appearance.deepSky;
    if (look) {
      p.uForm.value = DEEP_SKY_FORMS.indexOf(look.form);
      p.uColA.value.set(look.colors[0]);
      p.uColB.value.set(look.colors[1]);
      p.uSeed.value = look.seed;
      p.uSpread.value = DEEP_SKY_SPREAD[look.form];
    }
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
    }).catch(() => {
      // The full-size map didn't load: the planet keeps its overview map, a little softer.
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
    const st = stage?.current ?? IDENTITY_STAGE;
    const me = applyStage(zoomPlacement(base, zoomFrame, e, isFocus), st);
    const sunNow = applyStage(zoomPlacement(sun, zoomFrame, e, false), st);
    group.position.set(me.x - halfW, halfH - me.y, 0);
    group.scale.setScalar(me.r / base.r);
    const fade = Math.max(zoomFrame && !isFocus ? smoothstep(0, 0.55, e) : 0, 1 - st.opacity);
    if (star) setUniform(planetRef.current, "uIntensity", lerp(SUN_GLOW, closeGlow, isFocus ? e : 0));
    // The glow, sized on screen: the group's scale would otherwise blow it up with the disc.
    const glowMesh = glowMeshRef.current;
    if (glowMesh && me.r > 0) {
      const k = me.r / base.r;
      const w = glowWidthPx(me.r) / k;
      const edge = glowUniforms.uR.value + GLOW_REACH * w;
      glowMesh.scale.setScalar(edge * 2);
      setUniform(glowRef.current, "uW", w);
      setUniform(glowRef.current, "uEdge", edge);
      setUniform(glowRef.current, "uStrength", GLOW_STRENGTH * lerp(1, star ? GLOW_CLOSE : 0, isFocus ? e : 0));
    }
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
    for (const m of [planetRef.current, shellRef.current, ringRef.current, glowRef.current]) {
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
          // Turned along its orbit if needed to stay on screen (Orbiters places moons the same way).
          const look = orbiterFor(poi.id);
          const objR = objectRadius(poi, zoomFrame?.to.r ?? me.r);
          const angle = zoomFrame ? fitOrbitAngle(poi.orbit.angle, poi.orbit.distance, objR, zoomFrame.to, size.width, size.height, featureKeepOut(size.width, size.height)) : poi.orbit.angle;
          const a = (angle * Math.PI) / 180;
          x = me.x + Math.cos(a) * poi.orbit.distance * me.r;
          y = me.y - Math.sin(a) * poi.orbit.distance * me.r;
          alpha = arrived;
          // A moon's button covers the moon, which grows with the planet.
          if (look?.kind === "moon") el.style.setProperty("--obj-r", `${(look.radius * me.r).toFixed(1)}px`);
        }
        // A marker's name sits to the right, or to the left when the right edge is too close.
        const room = isSurfacePOI(poi) ? 18 : objectRadius(poi, zoomFrame?.to.r ?? me.r);
        const side = x + room + LABEL_ROOM > size.width ? "left" : "right";
        if (el.dataset.side !== side) el.dataset.side = side;
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
      {(star || appearance.deepSky?.form === "black-hole") && (
        // Added to the dark: drawn first for a star, so the disc sits on its own light; last for
        // a black hole, so the ring's light spills over the shadow.
        <mesh ref={glowMeshRef} renderOrder={star ? -1 : 3}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial ref={glowRef} {...starGlowShader} uniforms={glowUniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
        </mesh>
      )}
      <group rotation={[ring ? RING_VIEW_TILT : 0, 0, 0]}>
        {appearance.deepSky ? (
          // A flat cloud of light facing the viewer, added to the dark; premultiplied, so a black hole's shadow covers what's behind.
          <mesh ref={sphereRef}>
            <planeGeometry args={[base.r * 2 * DEEP_SKY_SPREAD[appearance.deepSky.form], base.r * 2 * DEEP_SKY_SPREAD[appearance.deepSky.form]]} />
            <shaderMaterial ref={planetRef} {...deepSkyShader} uniforms={planetUniforms} transparent premultipliedAlpha depthWrite={false} />
          </mesh>
        ) : (
          <mesh ref={sphereRef}>
            <sphereGeometry args={[base.r, 64, 48]} />
            <shaderMaterial ref={planetRef} {...(star ? sunShader : planetShader)} uniforms={planetUniforms} />
          </mesh>
        )}
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
      {!star && !appearance.deepSky && (
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
