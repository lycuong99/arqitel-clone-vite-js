import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';

const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};

export default class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.setLoaders();
    this.init();

    this.setLights();
    this.setGeometry();

    this.addObjects();

    this.render();
    this.setResize();
  }

  setLights() {
    this.ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1, 1));
    this.scene.add(this.ambientLight);

    const spotLight = new THREE.SpotLight(0xffe9e9, 1600);
    spotLight.decay = 1.1;
    spotLight.angle = Math.PI / 4;
    spotLight.distance = 3000;
    spotLight.position.set(-80, 200, -80);
    spotLight.penumbra = 0.5;
    this.scene.add(spotLight);

    let target = new THREE.Object3D();
    target.position.set(0, -80, 200);
    spotLight.target = target;
    // this.scene.add(spotLight.target);

    const spotLightHelper = new THREE.SpotLightHelper(spotLight);
    this.scene.add(spotLightHelper);
  }
  setLoaders() {
    this.gltfLoader = new GLTFLoader();
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

  setGeometry() {
    this.planeGeometry = new THREE.PlaneGeometry(1, 1, 128, 128);
    this.planeMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      // wireframe: true,
      fragmentShader: fragment,
      vertexShader: vertex,
      uniforms: {
        progress: { type: 'f', value: 0 }
      }
    });

    this.planeMesh = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    this.scene.add(this.planeMesh);
  }

  addObjects() {
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
        value: new THREE.TextureLoader().load(
          '/texture/texture-displacement-map.png'
        )
      },
      light_color: { value: new THREE.Color('#ffe9e9') },
      ramp_color_one: { value: new THREE.Color('#ff6b6b') },
      ramp_color_two: { value: new THREE.Color('#ffc400') },
      ramp_color_three: { value: new THREE.Color('#ff9100') },
      ramp_color_four: { value: new THREE.Color('#ff6b6b') }
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
          uniform sampler2D uFBO;
          uniform float uTime;
          uniform vec3 light_color;
          uniform vec3 ramp_color_one;
          uniform vec3 ramp_color_two;
          uniform vec3 ramp_color_three;
          uniform vec3 ramp_color_four;
          attribute vec2 instanceUV;
          
          `
      );
      //
      shader.vertexShader = shader.vertexShader.replace(
        `#include <begin_vertex>`,
        /* glsl */ `
        #include <begin_vertex>
        vec4 transition = texture2D(uFBO, instanceUV);
        // (x,y,z) (r,b,g)
        //SCALE
        transformed.y *=  (transition.x);
        
          
          `
      );
      console.log(shader.vertexShader);
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
          {
            instanceUV.set(
              [i / this.iSize, j / this.iSize],
              2 * (i * this.iSize + j)
            );
          }
          let x = w * (i - this.iSize / 2);
          let y = 0;
          let z = w * (j - this.iSize / 2);

          const position = new THREE.Vector3(x, y, z);

          let matrix = new THREE.Matrix4();
          matrix.setPosition(position);

          this.instanceMesh.setMatrixAt(i * this.iSize + j, matrix);
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

    this.planeMesh.rotation.x = 0.2 * elapsedTime;
    this.planeMesh.rotation.y = 0.1 * elapsedTime;

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
