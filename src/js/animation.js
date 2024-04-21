import * as THREE from 'three';
import { gsap } from 'gsap';

export const setupAnimation = (context) => {
    const {camera, uniforms, fboMaterial} = context;
    
    let tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.sec1',
          start: 'top top',
          end: 'bottom top',
          endTrigger: '.sec7',
          scrub: 1.5,
        }
      });
  
      const zoom1 = () => {
        camera.zoom = 1 + uniforms.uProgress.value * 0.1;
        camera.updateProjectionMatrix();
      };
      const zoomOut = (from = 0) => {
        
        let process1 = uniforms.uProgress.value - from;
        let progress2 = process1 - 0.5;
        camera.zoom = 1.2 - process1 * 0.2*( 1. + 3 * THREE.MathUtils.clamp( progress2 , 0., 0.4));
        camera.updateProjectionMatrix();
      };
      const zoomOut2 = (from = 0) => {
        
        let process1 = uniforms.uProgress.value - from;
        let progress2 = process1 - 0.5;
        camera.zoom = 1.2 -0.44 - process1 * 0.2;
        camera.updateProjectionMatrix();
      };
      const zoomIn2 = (from)=>{
        let process1 = uniforms.uProgress.value - from;
        camera.zoom = 1.2 -0.44 + process1 * 0.2;
        camera.updateProjectionMatrix();
      }
      const rotateCamera = () => {
        let progress = THREE.MathUtils.clamp(uniforms.uProgress.value - 5.5, 0., 1.);
        let target = new THREE.Vector3(0,0,0);
        
        camera.position.x =  100 * ( Math.sin( Math.PI/4  -progress*1.2 ) );
        camera.position.z = 100 * (  Math.cos( Math.PI/4 -progress*1.2 ) );
        // camera.position.y=target.y+camera_offset.y
  
        camera.lookAt(target.x,target.y,target.z);
      }
      const rotateCamera2 = () => {
        let progress = THREE.MathUtils.clamp(uniforms.uProgress.value - 6.5, 0., 1.);
        
        camera.position.x =  100 * ( Math.sin( Math.PI/4  - 1.2*0.5 - progress*0.6 ) );
        camera.position.z = 100 * (  Math.cos( Math.PI/4  - 1.2*0.5 - progress*0.6 ) );
        camera.lookAt(0,0,0);
      }
    //   const zoomOut2 = () => {
    //     // camera.zoom = 1.2 - (uniforms.uProgress.value - 5) * 0.3;
    //     camera.updateProjectionMatrix();
    //   };
      const decreaseCameraY = () => {
        camera.position.y = 100 - (uniforms.uProgress.value - 2) * 10;
        camera.lookAt(0, 0, 0);
      };
      let logProgress = () => {
        console.log(uniforms.uProgress.value.toFixed(2));
      }
      logProgress = throttle(logProgress, 1000/120);
      function throttle(fn, delay) {
        let timer = null;
        return function () {
          if (timer) {
            return;
          }
          timer = setTimeout(() => {
            fn();
            timer = null;
          }, delay);
        };
      }
      tl.to(uniforms.uProgress, {
        value: 1,
        onUpdate: (self) => {
          zoom1();
          logProgress();
        }
      });
      tl.to(uniforms.uProgress, {
        value: 2,
        onUpdate: (self) => {
          zoom1();
          logProgress();
        }
      });
      tl.to(uniforms.uProgress, {
        value: 3,
        onUpdate: (self) => {
          decreaseCameraY();
        }
      });
      tl.to(uniforms.uProgress, {
        value: 4,
        onUpdate: (self) => {
          decreaseCameraY();
          logProgress();
        }
      });
      tl.to(uniforms.uProgress, {
        value: 5,
        onUpdate: (self) => {
          logProgress();
        }
      });
      tl.to(uniforms.uProgress, {
        value: 6,
        // ease: "elastic.out(1,0.5)",
        // ease: 'power1.inOut',
        onUpdate: (self) => {
          fboMaterial.uniforms.uProgress.value =  uniforms.uProgress.value - 5;
          zoomOut(5);
          rotateCamera();
          logProgress();
        }
      });
      tl.to(uniforms.uProgress, {
        value: 8,
        // ease: 'power1.inOut',
        onUpdate: (self) => {
          fboMaterial.uniforms.uProgress.value =  uniforms.uProgress.value - 5;
          zoomIn2(6);
          rotateCamera2();
          logProgress();
        }
      });
  
      // ScrollTrigger.create({
      //   trigger: '.sec7',
      //   start: 'top top',
      //   // endTrigger: "#otherID",
      //   end: 'bottom top',
      //   // ease: 'power1.inOut',
      //   scrub: 3,
      //   onUpdate: (self) => {
      //     context.fboMaterial.uniforms.uProgress.value = self.progress;
      //     console.log(
      //       'progress:',
      //       self.progress.toFixed(3),
      //       'direction:',
      //       self.direction,
      //       'velocity',
      //       self.getVelocity()
      //     );
      //   }
      // });
  
  
      // tl.to(uniforms.amplitudeWave, {
      //   value: 0
      // });
}