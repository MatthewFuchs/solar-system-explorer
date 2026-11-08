// Shaders for the deep-space overview. All output linear color and finish with
// three's colorspace chunk, so they compose correctly with the bloom pass.

const sphereVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** Textured planet lit from the Sun: soft terminator, dark night side, atmospheric rim. */
export const planetShader = {
  vertexShader: sphereVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D uMap;
    uniform vec3 uSunPos;
    uniform vec3 uAtmosphere;
    uniform float uRim;
    uniform float uLight;
    uniform float uDim;
    uniform float uFade;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    varying vec3 vViewNormal;

    void main() {
      vec3 n = normalize(vWorldNormal);
      vec2 toSun = uSunPos.xy - vWorldPos.xy;
      // The Sun sits in the screen plane; lift it toward the viewer so more of the disc is lit.
      vec3 L = normalize(vec3(toSun, length(toSun) * 0.35));
      float ndl = dot(n, L);
      float day = smoothstep(-0.12, 0.3, ndl);

      vec3 albedo = texture2D(uMap, vUv).rgb;
      float diffuse = max(ndl, 0.0) * 0.92 + day * 0.12;
      vec3 col = albedo * (0.012 + diffuse * (1.0 + uLight * 0.4));

      float fresnel = pow(1.0 - clamp(vViewNormal.z, 0.0, 1.0), 2.6);
      float rimLit = smoothstep(-0.35, 0.55, ndl);
      col += uAtmosphere * fresnel * uRim * (0.1 + rimLit) * (1.0 + uLight * 0.7);

      col *= (1.0 - uDim * 0.55) * (1.0 - uFade);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }
  `,
};

/** Back-face shell slightly larger than the planet: a soft halo that fades outward. */
export const atmosphereShader = {
  vertexShader: sphereVertex,
  fragmentShader: /* glsl */ `
    uniform vec2 uSunDir;
    uniform vec3 uAtmosphere;
    uniform float uRim;
    uniform float uInner;
    uniform float uLight;
    uniform float uDim;
    uniform float uFade;
    varying vec3 vViewNormal;

    void main() {
      vec3 vn = normalize(vViewNormal);
      // 0 at the shell's outer edge, 1 where it meets the planet's silhouette.
      float glow = pow(smoothstep(0.0, uInner, abs(vn.z)), 2.2);
      float lit = smoothstep(-0.45, 0.8, dot(normalize(vn.xy), uSunDir));
      float a = glow * (0.12 + 0.88 * lit) * uRim * 0.55 * (1.0 + uLight * 0.9) * (1.0 - uDim * 0.6) * (1.0 - uFade);
      gl_FragColor = vec4(uAtmosphere * a, 1.0);
      #include <colorspace_fragment>
    }
  `,
};

/** Saturn's rings: the texture's u runs from inner to outer edge. */
export const ringShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D uMap;
    uniform float uLight;
    uniform float uDim;
    uniform float uFade;
    varying vec2 vUv;
    void main() {
      vec4 t = texture2D(uMap, vUv);
      vec3 col = t.rgb * (0.8 + uLight * 0.3) * (1.0 - uDim * 0.55);
      gl_FragColor = vec4(col, t.a * 0.95 * (1.0 - uFade));
      #include <colorspace_fragment>
    }
  `,
};

/** Emissive Sun: values above 1.0 feed the bloom pass. Limb darkening keeps it spherical. */
export const sunShader = {
  vertexShader: sphereVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D uMap;
    uniform float uIntensity;
    uniform float uFade;
    uniform float uLight;
    uniform float uDim;
    uniform vec3 uTint;
    uniform float uTintMix;
    varying vec2 vUv;
    varying vec3 vViewNormal;
    void main() {
      float mu = clamp(normalize(vViewNormal).z, 0.0, 1.0);
      vec3 tex = texture2D(uMap, vUv).rgb;
      // Other stars reuse the Sun's surface, recoloured: a faint trace of its granulation
      // in their own light, kept bright so up close they still read as stars, not moons.
      float lum = dot(tex, vec3(0.299, 0.587, 0.114));
      tex = mix(tex, uTint * (0.6 + 0.75 * lum), uTintMix);
      // Other stars darken more toward the limb, so up close they read as spheres of light.
      float limb = mix(mix(0.5, 0.22, uTintMix), 1.0, pow(mu, mix(0.45, 0.9, uTintMix)));
      // The hot-core boost scales with intensity, so the eased-down close-up does not clip to white.
      vec3 core = mix(vec3(1.0, 0.82, 0.55), uTint, uTintMix);
      vec3 col = tex * limb * uIntensity + core * pow(mu, 2.0) * 0.3 * uIntensity;
      col *= (1.0 + uLight * 0.2) * (1.0 - uDim * 0.35);
      gl_FragColor = vec4(col * (1.0 - uFade), 1.0);
      #include <colorspace_fragment>
    }
  `,
};

/** Fine round stars with per-star size and brightness. */
export const starShader = {
  vertexShader: /* glsl */ `
    attribute float aSize;
    attribute float aAlpha;
    attribute vec3 aColor;
    uniform float uDpr;
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
      vAlpha = aAlpha;
      vColor = aColor;
      gl_PointSize = aSize * uDpr;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.08, d) * vAlpha;
      gl_FragColor = vec4(vColor * a, a);
      #include <colorspace_fragment>
    }
  `,
};

/**
 * Deep-sky objects (nebulae, a supernova remnant, a star cluster, a black hole), drawn on a
 * flat, camera-facing square instead of a sphere: procedural, original, and still. The square
 * reaches `uSpread` body radii. Clouds and clusters are pure light added to the dark (alpha 0),
 * fading out softly, so they melt into the sky instead of sitting on it like a picture. The
 * black hole is the one thing that covers what's behind it: its shadow is opaque.
 */
export const deepSkyShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uForm;
    uniform vec3 uColA;
    uniform vec3 uColB;
    uniform float uSeed;
    uniform float uSpread;
    uniform float uLight;
    uniform float uDim;
    uniform float uFade;
    varying vec2 vUv;

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
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.03 + 17.1;
        a *= 0.5;
      }
      return v;
    }
    /** Pinpoint stars: at most one per cell, shown where a seeded draw beats 1 - density. */
    float stars(vec2 p, float cell, float density) {
      vec2 c = floor(p / cell);
      vec2 f = fract(p / cell) - 0.5;
      vec2 off = vec2(hash(c + 3.1 + uSeed), hash(c + 7.7 + uSeed)) - 0.5;
      float d = length(f - off * 0.7);
      return step(1.0 - density, hash(c + uSeed)) * smoothstep(0.14, 0.0, d) * (0.45 + 0.55 * hash(c + 11.0));
    }

    /**
     * A black hole after the look of Interstellar's Gargantua: a thin, nearly edge-on accretion
     * disk crossing in front of a dark shadow, the far side of the same disk bent by gravity
     * into arcs over and under it, and a fine bright ring at the shadow's edge. The disk is
     * striated, hottest (white) at its inner edge and amber further out, a little brighter on
     * the side turning toward us.
     */
    vec4 blackHole(vec2 p) {
      float r = length(p);
      float ang = atan(p.y, p.x);
      float rs = 0.34;
      vec3 hot = vec3(1.0, 0.95, 0.86);
      // The far side of the disk, lensed into a halo: tall over the top, thinner beneath.
      float outer = mix(0.5, 0.74, 0.5 + 0.5 * sin(ang));
      float t = clamp((r - rs) / (outer - rs), 0.0, 1.0);
      float lens = smoothstep(rs, rs + 0.02, r) * smoothstep(1.0, 0.75, t);
      lens *= (0.55 + 0.45 * noise(vec2(r * 46.0, ang * 1.5 + uSeed))) * mix(1.0, 0.2, t);
      lens *= 0.75 + 0.25 * sin(ang);
      vec3 col = mix(hot, uColA, t) * lens * 1.05;
      // The shadow.
      float shadow = smoothstep(rs + 0.004, rs - 0.006, r);
      col *= 1.0 - shadow;
      // The photon ring: light that has circled the hole, a hairline at the shadow's edge.
      col += hot * exp(-pow((r - rs - 0.008) / 0.007, 2.0)) * 1.3;
      // The near side of the disk, crossing in front: seen almost edge-on.
      float tilt = -0.06;
      vec2 q = vec2(p.x * cos(tilt) - p.y * sin(tilt), p.x * sin(tilt) + p.y * cos(tilt));
      float flat_ = 0.085;
      float rd = length(vec2(q.x, q.y / flat_));
      float disk = smoothstep(0.38, 0.46, rd) * smoothstep(1.28, 0.85, rd);
      float phi = atan(q.y / flat_, q.x);
      disk *= 0.5 + 0.5 * noise(vec2(rd * 34.0, phi * 1.2 + uSeed));
      // Behind the hole, its own shadow hides the disk; in front, the disk hides the shadow.
      float behind = step(0.0, q.y) * shadow;
      disk *= 1.0 - behind;
      float beam = 1.0 + 0.35 * clamp(-q.x / max(rd, 0.001), -1.0, 1.0);
      float heat = smoothstep(1.2, 0.42, rd);
      col += mix(uColA, hot, heat) * disk * beam * (0.55 + 0.75 * heat);
      // A warm haze of scattered light.
      col += uColA * exp(-r * r * 4.0) * 0.08 * (1.0 - shadow);
      return vec4(col, shadow * (1.0 - disk * (1.0 - behind)));
    }

    void main() {
      vec2 p = (vUv * 2.0 - 1.0) * uSpread;
      float r = length(p);
      vec3 col;
      float a = 0.0;
      if (uForm < 0.5) {
        // A nebula: warped clouds in two colours, thinning softly into the dark, a few young stars.
        vec2 q = p * 1.2 + uSeed;
        vec2 w = vec2(fbm(q), fbm(q + 5.2));
        float n = fbm(q + 2.4 * w);
        float body = exp(-r * r * 1.1) * (0.6 + 0.8 * fbm(q * 0.6 + 3.0));
        float dens = smoothstep(0.28, 0.9, n) * body;
        // Dust dims the glow from within (it can't darken the sky behind).
        float dust = smoothstep(0.5, 0.75, fbm(q * 2.1 + 9.0));
        col = mix(uColA, uColB, smoothstep(0.3, 0.8, w.x)) * dens * (1.0 - 0.6 * dust) * 0.95;
        col += vec3(1.0, 0.95, 0.86) * stars(p, 0.09, 0.06) * exp(-r * r * 0.8);
      } else if (uForm < 1.5) {
        // A supernova remnant: a cage of filaments in an oval shell around a pale heart.
        vec2 e = p * vec2(1.0, 1.3);
        float re = length(e);
        float n = fbm(e * 2.4 + uSeed);
        float ridge = 1.0 - abs(2.0 * fbm(e * 3.6 + uSeed + n) - 1.0);
        float shell = exp(-pow(max(re - 0.55, 0.0) / 0.38, 2.0)) * smoothstep(0.0, 0.5, re + 0.2);
        float fil = pow(ridge, 5.0) * shell;
        float heart = exp(-re * re * 4.0);
        col = uColA * fil * 1.25 + uColB * heart * 0.5 * (0.6 + 0.8 * n) + uColA * exp(-re * re * 1.5) * 0.06;
      } else if (uForm < 2.5) {
        // A globular cluster: stars crowding toward a glowing core.
        float crowd = exp(-r * r * 2.2);
        float s = stars(p, 0.07, 0.12 + 0.8 * crowd) * exp(-r * r * 0.9);
        float glow = exp(-r * r * 5.0) * 0.7 + exp(-r * r * 1.2) * 0.14;
        col = uColA * glow + mix(uColA, vec3(1.0), 0.5) * s;
      } else {
        vec4 bh = blackHole(p);
        col = bh.rgb;
        a = bh.a;
      }
      // Nothing reaches the square's border.
      float edge = smoothstep(uSpread, uSpread * 0.75, r);
      col *= edge * (1.0 + uLight * 0.4) * (1.0 - uDim * 0.55) * (1.0 - uFade);
      a *= edge * (1.0 - uFade);
      gl_FragColor = vec4(col, a);
      #include <colorspace_fragment>
    }
  `,
};
