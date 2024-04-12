import * as THREE from 'three';

const colorO = '#ffe9e9';
const color1 = '#dffb09';
class Environment {
  constructor(context) {
    this.context = context;
    this.init();
  }
  init() {
    const scene = this.context.scene;
    this.ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1, 1), 4);
    scene.add(this.ambientLight);

    const spotLight = new THREE.SpotLight('#dffb09', 10000);
    spotLight.decay = 1.1;
    spotLight.angle = Math.PI / 3.8;
    spotLight.distance = 3000;
    // spotLight.position.set(-60 * 3, 80 * 3, -60 * 3);
    spotLight.position.set(-300, 200, -200);
    spotLight.penumbra = 0.5;
    scene.add(spotLight);

    let target = new THREE.Object3D();
    target.position.set(0, -0, 0);
    spotLight.target = target;
    // scene.add(spotLight.target);

    // const spotLightHelper = new THREE.SpotLightHelper(spotLight);
    // scene.add(spotLightHelper);
  }
}

export default Environment;
