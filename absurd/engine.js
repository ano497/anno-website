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
const SKIN = [0xf1c7a5, 0xd9a07a, 0xa86f4c, 0x6e452c, 0xe8b894, 0xc68c64];
const SHIRT = [0xd9483b, 0x3b6fd9, 0xf2c14e, 0x4caf6a, 0xf5f5f0, 0x8e5bd6, 0xff8a3d, 0x2e3440, 0x58c4d6, 0xe86fa8, 0x9a6b4a, 0x6b7a8f];
const PANTS = [0x2c3e66, 0x3b3b3b, 0x6b5a48, 0x1d2b4a, 0x8a8a80, 0x4a5568, 0xc2b28f];
const HAIR = [0x2a1d14, 0x5a3a22, 0x111111, 0xc9a35a, 0x7a2f1c, 0x3a2a1e, 0x8a8a8a];
const smat = (c) => mat(c, { flatShading: false, roughness: 0.78 });
// shared smooth body-part geometry (built once)
const PG = (() => {
  const torso = new THREE.LatheGeometry([[0.0, 0.88], [0.15, 0.9], [0.165, 1.02], [0.19, 1.26], [0.2, 1.36], [0.17, 1.45], [0.07, 1.49], [0.0, 1.5]].map(([r, y]) => new THREE.Vector2(r, y)), 18);
  torso.scale(1, 1, 0.62);
  const hips = new THREE.SphereGeometry(1, 16, 10); hips.scale(0.155, 0.11, 0.105); hips.translate(0, 0.9, 0);
  const leg = new THREE.CapsuleGeometry(0.07, 0.7, 4, 12); leg.translate(0, -0.42, 0);
  const shoe = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); shoe.scale(0.07, 0.08, 0.14); shoe.translate(0, -0.845, 0.04);
  const upper = new THREE.CapsuleGeometry(0.058, 0.26, 4, 10); upper.translate(0, -0.15, 0);
  const fore = new THREE.CapsuleGeometry(0.046, 0.24, 4, 10); fore.translate(0, -0.45, 0);
  const hand = new THREE.SphereGeometry(0.05, 10, 8); hand.scale(0.9, 1.2, 0.7); hand.translate(0, -0.62, 0);
  const neck = new THREE.CylinderGeometry(0.05, 0.055, 0.12, 10); neck.translate(0, 1.52, 0);
  const head = new THREE.SphereGeometry(0.115, 20, 14); head.scale(0.9, 1.1, 1.0);
  const hair = new THREE.SphereGeometry(0.122, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52); hair.scale(0.93, 1.1, 1.05);
  const hairLong = new THREE.CapsuleGeometry(0.1, 0.16, 4, 10); hairLong.scale(1.05, 1, 0.55); hairLong.translate(0, -0.08, -0.06);
  const eye = new THREE.SphereGeometry(0.014, 8, 6);
  const nose = new THREE.SphereGeometry(0.018, 8, 6); nose.scale(0.8, 1, 1.2);
  return { torso, hips, leg, shoe, upper, fore, hand, neck, head, hair, hairLong, eye, nose };
})();
export function person(o = {}, parent) {
  const r = o.rand || Math.random;
  const pick = (a) => a[Math.floor(r() * a.length)];
  const g = new THREE.Group(); const s = o.scale || 1;
  const skin = o.skin ?? pick(SKIN), shirt = o.shirt ?? pick(SHIRT), pants = o.pants ?? pick(PANTS);
  const shortSleeve = o.shortSleeve ?? r() > 0.55, longHair = o.longHair ?? r() > 0.6;
  const M = (geo, c, parent2, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, typeof c === 'number' ? smat(c) : c); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent2.add(m); return m; };
  const legL = new THREE.Group(), legR = new THREE.Group(), armL = new THREE.Group(), armR = new THREE.Group();
  legL.position.set(-0.095, 0.88, 0); legR.position.set(0.095, 0.88, 0); armL.position.set(-0.222, 1.42, 0); armR.position.set(0.222, 1.42, 0);
  for (const L of [legL, legR]) { M(PG.leg, pants, L); M(PG.shoe, o.shoes ?? 0x2a2522, L); }
  for (const A of [armL, armR]) { M(PG.upper, shirt, A); M(PG.fore, shortSleeve ? skin : shirt, A); M(PG.hand, skin, A); }
  armL.rotation.z = 0.06; armR.rotation.z = -0.06;
  const torso = M(PG.torso, shirt, g); M(PG.hips, pants, g); M(PG.neck, skin, g);
  const head = new THREE.Group(); head.position.set(0, 1.635, 0); g.add(head);
  M(PG.head, skin, head);
  for (const x of [-0.038, 0.038]) M(PG.eye, 0x1a1a1a, head, x, 0.015, 0.098);
  M(PG.nose, skin, head, 0, -0.012, 0.11);
  if (o.hair !== false) { const hc = o.hairColor ?? pick(HAIR); const hr = M(PG.hair, hc, head, 0, 0.012, -0.012); hr.rotation.x = -0.22; if (longHair) M(PG.hairLong, hc, head, 0, 0, 0); }
  if (o.hat) { const hm = smat(o.hat); M(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 18), hm, head, 0, 0.1, 0.02); M(new THREE.CylinderGeometry(0.11, 0.12, 0.12, 18), hm, head, 0, 0.15, 0); }
  g.add(legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR, head, torso };
  g.scale.setScalar(s * (0.92 + r() * 0.16));
  g.walk = (phase, amt = 1) => { const a = Math.sin(phase) * 0.45 * amt; legL.rotation.x = a; legR.rotation.x = -a; armL.rotation.x = -a * 0.7; armR.rotation.x = a * 0.7; torso.position.y = Math.abs(Math.cos(phase)) * 0.015 * amt; };
  g.pose = ({ armL: al = 0, armR: ar = 0, armLz = 0.06, armRz = -0.06, head: hd = 0 } = {}) => { armL.rotation.x = al; armR.rotation.x = ar; armL.rotation.z = armLz; armR.rotation.z = armRz; head.rotation.x = hd; };
  if (parent) parent.add(g); return g;
}
// lots of people cheaply: four instanced meshes (shirt, pants, skin, hair), same silhouette as person()
let crowdGeo = null;
export function crowd(list, parent, o = {}) {
  if (!crowdGeo) {
    const at = (geo, x, y, z, rz = 0) => { const q = geo.clone(); if (rz) q.rotateZ(rz); q.translate(x, y, z); return q.toNonIndexed(); };
    const ni = (q) => { const m = q.toNonIndexed(); m.deleteAttribute('uv'); return m; };
    const strip = (q) => { q.deleteAttribute('uv'); return q; };
    const parts = (arr) => mergeGeometries(arr.map((q) => strip(q.index ? q.toNonIndexed() : q)));
    crowdGeo = {
      shirt: parts([PG.torso.clone(), at(PG.upper, -0.222, 1.42, 0, 0.08), at(PG.upper, 0.222, 1.42, 0, -0.08)]),
      pants: parts([PG.hips.clone(), at(PG.leg, -0.095, 0.88, 0), at(PG.leg, 0.095, 0.88, 0)]),
      skin: parts([PG.neck.clone(), at(PG.head, 0, 1.635, 0), at(PG.fore, -0.222, 1.42, 0, 0.08), at(PG.fore, 0.222, 1.42, 0, -0.08), at(PG.hand, -0.222, 1.42, 0, 0.08), at(PG.hand, 0.222, 1.42, 0, -0.08)]),
      hair: parts([(() => { const q = PG.hair.clone(); q.rotateX(-0.22); q.translate(0, 1.647, -0.012); return q; })(), at(PG.shoe, -0.095, 0.88, 0), at(PG.shoe, 0.095, 0.88, 0)]),
    };
  }
  const n = list.length; const r = rng(o.seed || 7), c = new THREE.Color();
  const mk = (geo) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n); m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; };
  const meshes = { shirt: mk(crowdGeo.shirt), pants: mk(crowdGeo.pants), skin: mk(crowdGeo.skin), hair: mk(crowdGeo.hair) };
  list.forEach((p, i) => {
    meshes.shirt.setColorAt(i, c.set(p.color ?? SHIRT[Math.floor(r() * SHIRT.length)]));
    meshes.pants.setColorAt(i, c.set(PANTS[Math.floor(r() * PANTS.length)]));
    meshes.skin.setColorAt(i, c.set(SKIN[Math.floor(r() * SKIN.length)]));
    meshes.hair.setColorAt(i, c.set(HAIR[Math.floor(r() * HAIR.length)]));
  });
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const all = Object.values(meshes);
  const set = (fn) => {
    list.forEach((p, i) => {
      const s = fn ? fn(p, i) : p; const bob = s.bob || 0;
      q.setFromAxisAngle(Y, s.ry || 0); S.setScalar((s.s || 1) * (0.93 + ((i * 0.618) % 1) * 0.14)); P.set(s.x, s.y + bob, s.z);
      M.compose(P, q, S); for (const m of all) m.setMatrixAt(i, M);
    });
    for (const m of all) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
  };
  set();
  const g = new THREE.Group(); g.add(...all); g.userData.set = set; if (parent) parent.add(g); return g;
}

// ---------- vehicles / props ----------
const carGeo = {};
function carGeometry(L) {
  if (carGeo[L]) return carGeo[L];
  const W = 1.78, h = L / 4.2;
  const prof = [[-L / 2, 0.32], [-L / 2 + 0.05, 0.82 * h], [-L * 0.36, 0.92 * h], [-L * 0.27, 1.36 * h], [-L * 0.02, 1.38 * h], [L * 0.17, 0.95 * h], [L * 0.44, 0.84 * h], [L / 2, 0.66 * h], [L / 2 - 0.02, 0.32]];
  const sh = new THREE.Shape(); prof.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
  const body = new THREE.ExtrudeGeometry(sh, { depth: W - 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 4 });
  body.translate(0, 0, -(W - 0.16) / 2); body.rotateY(-Math.PI / 2);
  const win = new THREE.Shape(); [[-L * 0.335, 0.97 * h], [-L * 0.26, 1.3 * h], [-L * 0.03, 1.31 * h], [L * 0.14, 0.99 * h]].forEach(([x, y], i) => (i ? win.lineTo(x, y) : win.moveTo(x, y))); win.closePath();
  const glass = new THREE.ExtrudeGeometry(win, { depth: W + 0.005, bevelEnabled: false }); glass.translate(0, 0, -(W + 0.005) / 2); glass.rotateY(-Math.PI / 2);
  return (carGeo[L] = { body, glass, h });
}
export function car(color = 0xd9483b, parent, o = {}) {
  const g = new THREE.Group(); const L = o.len || 4.2; const { body, glass, h } = carGeometry(L);
  const b = new THREE.Mesh(body, mat(color, { flatShading: false, roughness: 0.35, metalness: 0.35 })); b.castShadow = b.receiveShadow = true; g.add(b);
  const gl = new THREE.Mesh(glass, mat(0x1c2633, { flatShading: false, roughness: 0.12, metalness: 0.6 })); gl.castShadow = true; g.add(gl);
  // windshield + rear window panes laid on the slopes
  const pane = (z0, y0, z1, y1) => { const len = Math.hypot(z1 - z0, y1 - y0); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, len * 0.92), mat(0x1c2633, { flatShading: false, roughness: 0.12, metalness: 0.6, side: THREE.DoubleSide })); p.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2); p.rotation.x = -Math.atan2(y1 - y0, z1 - z0) + Math.PI / 2 * 0; p.lookAt(0, (y0 + y1) / 2 + (z1 - z0), (z0 + z1) / 2 - (y1 - y0)); g.add(p); return p; };
  pane(L * 0.17 + 0.02, 0.95 * h + 0.05, -L * 0.02 + 0.02, 1.38 * h + 0.05);
  pane(-L * 0.27 - 0.02, 1.36 * h + 0.05, -L * 0.36 - 0.02, 0.92 * h + 0.05);
  const tire = smat(0x1a1a1a), rim = mat(0xc8ccd2, { flatShading: false, roughness: 0.3, metalness: 0.8 });
  for (const [x, z] of [[-0.82, L * 0.31], [0.82, L * 0.31], [-0.82, -L * 0.31], [0.82, -L * 0.31]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20), tire); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); w.castShadow = true; g.add(w);
    const rr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 16), rim); rr.rotation.z = Math.PI / 2; rr.position.set(x * 1.005, 0.34, z); g.add(rr);
  }
  const hl = new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff2c8, emissiveIntensity: 0.8 }), tl = new THREE.MeshStandardMaterial({ color: 0xb01818, emissive: 0xc01818, emissiveIntensity: 0.6 });
  for (const x of [-0.6, 0.6]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.05), hl); a.position.set(x, 0.62 * h, -L / 2 - 0.06); g.add(a); const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.05), tl); c2.position.set(x, 0.72 * h, L / 2 + 0.06); g.add(c2); }
  // the front of the car faces -z (matches the old box car's layout closely enough)
  if (parent) parent.add(g); return g;
}
// many cars cheaply: body (instance colour), glass and wheels as three instanced meshes
let wheelGeo = null;
export function carsInstanced(list, parent, o = {}) {
  const L = 4.2; const { body, glass } = carGeometry(L); const n = list.length;
  if (!wheelGeo) { const w = []; for (const [x, z] of [[-0.82, L * 0.31], [0.82, L * 0.31], [-0.82, -L * 0.31], [0.82, -L * 0.31]]) { const c = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); c.rotateZ(Math.PI / 2); c.translate(x, 0.34, z); w.push(c.toNonIndexed()); } wheelGeo = mergeGeometries(w); }
  const B = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.35 }), n);
  const G = new THREE.InstancedMesh(glass, new THREE.MeshStandardMaterial({ color: 0x1c2633, roughness: 0.12, metalness: 0.6 }), n);
  const Wh = new THREE.InstancedMesh(wheelGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }), n);
  const cols = o.colors || [0xd9483b, 0x3b6fd9, 0xf5f5f0, 0x2e3440, 0xf2c14e, 0x4caf6a, 0x9aa0a8, 0x8e1f2a, 0x1d2b4a];
  const r = rng(o.seed || 5), c = new THREE.Color();
  list.forEach((p, i) => B.setColorAt(i, c.set(p.color ?? cols[Math.floor(r() * cols.length)])));
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const all = [B, G, Wh]; for (const m of all) { m.castShadow = o.shadow !== false; m.receiveShadow = true; }
  const set = (fn) => { list.forEach((p, i) => { const s2 = fn ? fn(p, i) : p; q.setFromAxisAngle(Y, s2.ry || 0); P.set(s2.x, s2.y || 0, s2.z); S.setScalar(s2.s ?? 1); M.compose(P, q, S); for (const m of all) m.setMatrixAt(i, M); }); for (const m of all) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } };
  set(); const g = new THREE.Group(); g.add(...all); g.userData.set = set; if (parent) parent.add(g); return g;
}
export function tree(parent, x = 0, z = 0, s = 1, o = {}) {
  const g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.scale.setScalar(s);
  const r = rng(Math.floor(x * 13 + z * 7 + 99));
  const bark = mat(o.trunk || 0x6b4a2f, { flatShading: false, roughness: 0.95 });
  const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 2.0, 10), bark); tk.position.y = 1.0; tk.castShadow = true; g.add(tk);
  const base = new THREE.Color(o.leaf || 0x3f8a3a);
  if (o.round) {
    for (let i = 0; i < 7; i++) {
      const c = base.clone().offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.12);
      const rr = 0.75 + r() * 0.55; const a = i / 7 * 6.28 + r();
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rr, 2), mat(c.getHex(), { flatShading: false, roughness: 0.9 }));
      b.position.set(i ? Math.cos(a) * 0.7 : 0, 2.6 + (i ? (r() - 0.3) * 0.9 : 0.4), i ? Math.sin(a) * 0.7 : 0); b.castShadow = b.receiveShadow = true; g.add(b);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const c = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.08);
      const cn = new THREE.Mesh(new THREE.ConeGeometry(1.35 - i * 0.28, 1.5, 12), mat(c.getHex(), { flatShading: false, roughness: 0.9 })); cn.position.y = 2.0 + i * 0.75; cn.castShadow = cn.receiveShadow = true; g.add(cn);
    }
  }
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

// ---------- flat 2D cartoon guy (canvas sprite billboard) ----------
export function guy(o = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const H = o.height || 1.9;
  const geo = new THREE.PlaneGeometry(H / 2, H); geo.translate(0, H / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, fog: false }));
  m.renderOrder = 5;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(H * 0.2, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; shadow.scale.y = 0.45;
  const G = new THREE.Group(); G.add(m, shadow);
  const INK = '#1b1b1f', job = o.job || 'plain';
  const st = { talk: 0, pose: 'idle', walk: 0, blink: 0, look: 0, mood: 'smug', flip: false };
  G.state = st;
  function line(x1, y1, x2, y2, w = 15) { g.strokeStyle = INK; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function draw(v) {
    g.clearRect(0, 0, 512, 1024);
    if (st.flip) { g.save(); g.translate(512, 0); g.scale(-1, 1); }
    const bob = st.walk ? Math.abs(Math.sin(v * 9)) * 8 : Math.sin(v * 2.2) * 3;
    const sw = st.walk ? Math.sin(v * 9) * 0.45 : 0;
    // legs
    const hipY = 690 - bob;
    line(232, hipY, 232 + Math.sin(sw) * 120, 985); line(280, hipY, 280 - Math.sin(sw) * 120, 985);
    g.fillStyle = INK; for (const [x] of [[232 + Math.sin(sw) * 120], [280 - Math.sin(sw) * 120]]) { g.beginPath(); g.ellipse(x + 14, 988, 30, 14, 0, 0, Math.PI * 2); g.fill(); }
    // arms (behind body for idle)
    const sh = 520 - bob; const pose = st.pose;
    const arm = (side) => { const x0 = 256 + side * 92; let x1, y1;
      if (pose === 'point' && side > 0) { x1 = x0 + 150; y1 = sh - 120; }
      else if (pose === 'shrug') { x1 = x0 + side * 110; y1 = sh - 70; }
      else if (pose === 'wave' && side > 0) { x1 = x0 + 90 + Math.sin(v * 10) * 30; y1 = sh - 190; }
      else if (pose === 'explain' && side > 0) { x1 = x0 + 120; y1 = sh + 40 + Math.sin(v * 5) * 25; }
      else { x1 = x0 + side * 30; y1 = sh + 190; }
      line(x0, sh, x1, y1, 14); g.fillStyle = INK; g.beginPath(); g.arc(x1, y1, 13, 0, Math.PI * 2); g.fill(); };
    arm(-1); arm(1);
    // body / outfit
    const o2 = o.outfit || { body: '#3aa9a0', trim: '#1b1b1f' };
    rr(162, 470 - bob, 188, 240, 46); g.fillStyle = o2.body; g.fill(); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
    if (o2.stripes) { g.save(); rr(162, 470 - bob, 188, 240, 46); g.clip(); g.fillStyle = o2.stripes; for (let y = 490; y < 720; y += 34) g.fillRect(150, y - bob, 220, 14); g.restore(); rr(162, 470 - bob, 188, 240, 46); g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); }
    if (o2.straps) { g.fillStyle = o2.straps; g.fillRect(196, 470 - bob, 18, 240); g.fillRect(298, 470 - bob, 18, 240); }
    if (o2.buttons) { g.fillStyle = o2.buttons; for (const y of [545, 600, 655]) { g.beginPath(); g.arc(256, y - bob, 8, 0, 7); g.fill(); } }
    if (o2.collar) { g.fillStyle = o2.collar; g.beginPath(); g.moveTo(206, 470 - bob); g.lineTo(256, 525 - bob); g.lineTo(306, 470 - bob); g.closePath(); g.fill(); g.lineWidth = 6; g.stroke(); }
    if (o2.tie) { g.fillStyle = o2.tie; g.beginPath(); g.moveTo(256, 500 - bob); g.lineTo(240, 580 - bob); g.lineTo(256, 610 - bob); g.lineTo(272, 580 - bob); g.closePath(); g.fill(); }
    if (o2.wings) { g.fillStyle = o2.wings; rr(276, 540 - bob, 52, 14, 6); g.fill(); }
    if (o2.bandana) { g.fillStyle = o2.bandana; g.beginPath(); g.moveTo(216, 470 - bob); g.lineTo(256, 520 - bob); g.lineTo(296, 470 - bob); g.closePath(); g.fill(); }
    // head
    const hx = 256, hy = 330 - bob; const R = 132;
    g.fillStyle = '#fbfaf6'; g.beginPath(); g.arc(hx, hy, R, 0, Math.PI * 2); g.fill(); g.lineWidth = 10; g.strokeStyle = INK; g.stroke();
    // hair tuft on the side
    g.fillStyle = o.hair || '#7a4a26'; g.beginPath(); g.arc(hx - 96, hy - 30, 46, Math.PI * 0.55, Math.PI * 1.6); g.closePath(); g.fill();
    // eyes (smug half-lids) + blink
    const blink = (v % 3.7) < 0.12;
    const lk = st.look * 10;
    for (const ex of [hx - 52 + lk, hx + 46 + lk]) {
      if (blink) line(ex - 26, hy - 6, ex + 22, hy - 6, 10);
      else { line(ex - 26, hy - 22, ex + 24, hy - 14, 11); g.fillStyle = INK; g.beginPath(); g.ellipse(ex + 2, hy - 2, 13, 11, 0, 0, Math.PI * 2); g.fill(); }
    }
    // mouth: smirk, opens with the voice
    const t = Math.min(1, st.talk);
    if (t > 0.08) { g.fillStyle = '#3a1416'; g.beginPath(); g.ellipse(hx + 6, hy + 62, 26, 6 + t * 26, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); }
    else { g.lineWidth = 9; g.strokeStyle = INK; g.beginPath(); g.moveTo(hx - 22, hy + 60); g.quadraticCurveTo(hx + 10, hy + 78, hx + 38, hy + 50); g.stroke(); }
    // hats
    const hat = o.hat;
    if (hat === 'pilot') { g.fillStyle = '#1e2c4f'; rr(hx - 120, hy - 190, 240, 80, 30); g.fill(); g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); g.fillStyle = INK; rr(hx - 140, hy - 118, 280, 22, 11); g.fill(); g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(hx, hy - 152, 18, 0, 7); g.fill(); rr(hx - 90, hy - 128, 180, 10, 5); g.fill(); }
    if (hat === 'mechanic') { g.fillStyle = '#d9483b'; g.beginPath(); g.arc(hx, hy - 92, 120, Math.PI, 0); g.closePath(); g.fill(); g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); g.fillStyle = '#b23a2f'; rr(hx + 20, hy - 104, 150, 26, 12); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx - 10, hy - 150, 20, 0, 7); g.fill(); }
    if (hat === 'sailor') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(hx, hy - 110, 150, 34, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); rr(hx - 100, hy - 190, 200, 80, 20); g.fill(); g.stroke(); g.fillStyle = '#1e2c4f'; g.fillRect(hx - 100, hy - 140, 200, 22); }
    if (hat === 'conductor') { g.fillStyle = '#2a4f8f'; rr(hx - 125, hy - 185, 250, 90, 40); g.fill(); g.strokeStyle = INK; g.lineWidth = 9; g.stroke(); g.fillStyle = '#ffffff'; for (let x = -100; x < 120; x += 36) g.fillRect(hx + x, hy - 180, 12, 82); g.fillStyle = INK; rr(hx - 135, hy - 104, 270, 20, 10); g.fill(); }
    if (st.flip) g.restore();
    tex.needsUpdate = true;
  }
  G.userData.update = (v) => { m.quaternion.copy(camera.quaternion); draw(v); };
  draw(0); return G;
}

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.25, 0.4, 0.92); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTilt: { value: 0.7 }, uFocus: { value: 0.5 }, uBand: { value: 0.1 }, uSat: { value: 1.18 }, uFade: { value: 0 }, uFlash: { value: 0 }, uTint: { value: 0 }, uTintC: { value: new THREE.Vector3(1, 1, 1) }, uSeed: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTilt, uFocus, uBand, uSat, uFade, uFlash, uSeed, uTint; uniform vec3 uTintC; uniform vec2 uRes; varying vec2 vUv;
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
      col = mix(col, min(vec3(1.), col * uTintC * 1.7 + uTintC * 0.12), uTint);
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
window.FPS = FPS;
// ---- "fast" edit mode: hook flash-forward, sped-up story, word captions, snap zooms ----
let FAST = null, VO = null, VOJSON = null;
const S0 = () => DATA.titleUntil ?? 3.2;
const toScene = (v) => v < FAST.H ? FAST.hook.t + v * 0.5 : S0() + (v - FAST.H) * FAST.K;
const toVideo = (t) => FAST.H + (t - S0()) / FAST.K;
function capWords(v) {
  // current subtitle + word timing (from the voice track if available, else estimated)
  const lines = VO || DATA.subs.map((x) => ({ start: toVideo(x[0]) + 0.06, dur: (x[1] - x[0]) / FAST.K * 0.88, text: x[2] }));
  const all = FAST.hook.say ? [{ start: 0.08, dur: FAST.H - 0.25, text: FAST.hook.say }, ...lines] : lines;
  let cur = null; for (const l of all) if (v >= l.start - 0.05 && v < l.start + l.dur + 0.35) cur = l;
  if (!cur) return null;
  const words = cur.text.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean);
  const w = words.map((x) => x.length + 2), tot = w.reduce((p, c) => p + c, 0);
  let acc = 0; const times = w.map((x) => { const t0 = cur.start + acc / tot * cur.dur; acc += x; return t0; });
  let wi = 0; times.forEach((t0, i) => { if (v >= t0) wi = i; });
  // chunks of up to 3 words / 16 chars
  const chunks = []; let c = [];
  const TT = FAST.style === 'tiktok' || FAST.style === 'why' || FAST.style === 'retain';
  words.forEach((x, i) => { const cur = c.map((k) => words[k]).join(' ');
    const brk = TT ? (c.length && (c.length >= 2 || cur.length + x.length > 8 || (cur.length > 3 && x.length > 3))) : (c.length && (c.length >= 3 || cur.length + x.length > 16));
    if (brk) { chunks.push(c); c = []; } c.push(i); });
  if (c.length) chunks.push(c);
  const ch = chunks.find((k) => k.includes(wi));
  return { html: ch.map((k) => `<span class="${k === wi ? 'on' : ''}">${words[k]}</span>`).join(' '), since: v - times[ch[0]] };
}
function fastOverlays(v) {
  $('title').style.opacity = '0'; $('sub').style.opacity = '0';
  if (FAST.endCard) { const ec = $('end'); const ve = window.DURATION - FAST.endCard.dur; ec.innerHTML = FAST.endCard.text; ec.style.opacity = v >= ve ? '1' : '0'; ec.style.transform = `scale(${1 + 0.15 * Math.exp(-(v - ve) * 8)})`; }
  if (FAST.style === 'why') { const tb = $('tbox'); tb.innerHTML = `<span>${DATA.titleBox}</span>`; tb.style.opacity = '1'; }
  const hk = $('hook'); hk.innerHTML = FAST.hook.text; hk.style.opacity = v < FAST.H ? '1' : '0';
  hk.style.transform = `scale(${1 + 0.12 * Math.exp(-v * 7)})`;
  const cw = capWords(v); const ce = $('cap');
  if (cw && v >= FAST.H - 0.02 || (cw && !FAST.hook.text)) { ce.innerHTML = cw.html; ce.style.opacity = '1'; ce.style.transform = `translateX(-50%) scale(${1 + (FAST.style !== 'fast' && FAST.style ? 0.1 : 0.18) * Math.exp(-cw.since * (FAST.style === 'tiktok' ? 30 : 18))})`; } else ce.style.opacity = '0';
  const t = toScene(v);
  const lab = v >= FAST.H && (DATA.labels || []).find(([a, b]) => t >= a && t < b);
  const le = $('label'); le.textContent = lab ? lab[2] : ''; le.style.opacity = lab ? '1' : '0';
}
window.renderAt = (v) => {
  const t = FAST ? toScene(v) : v;
  const s = SHOTS.find((x) => t >= x.t0 && t < x.t1) || SHOTS[SHOTS.length - 1];
  runShot(s, t);
  if (FAST) {
    const cutV = v < FAST.H ? 0 : Math.max(FAST.H, toVideo(s.t0));
    const k = clamp((v - cutV) / 0.24); let fovMul = 1 + 0.16 * (1 - easeOut(k)), shake = 0, flash = 0;
    if (FAST.style === 'retain') {
      const shotLen = Math.max(0.5, Math.min(toVideo(s.t1), window.DURATION) - cutV); const uu = clamp((v - cutV) / shotLen);
      fovMul = (1 + 0.07 * (1 - easeOut(clamp((v - cutV) / 0.2)))) * (1 - 0.08 * uu);
      const since = v - cutV; grade.uniforms.uTint.value = since < 0.07 ? 0.3 * (1 - since / 0.07) : 0; grade.uniforms.uTintC.value.set(1, 1, 1);
    }
    if (FAST.style === 'tiktok') {
      const seg = Math.floor((v - cutV) / 0.62); fovMul = [1, 0.8, 0.9, 0.74][seg % 4];  // hard punch-in jump cuts
      const ci = Math.round(cutV * 10); const since = v - cutV; const segSince = (v - cutV) - seg * 0.62;
      const tint = [[0.55, 1.0, 0.45], [1.0, 0.62, 0.3], [1, 1, 1]][ci % 3];
      const amt = since < 0.1 ? 0.55 * (1 - since / 0.1) : (seg > 0 && segSince < 0.05 && seg % 3 === 2 ? 0.35 : 0);
      grade.uniforms.uTintC.value.set(...tint); grade.uniforms.uTint.value = amt;
    }
    for (const i of FAST.punch || []) { const vs = toVideo(DATA.subs[i][0]); if (v >= vs) { const p = Math.exp(-(v - vs) * 5); fovMul *= 1 - 0.1 * p; shake = Math.max(shake, p); flash = Math.max(flash, 0.45 * Math.exp(-(v - vs) * 16)); } }
    if (v < 0.12) flash = Math.max(flash, 0.6 * (1 - v / 0.12));
    if (FAST.style === 'why') { fovMul = 1; shake = 0; flash = 0; }
    camera.fov *= fovMul; camera.updateProjectionMatrix();
    if (shake > 0.02) { camera.rotateZ(Math.sin(v * 71) * 0.025 * shake); camera.rotateX(Math.sin(v * 53) * 0.012 * shake); }
    grade.uniforms.uFade.value = 0; grade.uniforms.uFlash.value = Math.max(flash, s.flash ? s.flash(t) : 0);
    grade.uniforms.uSat.value *= 1.12;
    fastOverlays(v);
  } else {
    const fe = DATA.fadeOut ?? 59.2;
    grade.uniforms.uFade.value = Math.max(clamp(1 - t / 0.4), clamp((t - fe) / 0.6), s.fade ? s.fade(t) : 0);
    grade.uniforms.uFlash.value = s.flash ? s.flash(t) : 0;
    overlays(t);
  }
  grade.uniforms.uSeed.value = (v * 30) % 97;
  composer.render();
};

const DIR = `./eps/ep${EP}`;
DATA = await (await fetch(`${DIR}.json`)).json();
$('titlePov').innerHTML = DATA.title[0]; $('titleMain').innerHTML = DATA.title[1];
if (DATA.why) { DATA.fast = { K: 1, style: 'why', hook: { t: 0, dur: 0, text: '' } }; DATA.titleUntil = 0; DATA.subs = DATA.subs || [[0, 1, '']]; document.body.classList.add('why'); await document.fonts.load("900 96px 'Inter'"); await document.fonts.load("800 76px 'Inter'"); }
if (DATA.fast) {
  FAST = { ...DATA.fast }; if (FAST.style === 'tiktok' || FAST.style === 'retain') { document.body.classList.add('tt'); await document.fonts.load("132px 'Anton'"); } FAST.H = FAST.hook.dur;
  try { const r = await fetch(`./eps/out/ep${EP}_vo.json`); if (r.ok) { const j = await r.json(); VOJSON = j; VO = j.lines; if (j.hookDur) FAST.H = j.hookDur; } } catch (e) {}
  const last = DATA.subs[DATA.subs.length - 1];
  window.DURATION = VOJSON && VOJSON.dur ? VOJSON.dur : Math.ceil((toVideo(last[1]) + 0.25 + (FAST.endCard ? FAST.endCard.dur : 0)) * FPS) / FPS;
} else window.DURATION = DURATION;
const ep = await import(`${DIR}.js`);
const CLIPNAMES = ep.usesHumans ? await initHumans() : [];
const lineT = (i) => (VO && VO[i] ? VO[i].start : i * 2.6);
const mouth = (v) => { if (!VOJSON || !VOJSON.env) return Math.abs(Math.sin(v * 13)) * 0.5; const e = VOJSON.env; const f = Math.floor(v * FPS); return e[f] || 0; };
await ep.build({ guy, lineT, mouth, VOJSON, carsInstanced, realPerson, loadGLB, CLIPNAMES, skyMat, hemi, sun, renderer, city, THREE, scene, camera, defineSet, shot, mat, mesh, box, cyl, sphere, sign, textTex, terrain, water, person, crowd, car, tree, particles, rng, fbm, vnoise, clamp, lerp, smooth, ease, easeOut, DATA });
SHOTS.sort((a, b) => a.t0 - b.t0);
window.renderAt(FAST ? FAST.H + 0.5 : 0.5);
window.sceneReady = true;
