import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const W = 1080, H = 1920;
const FPS = 30, DURATION = 60;

// ---------------------------------------------------------------- utils
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const ease = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x) => { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), f * f * (3 - 2 * f)) * 2 - 1; };

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...o });
function box(w, h, d, m, x, y, z, parent = scene) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b;
}
// box by min/max extents
function slab(x0, x1, y0, y1, z0, z1, m, parent) {
  return box(x1 - x0, y1 - y0, z1 - z0, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, parent);
}

// ---------------------------------------------------------------- renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('stage').prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.FogExp2(0x0a0e18, 0.012);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 400);
scene.add(camera);

// ---------------------------------------------------------------- materials
const tileTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#cfcac2'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const s = 0.93 + rand() * 0.07; g.fillStyle = `rgb(${200 * s},${196 * s},${188 * s})`;
    g.fillRect(i * 256 + 3, j * 256 + 3, 250, 250);
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(120,115,105,${rand() * 0.08})`; g.fillRect(i * 256 + rand() * 256, j * 256 + rand() * 256, 2 + rand() * 6, 2 + rand() * 6); }
  }
  g.strokeStyle = '#8f8a82'; g.lineWidth = 4; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, h); g.moveTo(0, 256); g.lineTo(w, 256); g.stroke();
}, [30, 22]);
const floorMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.16, metalness: 0.0, envMapIntensity: 1.0 });
const wallMat = M(0xd8d4cc, { roughness: 0.85 });
const darkWall = M(0x3a3d44, { roughness: 0.8 });
const steel = M(0xa9adb3, { metalness: 0.85, roughness: 0.32 });
const darkSteel = M(0x45484e, { metalness: 0.7, roughness: 0.4 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x8fa3b5, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.18, depthWrite: false });
const ceilingMat = M(0xbfbcb6, { roughness: 0.95 });
const shutterTex = canvasTex(64, 256, (g, w, h) => {
  for (let y = 0; y < h; y += 8) { const gr = g.createLinearGradient(0, y, 0, y + 8); gr.addColorStop(0, '#9b9fa5'); gr.addColorStop(0.5, '#d2d5d9'); gr.addColorStop(1, '#6c7076'); g.fillStyle = gr; g.fillRect(0, y, w, 8); }
}, [1, 6]);
const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, metalness: 0.6, roughness: 0.45 });

// light banks: 0 = west (x<-10), 1 = centre, 2 = east (x>10). level 1 = on, 0 = off
const bankOf = (x) => (x < -10 ? 0 : x > 10 ? 2 : 1);
const bankLevel = [1, 1, 1];
const emissives = []; // {mat, base, bank}
function emissive(color, intensity, bank, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensity, roughness: 0.6, ...extra });
  emissives.push({ m, base: intensity, bank }); return m;
}

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight(0xfff1dc, 0x2a2622, 0.6); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x8fa8ff, 0.0);
moon.position.set(-8, 40, 10); moon.target.position.set(0, 0, 0);
moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -34, right: 34, top: 26, bottom: -26, near: 5, far: 80 });
moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.03;
scene.add(moon, moon.target);
const bankLights = [];
for (const [x, y, z, b] of [[-20, 5, 0, 0], [-20, 11, 10, 0], [0, 5, 10, 1], [0, 11, -10, 1], [20, 5, 0, 2], [20, 11, 10, 2], [0, 5, -10, 1], [-20, 5, -10, 0]]) {
  const l = new THREE.PointLight(0xffe6c4, 0, 30, 1.4); l.position.set(x, y, z); scene.add(l); bankLights.push({ l, b });
}
const flash = new THREE.SpotLight(0xfff4e0, 0, 38, 0.36, 0.55, 1.3);
flash.castShadow = true; flash.shadow.mapSize.set(1024, 1024); flash.shadow.bias = -0.0008; flash.shadow.camera.near = 0.3;
camera.add(flash); flash.position.set(0.22, -0.22, 0.1); camera.add(flash.target); flash.target.position.set(0.05, -0.12, -6);
const monitorGlow = new THREE.PointLight(0x8fb6ff, 0, 9, 1.5); monitorGlow.position.set(24, 2.0, 20.6); scene.add(monitorGlow);
const elevLight = new THREE.PointLight(0xdfe8ff, 0, 7, 1.5); elevLight.position.set(31.2, 2.4, 4); scene.add(elevLight);
const exitGlow = new THREE.PointLight(0x30ff80, 0, 6, 2); exitGlow.position.set(-29.5, 4.2, 0); scene.add(exitGlow);

// ---------------------------------------------------------------- architecture
// ground floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 44), floorMat);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
// upper slab (y 5.5..6) with the central void x -12..12, z -6..6
const slabMat = M(0xdedad2);
slab(-30, 30, 5.5, 6, 6, 22, slabMat); slab(-30, 30, 5.5, 6, -22, -6, slabMat);
slab(-30, -12, 5.5, 6, -6, 6, slabMat); slab(12, 30, 5.5, 6, -6, 6, slabMat);
const upperFloor = new THREE.Mesh(new THREE.PlaneGeometry(60, 44), floorMat);
upperFloor.rotation.x = -Math.PI / 2; upperFloor.position.y = 6.005; scene.add(upperFloor);
upperFloor.visible = false; // the slab tops carry the look; avoid z-fighting over the void
for (const [x0, x1, z0, z1] of [[-30, 30, 6, 22], [-30, 30, -22, -6], [-30, -12, -6, 6], [12, 30, -6, 6]]) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), floorMat);
  p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, 6.006, (z0 + z1) / 2); p.receiveShadow = true; scene.add(p);
}
// roof at 12 with skylight over the void
slab(-30, 30, 12, 12.5, 6, 22, ceilingMat); slab(-30, 30, 12, 12.5, -22, -6, ceilingMat);
slab(-30, -12, 12, 12.5, -6, 6, ceilingMat); slab(12, 30, 12, 12.5, -6, 6, ceilingMat);
for (let x = -12; x <= 12; x += 3) slab(x - 0.08, x + 0.08, 12.2, 12.5, -6, 6, darkSteel);
for (let z = -6; z <= 6; z += 3) slab(-12, 12, 12.2, 12.5, z - 0.08, z + 0.08, darkSteel);
const skyGlass = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), new THREE.MeshStandardMaterial({ color: 0x1a2440, transparent: true, opacity: 0.25, roughness: 0.1, depthWrite: false }));
skyGlass.rotation.x = Math.PI / 2; skyGlass.position.y = 12.4; scene.add(skyGlass);
// night sky above skylight + moon
const sky = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x0b1430, fog: false }));
sky.rotation.x = Math.PI / 2; sky.position.y = 40; scene.add(sky);
// end and back walls
slab(-30.3, -30, 0, 12, -22, 22, wallMat); slab(30, 30.3, 0, 12, -22, 22, wallMat);
slab(-30, 30, 0, 12, 22, 22.3, wallMat); slab(-30, 30, 0, 12, -22.3, -22, wallMat);
// columns
for (const [x, z] of [[-12, -6], [-12, 6], [12, -6], [12, 6], [0, -6], [0, 6]]) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 12, 24), wallMat); c.position.set(x, 6, z); c.castShadow = c.receiveShadow = true; scene.add(c);
}
// glass balustrade around the void
function balustrade(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
  const g = new THREE.Group(); g.position.set((x0 + x1) / 2, 6, (z0 + z1) / 2); g.rotation.y = -ang; scene.add(g);
  box(len, 1.0, 0.03, glassMat, 0, 0.55, 0, g).castShadow = false;
  box(len, 0.07, 0.12, steel, 0, 1.08, 0, g);
  box(len, 0.12, 0.2, darkSteel, 0, 0.04, 0, g);
}
balustrade(-12, -6, 12, -6); balustrade(-12, 6, 12, 6); balustrade(-12, -6, -12, 6); balustrade(12, -6, 12, -1.9); balustrade(12, 1.9, 12, 6);
// downlights under slabs and on the upper ceiling
const downGeo = new THREE.CircleGeometry(0.28, 20);
const downMats = [0, 1, 2].map((b) => emissive(0xfff0d8, 3.2, b));
for (let x = -27; x <= 27; x += 6) for (const z of [-17, -10, 10, 17]) for (const y of [5.49, 11.99]) {
  const d = new THREE.Mesh(downGeo, downMats[bankOf(x)]); d.rotation.x = Math.PI / 2; d.position.set(x, y, z); scene.add(d);
}

// ---------------------------------------------------------------- shops
const signMats = [];
function signTexture(text, color, bg, font = 'bold 120px DejaVu Sans') {
  return canvasTex(1024, 192, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 6);
  });
}
const STORES = {
  '-1,0,-24': { name: 'CAFÉ 21', color: '#ffd38a', interior: 0xe9c48f, kind: 'cafe' },
  '-1,0,-16': { name: 'NOODLE BAR', color: '#ff9a7a', interior: 0xf2b097, kind: 'cafe' },
  '-1,0,-8': { name: 'PAGES', color: '#f4efe4', interior: 0xe8e1cf, kind: 'racks' },
  '-1,0,0': { name: 'MODA', color: '#ffffff', interior: 0xf3ece2, kind: 'mannequins' },
  '-1,0,8': { name: 'NORTHWIND', color: '#9fd6ff', interior: 0xd8e6ef, kind: 'racks' },
  '-1,0,16': { name: 'VOLT', color: '#b6ff9e', interior: 0xd4e7d0, kind: 'racks' },
  '-1,0,24': { name: 'ATLAS SPORT', color: '#ff6b6b', interior: 0xe7d6d6, kind: 'shutter' },
  '1,0,-24': { name: 'KIDDO', color: '#ffe066', interior: 0xf2e7c4, kind: 'shutter' },
  '1,0,-16': { name: 'LUMEN', color: '#ffffff', interior: 0xf1efe8, kind: 'racks' },
  '1,0,-8': { name: 'ORBIT', color: '#c7a6ff', interior: 0xe2dcf0, kind: 'racks' },
  '1,0,0': { name: 'MODA HOME', color: '#ffffff', interior: 0xeee7dc, kind: 'racks' },
  '1,0,8': { name: 'FOOTNOTE', color: '#ffcf99', interior: 0xefe2d2, kind: 'shutter' },
  '1,0,16': { name: 'PHARMACY', color: '#7dffb0', interior: 0xe1efe6, kind: 'racks' },
  '1,0,24': { name: 'SECURITY', color: '#ffffff', interior: 0x2b2f38, kind: 'office' },
};
const upperNames = ['ARC', 'SOLA', 'HALDEN', 'MIRROR', 'GLASSWORKS', 'TEMPO', 'BLOOM'];
const mannequinRefs = [];
function store(side, level, x) {
  const y0 = level ? 6 : 0;
  const key = `${side},${level},${x}`;
  const cfg = STORES[key] || { name: upperNames[(x + 24) / 8], color: '#f0ece4', interior: 0xe6e0d6, kind: rand() < 0.35 ? 'shutter' : 'racks' };
  const b = bankOf(x);
  const zf = side * 14, zb = side * 22, dir = -side; // dir: direction the shop faces (towards the corridor)
  const g = new THREE.Group(); scene.add(g);
  // pilasters & header
  slab(x - 4, x - 3.7, y0, y0 + 5.5, Math.min(zf, zb), Math.max(zf, zb), wallMat, g);
  slab(x + 3.7, x + 4, y0, y0 + 5.5, Math.min(zf, zb), Math.max(zf, zb), wallMat, g);
  slab(x - 4, x + 4, y0 + 4.1, y0 + 5.5, zf - 0.15, zf + 0.15, darkWall, g);
  // sign
  const sm = new THREE.MeshStandardMaterial({ map: signTexture(cfg.name, cfg.color, '#1b1d22'), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0, roughness: 0.5 });
  sm.emissiveMap = sm.map; signMats.push({ m: sm, b, base: 1.25 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.98), sm);
  sign.position.set(x, y0 + 4.8, zf + dir * 0.17); sign.rotation.y = dir > 0 ? 0 : Math.PI; g.add(sign);
  // interior
  const interiorWall = M(cfg.interior, { roughness: 0.9 });
  slab(x - 3.7, x + 3.7, y0, y0 + 4.1, zb - side * 0.1, zb, interiorWall, g);
  slab(x - 3.7, x + 3.7, y0 + 4.05, y0 + 4.1, Math.min(zf, zb), Math.max(zf, zb), interiorWall, g);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(6, 5.5), emissive(0xfff3e2, 2.4, b));
  panel.rotation.x = Math.PI / 2; panel.position.set(x, y0 + 4.0, (zf + zb) / 2); g.add(panel);
  if (cfg.kind === 'office') return buildOffice(x, g);
  if (cfg.kind === 'shutter') {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 4.1), shutterMat);
    s.position.set(x, y0 + 2.05, zf + dir * 0.05); s.rotation.y = dir > 0 ? 0 : Math.PI; s.receiveShadow = true; g.add(s);
    return;
  }
  // glass front with mullions + door
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 4.1), glassMat);
  gl.position.set(x, y0 + 2.05, zf); gl.rotation.y = dir > 0 ? 0 : Math.PI; g.add(gl);
  for (const mx of [-3.7, -1.2, 1.2, 3.7]) slab(x + mx - 0.05, x + mx + 0.05, y0, y0 + 4.1, zf - 0.06, zf + 0.06, darkSteel, g);
  slab(x - 3.7, x + 3.7, y0, y0 + 0.12, zf - 0.08, zf + 0.08, darkSteel, g);
  // contents
  if (cfg.kind === 'racks') {
    const prod = [0x2f4b7c, 0xc94f3d, 0xe9e2d0, 0x3d7a5a, 0x222222, 0xd9a441];
    for (let i = -1; i <= 1; i++) {
      const rz = (zf + zb) / 2 + side * (i * 1.8);
      slab(x - 2.6, x + 2.6, y0, y0 + 1.6, rz - 0.35, rz + 0.35, M(0xf5f3ef), g);
      for (let k = 0; k < 10; k++) slab(x - 2.4 + k * 0.5, x - 2.05 + k * 0.5, y0 + 1.6, y0 + 1.95 + rand() * 0.25, rz - 0.25, rz + 0.25, M(prod[(k + i + 6) % 6]), g);
    }
    slab(x - 3.6, x + 3.6, y0 + 1.2, y0 + 3.4, zb - side * 0.35, zb - side * 0.1, M(0xebe7df), g);
  } else if (cfg.kind === 'cafe') {
    slab(x - 3, x + 3, y0, y0 + 1.1, zf + side * 2.2, zf + side * 3, M(0x6b4a33), g);
    slab(x - 3, x + 3, y0 + 1.1, y0 + 1.16, zf + side * 2.1, zf + side * 3.1, M(0xd9d4ca, { roughness: 0.3 }), g);
    const menu = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.4), emissive(0xffe2b0, 1.2, b));
    menu.position.set(x, y0 + 3.0, zb - side * 0.12); menu.rotation.y = dir > 0 ? 0 : Math.PI; g.add(menu);
  } else if (cfg.kind === 'mannequins') {
    for (let i = 0; i < 4; i++) {
      const mq = human({ skin: 0xcfcac2, shirt: [0x1c1c1f, 0xb8a58c, 0x7a1f24, 0xe8e4dc][i], pants: [0x2a2f3a, 0x1c1c1f, 0x3a3f4a, 0x8c7b66][i], hair: null, mannequin: true });
      mq.root.position.set(x - 2.7 + i * 1.8, y0 + 0.25, zf + side * 1.4);
      mq.root.rotation.y = dir > 0 ? 0 : Math.PI; mq.root.rotation.y += (i - 1.5) * 0.15;
      setPose(mq, 'mannequin', i);
      slab(x - 3.4, x + 3.4, y0, y0 + 0.25, zf + side * 0.6, zf + side * 2.2, M(0xf7f5f1), g);
      mannequinRefs.push(mq);
    }
  }
}

// ---------------------------------------------------------------- people (articulated capsule figures)
function limb(r, len, m) {
  const geo = new THREE.CapsuleGeometry(r, len, 4, 12); geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; return mesh;
}
function human({ skin = 0xc79a7b, shirt = 0x2b2f38, pants = 0x1d2027, shoes = 0x111111, hair = 0x1a1410, mannequin = false, height = 1.0 }) {
  const sk = M(skin, { roughness: mannequin ? 0.55 : 0.6 }), sh = M(shirt, { roughness: 0.9 }), pa = M(pants, { roughness: 0.9 }), so = M(shoes, { roughness: 0.5 });
  const root = new THREE.Group(); root.scale.setScalar(height); scene.add(root);
  const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), pa); pelvis.scale.set(1.05, 0.7, 0.75); pelvis.castShadow = true; hips.add(pelvis);
  const spine = new THREE.Group(); spine.position.y = 0.05; hips.add(spine);
  const torsoGeo = new THREE.CapsuleGeometry(0.16, 0.32, 6, 16); torsoGeo.translate(0, 0.27, 0);
  const torso = new THREE.Mesh(torsoGeo, sh); torso.scale.set(1.22, 1, 0.72); torso.castShadow = true; spine.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 10), sk); neck.position.y = 0.6; spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.66; spine.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), sk); skull.scale.set(0.88, 1.12, 1.0); skull.position.y = 0.1; skull.castShadow = true; head.add(skull);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 8), sk); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.09, 0.115); head.add(nose);
  if (hair) { const hm = new THREE.Mesh(new THREE.SphereGeometry(0.122, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M(hair, { roughness: 0.95 })); hm.scale.set(0.92, 1.1, 1.06); hm.position.set(0, 0.115, -0.01); hm.rotation.x = -0.25; head.add(hm); }
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const sh0 = new THREE.Group(); sh0.position.set(s * 0.22, 0.5, 0); spine.add(sh0);
    sh0.add(limb(0.055, 0.25, sh));
    const el = new THREE.Group(); el.position.y = -0.31; sh0.add(el);
    el.add(limb(0.045, 0.22, mannequin ? sk : sk));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), sk); hand.scale.set(0.8, 1.3, 0.6); hand.position.y = -0.3; el.add(hand);
    arms.push({ sh: sh0, el });
    const hp = new THREE.Group(); hp.position.set(s * 0.1, -0.02, 0); hips.add(hp);
    hp.add(limb(0.075, 0.36, pa));
    const kn = new THREE.Group(); kn.position.y = -0.45; hp.add(kn);
    kn.add(limb(0.06, 0.36, pa));
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), so); foot.position.set(0, -0.45, 0.05); foot.castShadow = true; kn.add(foot);
    legs.push({ hp, kn, foot });
  }
  return { root, hips, spine, head, arms, legs };
}
function setPose(h, mode, p = 0) {
  const { hips, spine, head, arms, legs } = h;
  for (const a of arms) { a.sh.rotation.set(0, 0, 0); a.el.rotation.set(0, 0, 0); }
  for (const l of legs) { l.hp.rotation.set(0, 0, 0); l.kn.rotation.set(0, 0, 0); l.foot.rotation.set(0, 0, 0); }
  spine.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0); hips.position.y = 0.95; hips.rotation.set(0, 0, 0);
  if (mode === 'walk') {
    const ph = p * Math.PI * 2;
    const s = Math.sin(ph);
    legs[0].hp.rotation.x = s * 0.45; legs[1].hp.rotation.x = -s * 0.45;
    legs[0].kn.rotation.x = Math.max(0, Math.sin(ph + 1.6)) * 0.75; legs[1].kn.rotation.x = Math.max(0, Math.sin(ph + Math.PI + 1.6)) * 0.75;
    arms[0].sh.rotation.x = -s * 0.35; arms[1].sh.rotation.x = s * 0.35;
    arms[0].el.rotation.x = arms[1].el.rotation.x = -0.25;
    arms[0].sh.rotation.z = -0.06; arms[1].sh.rotation.z = 0.06;
    hips.position.y = 0.95 + Math.abs(Math.cos(ph)) * 0.03;
    spine.rotation.x = 0.04;
  } else if (mode === 'stand') {
    arms[0].sh.rotation.z = -0.07; arms[1].sh.rotation.z = 0.07;
    arms[0].el.rotation.x = arms[1].el.rotation.x = -0.08;
  } else if (mode === 'sit') {
    hips.position.y = 0.52;
    legs[0].hp.rotation.x = legs[1].hp.rotation.x = -Math.PI / 2 + 0.1;
    legs[0].kn.rotation.x = legs[1].kn.rotation.x = Math.PI / 2 - 0.1;
    legs[0].hp.rotation.z = -0.06; legs[1].hp.rotation.z = 0.06;
    spine.rotation.x = 0.12;
    arms[0].sh.rotation.x = arms[1].sh.rotation.x = -0.75;
    arms[0].el.rotation.x = arms[1].el.rotation.x = -0.9;
    arms[0].sh.rotation.z = -0.15; arms[1].sh.rotation.z = 0.15;
  } else if (mode === 'mannequin') {
    arms[0].sh.rotation.z = -0.18 - p * 0.04; arms[1].sh.rotation.z = 0.12;
    arms[(p % 2)].el.rotation.x = -0.5 - p * 0.1;
    legs[p % 2].hp.rotation.x = 0.12; legs[(p + 1) % 2].hp.rotation.z = 0.06;
    head.rotation.y = (p - 1.5) * 0.12;
  } else if (mode === 'lurk') {
    arms[0].sh.rotation.z = -0.03; arms[1].sh.rotation.z = 0.03;
    spine.rotation.x = 0.1; head.rotation.x = -0.35 + p * 0.45; head.rotation.z = 0.25 * p;
  }
}

// ---------------------------------------------------------------- security office (SECURITY unit, x 20..28, z 14..22)
const monitorScreens = []; // {mesh, rt, cam, label}
let officeDoor;
function buildOffice(x, g) {
  // solid front wall with a door opening at x 23.4..24.6
  slab(x - 3.7, x - 0.6, 0, 4.1, 13.9, 14.1, darkWall, g); slab(x + 0.6, x + 3.7, 0, 4.1, 13.9, 14.1, darkWall, g);
  slab(x - 0.6, x + 0.6, 2.4, 4.1, 13.9, 14.1, darkWall, g);
  officeDoor = new THREE.Group(); officeDoor.position.set(x - 0.6, 0, 14.0); g.add(officeDoor);
  box(1.18, 2.38, 0.06, M(0x5c6068, { roughness: 0.5 }), 0.59, 1.2, 0, officeDoor);
  officeDoor.rotation.y = -1.1; // ajar, swung inward
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.3), new THREE.MeshStandardMaterial({ map: signTexture('SECURITY · STAFF ONLY', '#e6e6e6', '#2a2d33', 'bold 76px DejaVu Sans') }));
  plaque.position.set(x, 2.7, 13.88); plaque.rotation.y = Math.PI; g.add(plaque);
  // floor, desk, chair
  slab(x - 3.7, x + 3.7, 0, 0.01, 14.1, 21.9, M(0x2a2c31, { roughness: 0.9 }), g);
  slab(x - 3.2, x + 3.2, 0.72, 0.77, 20.6, 21.6, M(0x34363b, { roughness: 0.5 }), g);
  slab(x - 3.1, x - 2.9, 0, 0.72, 20.7, 21.5, darkSteel, g); slab(x + 2.9, x + 3.1, 0, 0.72, 20.7, 21.5, darkSteel, g);
  slab(x + 1.2, x + 1.6, 0.77, 0.8, 20.9, 21.2, M(0x111111), g); // keyboard
  slab(x - 0.25, x + 0.25, 0.77, 0.79, 20.75, 21.0, M(0x18191c), g);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.11, 14), M(0xf0ece4)); coffee.position.set(x - 1.4, 0.83, 20.9); g.add(coffee);
  // chair
  const chair = new THREE.Group(); chair.position.set(x, 0, 19.4); g.add(chair);
  box(0.55, 0.08, 0.55, M(0x1b1c20), 0, 0.48, 0, chair); box(0.55, 0.7, 0.08, M(0x1b1c20), 0, 0.9, -0.3, chair);
  box(0.06, 0.45, 0.06, darkSteel, 0, 0.23, 0, chair);
  // monitor wall: 2x2 screens on the back wall, facing -z
  const labels = ['CAM 03 · ATRIUM', 'CAM 01 · ENTRANCE', 'CAM 02 · FOOD COURT', 'CAM 05 · ELEVATORS'];
  const cams = [camFor('atrium'), camFor('entrance'), camFor('food'), camFor('elevators')];
  const pos = [[-0.6, 2.35], [0.6, 2.35], [-0.6, 1.6], [0.6, 1.6]];
  slab(x - 1.3, x + 1.3, 1.15, 2.8, 21.75, 21.85, M(0x0e0f12), g);
  pos.forEach(([dx, y], i) => {
    const rt = new THREE.WebGLRenderTarget(480, 292, { type: THREE.HalfFloatType });
    const mat = cctvScreenMaterial(rt.texture, labels[i]);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.7), mat);
    mesh.position.set(x + dx, y, 21.74); mesh.rotation.y = Math.PI; g.add(mesh);
    monitorScreens.push({ mesh, rt, cam: cams[i], mat });
  });
}
function labelTexture(text) {
  return canvasTex(512, 312, (g, w, h) => {
    g.font = 'bold 26px DejaVu Sans Mono'; g.fillStyle = '#e8f2e6'; g.fillText(text, 18, 36);
    g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(w - 70, 28, 8, 0, 7); g.fill(); g.fillStyle = '#e8f2e6'; g.fillText('REC', w - 56, 37);
    g.font = '22px DejaVu Sans Mono'; g.fillText('11-12-2026', 18, h - 18);
  });
}
function cctvScreenMaterial(tex, label) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, overlay: { value: labelTexture(label) }, uTime: { value: 0 }, uBright: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D map; uniform sampler2D overlay; uniform float uTime; uniform float uBright; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 uv = vUv; uv.x = 1.0 - uv.x; uv.x = 1.0 - uv.x;
        vec3 c = texture2D(map, uv).rgb;
        c = c / (c + vec3(0.6)) * 1.9;
        float l = dot(c, vec3(.299,.587,.114));
        vec3 col = vec3(l) * vec3(0.82, 1.0, 0.86);
        col *= 0.86 + 0.14 * sin(vUv.y * 600.0 + uTime * 8.0);
        col += (h(vUv * 300.0 + uTime) - 0.5) * 0.12;
        col *= smoothstep(0.85, 0.35, length(vUv - 0.5));
        vec4 o = texture2D(overlay, vUv);
        col = mix(col, o.rgb, o.a * 0.9);
        gl_FragColor = vec4(col * uBright * 1.05, 1.0);
      }`,
  });
}

// ---------------------------------------------------------------- CCTV camera definitions
const CAMS = {
  atrium: { pos: v3(-10.8, 10.9, 5.4), look: v3(2.5, 0, -1.5), fov: 70, label: 'CAM 03 · ATRIUM' },
  entrance: { pos: v3(-21, 4.9, 7), look: v3(-30, 1.0, 0), fov: 68, label: 'CAM 01 · ENTRANCE' },
  food: { pos: v3(-11.5, 4.9, -2), look: v3(-21, 0, -10), fov: 68, label: 'CAM 02 · FOOD COURT' },
  elevators: { pos: v3(23, 4.9, -7), look: v3(30, 1.0, 0), fov: 70, label: 'CAM 05 · ELEVATORS' },
  office: { pos: v3(20.7, 3.4, 14.5), look: v3(24.1, 0.9, 19.6), fov: 62, label: 'CAM 07 · SECURITY' },
};
function camFor(name, aspect = 480 / 292) {
  const c = CAMS[name];
  const cam = new THREE.PerspectiveCamera(c.fov / (aspect > 1 ? 1.45 : 1), aspect, 0.1, 200);
  cam.position.copy(c.pos); cam.lookAt(c.look); return cam;
}

// ---------------------------------------------------------------- build the mall
for (const side of [-1, 1]) for (const level of [0, 1]) for (let x = -24; x <= 24; x += 8) store(side, level, x);

// exit doors on the west wall (x=-30) with a roller shutter
const exitGroup = new THREE.Group(); scene.add(exitGroup);
slab(-30.05, -29.9, 0, 3.6, -3, 3, glassMat, exitGroup).castShadow = false;
for (const z of [-3, -1, 1, 3]) slab(-30.05, -29.85, 0, 3.6, z - 0.06, z + 0.06, darkSteel, exitGroup);
slab(-30.1, -29.8, 3.6, 4.3, -3.3, 3.3, darkSteel, exitGroup);
const exitHole = slab(-30.4, -30.25, 0, 3.6, -3, 3, new THREE.MeshBasicMaterial({ color: 0x0a1222 }), exitGroup);
const shutter = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.6), shutterMat);
shutter.rotation.y = Math.PI / 2; shutter.position.set(-29.7, 1.8, 0); shutter.castShadow = true; scene.add(shutter);
const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.45), new THREE.MeshStandardMaterial({ map: signTexture('EXIT', '#ffffff', '#0d8a3c', 'bold 150px DejaVu Sans'), emissive: 0xffffff, emissiveIntensity: 1.6 }));
exitSign.material.emissiveMap = exitSign.material.map;
exitSign.rotation.y = Math.PI / 2; exitSign.position.set(-29.85, 4.6, 0); scene.add(exitSign);

// elevators on the east wall (x=30): three cars at z = -4, 0, 4
const elevators = [];
function indicatorTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, t, last: null };
}
for (const z of [-4, 0, 4]) {
  const g = new THREE.Group(); g.position.set(30, 0, z); scene.add(g);
  // car interior behind the wall
  const carWall = M(0xb7b2a8, { metalness: 0.6, roughness: 0.35 });
  slab(0.3, 2.6, 0, 0.02, -1.1, 1.1, M(0x5b5048), g); slab(2.5, 2.6, 0, 2.8, -1.1, 1.1, carWall, g);
  slab(0.3, 2.6, 0, 2.8, -1.15, -1.05, carWall, g); slab(0.3, 2.6, 0, 2.8, 1.05, 1.15, carWall, g);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xe8f0ff, emissiveIntensity: 0 });
  slab(0.3, 2.6, 2.78, 2.8, -1.1, 1.1, lightMat, g);
  slab(2.0, 2.45, 0.9, 1.0, -0.5, 0.5, steel, g); // handrail
  // frame + doors
  slab(-0.15, 0.3, 2.45, 2.75, -1.25, 1.25, steel, g);
  slab(-0.15, 0.3, 0, 2.75, -1.25, -1.0, steel, g); slab(-0.15, 0.3, 0, 2.75, 1.0, 1.25, steel, g);
  const leafL = box(0.06, 2.42, 1.0, steel, -0.02, 1.21, -0.5, g);
  const leafR = box(0.06, 2.42, 1.0, steel, -0.02, 1.21, 0.5, g);
  const ind = indicatorTex();
  const indMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshBasicMaterial({ map: ind.t, toneMapped: false }));
  indMesh.rotation.y = -Math.PI / 2; indMesh.position.set(-0.17, 3.05, 0); g.add(indMesh);
  const btn = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  btn.rotation.y = -Math.PI / 2; btn.position.set(-0.16, 1.15, 1.5); g.add(btn);
  elevators.push({ z, leafL, leafR, ind, lightMat });
}
// wall pieces between elevators
for (const [z0, z1] of [[-22, -5.25], [-2.75, -1.25], [1.25, 2.75], [5.25, 22]]) slab(29.85, 30.0, 0, 5.5, z0, z1, wallMat);
slab(29.85, 30.0, 2.75, 5.5, -5.25, 5.25, wallMat);

// escalators in the void: up at z=-1.2 and down at z=+1.2, ground x=1 -> upper x=12
const stepTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#3a3c40'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d8086'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 3); g.fillStyle = '#d8b03a'; g.fillRect(0, 0, 5, h); g.fillStyle = '#16171a'; g.fillRect(5, 0, 3, h); }, [1, 1]);
const escalatorSteps = [];
for (const z of [-1.25, 1.25]) {
  const len = Math.hypot(11, 6), ang = Math.atan2(6, 11);
  const g = new THREE.Group(); g.position.set(6.5, 3, z); g.rotation.z = ang; scene.add(g);
  const st = stepTex.clone(); st.needsUpdate = true; st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(len / 0.4, 1); st.rotation = 0;
  const steps = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.0), new THREE.MeshStandardMaterial({ map: st, metalness: 0.6, roughness: 0.45 }));
  steps.rotation.x = -Math.PI / 2; steps.position.y = 0.02; steps.receiveShadow = true; g.add(steps);
  escalatorSteps.push({ tex: st, dir: z < 0 ? 1 : -1 });
  box(len + 1, 0.9, 1.5, M(0xc9ccd1, { metalness: 0.5, roughness: 0.4 }), 0, -0.47, 0, g);
  for (const s of [-1, 1]) {
    box(len, 0.95, 0.03, glassMat, 0, 0.5, s * 0.66, g).castShadow = false;
    box(len, 0.08, 0.12, M(0x111111, { roughness: 0.4 }), 0, 1.0, s * 0.66, g);
  }
}

// food court tables in front of CAFÉ 21 / NOODLE BAR
const tableMat = M(0xe9e6df, { roughness: 0.35 }), chairMat = M(0x40342b);
for (const [x, z] of [[-26, -10], [-22, -10], [-18, -10], [-26, -7], [-22, -7], [-14, -9], [-18, -6.5]]) {
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 28), tableMat); top.position.set(x, 0.75, z); top.castShadow = top.receiveShadow = true; scene.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 10), darkSteel); leg.position.set(x, 0.375, z); scene.add(leg);
  for (const a of [0, Math.PI]) {
    const c = new THREE.Group(); c.position.set(x + Math.cos(a) * 0.85, 0, z + Math.sin(a) * 0.85); c.rotation.y = -a + Math.PI / 2; scene.add(c);
    box(0.45, 0.05, 0.45, chairMat, 0, 0.46, 0, c); box(0.45, 0.45, 0.05, chairMat, 0, 0.7, -0.2, c);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.03, 0.46, 0.03, darkSteel, lx, 0.23, lz, c);
  }
}
// the "someone was just here" table: tray, cup with steam, half-eaten food, a phone face-up with its screen on
const trayGroup = new THREE.Group(); trayGroup.position.set(-18, 0.78, -6.5); scene.add(trayGroup);
box(0.5, 0.02, 0.35, M(0xa13c2b, { roughness: 0.5 }), 0, 0, 0, trayGroup);
const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.13, 18), M(0xf3efe7)); cup.position.set(0.12, 0.075, -0.05); trayGroup.add(cup);
const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 18), M(0x1d1d1d)); lid.position.set(0.12, 0.14, -0.05); trayGroup.add(lid);
const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M(0xf1ede6, { side: THREE.DoubleSide })); bowl.position.set(-0.1, 0.09, 0.02); trayGroup.add(bowl);
const phone = box(0.075, 0.008, 0.15, M(0x0b0b0c), -0.38, 0.0, 0.1, trayGroup);
const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.138), new THREE.MeshBasicMaterial({ map: canvasTex(66, 138, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3b5bdb'); gr.addColorStop(1, '#9775fa'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 15px DejaVu Sans'; g.textAlign = 'center'; g.fillText('00:07', w / 2, 40); }), toneMapped: false }));
phoneScreen.rotation.x = -Math.PI / 2; phoneScreen.position.set(-0.38, 0.006, 0.1); trayGroup.add(phoneScreen);
// steam
const steamTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const steam = [];
for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); trayGroup.add(s); steam.push(s); }

// planters, benches
for (const [x, z] of [[-7, -3.5], [-7, 3.5], [16, -9], [-16, 9]]) {
  slab(x - 1, x + 1, 0, 0.6, z - 1, z + 1, M(0x5f5a52, { roughness: 0.9 }));
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rand() * 0.25, 1), M([0x2d4a2b, 0x3b5e34, 0x24391f][i % 3], { flatShading: true })); f.position.set(x + (rand() - 0.5), 0.8 + rand() * 1.4, z + (rand() - 0.5)); f.castShadow = true; scene.add(f); }
}
for (const [x, z] of [[-3, -4.5], [-3, 4.5], [8, -9.5], [-8, 9.5]]) { slab(x - 1, x + 1, 0.4, 0.48, z - 0.25, z + 0.25, M(0x8a6a4a)); slab(x - 0.9, x - 0.8, 0, 0.4, z - 0.2, z + 0.2, darkSteel); slab(x + 0.8, x + 0.9, 0, 0.4, z - 0.2, z + 0.2, darkSteel); }

// outside, seen through the exit glass: night car park glow
const outside = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1630'); gr.addColorStop(0.6, '#1b2440'); gr.addColorStop(1, '#0c0d12'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { const x = 40 + i * 85, y = 150; const r = g.createRadialGradient(x, y, 0, x, y, 30); r.addColorStop(0, 'rgba(255,200,140,.9)'); r.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = r; g.fillRect(x - 30, y - 30, 60, 60); } }), fog: false }));
outside.rotation.y = Math.PI / 2; outside.position.set(-40, 4, 0); scene.add(outside);
exitHole.visible = false;

// moon shafts through the skylight (additive)
const shaftMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uStrength: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform float uStrength; varying vec2 vUv; void main(){ float a = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x) * mix(0.15, 1.0, vUv.y); gl_FragColor = vec4(vec3(0.55,0.65,1.0) * a * uStrength, 1.0); }',
});
const shafts = new THREE.Group(); scene.add(shafts);
for (let i = 0; i < 7; i++) {
  for (const r of [0, Math.PI / 2]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2 + rand() * 1.5, 13), shaftMat);
    p.position.set(-9 + i * 3 + rand(), 6, -3 + rand() * 6); p.rotation.set(0, r + 0.3, 0.22); shafts.add(p);
  }
}

// dust motes that glow inside the flashlight cone / moon shafts
const dustN = 5000, dustPos = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) { dustPos[i * 3] = -30 + rand() * 60; dustPos[i * 3 + 1] = rand() * 11.5; dustPos[i * 3 + 2] = -14 + rand() * 28; }
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { camPos: { value: v3(0, 0, 0) }, camDir: { value: v3(0, 0, -1) }, flashOn: { value: 0 }, moonOn: { value: 0 }, uTime: { value: 0 } },
  vertexShader: `uniform vec3 camPos; uniform vec3 camDir; uniform float flashOn; uniform float moonOn; uniform float uTime; varying float vA;
    void main(){ vec3 p = position + vec3(sin(uTime*0.3+position.y)*0.3, sin(uTime*0.2+position.x)*0.2, cos(uTime*0.25+position.z)*0.3);
      vec3 d = p - camPos; float dist = length(d); float cone = smoothstep(0.9, 0.97, dot(normalize(d), camDir));
      float inVoid = step(abs(p.x), 12.0) * step(abs(p.z), 6.0);
      vA = cone * flashOn * smoothstep(14.0, 1.0, dist) + inVoid * moonOn * 0.25;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 22.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: 'varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0,0.95,0.85) * smoothstep(0.5, 0.0, r) * vA, 1.0); }',
});
scene.add(new THREE.Points(dustGeo, dustMat));

// ---------------------------------------------------------------- the people only cameras can see
const ghosts = [];
const ghostCols = [[0x2a2d33, 0x1b1d22], [0x5a4a3a, 0x22252b], [0x3b4252, 0x2b2b2b], [0x6b6f75, 0x1d1f24], [0x272a30, 0x3a3328], [0x46393a, 0x1a1c20], [0x30343c, 0x262a33], [0x52524e, 0x1f2126], [0x2b3a4a, 0x202020], [0x3d3d3d, 0x2d2a26], [0x2e2a28, 0x1c1c1c], [0x48505a, 0x23262c]];
for (let i = 0; i < 12; i++) {
  const h = human({ skin: [0xc79a7b, 0x8d5f45, 0xe0b8a0, 0x6b4630][i % 4], shirt: ghostCols[i][0], pants: ghostCols[i][1], hair: [0x1a1410, 0x3b2a1e, 0x111111, 0x6b5a48][i % 4], height: 0.94 + rand() * 0.12 });
  const path = { cx: -8 + rand() * 16, cz: -4 + rand() * 8, rx: 2 + rand() * 6, rz: 1 + rand() * 3, sp: (0.08 + rand() * 0.06) * (rand() < 0.5 ? -1 : 1), ph: rand() * 6.28 };
  ghosts.push({ h, path, phase: rand() });
}
const you = human({ skin: 0xc49a80, shirt: 0x5c6b3a, pants: 0x23262c, hair: 0x2a1d15 }); // olive jacket
const lurker = human({ skin: 0x8a8a8a, shirt: 0x0c0c0e, pants: 0x0c0c0e, hair: 0x0a0a0a, height: 1.12 });
setPose(you, 'sit'); you.root.position.set(24, 0, 19.4);
lurker.root.position.set(24.4, 0, 18.3); lurker.root.rotation.y = -2.38; // faces the office camera / door

const STOP_T = 35.0; // after this the people stop walking and turn to the camera
function ghostState(t) {
  const camPos = CAMS.atrium.pos;
  for (const g of ghosts) {
    const tt = Math.min(t, STOP_T);
    const a = g.path.ph + tt * g.path.sp * 6.28 / 6;
    const x = g.path.cx + Math.cos(a) * g.path.rx, z = g.path.cz + Math.sin(a) * g.path.rz;
    g.h.root.position.set(x, 0, z);
    const tx = -Math.sin(a) * g.path.rx * Math.sign(g.path.sp), tz = Math.cos(a) * g.path.rz * Math.sign(g.path.sp);
    let yaw = Math.atan2(tx, tz);
    if (t < STOP_T) { setPose(g.h, 'walk', tt * 0.9 + g.phase); g.h.root.rotation.y = yaw; }
    else {
      const k = ease((t - STOP_T) / 1.2);
      const look = Math.atan2(camPos.x - x, camPos.z - z);
      let d = look - yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      setPose(g.h, 'stand'); g.h.root.rotation.y = yaw + d * k; g.h.head.rotation.x = -0.55 * k;
    }
  }
}
function setVisibility({ ghostsOn = false, youOn = false, lurkerOn = false }) {
  ghosts.forEach((g) => (g.h.root.visible = ghostsOn));
  you.root.visible = youOn; lurker.root.visible = lurkerOn;
}

// ---------------------------------------------------------------- global event timeline
const ELEV_OPEN = [40.6, 44.25, 45.75]; // centre, south, north: z = 0, -4, 4 -> indices 1, 0, 2
const ELEV_IDX = [1, 0, 2];
function worldState(t, lt = t) {
  // shutter falls 3.6 -> 4.6
  const s = lt > 10 ? 1 : ease((t - 3.55) / 1.0) ** 1.6;
  shutter.scale.y = Math.max(0.001, s); shutter.position.y = 3.6 - 1.8 * s;
  // light banks go out east -> west
  bankLevel[2] = lt < 7.4 ? 1 : 0; bankLevel[1] = lt < 8.0 ? 1 : 0; bankLevel[0] = lt < 8.6 ? 1 : 0;
  const dark = lt >= 8.6;
  for (const e of emissives) e.m.emissiveIntensity = e.base * bankLevel[e.bank];
  for (const s2 of signMats) s2.m.emissiveIntensity = s2.base * bankLevel[s2.b];
  for (const b of bankLights) b.l.intensity = 30 * bankLevel[b.b];
  const lit = (bankLevel[0] + bankLevel[1] + bankLevel[2]) / 3;
  hemi.intensity = 0.07 + 0.32 * lit; hemi.color.set(lit > 0.5 ? 0xfff1dc : 0x7d8cff);
  moon.intensity = 0.25 + (1 - lit) * 1.1;
  shaftMat.uniforms.uStrength.value = (1 - lit) * 0.03;
  dustMat.uniforms.moonOn.value = 1 - lit;
  exitGlow.intensity = dark ? 4 : 0; exitSign.material.emissiveIntensity = 1.6;
  scene.fog.color.set(dark ? 0x070a14 : 0x2a2622); scene.fog.density = dark ? 0.02 : 0.006;
  floorMat.envMap = dark ? envDark : envLit;
  // escalators keep running
  for (const e of escalatorSteps) e.tex.offset.x = -t * 0.55 * e.dir / 0.4 * 0.4;
  // elevators
  elevators.forEach((e, i) => {
    const k = ELEV_IDX.indexOf(i);
    const tOpen = ELEV_OPEN[k];
    const o = ease((t - tOpen - 0.35) / 1.1);
    e.leafL.position.z = -0.5 - o * 0.92; e.leafR.position.z = 0.5 + o * 0.92;
    let lv = t > tOpen - 0.2 ? 0.8 : 0;
    if (i === 2 && t > 47) lv *= (hash(Math.floor(t * 14)) > 0.3 ? 1 : 0.1); // north car flickers
    e.lightMat.emissiveIntensity = lv;
    // floor indicator
    let txt;
    if (t < tOpen - 2.4) txt = i === 2 ? '3' : '2';
    else if (t < tOpen - 1.2) txt = i === 2 ? '2' : '1';
    else txt = i === 2 && t > 46.6 ? 'B3' : 'G';
    const arrow = t < tOpen ? '▼' : '';
    const key = txt + arrow;
    if (e.ind.last !== key) {
      const g = e.ind.c.getContext('2d'); g.fillStyle = '#060606'; g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#ff4a3a'; g.font = 'bold 84px DejaVu Sans Mono'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(arrow + txt, 128, 68); e.ind.t.needsUpdate = true; e.ind.last = key;
    }
  });
  elevLight.intensity = t > ELEV_OPEN[2] - 0.2 ? (t > 47 && hash(Math.floor(t * 14)) < 0.3 ? 0.3 : 2.2) : 0;
  // steam
  steam.forEach((s3, i) => {
    const life = ((t * 0.5 + i / steam.length) % 1);
    s3.position.set(0.12 + Math.sin(t * 2 + i) * 0.02 * life * 3, 0.16 + life * 0.35, -0.05 + Math.cos(t * 1.7 + i) * 0.015 * life * 3);
    s3.scale.setScalar(0.05 + life * 0.14); s3.material.opacity = Math.sin(life * Math.PI) * 0.12;
  });
  ghostState(t);
  monitorGlow.intensity = 9;
}

// ---------------------------------------------------------------- env maps for floor reflections
const pmrem = new THREE.PMREMGenerator(renderer);
let envLit = null, envDark = null;
function bakeEnv(t) {
  worldState(t); setVisibility({});
  const prevEnv = floorMat.envMap; floorMat.envMap = null;
  scene.position.y = -1.2; scene.updateMatrixWorld(true);
  const rt = pmrem.fromScene(scene, 0.02, 0.1, 200);
  scene.position.y = 0; scene.updateMatrixWorld(true);
  floorMat.envMap = prevEnv; return rt.texture;
}

// ---------------------------------------------------------------- post
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.002, maxblur: 0.01 });
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.55, 0.78); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uCCTV: { value: 0 }, uGlitch: { value: 0 }, uFade: { value: 0 }, uGrain: { value: 0.05 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uCCTV; uniform float uGlitch; uniform float uFade; uniform float uGrain; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      float band = step(0.82, h(vec2(floor(uv.y * 38.0), floor(uTime * 24.0))));
      uv.x += (h(vec2(floor(uv.y * 90.0), uTime)) - 0.5) * 0.06 * uGlitch * band;
      if (uCCTV > 0.5) { vec2 c = uv - 0.5; uv = 0.5 + c * (1.0 - 0.06 * dot(c, c)); vec2 g = vec2(360.0, 640.0); uv = (floor(uv * g) + 0.5) / g; }
      vec3 col = texture2D(tDiffuse, uv).rgb;
      if (uCCTV > 0.5) {
        float l = dot(col, vec3(.299,.587,.114));
        col = vec3(pow(l, 0.85) * 1.1) * vec3(0.84, 1.0, 0.88);
        col *= 0.88 + 0.12 * sin(vUv.y * 1920.0 * 0.55 + uTime * 30.0);
        col += (h(vUv * 777.0 + fract(uTime)) - 0.5) * 0.18;
        col += uGlitch * 0.15 * band;
      } else {
        col = mix(col, col * vec3(0.93, 1.0, 1.08), 0.5); // cool grade
        col += (h(vUv * 999.0 + fract(uTime * 1.7)) - 0.5) * uGrain;
      }
      col *= mix(1.0, smoothstep(1.0, 0.25, length((vUv - 0.5) * vec2(1.0, 0.75))), 0.75);
      col *= 1.0 - uFade;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
composer.addPass(grade);

// ---------------------------------------------------------------- shots
const hand = (t, a, f = 1) => v3(vnoise(t * 0.9 * f) * a, vnoise(t * 1.1 * f + 7) * a * 0.8, vnoise(t * 0.7 * f + 13) * a * 0.5);
const walkBob = (t, rate, a) => v3(Math.sin(t * rate * Math.PI) * a * 0.5, Math.abs(Math.sin(t * rate * Math.PI)) * a, 0);
function aim(pos, look, roll = 0) { camera.position.copy(pos); camera.up.set(0, 1, 0); camera.lookAt(look); camera.rotateZ(roll); }
const pathLerp = (a, b, k) => a.clone().lerp(b, k);

const SHOTS = [
  { a: 0, b: 3.0, cctv: 'atrium', ghosts: true }, // HOOK: CCTV, people walking
  { a: 3.0, b: 6.5, fp: true, run(t, u) { // shutter slams in front of you
      aim(v3(-21.0, 1.66, 1.6).add(hand(t, 0.05)).add(t > 1.6 ? v3(0, Math.exp(-(t - 1.6) * 7) * Math.sin((t - 1.6) * 50) * 0.04, 0) : v3()), v3(-30, lerp(2.2, 1.6, ease(u)), -0.4));
      return { fov: 56, focus: 9, ap: 0.002, flash: 0 }; } },
  { a: 6.5, b: 10.0, run(t, u) { // establishing wide: lights die bank by bank
      aim(v3(27.5 - u * 1.2, 9.8 - u * 0.4, -12.8).add(hand(t, 0.03)), v3(-8, 1.5, 3));
      return { fov: 62, focus: 20, ap: 0.0005, flash: 0 }; } },
  { a: 10.0, b: 14.0, fp: true, run(t, u) { // walking past the mannequin window
      const p = pathLerp(v3(-6, 1.62, -9.6), v3(3.5, 1.62, -10.4), u).add(walkBob(t, 1.8, 0.035)).add(hand(t, 0.03));
      aim(p, v3(lerp(-3, 2.5, ease(u)), 1.35, -14.5));
      return { fov: 46, focus: 4.3, ap: 0.003, flash: 1 }; } },
  { a: 14.0, b: 18.0, fp: true, run(t, u) { // riding the running escalator up
      const k = u * 0.7 + 0.08;
      const base = v3(1 + 11 * k, 6 * k + 1.62 + 0.05, -1.25);
      aim(base.add(hand(t, 0.03)), v3(base.x + 6, base.y + 2.2, -1.6));
      return { fov: 52, focus: 6, ap: 0.0015, flash: 1 }; } },
  { a: 18.0, b: 21.5, run(t, u) { // upper balcony, moonlight, slow descending crane
      aim(v3(-11.2 + u * 1.5, lerp(9.5, 7.8, ease(u)), 5.6 - u * 0.4).add(hand(t, 0.03)), v3(4, 0.5, -2));
      return { fov: 58, focus: 14, ap: 0.0008, flash: 0 }; } },
  { a: 21.5, b: 25.0, fp: true, run(t, u) { // the warm cup
      const p = pathLerp(v3(-16.4, 1.5, -4.4), v3(-17.45, 1.12, -5.95), ease(u)).add(hand(t, 0.02));
      aim(p, v3(-17.9, 0.85, -6.55));
      return { fov: 42, focus: p.distanceTo(v3(-17.88, 0.85, -6.55)), ap: 0.012, flash: 0.3 }; } },
  { a: 25.0, b: 29.0, fp: true, run(t, u) { // approaching the security office
      const p = pathLerp(v3(18.2, 1.62, 6.5), v3(23.7, 1.62, 12.6), ease(u)).add(walkBob(t, 1.6, 0.03)).add(hand(t, 0.03));
      aim(p, v3(24.0, 1.4, 16));
      return { fov: 48, focus: p.distanceTo(v3(24, 1.4, 14)), ap: 0.002, flash: 1, monitors: true }; } },
  { a: 29.0, b: 33.0, office: true, run(t, u) { // sitting at the monitor wall
      aim(v3(24.0, 1.45, lerp(17.2, 18.0, ease(u))).add(hand(t, 0.012)), v3(23.85, 1.98, 21.8));
      return { fov: 46, focus: lerp(4.2, 3.4, ease(u)), ap: 0.003, flash: 0, monitors: true }; } },
  { a: 33.0, b: 36.0, fp: true, run(t, u) { // run out to the atrium: empty
      const p = pathLerp(v3(13.5, 1.62, 9.5), v3(6.5, 1.62, 6.6), ease(u * 1.3)).add(walkBob(t, 3.2, 0.06)).add(hand(t, 0.06, 2));
      aim(p, v3(lerp(0, -6, ease(u)), 1.0, lerp(0, -1.5, u)), Math.sin(t * 6) * 0.02);
      return { fov: 54, focus: 9, ap: 0.0015, flash: 1 }; } },
  { a: 36.0, b: 40.0, office: true, run(t, u) { // back at the screen: they stopped, they're looking up
      aim(v3(lerp(23.5, 23.42, u), lerp(2.38, 2.36, u), lerp(20.35, 20.9, ease(u))).add(hand(t, 0.006)), v3(23.4, 2.35, 21.75));
      return { fov: 46, focus: lerp(1.45, 0.9, ease(u)), ap: 0.002, flash: 0, monitors: true }; } },
  { a: 40.0, b: 44.0, fp: true, run(t, u) { // elevator lobby; centre doors open by themselves
      aim(v3(lerp(22.5, 23.4, ease(u)), 1.62, 0.6).add(hand(t, 0.025)), v3(30, 1.5, 0.1));
      return { fov: 50, focus: 7, ap: 0.0025, flash: 1 }; } },
  { a: 44.0, b: 45.5, fp: true, run(t, u) { // snap: south car opens
      aim(v3(25.0, 1.6, -1.0).add(hand(t, 0.04, 2)), v3(30, 1.5, -4.0), -0.02);
      return { fov: 48, focus: 4.3, ap: 0.003, flash: 1 }; } },
  { a: 45.5, b: 47.0, fp: true, run(t, u) { // snap: north car opens
      aim(v3(25.0, 1.6, 1.0).add(hand(t, 0.04, 2)), v3(30, 1.5, 4.0), 0.02);
      return { fov: 48, focus: 4.3, ap: 0.003, flash: 1 }; } },
  { a: 47.0, b: 52.0, fp: true, run(t, u) { // slow push toward the flickering B3 car
      aim(v3(lerp(24.0, 27.3, ease(u)), lerp(1.62, 1.7, u), 4.0).add(hand(t, 0.018)), v3(30, lerp(1.6, 2.25, ease(u)), 4.0));
      return { fov: 46, focus: lerp(6.5, 3.3, u), ap: 0.003, flash: 0.45 }; } },
  { a: 52.0, b: 54.5, fp: true, run(t, u) { // run back to the office
      const p = pathLerp(v3(22.5, 1.62, 3), v3(23.8, 1.62, 12.4), ease(u)).add(walkBob(t, 3.4, 0.07)).add(hand(t, 0.07, 2.5));
      aim(p, v3(24, 1.3, 16), Math.sin(t * 7) * 0.03);
      return { fov: 56, focus: 5, ap: 0.0015, flash: 1, monitors: true }; } },
  { a: 54.5, b: 58.3, cctv: 'office', you: true, lurker: true, monitors: true }, // the twist
  { a: 58.3, b: 59.3, fp: true, run(t, u) { // whip around: nobody. the light dies
      const yaw = lerp(0, Math.PI, ease(t / 0.45));
      const p = v3(24, 1.25, 19.35);
      aim(p, v3(24 + Math.sin(yaw) * 0.3, 1.3, 19.35 + Math.cos(yaw) * 3));
      const f = t < 0.55 ? 1 : t < 0.62 ? 0.2 : t < 0.7 ? 0.9 : t < 0.78 ? 0 : t < 0.83 ? 0.5 : 0;
      return { fov: 52, focus: 3, ap: 0.002, flash: f, monitors: true }; } },
  { a: 59.3, b: 60.01, black: true },
];

// ---------------------------------------------------------------- captions
const SUBS = [
  [3.35, 6.5, '23:58. The shutters came down.'],
  [6.6, 8.5, 'Then the lights went out.'],
  [8.5, 10.0, 'With me still inside.'],
  [10.15, 14.0, 'Every store was empty.'],
  [14.1, 18.0, 'But the escalators kept running.'],
  [18.1, 21.4, 'No alarms. No guards.'],
  [21.6, 25.0, 'Someone had just been here.\nThe coffee was still hot.'],
  [25.1, 29.0, 'I found the security office.'],
  [29.1, 31.1, 'CAM 03. The atrium.'],
  [31.1, 33.0, 'It was full of people.'],
  [33.1, 34.6, 'I ran out there.'],
  [34.6, 36.0, 'Empty.'],
  [36.1, 38.0, 'On the screen, they had stopped.'],
  [38.0, 40.0, 'All of them were looking up.\nAt the camera.'],
  [40.1, 44.0, 'Then the elevators started opening.'],
  [44.0, 47.0, 'One by one.'],
  [47.1, 49.5, 'The last one said B3.'],
  [49.5, 52.0, 'This mall has no B3.'],
  [52.1, 54.5, 'I ran back to the office.'],
  [54.6, 56.4, 'CAM 07. Security office.'],
  [56.4, 58.3, 'Me. In the chair.\nAnd someone behind me.'],
];
const subEl = document.getElementById('sub'), titleEl = document.getElementById('title'), endEl = document.getElementById('end');
const cctvEl = document.getElementById('cctv'), camLabel = document.getElementById('camlabel'), camTime = document.getElementById('camtime');
function overlays(t, shot) {
  const s = SUBS.find(([a, b]) => t >= a && t < b);
  subEl.innerHTML = s ? s[2].replace(/\n/g, '<br>') : '';
  subEl.style.opacity = s ? String(Math.min(1, (t - s[0]) / 0.12)) : '0';
  titleEl.style.opacity = t < 3.3 ? String(Math.min(1, t / 0.2)) : '0';
  endEl.style.opacity = t > 59.45 ? String(clamp01((t - 59.45) / 0.15)) : '0';
  if (shot.cctv) {
    cctvEl.style.display = 'block'; camLabel.textContent = CAMS[shot.cctv].label;
    const secs = Math.floor(t + (shot.cctv === 'office' ? 7 * 60 + 12 : 0));
    camTime.textContent = `11-12-2026 00:${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  } else cctvEl.style.display = 'none';
}

// security cameras see in infrared: a flat fill that only exists for CCTV renders
function withIR(level, fn) {
  const h = hemi.intensity, hc = hemi.color.getHex(), hg = hemi.groundColor.getHex(), fd = scene.fog.density;
  hemi.intensity = Math.max(h, level); hemi.color.set(0xffffff); hemi.groundColor.set(0x8a8a8a); scene.fog.density = 0.004;
  fn();
  hemi.intensity = h; hemi.color.setHex(hc); hemi.groundColor.setHex(hg); scene.fog.density = fd;
}
// ---------------------------------------------------------------- render a frame
window.renderAt = function (t) {
  const shot = SHOTS.find((s) => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
  const local = t - shot.a, u = local / (shot.b - shot.a);
  worldState(t, shot.cctv === 'atrium' && t < 3 ? 20 : t);
  const darkNow = t > 8.6 || t < 3;
  grade.uniforms.uTime.value = t; dustMat.uniforms.uTime.value = t;
  let fov = 50, focus = 8, ap = 0.002, flashK = 0, monitors = shot.monitors;
  if (shot.black) {
    grade.uniforms.uFade.value = 1; overlays(t, shot); composer.render(); return;
  }
  grade.uniforms.uFade.value = 0;
  if (shot.cctv) {
    const c = CAMS[shot.cctv];
    camera.position.copy(c.pos); camera.up.set(0, 1, 0); camera.lookAt(c.look); camera.fov = c.fov;
    setVisibility({ ghostsOn: !!shot.ghosts, youOn: !!shot.you, lurkerOn: !!shot.lurker });
    if (shot.lurker) setPose(lurker, 'lurk', ease((t - 56.4) / 1.6));
    focus = 10; ap = 0;
    grade.uniforms.uCCTV.value = 1;
    const gl = shot.cctv === 'atrium' ? (local > 2.45 ? 1 : 0) + (local < 0.12 ? 1 : 0) : (local < 0.15 ? 1 : 0) + (t > 57.9 ? 0.6 : 0);
    grade.uniforms.uGlitch.value = gl;
  } else {
    setVisibility({});
    const r = shot.run(local, u);
    fov = r.fov; focus = r.focus; ap = r.ap; flashK = r.flash; camera.fov = fov; monitors = monitors || r.monitors;
    grade.uniforms.uCCTV.value = 0; grade.uniforms.uGlitch.value = 0;
  }
  camera.updateProjectionMatrix();
  flash.intensity = 16 * flashK * (t > 8.6 ? 1 : 0.0);
  const dir = camera.getWorldDirection(v3(0, 0, 0));
  dustMat.uniforms.camPos.value.copy(camera.position); dustMat.uniforms.camDir.value.copy(dir); dustMat.uniforms.flashOn.value = flash.intensity > 0 ? flashK : 0;
  bokeh.uniforms.focus.value = focus; bokeh.uniforms.aperture.value = ap;
  bloom.strength = darkNow ? 0.45 : 0.25;
  renderer.toneMappingExposure = shot.cctv ? 1.3 : darkNow ? 1.15 : 0.8;
  grade.uniforms.uGrain.value = darkNow ? 0.07 : 0.04;
  // live feeds on the office monitors
  if (monitors) {
    const vis = { ghostsOn: true };
    const prev = { y: you.root.visible, l: lurker.root.visible };
    setVisibility(vis);
    for (const m of monitorScreens) {
      m.mat.uniforms.uTime.value = t;
      withIR(1.6, () => { renderer.setRenderTarget(m.rt); renderer.render(scene, m.cam); });
    }
    renderer.setRenderTarget(null);
    setVisibility({ ghostsOn: !!shot.ghosts, youOn: prev.y, lurkerOn: prev.l });
  }
  if (shot.cctv) withIR(shot.cctv === 'office' ? 0.7 : 1.3, () => composer.render()); else composer.render();
  overlays(t, shot);
};

envLit = bakeEnv(1);
envDark = bakeEnv(20);
window.DURATION = DURATION; window.FPS = FPS;
document.fonts.ready.then(() => { window.renderAt(0); window.sceneReady = true; });
