import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';
import { GUI } from 'dat.gui';
import { gsap } from 'gsap';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Environment from './Environtment';
import { modifyShader } from './modifyShader';
gsap.registerPlugin(ScrollTrigger);

const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};
export default class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.gui = new GUI();

    this.setLoaders();
    this.init();
    this.environment = new Environment(this);
    this.setupFBO();

    this.addObjects();

    this.render();
    this.setResize();

    this.addHelpers();
    this.setUpSettings();
  }
  setUpSettings() {
    this.settings = {
      process: 0,
      enableControl: false
    };

    try {
      this.gui.add(this.settings, 'process', 0, 1, 0.01).onChange((value) => {
        this.fboMaterial.uniforms.uProgress.value = value;
      });
    } catch (error) {
      console.log(error);
    }

    // this.gui.add(this.settings, 'enableControl').listen().onFinishChange(function() {
    //   this.controls.enabled = this.settings.enableControl;
    // });

    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.sec1',
        start: 'top top',
        end: 'bottom top',
        endTrigger: '.sec7',
        scrub: 1.5,
        onEnter: (self) => {
          console.groupEnd();
          console.group('Stage 1:');
        }
      }
    });
    //stage 1

    // tl.to(this.fboMaterial.uniforms.uProgress, {
    //   value: 1,
    //   onComplete: (self) => {
    //     this.uniforms.uProgress.value = self.progress;
    //   }
    // });
    const zoom1 = () => {
      this.camera.zoom = 1 + this.uniforms.uProgress.value * 0.1;
      this.camera.updateProjectionMatrix();
    };
    const zoomOut = () => {
      
      let process1 = this.uniforms.uProgress.value - 5;
      let progress2 = process1 - 0.5;
      this.camera.zoom = 1.2 - process1 * 0.2*( 1. + 3*THREE.MathUtils.clamp( progress2 , 0., 0.4));
      this.camera.updateProjectionMatrix();
    };
    const rotateCamera = () => {
      let progress = THREE.MathUtils.clamp(this.uniforms.uProgress.value - 5.5, 0., 1.);
      let camera = this.camera;
      let target = new THREE.Vector3(0,0,0);
      
      camera.position.x =  100 * ( Math.sin( Math.PI/4  - progress ) );
      camera.position.z = 100 * (  Math.cos( Math.PI/4 - progress ) );
      // camera.position.y=target.y+camera_offset.y

      camera.lookAt(target.x,target.y,target.z);
    }
    const zoomOut2 = () => {
      // this.camera.zoom = 1.2 - (this.uniforms.uProgress.value - 5) * 0.3;
      this.camera.updateProjectionMatrix();
    };
    const decreaseCameraY = () => {
      this.camera.position.y = 100 - (this.uniforms.uProgress.value - 2) * 20;
      this.camera.lookAt(0, 0, 0);
    };
    let logProgress = () => {
      console.log(this.uniforms.uProgress.value.toFixed(2));
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
    tl.to(this.uniforms.uProgress, {
      value: 1,
      onUpdate: (self) => {
        zoom1();
        logProgress();
      }
    });
    tl.to(this.uniforms.uProgress, {
      value: 2,
      onUpdate: (self) => {
        zoom1();
        logProgress();
      }
    });
    tl.to(this.uniforms.uProgress, {
      value: 3,
      onUpdate: (self) => {
        decreaseCameraY();
      }
    });
    tl.to(this.uniforms.uProgress, {
      value: 4,
      onUpdate: (self) => {
        decreaseCameraY();
        logProgress();
      }
    });
    tl.to(this.uniforms.uProgress, {
      value: 5,
      onUpdate: (self) => {
        logProgress();
      }
    });
    tl.to(this.uniforms.uProgress, {
      value: 6,
      // ease: 'power1.inOut',
      onUpdate: (self) => {
        this.fboMaterial.uniforms.uProgress.value =  this.uniforms.uProgress.value - 5;
        zoomOut();
        rotateCamera();
        logProgress();
      }
    });
    tl.to(this.uniforms.uProgress, {
      value: 7,
      ease: 'power2.inOut',
      onUpdate: (self) => {
        this.fboMaterial.uniforms.uProgress.value =  this.uniforms.uProgress.value - 5;
        // zoomOut();
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
    //     this.fboMaterial.uniforms.uProgress.value = self.progress;
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


    // tl.to(this.uniforms.amplitudeWave, {
    //   value: 0
    // });
  }
  addHelpers() {
    const axesHelper = new THREE.AxesHelper(1000);
    this.scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(1000, 100);
    // this.scene.add(gridHelper);
  }
  init() {
    this.scene = new THREE.Scene();

    {
      this.camera = new THREE.PerspectiveCamera(
        75,
        device.width / device.height,
        0.1,
        2000
      );
      this.camera.position.set(0, 0, 2);
    }

    {
      let frustumSize = device.height;
      let aspect = device.width / device.height;
      //set orthorgraphic camera
      let left = (frustumSize * aspect) / -2;
      let right = (frustumSize * aspect) / 2;
      let top = frustumSize / 2;
      let bottom = frustumSize / -2;
      let near = -4000;
      let far = 4000;

      this.camera = new THREE.OrthographicCamera(
        left,
        right,
        top,
        bottom,
        near,
        far
      );
      this.camera.position.set(100, 100, 100);
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    }

    this.scene.add(this.camera);

    //
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
    // this.renderer.setClearColor('#08092d', 1);

    // this.controls = new OrbitControls(this.camera, this.canvas);

    // this.gui.add(this.controls, 'enablePan').listen().onFinishChange(function (value) {
    //   this.controls.enablePan = value
    // });
    this.clock = new THREE.Clock();
  }

  setLoaders() {
    this.gltfLoader = new GLTFLoader();
  }
  //Dynamic
  setupFBO() {
    this.fbo = new THREE.WebGLRenderTarget(device.width, device.height);

    this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    this.fboScene = new THREE.Scene();

    let textureLoader = new THREE.TextureLoader();
    this.fboMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uFBO: { value: null },
        uState1: {
          value: textureLoader.load('/texture/fbo.png')
        },
        uState2: {
          value: textureLoader.load('/texture/state3.png')
        },
        uDisplacement2:{
          value: textureLoader.load('/texture/texture-displacement-map.png')
        }
      },
      vertexShader: vertex,
      fragmentShader: fragment
    });
    this.fbogeo = new THREE.PlaneGeometry(2, 2);
    this.fboMesh = new THREE.Mesh(this.fbogeo, this.fboMaterial);
    this.fboScene.add(this.fboMesh);
  }

  addDebugDynamicTexturePlane() {
    this.debug = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({
        map: this.fbo.texture,
        side: THREE.DoubleSide
      })
    );

    this.debug.position.set(0, 200, 0);

    this.scene.add(this.debug);
    // this.debug.visible = false;
  }

  addObjects() {
    this.addDebugDynamicTexturePlane();
    this.aoTexture = new THREE.TextureLoader().load('/texture/ao.png');
    this.aoTexture.flipY = false;

    this.material = new THREE.MeshPhysicalMaterial({
      metalness: 0.3,
      roughness: 0.41,
      aoMap: this.aoTexture,
      aoMapIntensity: 1.3
    });

    this.uniforms = {
      uTime: { value: 0 },
      aoMap: { value: this.aoTexture },
      uFBO: {
        value: new THREE.TextureLoader().load('/texture/fbo.png')
      },

      light_color: { value: new THREE.Color('#ffe9e9') },
      ramp_color_one: { value: new THREE.Color('#06082D') },
      // ramp_color_two: { value: new THREE.Color('#e8c91a') },
      ramp_color_two: { value: new THREE.Color('#020284') },
      ramp_color_three: { value: new THREE.Color('#0000ff') },
      ramp_color_four: { value: new THREE.Color('hsl(214, 100%, 70%)') },
      ramp_color_five: { value: new THREE.Color('#71c7f5') },

      amplitudeWave: { value: 0 },
      uProgress: { value: 0 },
      uRatioGrid: { value: 24 / 128 }
    };

    this.material.onBeforeCompile = modifyShader(this.uniforms);

    this.gltfLoader.load('/model/bar.glb', (gltf) => {
      const { scene } = gltf;
      this.model = scene.children[0];
      this.model.material = this.material;
      this.geometry = this.model.geometry;

      let ratio = 3/4;
      // ratio = 2;
      let cellWidth = 24;
      const boxSize = cellWidth * ratio;
      this.geometry.scale(boxSize, boxSize, boxSize);
      this.scene.add(this.model);

      this.iSize = 129;
      let instanceSize = this.iSize ** 2;
      this.instanceMesh = new THREE.InstancedMesh(
        this.geometry,
        this.material,
        instanceSize
      );
      this.instanceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      let instanceUV = new Float32Array(instanceSize * 2); //xy
      for (let i = 0; i < this.iSize; i++) {
        for (let j = 0; j < this.iSize; j++) {
          instanceUV.set(
            [i / this.iSize, j / this.iSize],
            2 * (i * this.iSize + j)
          );
          // console.log(i / this.iSize, j / this.iSize);
          {
            let x = cellWidth * (i - this.iSize / 2);
            let y = 0;
            let z = cellWidth * (j - this.iSize / 2);

            const position = new THREE.Vector3(x, y, z);

            let matrix = new THREE.Matrix4();
            matrix.setPosition(position);

            this.instanceMesh.setMatrixAt(i * this.iSize + j, matrix);
          }
        }
      }

      this.geometry.setAttribute(
        'instanceUV',
        new THREE.InstancedBufferAttribute(instanceUV, 2)
      );
      // console.log(instanceUV);
      this.scene.add(this.instanceMesh);
    });
  }

  render() {
    const elapsedTime = this.clock.getElapsedTime();

    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.fboScene, this.fboCamera);

    this.uniforms.uTime.value = elapsedTime;
    // dynamic texture -> Instance Mesh Material
    this.uniforms.uFBO.value = this.fbo.texture;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(this.render.bind(this));
  }

  setResize() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    device.width = window.innerWidth;
    device.height = window.innerHeight;

    this.camera.aspect = device.width / device.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
  }
}
