import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, type WebGLRenderTarget } from "three";

const copyShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tScene;
    varying vec2 vUv;
    void main() {
      gl_FragColor = vec4(clamp(texture2D(tScene, vUv).rgb, 0.0, 1.0), 1.0);
      #include <colorspace_fragment>
    }
  `,
};

/**
 * The scene is drawn into a linear, half-float buffer, then copied to the screen in one pass
 * that converts it for display. Light added to the dark (the galaxy, nebulae, glows) then sums
 * as light does, in linear values, and only the result is encoded. This replaced a bloom pass
 * (with its own multisampling) that cost most of each frame on modest graphics chips; stars now
 * draw their own glow (starGlowShader). `target` is a half-float WebGLRenderTarget.
 */
export function LinearOutput({ target }: { target: WebGLRenderTarget }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const copy = useMemo(() => {
    const material = new ShaderMaterial({ ...copyShader, uniforms: { tScene: { value: target.texture } }, depthTest: false, depthWrite: false });
    const geometry = new PlaneGeometry(2, 2);
    const scene = new Scene();
    scene.add(new Mesh(geometry, material));
    return { scene, camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1), material, geometry };
  }, [target]);
  useEffect(
    () => () => {
      copy.material.dispose();
      copy.geometry.dispose();
    },
    [copy],
  );

  useEffect(() => {
    target.setSize(Math.max(1, Math.round(size.width * dpr)), Math.max(1, Math.round(size.height * dpr)));
  }, [target, size.width, size.height, dpr]);

  // A positive priority takes over rendering from R3F: draw the scene, then the copy.
  useFrame(({ scene, camera }) => {
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(copy.scene, copy.camera);
  }, 1);
  return null;
}
