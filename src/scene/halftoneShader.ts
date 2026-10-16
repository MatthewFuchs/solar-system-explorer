// Stylized sphere shading: lit side in a flat muted tone, shadow side built from
// a rotated halftone dot screen in ink, like an engraved or printed plate.

export const halftoneVertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const halftoneFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uInk;
  uniform vec3 uLightDir;
  uniform float uCell;
  uniform float uLight;
  uniform float uDim;
  varying vec3 vNormal;

  void main() {
    vec3 n = normalize(vNormal);
    float diffuse = dot(n, normalize(uLightDir));
    float shade = smoothstep(-0.25, 0.95, diffuse);

    // Halftone screen at 30 degrees, in device pixels.
    vec2 p = mat2(0.866, -0.5, 0.5, 0.866) * (gl_FragCoord.xy / uCell);
    float d = length(fract(p) - 0.5);
    float dotRadius = sqrt(1.0 - shade) * 0.66;
    float aa = fwidth(d);
    float inkAmount = 1.0 - smoothstep(dotRadius - aa, dotRadius + aa, d);

    vec3 base = mix(uColor * 0.62, uColor, shade);
    vec3 col = mix(base, uInk, inkAmount * 0.92);

    // Fine paper grain.
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.045;

    col = mix(col, min(col * 1.3 + 0.04, vec3(1.0)), uLight);
    col = mix(col, uInk, uDim * 0.62);

    gl_FragColor = vec4(col, 1.0);
  }
`;
