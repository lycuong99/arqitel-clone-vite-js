import * as THREE from 'three';

class Environment {
  constructor(context) {
    this.context = context;
    this.init();
  }
  init() {
    const scene = this.context.scene;
    this.ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1, 1), 4);
    scene.add(this.ambientLight);

    const spotLight = new THREE.SpotLight(0xffe9e9, 1600);
    spotLight.decay = 1.1;
    spotLight.angle = Math.PI / 2;
    spotLight.distance = 3000;
    spotLight.position.set(-80 * 3, 200 * 3, -80 * 3);
    spotLight.penumbra = 0.5;
    scene.add(spotLight);

    let target = new THREE.Object3D();
    target.position.set(0, -80, 200);
    spotLight.target = target;
    // scene.add(spotLight.target);

    const spotLightHelper = new THREE.SpotLightHelper(spotLight);
    scene.add(spotLightHelper);
  }
}

export default Environment;
