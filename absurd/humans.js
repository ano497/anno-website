// Realistic rigged humans (Mixamo-rigged glTF characters from the three.js examples).
// All share the "mixamorig" skeleton, so the Soldier/Xbot animation clips drive every model.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const cache = {};
export async function loadGLB(name) { if (!cache[name]) cache[name] = await new GLTFLoader().loadAsync(`./assets/${name}.glb`); return cache[name]; }
const CLIPS = {};
export async function initHumans() {
  for (const n of ['Soldier', 'Michelle', 'Xbot']) await loadGLB(n);
  for (const n of ['Soldier', 'Xbot', 'Michelle']) for (const c of cache[n].animations) CLIPS[c.name.toLowerCase()] ??= c;
  return Object.keys(CLIPS);
}
export function realPerson({ model = 'Michelle', clip = 'idle', offset = 0, speed = 1, tint = null, scale = 1 } = {}) {
  const obj = SkeletonUtils.clone(cache[model].scene);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (tint) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(tint)); } } });
  const mixer = new THREE.AnimationMixer(obj); let act = mixer.clipAction(CLIPS[clip.toLowerCase()]); act.play();
  const g = new THREE.Group(); g.add(obj); g.scale.setScalar(scale);
  g.setClip = (c) => { act.stop(); act = mixer.clipAction(CLIPS[c.toLowerCase()]); act.play(); };
  g.userData.update = (t) => mixer.setTime(t * speed + offset);
  g.userData.update(0);
  return g;
}
