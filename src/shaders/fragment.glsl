uniform float uProgress;
uniform sampler2D uState1;
uniform sampler2D uState2;
varying vec2 vUv;

void main() {
  vec4 color1 = texture2D(uState1, vUv);
  vec4 color2 = texture2D(uState2, vec2(vUv.x, 1. - vUv.y));

  float distFromCenter = distance(vUv, vec2(0.5));
  float radius = 1.41;//sqrt of 2

  float outner_progress = clamp(1.1 * uProgress, 0., 1.);
  float inner_progress = clamp(1.1 * uProgress - 0.05, 0., 1.);

  float innerCircle = 1. - smoothstep((inner_progress - 0.2) * radius, inner_progress * radius, distFromCenter);

  vec4 finalColor = mix(color1, color2, uProgress);

  gl_FragColor = finalColor;
  gl_FragColor = vec4(vec3(innerCircle), 1.);
}