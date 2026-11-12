import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1080, H = 1920;
export const FPS = 30;

// ---------------------------------------------------------------- utilities
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const ease = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

function noiseTex(base, variance, size = 256, repeat = [1, 1], speckle = 0.0) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const col = new THREE.Color(base);
  for (let i = 0; i < size * size; i++) {
    let n = (rand() - 0.5) * variance;
    if (speckle && rand() < speckle) n -= variance * 1.5;
    img.data[i * 4] = Math.max(0, Math.min(255, col.r * 255 + n * 255));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, col.g * 255 + n * 255));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, col.b * 255 + n * 255));
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const matCache = {};
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
  return matCache[key];
}

function box(w, h, d, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('stage').prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 2000);
scene.fog = new THREE.Fog(0xb9cbe6, 80, 420);

// ---------------------------------------------------------------- sky
const skyUniforms = {
  top: { value: new THREE.Color(0x2f5fc4) },
  mid: { value: new THREE.Color(0x6f9be0) },
  horizon: { value: new THREE.Color(0xe9dcc8) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1200, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; varying vec3 vP;
      void main(){ float h = clamp(vP.y, -0.1, 1.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h));
        c = mix(c, top, smoothstep(0.18, 0.7, h));
        gl_FragColor = vec4(c, 1.); }`,
  })
);
scene.add(sky);

// painted-looking clouds: soft blob sprites
function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 38; i++) {
    const x = 70 + rand() * 372, y = 110 + (rand() - 0.5) * 70 - Math.sin((x / 512) * Math.PI) * 40;
    const r = 30 + rand() * 60;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const shade = 235 + rand() * 20;
    grd.addColorStop(0, `rgba(${shade},${shade - 8},${shade - 22},0.55)`);
    grd.addColorStop(1, 'rgba(255,245,230,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const clouds = new THREE.Group();
const cloudTexs = [cloudTexture(), cloudTexture(), cloudTexture()];
for (let i = 0; i < 26; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexs[i % 3], fog: false, depthWrite: false, transparent: true }));
  const a = rand() * Math.PI * 2, d = 600 + rand() * 300;
  s.position.set(Math.cos(a) * d, 90 + rand() * 170, Math.sin(a) * d - 100);
  const sc = 260 + rand() * 260; s.scale.set(sc, sc * 0.5, 1);
  clouds.add(s);
}
scene.add(clouds);

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x6b5a45, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 300;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
sun.shadow.radius = 4;
scene.add(sun, sun.target);

const lampLights = [];
for (let i = 0; i < 4; i++) {
  const l = new THREE.PointLight(0xffd9a0, 0, 34, 1.6);
  scene.add(l); lampLights.push(l);
}

// ---------------------------------------------------------------- ground & road
const asphalt = noiseTex(0x7a7068, 0.16, 512, [6, 120], 0.04);
const sidewalkTex = noiseTex(0xd9c9a6, 0.06, 256, [2, 80]);
const grassTex = noiseTex(0x4f8a35, 0.14, 256, [30, 200]);

const ROAD_Z0 = 60, ROAD_Z1 = -400, ROAD_LEN = ROAD_Z0 - ROAD_Z1, ROAD_MID = (ROAD_Z0 + ROAD_Z1) / 2;
const road = new THREE.Mesh(new THREE.PlaneGeometry(10, ROAD_LEN), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 }));
road.rotation.x = -Math.PI / 2; road.position.set(0, 0, ROAD_MID); road.receiveShadow = true; scene.add(road);

const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, ROAD_LEN + 400), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.02, ROAD_MID); grass.receiveShadow = true; scene.add(grass);

for (const side of [-1, 1]) {
  const sw = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, ROAD_LEN), new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.9 }));
  sw.position.set(side * 6.6, 0.15, ROAD_MID); sw.receiveShadow = true; scene.add(sw);
  const curb = box(0.25, 0.34, ROAD_LEN, mat(0x9b9184), side * 5.05, 0.17, ROAD_MID); curb.castShadow = false;
}
// dashed center line (instanced)
{
  const n = Math.floor(ROAD_LEN / 7);
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.02, 3), mat(0xf2cf3a, { roughness: 0.6 }), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { m.makeTranslation(0, 0.01, ROAD_Z0 - i * 7); dash.setMatrixAt(i, m); }
  dash.receiveShadow = true; scene.add(dash);
}
// crosswalk near the shop
for (let i = 0; i < 7; i++) box(1.0, 0.02, 3.2, mat(0xeeeeee), -4 + i * 1.35, 0.012, -30).castShadow = false;

// ---------------------------------------------------------------- fences (instanced pickets)
{
  const picketGeo = new THREE.BoxGeometry(0.3, 1.5, 0.12);
  const capGeo = new THREE.BoxGeometry(0.21, 0.21, 0.121);
  const railGeo = new THREE.BoxGeometry(0.08, 0.12, 1);
  const pm = mat(0x7a3a1f, { roughness: 0.8 });
  const positions = [];
  for (const side of [-1, 1]) {
    for (let z = 40; z > -360; z -= 0.55) {
      const seg = (((z - (side > 0 ? 0 : 8)) % 16) + 16) % 16;
      if (seg < 1.25 || seg > 14.75) continue; // gate gap at each house path
      positions.push([side * 8.45, z]);
    }
  }
  const pickets = new THREE.InstancedMesh(picketGeo, pm, positions.length);
  const caps = new THREE.InstancedMesh(capGeo, pm, positions.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = v3(1, 1, 1);
  positions.forEach(([x, z], i) => {
    m.compose(v3(x, 0.95, z), q.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), s); pickets.setMatrixAt(i, m);
    m.compose(v3(x, 1.7, z), q.setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.PI / 4)), s); caps.setMatrixAt(i, m);
  });
  pickets.castShadow = caps.castShadow = true; pickets.receiveShadow = true;
  scene.add(pickets, caps);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, pm); rail.scale.z = 400; rail.position.set(side * 8.38, 1.2, -160); scene.add(rail);
  }
}

// ---------------------------------------------------------------- houses
const windowMats = [];
function house(x, z, facing, style) {
  const g = new THREE.Group();
  const w = 9 + rand() * 3, d = 8, h = style === 'two' ? 8 : 5.5;
  const wall = style === 'timber' ? 0xe8dcc0 : style === 'grey' ? 0xc9cbcc : 0xf1efe9;
  box(d, h, w, mat(wall), 0, h / 2, 0, g);
  // gable roof
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2 - 0.6, 0); shape.lineTo(0, 3.2); shape.lineTo(d / 2 + 0.6, 0); shape.lineTo(-d / 2 - 0.6, 0);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: w + 1, bevelEnabled: false }),
    mat(style === 'timber' ? 0x6b4a3a : style === 'grey' ? 0xd9d2c4 : 0x5b5e66));
  roof.position.set(0, h, -(w + 1) / 2); roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  const roofWall = new THREE.Mesh(new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(0, 3); s.lineTo(d / 2, 0); return s; })(), { depth: w - 0.02, bevelEnabled: false }), mat(wall));
  roofWall.position.set(0, h - 0.01, -(w - 0.02) / 2); g.add(roofWall);
  // timber framing
  if (style === 'timber') {
    const tm = mat(0x3b2a20);
    for (const zz of [-w / 2 + 0.2, -w / 4, 0, w / 4, w / 2 - 0.2]) box(0.1, h, 0.35, tm, -d / 2 - 0.05, h / 2, zz, g);
    box(0.1, 0.35, w, tm, -d / 2 - 0.05, h * 0.5, 0, g);
    for (const zz of [-w / 2 + 1.5, w / 2 - 1.5]) { const b = box(0.1, 3.4, 0.3, tm, -d / 2 - 0.06, h * 0.28, zz, g); b.rotation.x = zz > 0 ? 0.6 : -0.6; }
  }
  // windows
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.15, metalness: 0.3, emissive: 0xffb860, emissiveIntensity: 0 });
  windowMats.push({ m: glass, on: rand() < 0.6 });
  const rows = style === 'two' ? [2.4, 5.8] : [2.6];
  for (const wy of rows) for (const wz of [-w / 4 - 0.4, w / 4 + 0.4]) {
    box(0.16, 2.1, 1.9, mat(0xffffff), -d / 2 - 0.05, wy, wz, g);
    box(0.18, 1.8, 1.6, glass, -d / 2 - 0.06, wy, wz, g);
    box(0.2, 0.08, 1.6, mat(0xffffff), -d / 2 - 0.07, wy, wz, g);
    box(0.2, 1.8, 0.08, mat(0xffffff), -d / 2 - 0.07, wy, wz, g);
    if (style !== 'grey') for (const sz of [-1.25, 1.25]) box(0.12, 2.1, 0.55, mat(0x5a2f1c), -d / 2 - 0.08, wy, wz + sz, g);
    if (wy < 3.5 && style === 'white') box(0.6, 0.35, 1.9, mat(0x6a3a22), -d / 2 - 0.3, wy - 1.2, wz, g);
  }
  // door + step + porch columns
  box(0.15, 2.8, 1.4, mat(0x3a2a22), -d / 2 - 0.05, 1.4, 0, g);
  box(1.4, 0.3, 2.6, mat(0xbdb6aa), -d / 2 - 0.7, 0.15, 0, g);
  if (style === 'white') for (const cz of [-1.6, 1.6]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 3.2, 12), mat(0xffffff));
    col.position.set(-d / 2 - 1.2, 1.6, cz); col.castShadow = true; g.add(col);
  }
  g.position.set(x, 0, z);
  g.rotation.y = facing;
  scene.add(g);
  // path from gate to door
  const path = box(Math.abs(x) - d / 2 - 8.4, 0.05, 2, mat(0xcfc2a3), Math.sign(x) * (8.4 + (Math.abs(x) - d / 2 - 8.4) / 2), 0.03, z);
  path.castShadow = false;
  return g;
}

function shop(x, z) {
  const g = new THREE.Group();
  box(10, 7.5, 12, mat(0xf3eee6), 0, 3.75, 0, g);
  const trim = mat(0xd9532b);
  box(10.3, 0.6, 12.3, trim, 0, 7.5, 0, g);
  for (const zz of [-6.05, 6.05]) box(10.2, 7.5, 0.4, trim, 0, 3.75, zz, g);
  box(0.4, 0.5, 12.2, trim, -5.1, 3.6, 0, g);
  for (const wz of [-3, 3]) {
    box(0.2, 1.9, 1.8, mat(0x1d2433, { roughness: 0.2 }), -5.05, 5.4, wz, g);
    box(0.22, 2.1, 0.15, trim, -5.06, 5.4, wz - 0.9, g); box(0.22, 2.1, 0.15, trim, -5.06, 5.4, wz + 0.9, g);
    box(0.22, 0.15, 1.95, trim, -5.06, 6.45, wz, g); box(0.22, 0.15, 1.95, trim, -5.06, 4.35, wz, g);
  }
  box(0.2, 2.6, 6, mat(0x26303f, { roughness: 0.2, emissive: 0xffc070, emissiveIntensity: 0 }), -5.05, 1.6, 0, g);
  // sign text
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const cg = c.getContext('2d'); cg.fillStyle = '#d9532b'; cg.font = 'bold 60px serif'; cg.textAlign = 'center'; cg.fillText('Corner Grocer', 256, 70);
  const st = new THREE.CanvasTexture(c); st.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.95), new THREE.MeshStandardMaterial({ map: st, transparent: true }));
  sign.position.set(-5.32, 3.3, 0); sign.rotation.y = -Math.PI / 2; g.add(sign);
  // awning
  const aw = box(1.6, 0.15, 7, mat(0xd9532b), -5.9, 3.05, 0, g); aw.rotation.z = 0.35;
  g.position.set(x, 0, z); scene.add(g);
}

// trees: trunk + clustered painterly foliage
const foliageMats = [0x6f8f2a, 0x87a336, 0x5c7a24, 0x9db54a].map((c) => mat(c, { flatShading: true, roughness: 1 }));
function tree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.45 * s, 7 * s, 8), mat(0x6b4128));
  trunk.position.y = 3.5 * s; trunk.rotation.z = (rand() - 0.5) * 0.15; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 9; i++) {
    const r = (1.6 + rand() * 1.4) * s;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), foliageMats[i % 4]);
    b.position.set((rand() - 0.5) * 4 * s, (7 + rand() * 3.5) * s, (rand() - 0.5) * 4 * s);
    b.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    b.castShadow = true; b.receiveShadow = true; g.add(b);
  }
  g.position.set(x, 0, z); scene.add(g);
}
function bush(x, z, s = 1) {
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.7 + rand() * 0.4) * s, 1), foliageMats[(i + 1) % 4]);
    b.position.set(x + (rand() - 0.5) * 1.2, 0.6 * s, z + (rand() - 0.5) * 1.6);
    b.castShadow = true; b.receiveShadow = true; scene.add(b);
  }
}

// streetlamps
const lamps = [];
const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 0.4 });
function lamp(x, z) {
  const side = Math.sign(x);
  const curve = new THREE.CubicBezierCurve3(v3(0, 0, 0), v3(0, 8.5, 0), v3(0, 9.6, 0), v3(-side * 2.2, 9.2, 0));
  const pole = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.13, 8), mat(0xb8bcc2, { metalness: 0.4, roughness: 0.5 }));
  pole.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.7), mat(0x9aa0a6));
  head.position.set(-side * 2.3, 9.15, 0);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.5), bulbMat);
  bulb.position.set(-side * 2.3, 9.0, 0);
  const g = new THREE.Group(); g.add(pole, head, bulb); g.position.set(x, 0.3, z); scene.add(g);
  lamps.push({ pos: v3(x - side * 2.3, 8.6, z) });
}

function mailbox(x, z) {
  box(0.2, 1.1, 0.2, mat(0x8a5a32), x, 0.55, z);
  box(0.7, 0.6, 1.1, mat(0xcfd2d6, { metalness: 0.3, roughness: 0.5 }), x, 1.35, z);
  box(0.05, 0.5, 0.12, mat(0xd8332a), x + 0.37, 1.6, z + 0.3);
}

function trafficLight(x, z) {
  box(0.2, 5, 0.2, mat(0x2b2d31), x, 2.5, z);
  box(0.6, 1.8, 0.6, mat(0x1a1b1e), x, 5.6, z);
  const cols = [0x3a0000, 0x3a2a00, 0x00ff66];
  cols.forEach((c, i) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshStandardMaterial({ color: c, emissive: i === 2 ? 0x22ff77 : 0x000000, emissiveIntensity: 2 }));
    l.position.set(x - 0.31, 6.15 - i * 0.55, z); scene.add(l);
  });
}

// mountains
const mtnMat = mat(0x3b4a3a, { flatShading: true, roughness: 1 });
for (let i = 0; i < 26; i++) {
  const r = 50 + rand() * 70, h = 50 + rand() * 80;
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6 + Math.floor(rand() * 3)), mtnMat);
  const ang = -Math.PI / 2 + (rand() - 0.5) * 2.2;
  const d = 380 + rand() * 120;
  m.position.set(Math.cos(ang) * d * 0.9, h / 2 - 5, -120 + Math.sin(ang) * d);
  m.rotation.y = rand() * 3; scene.add(m);
}

// layout the street
const styles = ['white', 'timber', 'grey', 'two'];
for (let z = 40, i = 0; z > -330; z -= 16, i++) {
  if (z !== -40) house(16, z + 8, 0, styles[i % 4]); // right side: front faces the road (-X)
  house(-16, z, Math.PI, styles[(i + 2) % 4]); // left side: rotated so the front faces +X
  if (i % 2 === 0) tree(11 + rand() * 2, z + 1.5, 0.9 + rand() * 0.3);
  if (i % 3 === 1) tree(-11 - rand() * 2, z - 4, 0.9 + rand() * 0.3);
  bush(10, z + 12, 1); bush(-10, z + 3, 1);
  if (i % 2 === 1) mailbox(8.0, z + 5.5);
  if (i % 2 === 0) mailbox(-8.0, z - 2);
}
shop(17, -36);
trafficLight(5.6, -28.5);
for (let z = 44; z > -340; z -= 24) { lamp(7.6, z - 4); lamp(-7.6, z + 8); }

// ---------------------------------------------------------------- vehicles
function car() {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x1b2f6b, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 });
  const s = new THREE.Shape();
  s.moveTo(-2.4, 0.35); s.lineTo(2.4, 0.35); s.lineTo(2.45, 0.95); s.lineTo(1.6, 1.15);
  s.lineTo(0.7, 1.65); s.lineTo(-0.9, 1.68); s.lineTo(-1.9, 1.2); s.lineTo(-2.45, 1.1); s.lineTo(-2.4, 0.35);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 }), paint);
  body.position.z = -0.95; body.castShadow = true; g.add(body);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.05, metalness: 0.8 });
  const gs = new THREE.Shape(); gs.moveTo(1.45, 1.2); gs.lineTo(0.65, 1.6); gs.lineTo(-0.85, 1.62); gs.lineTo(-1.75, 1.22);
  const gl = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: 2.02, bevelEnabled: false }), glassMat); gl.position.z = -1.01; g.add(gl);
  for (const [x, z] of [[1.5, 1.0], [1.5, -1.0], [-1.5, 1.0], [-1.5, -1.0]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 20), mat(0x15161a));
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.45, z); w.castShadow = true; g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.37, 12), mat(0xb9bec6, { metalness: 0.8, roughness: 0.3 }));
    hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.45, z); g.add(hub);
  }
  const tail = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: 1.2 });
  box(0.08, 0.15, 1.7, tail, -2.5, 0.95, 0, g).castShadow = false;
  scene.add(g); return g;
}
function truck() {
  const g = new THREE.Group();
  box(2.6, 2.6, 2.6, mat(0x223a78, { roughness: 0.5 }), 3.4, 1.8, 0, g);
  box(0.1, 1.1, 2.2, new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.1 }), 4.71, 2.5, 0, g);
  box(6, 3.8, 2.7, mat(0xe8dfc6), -1.0, 2.6, 0, g);
  box(8.8, 0.4, 2.2, mat(0x202124), 0.3, 0.75, 0, g);
  for (const [x, z] of [[3.4, 1.1], [3.4, -1.1], [-2.6, 1.1], [-2.6, -1.1]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), mat(0x15161a));
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.55, z); w.castShadow = true; g.add(w);
  }
  const tail = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2020, emissiveIntensity: 2 });
  for (const z of [-1.1, 1.1]) box(0.08, 0.3, 0.3, tail, -4.05, 1.1, z, g).castShadow = false;
  scene.add(g); return g;
}
const carObj = car();
const truckObj = truck();

// ---------------------------------------------------------------- character
const blue = mat(0x1f5fd6, { roughness: 0.55 });
const black = mat(0x0c0c0f, { roughness: 0.7 });
const hairMat = mat(0x1a2f8a, { roughness: 0.6, flatShading: true });
const hairLight = mat(0x5b8fe8, { roughness: 0.6, flatShading: true });
function character() {
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 2; root.add(hips);
  // torso
  const torso = box(2, 2, 1, black, 0, 1, 0, hips);
  box(0.04, 1.8, 0.02, mat(0x2b2b30), 0, 1, 0.51, hips); // zipper
  box(0.9, 0.5, 0.05, mat(0x17171b), -0.45, 1.8, 0.5, hips).rotation.z = -0.5; // collar
  box(0.9, 0.5, 0.05, mat(0x17171b), 0.45, 1.8, 0.5, hips).rotation.z = 0.5;
  const vee = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.32, 3), blue); vee.rotation.x = Math.PI; vee.position.set(0, 1.86, 0.45); hips.add(vee);
  const badgeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 28), mat(0xf2b928, { metalness: 0.4, roughness: 0.4 }));
  badgeRing.rotation.x = Math.PI / 2; badgeRing.position.set(0.55, 1.45, 0.52); hips.add(badgeRing);
  const badgeIn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 28), mat(0xe8742a));
  badgeIn.rotation.x = Math.PI / 2; badgeIn.position.set(0.55, 1.45, 0.54); hips.add(badgeIn);
  // head (rounded cylinder via lathe)
  const pts = [];
  pts.push(new THREE.Vector2(0, -0.6));
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(0.48 + Math.cos(a) * 0.14, -0.46 + Math.sin(a) * 0.14)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(0.48 + Math.cos(a) * 0.14, 0.46 + Math.sin(a) * 0.14)); }
  pts.push(new THREE.Vector2(0, 0.6));
  const headG = new THREE.Group(); headG.position.y = 2.62; hips.add(headG);
  const head = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), blue);
  head.scale.set(1.15, 1, 1); head.castShadow = true; headG.add(head);
  // face
  const faceMat = mat(0x050505, { roughness: 0.4 });
  for (const ex of [-0.22, 0.22]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 8), faceMat); e.scale.set(1, 1.55, 0.4); e.position.set(ex, 0.14, 0.6); headG.add(e);
  }
  const mouth = box(0.42, 0.05, 0.04, faceMat, 0, -0.16, 0.605, headG); mouth.castShadow = false;
  // hair: flat messy shards, swept back, with a fringe
  const shardGeo = new THREE.ConeGeometry(0.22, 1, 4); shardGeo.translate(0, 0.5, 0);
  const addShard = (pos, dir, len, w, m) => {
    const c = new THREE.Mesh(shardGeo, m);
    c.position.copy(pos); c.scale.set(w, len, w * 0.45);
    c.quaternion.setFromUnitVectors(v3(0, 1, 0), dir.normalize());
    c.rotateY(rand() * Math.PI); c.castShadow = true; headG.add(c);
  };
  for (let i = 0; i < 46; i++) {
    const a = Math.PI * 0.6 + rand() * Math.PI * 1.8; // mostly sides and back
    const y = 0.2 + rand() * 0.55;
    const pos = v3(Math.cos(a) * 0.62, y, Math.sin(a) * 0.55);
    const dir = v3(Math.cos(a), -0.35 + rand() * 0.75, Math.sin(a) - 0.4);
    addShard(pos, dir, 0.4 + rand() * 0.45, 1.1 + rand() * 0.6, i % 11 === 0 ? hairLight : hairMat);
  }
  for (let i = 0; i < 16; i++) { // top
    const pos = v3((rand() - 0.5) * 0.9, 0.62, (rand() - 0.6) * 0.8);
    addShard(pos, v3(pos.x * 1.8, 0.25 + rand() * 0.45, -0.8 - rand() * 0.5), 0.4 + rand() * 0.4, 1.3 + rand() * 0.6, hairMat);
  }
  for (const fx of [-0.42, -0.15, 0.12, 0.38]) { // fringe hanging over the forehead
    addShard(v3(fx, 0.72, 0.42), v3(fx * 0.8 + (rand() - 0.5) * 0.4, -1, 0.55), 0.42 + rand() * 0.12, 1.3, hairMat);
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
  cap.scale.set(1.15, 0.55, 1.05); cap.position.y = 0.52; headG.add(cap);
  // arms (pivot at shoulder)
  const arms = [];
  for (const sx of [-1.5, 1.5]) {
    const p = new THREE.Group(); p.position.set(sx, 1.95, 0); hips.add(p);
    box(1, 1, 1, black, 0, -0.45, 0, p);
    box(1.0, 1.05, 1.0, blue, 0, -1.45, 0, p);
    arms.push(p);
  }
  const legs = [];
  for (const lx of [-0.5, 0.5]) {
    const p = new THREE.Group(); p.position.set(lx, 0, 0); hips.add(p);
    box(0.98, 2, 1, black, 0, -1, 0, p);
    legs.push(p);
  }
  scene.add(root);
  return { root, hips, headG, arms, legs, torso };
}
const hero = character();

function pose(t, mode) {
  const { hips, arms, legs, headG } = hero;
  if (mode === 'walk') {
    const ph = t * 2 * Math.PI * 1.15;
    const sw = Math.sin(ph) * 0.65;
    legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
    arms[0].rotation.x = -sw * 0.8; arms[1].rotation.x = sw * 0.8;
    hips.position.y = 2 + Math.abs(Math.cos(ph)) * 0.12;
    headG.rotation.y = Math.sin(t * 0.7) * 0.05;
  } else {
    legs[0].rotation.x = legs[1].rotation.x = 0;
    arms[0].rotation.x = arms[1].rotation.x = 0;
    arms[0].rotation.z = -0.05; arms[1].rotation.z = 0.05;
    hips.position.y = 2 + Math.sin(t * 2.2) * 0.02;
    headG.rotation.y = 0; headG.rotation.x = 0;
  }
}

// ---------------------------------------------------------------- post
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0.0025, maxblur: 0.012 });
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.35, 0.6, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- time of day
function setDay() {
  skyUniforms.top.value.set(0x2856bd); skyUniforms.mid.value.set(0x6d99de); skyUniforms.horizon.value.set(0xd9d6cf);
  scene.fog.color.set(0xa9bde0); scene.fog.near = 110; scene.fog.far = 520;
  hemi.color.set(0xcfe0ff); hemi.groundColor.set(0x6b5a45); hemi.intensity = 1.15;
  sun.color.set(0xfff0d8); sun.intensity = 2.7;
  clouds.visible = true; mtnMat.color.set(0x5b7a63);
  bulbMat.emissiveIntensity = 0.3;
  lampLights.forEach((l) => (l.intensity = 0));
  windowMats.forEach((w) => (w.m.emissiveIntensity = 0));
  bloom.strength = 0.22; bloom.threshold = 0.9;
  renderer.toneMappingExposure = 1.0;
}
function setNight() {
  skyUniforms.top.value.set(0x1a2150); skyUniforms.mid.value.set(0x34408f); skyUniforms.horizon.value.set(0x4a56a8);
  scene.fog.color.set(0x3a4590); scene.fog.near = 60; scene.fog.far = 360;
  hemi.color.set(0x6f7fd8); hemi.groundColor.set(0x1a1830); hemi.intensity = 0.9;
  sun.color.set(0xa8b8ff); sun.intensity = 0.55;
  clouds.visible = false; mtnMat.color.set(0x0d0f1c);
  bulbMat.emissiveIntensity = 2.2;
  windowMats.forEach((w) => (w.m.emissiveIntensity = w.on ? 1.4 : 0));
  bloom.strength = 0.45; bloom.threshold = 0.75;
  renderer.toneMappingExposure = 1.05;
}
function placeLampLights(target, power = 1) {
  const near = lamps.slice().sort((a, b) => a.pos.distanceToSquared(target) - b.pos.distanceToSquared(target)).slice(0, 4);
  lampLights.forEach((l, i) => { l.position.copy(near[i].pos); l.intensity = 70 * power; });
}

// ---------------------------------------------------------------- script
// captions: [start, end, text]
export const CAPTIONS = [
  [0.0, 0.85, 'IN MY TOWN'], [0.85, 1.75, 'EVERYTHING'], [1.75, 2.7, 'IS NORMAL'],
  [2.7, 3.6, 'THE ROADS'], [3.6, 4.6, 'ARE CLEAN'],
  [4.6, 5.45, 'I STEP'], [5.45, 6.6, 'OUTSIDE'], [6.6, 7.6, 'AT 8AM'],
  [7.6, 8.45, 'I WALK'], [8.45, 9.25, 'DOWN'], [9.25, 10.1, 'THE STREET'], [10.1, 11.1, 'LIKE ALWAYS'],
  [11.1, 11.9, 'A TRUCK'], [11.9, 12.6, 'STARTS'], [12.6, 13.0, 'ITS'], [13.0, 14.6, 'ENGINE'],
  [14.6, 15.5, 'IT DRIVES'], [15.5, 16.6, 'STRAIGHT'], [16.6, 18.0, 'PAST ME'],
  [18.0, 19.0, 'NOTHING'], [19.0, 19.8, 'EVER'], [19.8, 22.0, 'HAPPENS'],
];
export const DURATION = 22.0;

const handheld = (t, amt) => v3(Math.sin(t * 1.3) * amt + Math.sin(t * 3.1) * amt * 0.3, Math.sin(t * 1.7 + 1) * amt * 0.8, Math.sin(t * 0.9 + 2) * amt);

const SHOTS = [
  { // 1. day, low on the sidewalk, car pulls away toward the light
    start: 0, end: 4.6, night: false,
    setup(t, u) {
      hero.root.visible = false;
      carObj.visible = true; truckObj.visible = false;
      const cz = 6 - 4 * t - 1.8 * t * t;
      carObj.position.set(2.5, 0, cz); carObj.rotation.y = Math.PI / 2;
      camera.fov = 40;
      camera.position.copy(v3(7.3, 1.05, 16 - u * 2.5).add(handheld(t, 0.05)));
      camera.lookAt(v3(-1.5, 3.2, -30));
      return { focus: camera.position.distanceTo(carObj.position), aperture: 0.004 };
    },
  },
  { // 2. day, hero standing in front of a house, slow push-in
    start: 4.6, end: 7.6, night: false,
    setup(t, u) {
      hero.root.visible = true; carObj.visible = false; truckObj.visible = false;
      hero.root.position.set(9.7, 0, -64); hero.root.rotation.y = -Math.PI / 2;
      pose(t, 'idle');
      camera.fov = 40;
      camera.position.copy(v3(lerp(-5, -3, ease(u)), 2.5, -64 + lerp(0.8, 0.3, u)).add(handheld(t, 0.04)));
      camera.lookAt(v3(9.7, 3.6, -64));
      return { focus: camera.position.distanceTo(v3(9.7, 3.4, -64)), aperture: 0.0045 };
    },
  },
  { // 3. day, side tracking shot as hero walks along the fence
    start: 7.6, end: 11.1, night: false,
    setup(t, u) {
      hero.root.visible = true; carObj.visible = false; truckObj.visible = false;
      const hz = -64 - t * 3.2;
      hero.root.position.set(6.6, 0.3, hz); hero.root.rotation.y = Math.PI; // walking toward -Z
      pose(t, 'walk');
      camera.fov = 44;
      camera.position.copy(v3(-4.5, 2.4, hz + 9 - u * 0.8).add(handheld(t, 0.06)));
      camera.lookAt(v3(6.6, 4.2, hz - 1.5));
      return { focus: camera.position.distanceTo(hero.root.position), aperture: 0.003 };
    },
  },
  { // 4. night, close-up on the deadpan face
    start: 11.1, end: 14.6, night: true,
    setup(t, u) {
      hero.root.visible = true; carObj.visible = false; truckObj.visible = true;
      truckObj.position.set(2.5, 0, -108); truckObj.rotation.y = Math.PI / 2;
      hero.root.position.set(6.6, 0.3, -100.5); hero.root.rotation.y = -Math.PI / 2 + 0.25;
      pose(t, 'idle');
      hero.headG.rotation.y = lerp(0, 0.35, ease((u - 0.55) * 3)); // slowly turns toward the engine sound
      camera.fov = 34;
      const head = v3(6.6, 4.95, -100.5);
      camera.position.copy(v3(lerp(1.6, 2.1, u), 4.1, -99.0 + lerp(0, -0.3, u)).add(handheld(t, 0.035)));
      camera.lookAt(head.clone().add(v3(0, -0.1, 0)));
      placeLampLights(v3(6.6, 4, -100.5));
      return { focus: camera.position.distanceTo(head), aperture: 0.009 };
    },
  },
  { // 5. night, low behind the curb as the truck drives straight off
    start: 14.6, end: 18.0, night: true,
    setup(t, u) {
      hero.root.visible = false; carObj.visible = false; truckObj.visible = true;
      truckObj.position.set(2.5, 0, -110 - 1.5 * t - 2.2 * t * t); truckObj.rotation.y = Math.PI / 2;
      camera.fov = 42;
      camera.position.copy(v3(5.7, 0.85, -94 - u * 2).add(handheld(t, 0.05)));
      camera.lookAt(v3(-0.5, 3.0, -160));
      placeLampLights(v3(4, 4, -112));
      return { focus: camera.position.distanceTo(truckObj.position), aperture: 0.0055 };
    },
  },
  { // 6. night, hero alone under the streetlamp, slow pull-back; lamp flickers out
    start: 18.0, end: 22.0, night: true,
    setup(t, u) {
      hero.root.visible = true; carObj.visible = false; truckObj.visible = false;
      hero.root.position.set(6.4, 0.3, -101.5); hero.root.rotation.y = -0.75;
      pose(t, 'idle');
      camera.fov = 40;
      camera.position.copy(v3(lerp(-0.5, -3.5, ease(u)), lerp(3.2, 5.5, ease(u)), lerp(-93.5, -89, ease(u))).add(handheld(t, 0.03)));
      camera.lookAt(v3(6.0, 3.6, -101.5));
      // flicker in the last 1.2s
      const f = t > 2.8 ? ([1, 0.2, 1, 0, 0.6, 0, 0, 0][Math.min(7, Math.floor((t - 2.8) * 8))]) : 1;
      placeLampLights(v3(6.4, 4, -101.5), f);
      bulbMat.emissiveIntensity = 2.2 * f;
      return { focus: camera.position.distanceTo(v3(6.4, 3, -101.5)), aperture: 0.004 };
    },
  },
];

// ---------------------------------------------------------------- captions
const capEl = document.getElementById('cap');
const capSpans = capEl.querySelectorAll('span');
function setCaption(t) {
  const c = CAPTIONS.find(([a, b]) => t >= a && t < b);
  const text = c ? c[2] : '';
  capSpans.forEach((s) => (s.textContent = text));
  if (c) {
    const k = clamp01((t - c[0]) / 0.1);
    const s = lerp(1.18, 1, ease(k));
    capEl.style.transform = `scale(${s})`;
  }
}

// ---------------------------------------------------------------- render
let currentNight = null;
window.renderAt = function (t) {
  const shot = SHOTS.find((s) => t >= s.start && t < s.end) || SHOTS[SHOTS.length - 1];
  if (shot.night !== currentNight) { shot.night ? setNight() : setDay(); currentNight = shot.night; }
  const local = t - shot.start, u = local / (shot.end - shot.start);
  const dof = shot.setup(local, u);
  camera.updateProjectionMatrix();
  // keep shadow camera around the action
  const tgt = camera.position.clone().add(camera.getWorldDirection(v3(0, 0, 0)).multiplyScalar(18));
  sun.target.position.set(tgt.x, 0, tgt.z);
  sun.position.set(tgt.x + (shot.night ? -30 : 45), 80, tgt.z + (shot.night ? 20 : 35));
  bokeh.uniforms.focus.value = dof.focus;
  bokeh.uniforms.aperture.value = dof.aperture;
  composer.render();
  setCaption(t);
  document.getElementById('fade').style.opacity = t > DURATION - 0.5 ? String(clamp01((t - (DURATION - 0.5)) / 0.5)) : '0';
};
window.DURATION = DURATION;
window.FPS = FPS;
document.fonts.ready.then(() => { window.renderAt(0); window.sceneReady = true; });
