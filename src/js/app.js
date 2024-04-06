import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';
import { GUI } from 'dat.gui';

const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};

const noise = /*glsl*/`
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


export default class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.setUpSettings();
    this.setLoaders();
    this.init();
    this.setupFBO();

    this.setLights();
    this.setGeometry();

    this.addObjects();

    this.render();
    this.setResize();
  }
  setUpSettings() {
    this.settings = {
      process: 0
    };
    this.gui = new GUI();
    this.gui.add(this.settings, 'process', 0, 1, 0.01).onChange((value) => {
      this.fboMaterial.uniforms.uProgress.value = value;
    });
  }
  setLights() {
    this.ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1, 1));
    this.scene.add(this.ambientLight);

    const spotLight = new THREE.SpotLight(0xffe9e9, 1600);
    spotLight.decay = 1.1;
    spotLight.angle = Math.PI / 2;
    spotLight.distance = 3000;
    spotLight.position.set(-80 * 3, 200 * 3, -80 * 3);
    spotLight.penumbra = 0.5;
    this.scene.add(spotLight);

    let target = new THREE.Object3D();
    target.position.set(0, -80, 200);
    spotLight.target = target;
    // this.scene.add(spotLight.target);

    const spotLightHelper = new THREE.SpotLightHelper(spotLight);
    this.scene.add(spotLightHelper);
  }

  init() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      device.width / device.height,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 2);

    {
      let frustumSize = device.height;
      let aspect = device.width / device.height;
      //set orthorgraphic camera
      let left = (frustumSize * aspect) / -2;
      let right = (frustumSize * aspect) / 2;
      let top = frustumSize / 2;
      let bottom = frustumSize / -2;
      let near = -2000;
      let far = 2000;

      this.camera = new THREE.OrthographicCamera(
        left,
        right,
        top,
        bottom,
        near,
        far
      );
      this.camera.position.set(0, 100, 20);
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
    this.renderer.setClearColor('#08092d', 1);

    this.controls = new OrbitControls(this.camera, this.canvas);

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
        }
      },
      vertexShader: vertex,
      fragmentShader: fragment
    });
    this.fbogeo = new THREE.PlaneGeometry(2, 2);
    this.fboMesh = new THREE.Mesh(this.fbogeo, this.fboMaterial);
    this.fboScene.add(this.fboMesh);
  }

  setGeometry() {
    // this.planeGeometry = new THREE.PlaneGeometry(1, 1, 128, 128);
    // this.planeMaterial = new THREE.ShaderMaterial({
    //   side: THREE.DoubleSide,
    //   // wireframe: true,
    //   fragmentShader: fragment,
    //   vertexShader: vertex,
    //   uniforms: {
    //     progress: { type: 'f', value: 0 }
    //   }
    // });
    // this.planeMesh = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    // this.scene.add(this.planeMesh);
  }

  addDebugDynamicTexturePlane() {
    this.debug = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({
        map: this.fbo.texture,
        side: THREE.DoubleSide
      })
    );

    this.debug.position.set(0, 100, 0);

    this.scene.add(this.debug);
  }

  addObjects() {
    this.addDebugDynamicTexturePlane();
    this.aoTexture = new THREE.TextureLoader().load('/texture/ao.png');
    this.aoTexture.flipY = false;

    this.material = new THREE.MeshPhysicalMaterial({
      metalness: 0.5,
      roughness: 0.75,
      aoMap: this.aoTexture,
      aoMapIntensity: 1
    });

    this.uniforms = {
      uTime: { value: 0 },
      aoMap: { value: this.aoTexture },
      uFBO: {
        value: new THREE.TextureLoader().load('/texture/fbo.png')
      },
      light_color: { value: new THREE.Color('#ffe9e9') },
      ramp_color_one: { value: new THREE.Color('#06082D') },
      ramp_color_two: { value: new THREE.Color('#020284') },
      ramp_color_three: { value: new THREE.Color('#0000ff') },
      ramp_color_four: { value: new THREE.Color('#71c7f5') }
    };

    this.material.onBeforeCompile = (shader) => {
      shader.uniforms = {
        ...shader.uniforms,
        ...this.uniforms
      };

      //Modify declare
      shader.vertexShader = shader.vertexShader.replace(
        `#include <common>`,
        /*glsl*/ `
          #include <common>
          uniform sampler2D uFBO;
          uniform float uTime;
          uniform vec3 light_color;
          uniform vec3 ramp_color_one;
          uniform vec3 ramp_color_two;
          uniform vec3 ramp_color_three;
          uniform vec3 ramp_color_four;
          attribute vec2 instanceUV;
          varying float vHeight;
          varying float vHeightUV;

          ${noise}
          
          `
      );
      //
      shader.vertexShader = shader.vertexShader.replace(
        `#include <begin_vertex>`,
        /* glsl */ `
        #include <begin_vertex>
        
      

        float n = cnoise(vec3(instanceUV.x*5., instanceUV.y*5., uTime*0.1));  
        transformed.y += n*60.;
        //by sin wave cirlce
        // float dist = distance(instanceUV, vec2( 0.5, 0.5));
        // transformed.y += (sin((dist )*20.+ uTime* 2.) )*10.;
      

        vHeightUV = clamp(position.y*2., 0.0, 1.0);
        vec4 transition = texture2D(uFBO, instanceUV);
        // (x,y,z) (r,b,g)
        //SCALE

        transformed *=  (transition.g);
        transformed.y +=  transition.r*100.;

        vHeight = transformed.y;


        
          `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <common>`,
        /*glsl*/ `
          #include <common>
          uniform sampler2D uFBO;
          uniform float uTime;
          uniform vec3 light_color;
          uniform vec3 ramp_color_one;
          uniform vec3 ramp_color_two;
          uniform vec3 ramp_color_three;
          uniform vec3 ramp_color_four;
          varying float vHeight;
          varying float vHeightUV;

          `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <color_fragment>`,
        /* glsl */ `
          #include <color_fragment>

          //sáng ở trên
          vec3 hightlight = mix(ramp_color_three, ramp_color_four, vHeightUV);

          diffuseColor.rgb = ramp_color_two;
          diffuseColor.rgb = mix(diffuseColor.rgb, ramp_color_three, vHeightUV);
          diffuseColor.rgb = mix(diffuseColor.rgb, hightlight, clamp(vHeight/10. -3. , 0., 1.));
          `
      );
      // console.log(shader.vertexShader);
    };

    this.gltfLoader.load('/model/bar.glb', (gltf) => {
      const { scene } = gltf;
      this.model = scene.children[0];
      this.model.material = this.material;
      this.geometry = this.model.geometry;
      this.geometry.scale(40, 40, 40);
      this.scene.add(this.model);

      this.iSize = 50;
      let instanceSize = this.iSize ** 2;
      this.instanceMesh = new THREE.InstancedMesh(
        this.geometry,
        this.material,
        instanceSize
      );
      this.instanceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      let w = 60;

      let instanceUV = new Float32Array(instanceSize * 2); //xy
      for (let i = 0; i < this.iSize; i++) {
        for (let j = 0; j < this.iSize; j++) {
          instanceUV.set(
            [i / this.iSize, j / this.iSize],
            2 * (i * this.iSize + j)
          );

          {
            let x = w * (i - this.iSize / 2);
            let y = 0;
            let z = w * (j - this.iSize / 2);

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
      console.log(this.geometry);
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
