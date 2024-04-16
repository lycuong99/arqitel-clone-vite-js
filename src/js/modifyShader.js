const noise = /*glsl*/ `
//	Classic Perlin 3D Noise 
//	by Stefan Gustavson
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}
`;

export const modifyShader = (uniforms) => {
  return (shader) => {
    shader.uniforms = {
      ...shader.uniforms,
      ...uniforms
    };

    //Modify
    //declare
    shader.vertexShader = shader.vertexShader.replace(
      `#include <common>`,
      /*glsl*/ `
            #include <common>
            uniform sampler2D uFBO;
            uniform float uProgress;
            uniform float uTime;
            uniform float uRatioGrid;
            uniform vec3 light_color;
            uniform vec3 ramp_color_one;
            uniform vec3 ramp_color_two;
            uniform vec3 ramp_color_three;
            uniform vec3 ramp_color_four;
            attribute vec2 instanceUV;
            varying float vHeight;
            varying float vHeightUV;
  
            varying float vHesoYForColor;
            varying vec2 vinstanceUV;
            varying float vHesoTangChieuCao;
            varying float vGraph2X;
  
            ${noise}
            
            float drawWaveGraph(float x, float t){
                return clamp(pow( cos(3.14 * (2.*x+t - 1.) / 2.0), 3.0), 0.,1.);
            }
            float drawOneWaveGraph(float x){
                return smoothstep(0.0,1.,(1. - (pow(2.0*x,2.)))/2.)*2.;
            }

            float easeOutBack(float x){
              float c1 = 1.70158;
              float c3 = c1 + 1.;
              
              return 1. + c3 * pow(x - 1., 3.) + c1 * pow(x - 1., 2.);
            }

            float easeOutCubic(float x) {
              return 1. - pow(1. - x, 3.);
            }
            `
    );
    //
    shader.vertexShader = shader.vertexShader.replace(
      `#include <begin_vertex>`,
      /* glsl*/ `
          #include <begin_vertex>
          
        
  
          // float n = cnoise(vec3(instanceUV.x*5., instanceUV.y*5., uTime*0.1));  
          // if(transformed.y > 0.1){
          //   transformed.y *= abs( n*10.);
          // }
  
          //by sin wave cirlce
          float dist = distance(instanceUV, vec2( 0.5, 0.5));
          vHesoYForColor = 0.;

          if(transformed.y >= 0.1){
          
          // float distX  = 1.;
          // distX = (0 -> 1) IN GRID
          float distX = abs(0.5 - instanceUV.x)*2.;
          distX /= uRatioGrid;
          float distY = abs(0.5 - instanceUV.y)*2.;
          distY /= uRatioGrid;
            
          //test for GRAPH
          //stage 1: NOISE
          if(uProgress <= 2.0){
                 // aX = 1.;
          float ampl = 1.1;
          float bienDoX = 1.* ampl;
          float bienDoY = 1.5 * ampl;
  
          float lowerBound = 2.;
          
          transformed.y *= abs((sin((instanceUV.x)*50.+ uTime* 2.) + lowerBound ) * bienDoX + 1.);
          transformed.y *= abs((sin((instanceUV.y)*30.+ uTime* 2.) + lowerBound ) * bienDoY);

            // transformed.y *= (1. * clamp(1. - uProgress * (1.-distX)*1., 0.0, 0.5 + uProgress));
  
            // float tocDoChamDay = uProgress + clamp( uProgress - 1.5, 0.0, 1.0)*uProgress*uProgress*5.;
            // STAGE 2:
            float tocDoChamDay = uProgress;
            float heSoDistX = (1.-distX / clamp( 1. + uProgress - 1., 1., 2.0));
            float vHesoY1 = smoothstep(0.0,  0.6 , 1. - (heSoDistX*tocDoChamDay));
            vHesoYForColor = vHesoY1;
            transformed.y *= (1. * vHesoY1);
          }
          //STAGE 3: GRAPH
          else if(uProgress <=5.){

            float graphProgress = uProgress - 2.0;
            float graphProgress2 = uProgress - 3.0 ;

           
            float khoangRiseX = 2./24.;

            float datas[24] = float[](0.25, 0.275, 0.3, 0.3, 0.3, 0.37, 0.4, 0.375, 0.3, 0.35, 0.3, 0.35, 0.4, 0.4, 0.375, 0.4, 0.5, 0.6, 0.55, 0.6, 0.7, 0.85, 0.975, 1.0);
            //transition
            float sign1 = clamp((instanceUV.x-0.5)/abs(instanceUV.x-0.5), 0., 1.);
            float selectCenter = clamp(khoangRiseX - (distX) , 0.0, khoangRiseX)*(1./khoangRiseX) * sign1;

            float apmlGraph1 = 50.;
            float graphX =  ((instanceUV.y - 1. ) / uRatioGrid) + graphProgress;
            float graph1X = graphX + 1.5 ;
            float graph1 = drawOneWaveGraph(graph1X);

            //graph
            float gY = (instanceUV.y - (0.5 - uRatioGrid/2.)) / uRatioGrid;
            float index = floor(mix(23.,0., gY));
            float chartData = datas[int(index)];

            float hesoGiam = clamp(4. - uProgress, 0., 1.);
            // hesoGiam = smoothstep(0., 1., 4. - uProgress);
            // hesoGiam = easeOutBack(hesoGiam);
         
          
      

            float extra = clamp(graph1 - chartData, 0.,1. );

            float ONE_UNIT = 1./24.;
            float max1 = max(graph1, chartData);
            float min1 = min(graph1, chartData);

            graph1 = graph1*hesoGiam + chartData*(1. - hesoGiam);

            graph1 = apmlGraph1 *  selectCenter * (graph1);
            


            // 2:
            float sign2 =  clamp((-(instanceUV.x - 0.5))/abs(instanceUV.x-0.5), 0., 1.);
            float selectCenter2 = clamp(khoangRiseX - (distX) , 0.0, khoangRiseX)*(1./khoangRiseX) * sign2;

            float graph2X = graphX + 0.5;
            vGraph2X = graph2X;
            float graph2 =  drawOneWaveGraph(graph2X);
            float chartData2 = chartData * 1.5;
            float hesoGiam2 = clamp(5.- uProgress, 0.,1. );
            // graph2 = graph2X >=  0.3 ? chartData + clamp(graph2 - chartData2, 0.,1.)*(hesoGiam2) : graph2;
            graph2 = graph2*hesoGiam2  + chartData2*(1. - hesoGiam2);
            graph2 =  apmlGraph1 * graph2 * selectCenter2;

         
            //
            transformed.y *= graph1 + graph2;

            // ve graph
                     
           
            // transformed.y *= 70. * drawOneWaveGraph(((instanceUV.x - 1. ) / uRatioGrid) + graphProgress + 1.5, graphProgress) * selectCenter2;
          }
          }
  
          vHeightUV = clamp(position.y*2., 0.0, 1.0);
          //apply transition by dynamic texture
          vec4 transition = texture2D(uFBO, instanceUV);
          // (x,y,z) (r,b,g)
          //SCALE
  
          transformed *=  step(0.9,transition.g);
          transformed.y +=  transition.r*200.;  
  
          vHeight = transformed.y;
  
          vinstanceUV = instanceUV;
          vHesoTangChieuCao = vHeight/vHeightUV;
  
          
            `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <common>`,
      /*glsl*/ `
            #include <common>
            uniform sampler2D uFBO;
            uniform float uProgress;
            uniform float uTime;
            uniform float uRatioGrid;
            uniform vec3 light_color;
            uniform vec3 ramp_color_one;
            uniform vec3 ramp_color_two;
            uniform vec3 ramp_color_three;
            uniform vec3 ramp_color_four;
            varying float vHeight;
            varying float vHeightUV;
  
          
  
            varying float vHesoYForColor;
            varying vec2 vinstanceUV;
            //GRAPH
            varying float vGraph2X;
  
            `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <color_fragment>`,
      /* glsl */ `
            #include <color_fragment>
            float distX = abs(0.5 - clamp(vinstanceUV.x*1., 0.0, 1.0))*2.;
            distX /= uRatioGrid;
            //sáng ở trên
            vec3 hightlight = mix(ramp_color_three, ramp_color_four, vHeightUV);
            vec3 finalColor = ramp_color_two;
            // diffuseColor.rgb = mix(diffuseColor.rgb, ramp_color_three, vHeightUV);
            // diffuseColor.rgb = mix(diffuseColor.rgb, hightlight, clamp((vHeight/10. -3.) , 0., 1.));
  
            //STAGE 1: Wave process
            //take highest color by Y
            if(uProgress <= 2.){
              vec3 hightestColor = mix(hightlight, ramp_color_three, smoothstep(0.6, 1., vHesoYForColor));
              if(vHesoYForColor <= 0.2){
                hightestColor = mix(ramp_color_three, ramp_color_three, smoothstep(0.0, 0.2, vHesoYForColor));
              }
              else if(vHesoYForColor > 0.2 && vHesoYForColor < 0.6 ){
                // diffuseColor.rgb = mix(ramp_color_two, hightlight, vHesoYForColor);
                // hightestColor = ramp_color_four;
                hightestColor = mix(ramp_color_three, hightlight, smoothstep(0.2, 0.6, vHesoYForColor));
              } 
  
  
              finalColor = mix(ramp_color_two, hightestColor, vHeightUV);
            }else if(uProgress <= 5.){
              vec3 g2Color = mix(ramp_color_three, hightlight, clamp( (vGraph2X + 0.5)*1.5, 0., 1.)  );
              finalColor = vGraph2X +0.5 > 0. && vinstanceUV.x - 0.5 < 0. ? g2Color : ramp_color_three;
            }
           


            
            diffuseColor.rgb = finalColor;
              
  
            `
    );
  };
};
