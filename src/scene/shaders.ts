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
