uniform float uProgress;
uniform sampler2D uState1;
uniform sampler2D uState2;
varying vec2 vUv;

vec4 stage1(vec4 color1, vec4 color2, float distFromCenter, float radius, float uProgress) {
  float outner_progress = clamp(1.1 * uProgress, 0., 1.);
  float inner_progress = clamp(1.1 * uProgress - 0.05, 0., 1.);

  float deltaCircle = 0.1;
  // mờ tại 1 khoảng {deltaCircle}
  // vòng tròn lớn dần theo {inner_progress}
  // từ đen -> trắng
  float innerCircle = 1. - smoothstep((inner_progress - deltaCircle) * radius, inner_progress * radius, distFromCenter);

  float outerCircle = 1. - smoothstep((outner_progress - deltaCircle) * radius, outner_progress * radius, distFromCenter);

  // outerCircle - innerCircle: khoảng giữa 2 circle 
  float displacement = outerCircle - innerCircle;

  // từ color1 -> color2
  float scale = mix(color1.r, color2.r, innerCircle);

  vec4 finalColor = vec4(vec3(displacement, scale, 0.), 1.);
  return finalColor;
}

void main() {
  vec4 color1 = texture2D(uState1, vUv);
  vec4 color2 = texture2D(uState2, vec2(vUv.x, 1. - vUv.y));

  float distFromCenter = distance(vUv, vec2(0.5));
  float radius = 1.41;//sqrt of 2

  vec4 finalColor = color1;
  //Stage 1:
  if(uProgress < 1.0) {
    finalColor = stage1(color1, color2, distFromCenter, radius, uProgress/2.);
  }

  gl_FragColor = finalColor;

}
