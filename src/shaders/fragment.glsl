uniform float uProgress;
uniform sampler2D uState1;
uniform sampler2D uState2;
uniform sampler2D uState3;
uniform sampler2D uState4;
varying vec2 vUv;
uniform sampler2D uDisplacement2;
uniform sampler2D uDisplacement3;
uniform sampler2D uDisplacement4;

vec2 rotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  mat2 m = mat2(c, s, -s, c);
  return m * v;
}
vec4 stage1(vec4 color1, vec4 color2, float distFromCenter, float radius, float uProgress) {
  float outner_progress = clamp(1.1 * uProgress, 0., 1.);
  float inner_progress = clamp(1.1 * uProgress - 0.05, 0., 1.);
  vec4 displacement2Map = texture2D(uDisplacement2, vec2(vUv.x, 1. - vUv.y));

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

  float scaleY = displacement2Map.r * smoothstep(0., 1., (uProgress - 0.1) * (innerCircle - distFromCenter - innerCircle * 0.8 * (1. - uProgress) / 2.) * innerCircle * 3. + uProgress * 0.5);

  vec4 finalColor = vec4(vec3(displacement, scale, scaleY), 1.);
  return finalColor;
}

void main() {
  vec4 color1 = texture2D(uState1, vUv);
  vec4 color2 = texture2D(uState2, vec2(vUv.x, 1. - vUv.y));
  vec4 color3 = texture2D(uState3, vec2(vUv.x, 1. - vUv.y));
  vec4 color4 = texture2D(uState4, vec2(vUv.x, 1. - vUv.y));

  vec4 displacement2Map = texture2D(uDisplacement2, vec2(vUv.x, 1. - vUv.y));
  vec4 displacement3Map = texture2D(uDisplacement3, vec2(vUv.x, 1. - vUv.y));
  vec4 displacement4Map = texture2D(uDisplacement4, vec2(vUv.x, 1. - vUv.y));

  float distFromCenter = distance(vUv, vec2(0.5));
  float radius = 1.41;//sqrt of 2

  vec4 finalColor = color1;

  //Stage 1: 5->6 <=> 0 - 1
  //state 2: 2 -> 4
  float transitionProcess1To2 = clamp(uProgress / 2., 0., 1.);
  finalColor = stage1(color1, color2, distFromCenter, radius, transitionProcess1To2);

  float displacementProcess = clamp(transitionProcess1To2 * 1.5, 0., 1.);

  // finalColor.b = displacement2Map.r * smoothstep(0., 1., displacementProcess );

//2->3
 
  float progressTo3 = clamp((uProgress - 2. + 0.5)/2., 0., 1.);
  float outner_progress = clamp(1.1 * progressTo3, 0., 1.);
  float inner_progress = clamp(1.1 * progressTo3 - 0.05, 0., 1.);
  float deltaCircle = 0.1;
  float innerCircle = 1. - smoothstep((inner_progress - deltaCircle) * radius, inner_progress * radius, distFromCenter);
  float outerCircle = 1. - smoothstep((outner_progress - deltaCircle) * radius, outner_progress * radius, distFromCenter);
  float displacement = outerCircle - innerCircle;
  float scale = mix(color2.r, color3.r, innerCircle);
  finalColor.r += displacement;

  if(uProgress > 1.){
    finalColor.g = scale;
    float a = smoothstep( 0., outerCircle,(distFromCenter - outerCircle + 0.5));

    finalColor.b *= a;
    // finalColor.r *= 1.-a;
  }

  float progressTo35 = clamp((uProgress - 2. + 0.15)/2., 0., 1.);
  deltaCircle = 0.05;
  outner_progress = clamp( progressTo35, 0., 1.);
  inner_progress = clamp( progressTo35 - 0.05, 0., 1.);
    innerCircle = 1. - smoothstep((inner_progress - deltaCircle) * radius, inner_progress * radius, distFromCenter);
   outerCircle = 1. - smoothstep((outner_progress - deltaCircle) * radius, outner_progress * radius, distFromCenter);
   displacement = outerCircle - innerCircle;
   finalColor.r += displacement * 0.75;

  float scaleY = clamp(outerCircle - distFromCenter, 0., 1.)*(0.5 - distFromCenter);
  finalColor.b += scaleY*displacement3Map.r * 8.;

//
float progressTo45 = clamp((uProgress -3. + 0.15)/2., 0., 1.);
  deltaCircle = 0.1;
  outner_progress = clamp( progressTo45, 0., 1.);
  inner_progress = clamp( progressTo45 - 0.05, 0., 1.);
    innerCircle = 1. - smoothstep((inner_progress - deltaCircle) * radius, inner_progress * radius, distFromCenter);
   outerCircle = 1. - smoothstep((outner_progress - deltaCircle) * radius, outner_progress * radius, distFromCenter);
   displacement = outerCircle - innerCircle;
   finalColor.r += displacement * 0.75;
  scale = mix(color3.r, color4.r, innerCircle);
  if(uProgress > 3.){
     finalColor.g = scale;
     float aa = smoothstep( 0., outerCircle,(distFromCenter - outerCircle + 0.5));
    
    finalColor.b *= aa;
  }
  scaleY = clamp(outerCircle - distFromCenter, 0., 1.)*(0.5 - distFromCenter);
  finalColor.b += scaleY*displacement4Map.r * 8.;








  gl_FragColor = finalColor;
}
