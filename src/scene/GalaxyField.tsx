import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferGeometry, DoubleSide, Float32BufferAttribute, PlaneGeometry, type ShaderMaterial } from "three";
import { GALAXY_RADIUS_LY } from "../data/milkyWay";
import { ARMS, BAR, galaxyStipple } from "./galaxy";
import type { GalaxyPlacement } from "./layout/solarPlate";
import { lerp, smoothstep, type Timeline, type ZoomFrame } from "./viewTransition";
import { IDENTITY_STAGE, type StageRef } from "./voyage";

interface GalaxyFieldProps {
  galaxy: GalaxyPlacement;
  width: number;
  height: number;
  zoom: Timeline;
  zoomFrame: ZoomFrame | null;
  /** The voyage between scales (identity otherwise). */
  stage?: StageRef;
}

const DEG = Math.PI / 180;

/** Shared by the stipple and the glow: positions are CSS pixels (y down), moved by the zoom and the voyage. */
const placeVertex = /* glsl */ `
  uniform vec2 uHalf;
  uniform vec2 uFrom;
  uniform vec2 uCenter;
  uniform float uScale;
  vec4 place(vec2 xy) {
    vec2 p = uCenter + (xy - uFrom) * uScale;
    return projectionMatrix * modelViewMatrix * vec4(p.x - uHalf.x, uHalf.y - p.y, -500.0, 1.0);
  }
`;

export const galaxyVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uDpr;
  varying float vAlpha;
  varying vec3 vColor;
  ${placeVertex}
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    gl_PointSize = aSize * uDpr;
    gl_Position = place(position.xy);
  }
`;

export const galaxyFragmentShader = /* glsl */ `
  uniform float uFade;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.12, d) * vAlpha * (1.0 - uFade);
    // Added to what's beneath: where stars crowd, the light builds, as it does in a real galaxy.
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`;

export const galaxyGlowVertexShader = /* glsl */ `
  uniform vec2 uGalaxy;
  varying vec2 vLocal;
  ${placeVertex}
  void main() {
    vLocal = position.xy - uGalaxy;
    gl_Position = place(position.xy);
  }
`;

/**
 * The galaxy's own light, under its stars: a soft glow traced along the same arms as the
 * stipple (galaxy.ts), violet-blue where young stars crowd and rose where hydrogen glows, with
 * the warm, old light of the bar and bulge at the heart.
 */
export const galaxyGlowFragmentShader = /* glsl */ `
  uniform float uLyPerPx;
  uniform float uTurn;
  uniform float uFade;
  uniform float uTh[${ARMS.length}];
  uniform float uCot[${ARMS.length}];
  uniform float uArmFrom[${ARMS.length}];
  uniform float uArmTo[${ARMS.length}];
  uniform float uWidth[${ARMS.length}];
  uniform float uWeight[${ARMS.length}];
  uniform float uBarAngle;
  uniform float uBarHalf;
  varying vec2 vLocal;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    return 0.5 * noise(p) + 0.3 * noise(p * 2.1 + 7.0) + 0.2 * noise(p * 4.3 + 13.0);
  }

  void main() {
    vec2 q = vLocal * uLyPerPx;
    float r = length(q);
    // The galaxy's own frame: angles as in galaxy.ts (y down, the Sun at 90 degrees).
    float c = cos(-uTurn);
    float s = sin(-uTurn);
    vec2 g = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
    float th = atan(g.y, g.x);
    float arms = 0.0;
    for (int i = 0; i < ${ARMS.length}; i++) {
      float a = uTh[i] - uCot[i] * log(max(r, 100.0) / 20000.0);
      float d = mod(th - a + 3.14159265, 6.2831853) - 3.14159265;
      float dist = abs(d) * r;
      // Real arms have no edges: a broad band, thousands of light-years across, fading slowly.
      float w = uWidth[i] * 3.6;
      float span = smoothstep(uArmFrom[i] - 4000.0, uArmFrom[i] + 4000.0, r) * smoothstep(uArmTo[i] + 3000.0, uArmTo[i] - 9000.0, r);
      // Patchy, not a smooth tube: clumps along each arm, and a wide faint wash around it.
      float clump = 0.4 + 1.0 * fbm(g / 2100.0 + float(i) * 9.7);
      float band = exp(-dist * dist / (w * w)) * clump + 0.45 * exp(-dist * dist / (w * w * 6.0));
      // A dark lane of dust along each arm's inner edge (d < 0 is inside the arm, as it trails).
      float lane = (d * r + 0.55 * w) / (0.3 * w);
      band *= 1.0 - 0.55 * exp(-lane * lane) * (0.6 + 0.8 * fbm(g / 900.0));
      arms += uWeight[i] * span * band;
    }
    float n = fbm(g / 2600.0);
    vec2 bd = vec2(cos(uBarAngle), sin(uBarAngle));
    float along = dot(g, bd);
    float across = dot(g, vec2(-bd.y, bd.x));
    float bar = exp(-1.6 * (along / uBarHalf) * (along / uBarHalf) - (across / 2800.0) * (across / 2800.0));
    float core = exp(-r * r / (3600.0 * 3600.0));
    float halo = exp(-r * r / (9500.0 * 9500.0));
    float disc = exp(-r / 15000.0) * smoothstep(52000.0, 38000.0, r);
    vec3 armCol = mix(vec3(0.46, 0.44, 0.98), vec3(0.92, 0.4, 0.66), smoothstep(0.38, 0.72, n));
    vec3 col = armCol * arms * (0.09 + 0.12 * n) * exp(-max(r - 15000.0, 0.0) / 42000.0)
      + vec3(1.0, 0.6, 0.28) * (bar * 0.22 + halo * 0.1)
      + vec3(1.0, 0.84, 0.6) * core * 0.3
      // Between the arms the disc is dimmer, not empty: the faint, yellowish light of older stars.
      + mix(vec3(0.8, 0.64, 0.46), vec3(0.5, 0.42, 0.7), n) * disc * 0.15;
    gl_FragColor = vec4(col * (1.0 - uFade), 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * The Milky Way (see galaxy.ts): a soft glow along its arms, and coloured stipple over it,
 * both added to the dark so crowded places build up light. Generated once for the plate's
 * size, then moved only by the zoom into a landmark and the voyage between scales.
 */
export function GalaxyField({ galaxy, width, height, zoom, zoomFrame, stage }: GalaxyFieldProps) {
  const dpr = useThree((s) => s.viewport.dpr);
  const dotsRef = useRef<ShaderMaterial>(null);
  const glowRef = useRef<ShaderMaterial>(null);

  const dots = useMemo(() => {
    const stipple = galaxyStipple(galaxy);
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(stipple.positions, 3));
    g.setAttribute("aSize", new Float32BufferAttribute(stipple.sizes, 1));
    g.setAttribute("aAlpha", new Float32BufferAttribute(stipple.alphas, 1));
    g.setAttribute("aColor", new Float32BufferAttribute(stipple.colors, 3));
    return g;
  }, [galaxy]);
  useEffect(() => () => dots.dispose(), [dots]);

  // A square over the disc, in the same CSS-pixel coordinates as the dots.
  const glow = useMemo(() => {
    const side = galaxy.r * 2.15;
    return new PlaneGeometry(side, side).translate(galaxy.x, galaxy.y, 0);
  }, [galaxy]);
  useEffect(() => () => glow.dispose(), [glow]);

  const dotUniforms = useMemo(() => ({ ...placeUniforms(), uDpr: { value: 1 } }), []);
  const glowUniforms = useMemo(
    () => ({
      ...placeUniforms(),
      uGalaxy: { value: [galaxy.x, galaxy.y] as [number, number] },
      uLyPerPx: { value: GALAXY_RADIUS_LY / galaxy.r },
      uTurn: { value: galaxy.sunAngle - 90 * DEG },
      uTh: { value: ARMS.map((a) => a.th20 * DEG) },
      uCot: { value: ARMS.map((a) => 1 / Math.tan(a.pitch * DEG)) },
      uArmFrom: { value: ARMS.map((a) => a.from) },
      uArmTo: { value: ARMS.map((a) => a.to) },
      uWidth: { value: ARMS.map((a) => a.width) },
      uWeight: { value: ARMS.map((a) => a.weight) },
      uBarAngle: { value: BAR.angle * DEG },
      uBarHalf: { value: BAR.half },
    }),
    [galaxy],
  );

  useFrame(() => {
    const e = zoom.value(performance.now());
    let from: [number, number] = [0, 0];
    let center: [number, number] = [0, 0];
    let scale = 1;
    if (zoomFrame && e > 0) {
      scale = Math.exp(Math.log(zoomFrame.to.r / zoomFrame.from.r) * e);
      from = [zoomFrame.from.x, zoomFrame.from.y];
      center = [lerp(zoomFrame.from.x, zoomFrame.to.x, e), lerp(zoomFrame.from.y, zoomFrame.to.y, e)];
    }
    // The voyage between scales, on top of the zoom: p' = P + s (p - A).
    const st = stage?.current ?? IDENTITY_STAGE;
    const fade = Math.max(zoomFrame ? smoothstep(0, 0.5, e) : 0, 1 - st.opacity);
    for (const m of [dotsRef.current, glowRef.current]) {
      if (!m) continue;
      const u = m.uniforms;
      u.uHalf.value = [width / 2, height / 2];
      u.uFrom.value = from;
      u.uCenter.value = [st.px + st.s * (center[0] - st.ax), st.py + st.s * (center[1] - st.ay)];
      u.uScale.value = scale * st.s;
      u.uFade.value = fade;
    }
    if (dotsRef.current) dotsRef.current.uniforms.uDpr.value = dpr;
  });

  return (
    <>
      <mesh geometry={glow} renderOrder={-2}>
        <shaderMaterial
          ref={glowRef}
          vertexShader={galaxyGlowVertexShader}
          fragmentShader={galaxyGlowFragmentShader}
          uniforms={glowUniforms}
          // Flipping y into CSS pixels reverses the winding, so the square shows its back.
          side={DoubleSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <points geometry={dots} renderOrder={-1}>
        <shaderMaterial
          ref={dotsRef}
          vertexShader={galaxyVertexShader}
          fragmentShader={galaxyFragmentShader}
          uniforms={dotUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </>
  );
}

/** The zoom and voyage uniforms both layers share (see placeVertex). */
function placeUniforms() {
  return {
    uHalf: { value: [0, 0] as [number, number] },
    uFrom: { value: [0, 0] as [number, number] },
    uCenter: { value: [0, 0] as [number, number] },
    uScale: { value: 1 },
    uFade: { value: 0 },
  };
}
