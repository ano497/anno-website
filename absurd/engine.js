// Shared engine for the "absurd documentary" series.
// Tilt-shift miniature look: low-poly flat-shaded worlds, saturated colours,
// blurred top/bottom of frame. Each episode (eps/epNN.js + eps/epNN.json)
// builds a few "sets" and a list of shots; the engine handles camera, sky,
// lighting, captions, labels and post.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { initHumans, realPerson, loadGLB } from './humans.js';

export { THREE };
export const W = 720, H = 1280, FPS = 30, DURATION = 60;
const EP = new URLSearchParams(location.search).get('ep') || '01';

// ---------- renderer / scene ----------
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.domElement.style.width = '1080px'; renderer.domElement.style.height = '1920px';
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
document.getElementById('stage').prepend(renderer.domElement);
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(40, W / H, 0.5, 30000);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6b5a48, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);

// ---------- deterministic noise ----------
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const ease = (u) => u * u * (3 - 2 * u);
export const easeOut = (u) => 1 - (1 - u) * (1 - u);

// ---------- sky ----------
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    top: { value: new THREE.Color(0x3f7fd6) }, horizon: { value: new THREE.Color(0xcfe6ff) }, bottom: { value: new THREE.Color(0xa9c3dd) },
    sunDir: { value: new THREE.Vector3(0.3, 0.5, -0.8).normalize() }, sunColor: { value: new THREE.Color(0xfff2d0) }, sunSize: { value: 0.02 },
    stars: { value: 0 }, glow: { value: 0.35 },
  },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 top, horizon, bottom, sunColor, sunDir; uniform float sunSize, stars, glow; varying vec3 vDir;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
    void main(){
      vec3 d = normalize(vDir);
      float y = d.y;
      vec3 c = y > 0. ? mix(horizon, top, pow(clamp(y,0.,1.), 0.55)) : mix(horizon, bottom, clamp(-y*4.,0.,1.));
      float sd = dot(d, normalize(sunDir));
      c += sunColor * (smoothstep(1. - sunSize, 1. - sunSize*0.6, sd) * 4. + pow(max(sd,0.), 18.) * glow);
      if (stars > 0.) { vec3 q = floor(d * 420.); float s = step(0.9965, h(q)); c += vec3(s) * stars * smoothstep(0.0, 0.25, y) * (0.5 + h(q+1.)); }
      gl_FragColor = vec4(c, 1.);
    }`,
});
export const sky = new THREE.Mesh(new THREE.SphereGeometry(10000, 32, 16), skyMat);
sky.renderOrder = -10; scene.add(sky);

// ---------- sets ----------
const sets = {}; let curSet = null;
const pmrem = new THREE.PMREMGenerator(renderer);
export function defineSet(name, cfg = {}) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  sets[name] = { g, cfg, env: null }; return g;
}
const tmpC = new THREE.Color();
function applySet(name) {
  if (curSet === name) return; curSet = name;
  for (const [n, s] of Object.entries(sets)) s.g.visible = n === name;
  const c = sets[name].cfg;
  const sk = c.sky || {};
  skyMat.uniforms.top.value.set(sk.top ?? 0x3f7fd6); skyMat.uniforms.horizon.value.set(sk.horizon ?? 0xcfe6ff);
  skyMat.uniforms.bottom.value.set(sk.bottom ?? sk.horizon ?? 0xa9c3dd); skyMat.uniforms.sunColor.value.set(sk.sunColor ?? 0xfff2d0);
  skyMat.uniforms.sunSize.value = sk.sunSize ?? 0.02; skyMat.uniforms.stars.value = sk.stars ?? 0; skyMat.uniforms.glow.value = sk.glow ?? 0.35;
  const sd = new THREE.Vector3(...(c.sunDir || [0.4, 0.55, -0.6])).normalize();
  skyMat.uniforms.sunDir.value.copy(sk.sunDirSky ? new THREE.Vector3(...sk.sunDirSky).normalize() : sd);
  const f = c.fog; scene.fog = f ? new THREE.Fog(f[0], f[1], f[2]) : null;
  const hh = c.hemi || [0xcfe3ff, 0x6b5a48, 1.0]; hemi.color.set(hh[0]); hemi.groundColor.set(hh[1]); hemi.intensity = hh[2];
  const ss = c.sun || [0xffffff, 2.6]; sun.color.set(ss[0]); sun.intensity = ss[1];
  const ctr = new THREE.Vector3(...(c.shadowCenter || [0, 0, 0])), size = c.shadowSize || 200;
  sun.position.copy(ctr).addScaledVector(sd, size * 2); sun.target.position.copy(ctr);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -size; sc.right = sc.top = size; sc.near = 1; sc.far = size * 5; sc.updateProjectionMatrix();
  renderer.toneMappingExposure = c.exposure ?? 1.0;
  camera.near = c.near ?? 0.5; camera.far = c.far ?? 30000;
  // environment from the sky only (for water/glass reflections)
  if (!sets[name].env) {
    const s2 = new THREE.Scene(); const m = sky.clone(); m.position.set(0, 0, 0); s2.add(m);
    sets[name].env = pmrem.fromScene(s2, 0, 1, 20000).texture;
  }
  scene.environment = sets[name].env; scene.environmentIntensity = c.envIntensity ?? 0.6;
}

// ---------- materials / primitives ----------
const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...o }));
  return matCache.get(key);
}
export function mesh(geo, m, x = 0, y = 0, z = 0, parent) {
  const o = new THREE.Mesh(geo, typeof m === 'number' || typeof m === 'string' ? mat(m) : m);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; if (parent) parent.add(o); return o;
}
export const box = (w, h, d, m, x = 0, y = 0, z = 0, parent) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, parent);
export const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, parent, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y + h / 2, z, parent);
export const sphere = (r, m, x = 0, y = 0, z = 0, parent, seg = 12) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0)), m, x, y, z, parent);

// canvas texture with text (signs, billboards, labels)
export function textTex(lines, o = {}) {
  const w = o.w || 1024, h = o.h || 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = o.borderW || h * 0.06; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
  if (o.draw) o.draw(g, w, h);
  const L = Array.isArray(lines) ? lines : [lines];
  const fs = o.size || h * 0.6 / L.length;
  g.fillStyle = o.fg || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${o.weight || 'bold'} ${fs}px ${o.font || "'DejaVu Sans', sans-serif"}`;
  L.forEach((s, i) => g.fillText(s, w / 2, h / 2 + (i - (L.length - 1) / 2) * fs * 1.12, w * 0.94));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function sign(lines, w, h, o = {}, x = 0, y = 0, z = 0, parent) {
  const t = textTex(lines, { w: 1024, h: Math.round(1024 * h / w), ...o });
  const m = o.lit === false ? new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }) : new THREE.MeshBasicMaterial({ map: t, transparent: !o.bg, side: THREE.DoubleSide });
  if (o.lit !== false) m.color.setScalar(o.glow || 1.0);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); if (parent) parent.add(p); return p;
}

// heightfield terrain with vertex colours
export function terrain({ size = 400, sizeZ, seg = 160, segZ, height, color, x = 0, z = 0, parent, flat = true, rough = 0.95 }) {
  const g = new THREE.PlaneGeometry(size, sizeZ || size, seg, segZ || seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i) + x, Z = p.getZ(i) + z, Y = height(X, Z); p.setY(i, Y);
    const r = color(X, Y, Z); c.set(r); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough }));
  m.position.set(x, 0, z); m.receiveShadow = true; m.castShadow = true; if (parent) parent.add(m); return m;
}

// animated low-poly water (CPU waves; deterministic in t)
export function water({ size = 600, sizeZ, seg = 90, color = 0x2a7fb8, amp = 0.6, freq = 0.06, x = 0, y = 0, z = 0, parent, opacity = 1, rough = 0.18 }) {
  const g = new THREE.PlaneGeometry(size, sizeZ || size, seg, seg); g.rotateX(-Math.PI / 2);
  const base = g.attributes.position.array.slice();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.2, flatShading: true, transparent: opacity < 1, opacity }));
  m.position.set(x, y, z); m.receiveShadow = true; if (parent) parent.add(m);
  m.userData.update = (t) => {
    const a = g.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      const X = base[i] + x, Z = base[i + 2] + z;
      a[i + 1] = amp * (Math.sin(X * freq + t * 1.3) * 0.6 + Math.sin(Z * freq * 1.37 - t * 1.1) * 0.5 + Math.sin((X + Z) * freq * 2.3 + t * 2.1) * 0.25);
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  };
  m.userData.update(0); return m;
}

// ---------- people ----------
const SKIN = [0xf1c7a5, 0xd9a07a, 0xa86f4c, 0x6e452c, 0xe8b894];
const SHIRT = [0xd9483b, 0x3b6fd9, 0xf2c14e, 0x4caf6a, 0xf5f5f0, 0x8e5bd6, 0xff8a3d, 0x2e3440, 0x58c4d6, 0xe86fa8];
const PANTS = [0x2c3e66, 0x3b3b3b, 0x6b5a48, 0x1d2b4a, 0x8a8a80];
export function person(o = {}, parent) {
  const r = o.rand || Math.random;
  const pick = (a) => a[Math.floor(r() * a.length)];
  const g = new THREE.Group(); const s = o.scale || 1;
  const skin = o.skin ?? pick(SKIN), shirt = o.shirt ?? pick(SHIRT), pants = o.pants ?? pick(PANTS);
  const legL = new THREE.Group(), legR = new THREE.Group(), armL = new THREE.Group(), armR = new THREE.Group();
  legL.position.set(-0.11, 0.86, 0); legR.position.set(0.11, 0.86, 0); armL.position.set(-0.27, 1.42, 0); armR.position.set(0.27, 1.42, 0);
  mesh(new THREE.CapsuleGeometry(0.085, 0.66, 3, 8), pants, 0, -0.42, 0, legL);
  mesh(new THREE.CapsuleGeometry(0.085, 0.66, 3, 8), pants, 0, -0.42, 0, legR);
  mesh(new THREE.CapsuleGeometry(0.065, 0.52, 3, 8), shirt, 0, -0.3, 0, armL);
  mesh(new THREE.CapsuleGeometry(0.065, 0.52, 3, 8), shirt, 0, -0.3, 0, armR);
  const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), shirt, 0, 1.2, 0, g); torso.scale.set(1, 1, 0.65);
  const head = mesh(new THREE.SphereGeometry(0.15, 14, 10), skin, 0, 1.66, 0, g);
  if (o.hair !== false) { const hr = mesh(new THREE.SphereGeometry(0.155, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), o.hairColor ?? pick([0x2a1d14, 0x5a3a22, 0x111111, 0xc9a35a, 0x7a2f1c]), 0, 1.68, -0.01, g); hr.rotation.x = -0.25; }
  if (o.hat) { cyl(0.2, 0.2, 0.02, o.hat, 0, 1.76, 0, g); cyl(0.13, 0.14, 0.14, o.hat, 0, 1.77, 0, g); }
  g.add(legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR, head, torso };
  g.scale.setScalar(s * (0.92 + r() * 0.16));
  g.walk = (phase, amt = 1) => { const a = Math.sin(phase) * 0.5 * amt; legL.rotation.x = a; legR.rotation.x = -a; armL.rotation.x = -a * 0.8; armR.rotation.x = a * 0.8; };
  g.pose = ({ armL: al = 0, armR: ar = 0, armLz = 0, armRz = 0, head: hd = 0 } = {}) => { armL.rotation.x = al; armR.rotation.x = ar; armL.rotation.z = armLz; armR.rotation.z = armRz; head.rotation.x = hd; };
  if (parent) parent.add(g); return g;
}
// lots of people cheaply: two instanced meshes (body coloured by shirt, head)
let crowdGeo = null;
export function crowd(list, parent, o = {}) {
  if (!crowdGeo) {
    const legs = new THREE.CapsuleGeometry(0.17, 0.6, 2, 8); legs.translate(0, 0.47, 0); legs.scale(1, 1, 0.7);
    const tor = new THREE.CapsuleGeometry(0.22, 0.42, 2, 8); tor.translate(0, 1.2, 0); tor.scale(1, 1, 0.65);
    crowdGeo = { body: mergeGeometries([legs.toNonIndexed(), tor.toNonIndexed()]), head: new THREE.SphereGeometry(0.16, 10, 7) };
    crowdGeo.head.translate(0, 1.68, 0);
  }
  const n = list.length;
  const body = new THREE.InstancedMesh(crowdGeo.body, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), n);
  const head = new THREE.InstancedMesh(crowdGeo.head, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), n);
  body.castShadow = head.castShadow = o.shadow !== false; body.receiveShadow = true;
  const r = rng(o.seed || 7), c = new THREE.Color();
  list.forEach((p, i) => { body.setColorAt(i, c.set(p.color ?? SHIRT[Math.floor(r() * SHIRT.length)])); head.setColorAt(i, c.set(SKIN[Math.floor(r() * SKIN.length)])); });
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const set = (fn) => {
    list.forEach((p, i) => {
      const s = fn ? fn(p, i) : p; const bob = s.bob || 0;
      q.setFromAxisAngle(Y, s.ry || 0); S.setScalar(s.s || 1); P.set(s.x, s.y + bob, s.z);
      M.compose(P, q, S); body.setMatrixAt(i, M); head.setMatrixAt(i, M);
    });
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
    body.computeBoundingSphere(); head.computeBoundingSphere();
  };
  set();
  const g = new THREE.Group(); g.add(body, head); g.userData.set = set; if (parent) parent.add(g); return g;
}

// ---------- vehicles / props ----------
export function car(color = 0xd9483b, parent, o = {}) {
  const g = new THREE.Group(); const L = o.len || 4.2;
  box(1.8, 0.7, L, color, 0, 0.35, 0, g);
  box(1.6, 0.6, L * 0.5, color, 0, 1.05, -L * 0.05, g);
  box(1.62, 0.44, L * 0.46, mat(0x223344, { roughness: 0.2, metalness: 0.5 }), 0, 1.1, -L * 0.05, g);
  for (const [x, z] of [[-0.85, L * 0.32], [0.85, L * 0.32], [-0.85, -L * 0.32], [0.85, -L * 0.32]]) { const w = cyl(0.36, 0.36, 0.3, 0x1a1a1a, 0, 0, 0, g, 12); w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); }
  if (parent) parent.add(g); return g;
}
export function tree(parent, x = 0, z = 0, s = 1, o = {}) {
  const g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.scale.setScalar(s);
  cyl(0.18, 0.25, 1.6, o.trunk || 0x6b4a2f, 0, 0, 0, g, 6);
  if (o.round) sphere(1.3, o.leaf || 0x4f9a3c, 0, 2.6, 0, g, 7);
  else { mesh(new THREE.ConeGeometry(1.3, 2.4, 7), o.leaf || 0x3f8a3a, 0, 2.6, 0, g); mesh(new THREE.ConeGeometry(1.0, 1.8, 7), o.leaf || 0x3f8a3a, 0, 3.5, 0, g); }
  if (parent) parent.add(g); return g;
}
// points particle system positioned by a function of (i, t)
let dotTex = null;
function getDot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); dotTex = new THREE.CanvasTexture(c); return dotTex;
}
export function particles(n, fn, o = {}, parent) {
  const pos = new Float32Array(n * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: o.square ? null : getDot(), color: o.color ?? 0xffffff, size: o.size ?? 0.3, transparent: true, opacity: o.opacity ?? 0.8, depthWrite: false, sizeAttenuation: true, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  p.frustumCulled = false;
  p.userData.update = (t) => { const v = new THREE.Vector3(); for (let i = 0; i < n; i++) { fn(i, t, v); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; } g.attributes.position.needsUpdate = true; };
  p.userData.update(0); if (parent) parent.add(p); return p;
}

// ---------- city ----------
const winCache = {};
function windowTex(night, seed) {
  const key = (night ? 'n' : 'd') + seed; if (winCache[key]) return winCache[key];
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  const e = document.createElement('canvas'); e.width = 128; e.height = 128; const ge = e.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); ge.fillStyle = '#000'; ge.fillRect(0, 0, 128, 128);
  const r = rng(seed + 1);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = night ? '#2a3140' : (r() > 0.5 ? '#5f7fa6' : '#6f8fb5'); g.fillRect(x * 32 + 6, y * 32 + 7, 20, 18);
    if (night && r() > 0.45) { ge.fillStyle = ['#ffd68a', '#ffe9b8', '#fff2d6', '#ffc56b'][Math.floor(r() * 4)]; ge.fillRect(x * 32 + 6, y * 32 + 7, 20, 18); }
  }
  const t = new THREE.CanvasTexture(c), te = new THREE.CanvasTexture(e);
  t.wrapS = t.wrapT = te.wrapS = te.wrapT = THREE.RepeatWrapping; t.colorSpace = te.colorSpace = THREE.SRGBColorSpace;
  return (winCache[key] = { t, te });
}
export function city({ nx = 8, nz = 8, block = 34, road = 12, seed = 3, night = false, parent, hmin = 10, hmax = 70, x = 0, z = 0, skip = () => false, colors = [0xd9cfc0, 0xc8b8a6, 0xe8e2d6, 0xb9c4cc, 0xd6b7a0, 0xa9b4bd, 0xe0d2b4] } = {}) {
  const G = new THREE.Group(); G.position.set(x, 0, z); const r = rng(seed); const pitch = block + road;
  const W2 = nx * pitch, D2 = nz * pitch;
  box(W2 + road, 0.2, D2 + road, night ? 0x24262b : 0x55585e, 0, -0.2, 0, G).castShadow = false;
  const lots = [];
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const bx = -W2 / 2 + road / 2 + i * pitch + block / 2, bz = -D2 / 2 + road / 2 + k * pitch + block / 2;
    if (skip(bx + x, bz + z)) continue;
    box(block + 2, 0.35, block + 2, night ? 0x3a3c42 : 0xb8b4ab, bx, -0.15, bz, G).castShadow = false;
    const split = r() > 0.4 ? 2 : 1;
    for (let a = 0; a < split; a++) for (let b = 0; b < split; b++) {
      const w = block / split - 2, d = block / split - 2;
      const cxx = bx - block / 2 + (a + 0.5) * block / split, czz = bz - block / 2 + (b + 0.5) * block / split;
      const dist = Math.hypot(cxx + x, czz + z) / Math.max(W2, D2);
      const h = hmin + (hmax - hmin) * Math.pow(r(), 1.6) * (1.2 - Math.min(1, dist * 1.4));
      const { t, te } = windowTex(night, Math.floor(r() * 5));
      const mt = t.clone(), me = te.clone(); mt.needsUpdate = me.needsUpdate = true; mt.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 6))); me.repeat.copy(mt.repeat);
      const col = colors[Math.floor(r() * colors.length)];
      const side = new THREE.MeshStandardMaterial({ color: night ? new THREE.Color(col).multiplyScalar(0.5) : col, map: mt, roughness: 0.8, emissive: night ? 0xffffff : 0x000000, emissiveMap: night ? me : null, emissiveIntensity: night ? 1.1 : 0 });
      const top = mat(night ? 0x3a3c42 : 0x9a968e);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side]);
      m.position.set(cxx, h / 2, czz); m.castShadow = m.receiveShadow = true; G.add(m); lots.push({ x: cxx + x, z: czz + z, w, d, h });
    }
  }
  G.userData.lots = lots; G.userData.pitch = pitch; G.userData.size = [W2, D2];
  if (parent) parent.add(G); return G;
}

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.25, 0.4, 0.92); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTilt: { value: 0.7 }, uFocus: { value: 0.5 }, uBand: { value: 0.1 }, uSat: { value: 1.18 }, uFade: { value: 0 }, uFlash: { value: 0 }, uSeed: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTilt, uFocus, uBand, uSat, uFade, uFlash, uSeed; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      float d = max(abs(vUv.y - uFocus) - uBand, 0.);
      float r = uTilt * smoothstep(0., 0.35, d) * 9.;
      vec3 col = texture2D(tDiffuse, vUv).rgb; float wsum = 1.;
      if (r > 0.05) {
        for (int i = 0; i < 16; i++) {
          float a = float(i) * 2.39996; float rr = sqrt(float(i) + 0.5) / 4.;
          vec2 o = vec2(cos(a), sin(a)) * rr * r / uRes;
          col += texture2D(tDiffuse, vUv + o).rgb; wsum += 1.;
        }
        col /= wsum;
      }
      float l = dot(col, vec3(.299,.587,.114));
      col = mix(vec3(l), col, uSat);
      col = mix(col, col * col * (3. - 2. * col), 0.25);            // gentle S-curve
      col *= smoothstep(0.95, 0.35, length((vUv - 0.5) * vec2(0.9, 1.1)));
      col += (h(vUv * uRes + uSeed) - 0.5) * 0.025;
      col = mix(col, vec3(1.), uFlash);
      col *= 1. - uFade;
      gl_FragColor = vec4(col, 1.);
    }`,
});
composer.addPass(grade);

// ---------- overlays ----------
const $ = (id) => document.getElementById(id);
let DATA = null;
function overlays(t) {
  const T = DATA.titleUntil ?? 3.2;
  const ti = $('title'); ti.style.opacity = t < T ? String(clamp((T - t) / 0.35) * clamp(t / 0.25 + 0.6)) : '0';
  const sub = DATA.subs.find(([a, b]) => t >= a && t < b);
  const se = $('sub'); se.innerHTML = sub ? sub[2] : ''; se.style.opacity = sub ? String(clamp((t - sub[0]) / 0.12)) : '0';
  const lab = (DATA.labels || []).find(([a, b]) => t >= a && t < b);
  const le = $('label'); le.textContent = lab ? lab[2] : ''; le.style.opacity = lab ? String(clamp((t - lab[0]) / 0.25) * clamp((lab[1] - t) / 0.25)) : '0';
  const en = $('end'); if (DATA.end) { en.innerHTML = DATA.end[1]; en.style.opacity = String(clamp((t - DATA.end[0]) / 0.4)); }
}

// ---------- shots / main loop ----------
let SHOTS = [];
const v3 = (a) => new THREE.Vector3(...a);
export function shot(o) { SHOTS.push(o); return o; }
function runShot(s, t) {
  const u = clamp((t - s.t0) / (s.t1 - s.t0)); const e = (s.ease || ease)(u);
  applySet(s.set);
  const p0 = v3(s.from), p1 = v3(s.to || s.from), l0 = v3(s.look), l1 = v3(s.lookTo || s.look);
  camera.position.lerpVectors(p0, p1, e);
  camera.up.set(0, 1, 0);
  camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, e));
  if (s.roll) camera.rotateZ(lerp(s.roll[0], s.roll[1] ?? s.roll[0], e));
  camera.fov = lerp(s.fov ?? 40, s.fovTo ?? s.fov ?? 40, e); camera.updateProjectionMatrix();
  const c = sets[s.set].cfg;
  sets[s.set].g.traverse((o) => o.userData.update && o.userData.update(t));
  if (c.update) c.update(t, u, s);
  if (s.update) s.update(t, u, e);
  grade.uniforms.uTilt.value = s.tilt ?? c.tilt ?? 0.7; grade.uniforms.uSat.value = typeof s.sat === 'function' ? s.sat(t) : (s.sat ?? c.sat ?? 1.18); grade.uniforms.uFocus.value = s.focus ?? 0.5; grade.uniforms.uBand.value = s.band ?? 0.1;
  sky.position.copy(camera.position);
}
window.DURATION = DURATION; window.FPS = FPS;
window.renderAt = (t) => {
  const s = SHOTS.find((x) => t >= x.t0 && t < x.t1) || SHOTS[SHOTS.length - 1];
  runShot(s, t);
  const fe = DATA.fadeOut ?? 59.2;
  grade.uniforms.uFade.value = Math.max(clamp(1 - t / 0.4), clamp((t - fe) / 0.6), s.fade ? s.fade(t) : 0);
  grade.uniforms.uFlash.value = s.flash ? s.flash(t) : 0;
  grade.uniforms.uSeed.value = (t * 30) % 97;
  overlays(t);
  composer.render();
};

const DIR = `./eps/ep${EP}`;
DATA = await (await fetch(`${DIR}.json`)).json();
$('titlePov').innerHTML = DATA.title[0]; $('titleMain').innerHTML = DATA.title[1];
const ep = await import(`${DIR}.js`);
const CLIPNAMES = ep.usesHumans ? await initHumans() : [];
await ep.build({ realPerson, loadGLB, CLIPNAMES, skyMat, hemi, sun, renderer, city, THREE, scene, camera, defineSet, shot, mat, mesh, box, cyl, sphere, sign, textTex, terrain, water, person, crowd, car, tree, particles, rng, fbm, vnoise, clamp, lerp, smooth, ease, easeOut, DATA });
SHOTS.sort((a, b) => a.t0 - b.t0);
window.renderAt(0.5);
window.sceneReady = true;
