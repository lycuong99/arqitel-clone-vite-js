import { noise } from "./noise.glsl";


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

            float createWaveNoise(){
              float ampl = 1.1;
              float bienDoX = 1.* ampl;
              float bienDoY = 1.5 * ampl;
      
              float lowerBound = 2.;
            
              float noiseWave = abs((sin((instanceUV.x)*50.+ uTime* 2.) + lowerBound ) * bienDoX + 1.);
              noiseWave *= abs((sin((instanceUV.y)*30.+ uTime* 2.) + lowerBound ) * bienDoY);

              return noiseWave;
            }


            float reduceWaveToBase(float distX,float progress){
              float factor = 1.;
              float tocDoChamDay = progress * 2.;
              float heSoDistX = (1.-distX / clamp( 1. + progress * 2. - 1., 1., 2.0));
              factor = smoothstep(0.0,  0.6 , 1. - (heSoDistX*tocDoChamDay));
              return factor;
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
  
        
          float dist = distance(instanceUV, vec2( 0.5, 0.5));
          vHesoYForColor = 0.;
          float originY = transformed.y;
          float mocY = max(0.1, originY);

          vec4 transition = texture2D(uFBO, instanceUV);
          if(transformed.y >= mocY){
            // float distX  = 1.;
            // distX = (0 -> 1) IN GRID
            float distX = abs(0.5 - instanceUV.x)*2.;
            distX /= uRatioGrid;
            float distY = abs(0.5 - instanceUV.y)*2.;
            distY /= uRatioGrid;
            
            float ONE_UNIT = 1./24.;

            //test for GRAPH
            //stage 1: NOISE
            if(uProgress <= 2.0){
              //INTRO
              transformed.y *= createWaveNoise();
              //START SCROLL
              vHesoYForColor = reduceWaveToBase(distX,uProgress/2.);
              transformed.y *= vHesoYForColor;
            }
            //STAGE 3: GRAPH
            else if(uProgress <= 8.){
              //2 -> 3: plane -> parabol 1
              //3 -> 4: parabol1 -> graph 1, plane -> parabol 2
              //4 -> 5: graph1 -> plane, parabol 2 -> graph 2
              //5 -> 6: graph2 -> plane + transition texture
              float graphProgress = uProgress - 2.0;
              
              float khoangRiseX = 2.* ONE_UNIT;

              float datas[24] = float[](0.25, 0.275, 0.3, 0.3, 0.3, 0.37, 0.4, 0.375, 0.3, 0.35, 0.3, 0.35, 0.4, 0.4, 0.375, 0.4, 0.5, 0.6, 0.55, 0.6, 0.7, 0.85, 0.975, 1.0);

              //transition
              float sign1 = clamp((instanceUV.x-0.5)/abs(instanceUV.x-0.5), 0., 1.);
              float selectCenter = clamp(khoangRiseX - (distX) , 0.0, khoangRiseX) * (1./khoangRiseX) * sign1;

              float apmlGraph1 = 50.;
              float graphX =  ((instanceUV.y - 1. ) / uRatioGrid) + graphProgress;

              float graph1X = graphX + 1.5 ;
              float graph1 = drawOneWaveGraph(graph1X);

              //graph
              //normalize y in GRID from -? -> 0 -> 1 -> ?
              float gY =  (instanceUV.y - (0.5 - uRatioGrid/2.)) / uRatioGrid;
              // gy = clamp(gY, 0., 1.);

              float index = floor(mix(23.,0., gY));

              bool isgYOutGrid = gY < 0. || gY > 1.;
              float chartData = isgYOutGrid ? 0. : datas[int(index)];

              //3 -> 4: parabol1 -> graph 1
              float factorTransition1 = clamp(4. - uProgress, 0., 1.);
              //4 -> 5: graph1 -> plane from Y 
              float transitionDownProcess1 = clamp(uProgress - 4.0, 0., 1.);
              
              graph1 = graph1 * factorTransition1 + chartData * (1. - factorTransition1);

              graph1 *= smoothstep( 0.0, 0.3 , 1. - transitionDownProcess1 * (gY+transitionDownProcess1));
              graph1 = apmlGraph1 *  selectCenter * (graph1);
              
              

              // 2:
              float sign2 =  clamp((-(instanceUV.x - 0.5))/abs(instanceUV.x-0.5), 0., 1.);
              float selectCenter2 = clamp(khoangRiseX - (distX) , 0.0, khoangRiseX)*(1./khoangRiseX) * sign2;

              float graph2X = graphX + 0.5;
              vGraph2X = graph2X;
              float graph2 =  drawOneWaveGraph(graph2X);
              float chartData2 = chartData * 1.5;
              float hesoGiam2 = clamp(5.- uProgress, 0.,1. );

              graph2 = graph2 * hesoGiam2  + chartData2*(1. - hesoGiam2);
              graph2 =  apmlGraph1 * graph2 * selectCenter2;

              // ve graph
              //5 -> 6: graph2 -> plane
              float transitionDownProcess = uProgress - 5.0;
              if(transitionDownProcess > 0.) {
                transformed.y *= (graph1 + graph2)*smoothstep(0.0, 1., 1. -  transitionDownProcess * 10. * (1.-dist/uRatioGrid));
              }else{
                transformed.y *=  (graph1 + graph2);
              }
            }
          }
          vHeightUV = clamp(position.y*2., 0.0, 1.0);
          //apply transition by dynamic texture
        
          // (x,y,z) (r,b,g)
          //SCALE
          // G : scale
          // R : translate/ move Y
          // B : SCALE by Y/displacement
          // transformed *=  step(0.9,transition.g);
        

          transformed *=  smoothstep(0.01, 0.9, transition.g);
          //--
          bool isUpPartBeforeAddR = transformed.y >= 0.;
          float yBeforeAddR = transformed.y;
          //--
          float MAX_HEIGHT = 180.;
          float fly =  transition.r*MAX_HEIGHT;
          float transitionHeight = smoothstep(0.0, 1.,transition.b);
          float height = transitionHeight*(1. + transitionHeight)*MAX_HEIGHT;
            transformed.y += fly;
            if(transition.b > 0.0 && isUpPartBeforeAddR)
            {
              transformed.y = transformed.y + transitionHeight*MAX_HEIGHT ;
            }
          vHeight = transformed.y;
  
          vinstanceUV = instanceUV;

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
                //wave to plane
                hightestColor = mix(ramp_color_three, hightlight, smoothstep(0.2, 0.6, vHesoYForColor));
              } 
  
  
              finalColor = mix(ramp_color_two, hightestColor, vHeightUV);
            }else if(uProgress <= 8.){
              vec3 g2Color = mix(ramp_color_three, hightlight, clamp( (vGraph2X + 0.5)*1.5, 0., 1.)  );
              finalColor = vGraph2X +0.5 > 0. && vinstanceUV.x - 0.5 < 0. ? g2Color : ramp_color_three;

              float transitionProcess = (uProgress - 5.)*0.5;
              float processColorCircleLanRa = clamp(transitionProcess, 0., 1.);
              finalColor = mix(finalColor, ramp_color_three, smoothstep(0.1, 1., processColorCircleLanRa*4.));

              //change texture
              if(uProgress >= 5.){

                finalColor = mix(finalColor, hightlight, clamp((vHeight/140. - 0.2) , 0., 1.));
                finalColor+= clamp((vHeight/140. - 0.2) , 0., 1.)/10.;
              }
              
            }

            diffuseColor.rgb = finalColor;
              
  
            `
    );
  };
};
