// EP12 — Why tires are black (explainer)
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, textTex, terrain, particles, carsInstanced, car, rng, fbm, clamp, smooth, lerp, mat, guy, lineT, mouth } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const MECH = { height: 2.7, job: 'mechanic', hat: 'mechanic', outfit: { body: '#2f5fa8', straps: '#1e3f78', buttons: '#f2c14e', collar: '#d9483b' } };
  const sm = (c, o = {}) => mat(c, { flatShading: false, roughness: 0.8, ...o });
  // a tire: torus + hub
  function tire(col = 0x1c1c1e, o = {}) {
    const g = new THREE.Group(); const R = o.R || 1.0, r = o.r || 0.32;
    const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 18, 40), sm(col, { roughness: 0.9 })); t.castShadow = true; g.add(t);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const tr = box(0.12, 0.08, r * 1.6, sm(col), 0, 0, 0, g); tr.position.set(Math.cos(a) * (R + r * 0.92), Math.sin(a) * (R + r * 0.92), -r * 0.8); tr.rotation.z = a; }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.7, R * 0.7, r * 1.2, 24), sm(o.hub || 0xc8ccd2, { metalness: 0.6, roughness: 0.35 })); hub.rotation.x = Math.PI / 2; g.add(hub);
    if (o.whitewall) { const ww = new THREE.Mesh(new THREE.TorusGeometry(R * 0.86, r * 0.42, 10, 40), sm(0xf5f5f0)); ww.position.z = r * 0.62; ww.scale.z = 0.25; g.add(ww); g.userData.ww = ww; }
    g.userData.t = t; return g;
  }
  const WARM = { sky: { top: 0x000000, horizon: 0x000000 }, hemi: [0xfff0dc, 0x5a4a3a, 0.75], sun: [0xfff0d8, 1.8], sunDir: [0.4, 0.8, 0.6], shadowSize: 20, tilt: 0.25, sat: 1.45, exposure: 0.88 };

  // ---------------- old garage, 1910s car on white tires ----------------
  const ga = defineSet('garage', WARM);
  box(60, 0.2, 40, 0x8a6a4a, 0, -0.2, 0, ga); box(60, 14, 0.4, 0xb8a080, 0, 0, -8, ga); box(0.4, 14, 40, 0xa89070, -14, 0, 0, ga);
  for (let i = 0; i < 6; i++) box(0.12, 14, 0.5, 0x6b4a2f, -12 + i * 5, 0, -7.7, ga);
  const lamp = new THREE.PointLight(0xffd9a0, 160, 30, 1.4); lamp.position.set(0, 9, 2); ga.add(lamp);
  const oldCar = new THREE.Group(); oldCar.position.set(-3.5, 0, -2.5); oldCar.rotation.y = 0.35; ga.add(oldCar);
  box(4.6, 0.7, 1.9, sm(0x1d2b4a), 0, 1.0, 0, oldCar); box(2.0, 1.3, 1.8, sm(0x1d2b4a), -0.7, 1.7, 0, oldCar); box(2.1, 0.12, 2.0, sm(0x111111), -0.7, 3.0, 0, oldCar);
  for (const x of [-1.2]) for (const z of [-0.9, 0.9]) box(0.08, 1.3, 0.08, sm(0x111111), x - 0.9, 1.7, z, oldCar);
  const r1 = sphere(0.3, sm(0xf2c14e, { emissive: 0x6a5a20 }), 2.35, 1.6, 0.6, oldCar, 12); const r2 = sphere(0.3, sm(0xf2c14e, { emissive: 0x6a5a20 }), 2.35, 1.6, -0.6, oldCar, 12);
  const oldTires = []; for (const [x, z] of [[1.6, 1.05], [-1.6, 1.05], [1.6, -1.05], [-1.6, -1.05]]) { const t = tire(0xf2ede0, { R: 0.62, r: 0.13, hub: 0x8a6a4a }); t.position.set(x, 0.75, z); oldCar.add(t); oldTires.push(t); }
  const stack = []; for (let i = 0; i < 4; i++) { const t = tire(0xf2ede0, { R: 0.62, r: 0.16, hub: 0x8a6a4a }); t.rotation.x = Math.PI / 2; t.position.set(5.6, 0.2 + i * 0.34, -5); ga.add(t); stack.push(t); }
  const worn = tire(0xe8e0cc, { R: 0.9, r: 0.24, hub: 0x8a6a4a }); worn.position.set(4.2, 1.15, -1.6); worn.rotation.y = -0.4; ga.add(worn);
  const crackC = document.createElement('canvas'); crackC.width = 512; crackC.height = 128; const cg = crackC.getContext('2d'); cg.fillStyle = '#e8e0cc'; cg.fillRect(0, 0, 512, 128); cg.strokeStyle = '#3a2a1a'; cg.lineWidth = 4;
  for (let i = 0; i < 40; i++) { cg.beginPath(); let x = Math.random() * 512, y = Math.random() * 128; cg.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 30; cg.lineTo(x, y); } cg.stroke(); }
  const crackT = new THREE.CanvasTexture(crackC); crackT.wrapS = THREE.RepeatWrapping; crackT.repeat.set(4, 1); crackT.colorSpace = THREE.SRGBColorSpace;
  const crackMat = new THREE.MeshStandardMaterial({ map: crackT, roughness: 1 });
  const odo = sign(['2,000 MILES', 'WORN OUT'], 2.8, 1.2, { bg: '#f5f1e6', fg: '#8a1f1f', border: '#8a1f1f' }, 4.2, 2.8, -1.5, ga);
  const mech1 = guy(MECH); mech1.position.set(1.4, 0, 4.4); ga.add(mech1);

  // ---------------- factory: black powder into white rubber ----------------
  const fa = defineSet('factory', { ...WARM, hemi: [0xe8eef6, 0x4a4a50, 0.8], exposure: 0.9 });
  box(60, 0.2, 40, 0x6a6e76, 0, -0.2, 0, fa); box(60, 16, 0.4, 0x8a9098, 0, 0, -9, fa);
  for (const x of [-6, 6]) { const l = new THREE.PointLight(0xfff2e0, 140, 30, 1.4); l.position.set(x, 10, 2); fa.add(l); }
  const vat = cyl(2.6, 2.2, 2.6, sm(0x9aa0a8, { metalness: 0.6, roughness: 0.35 }), -1.5, 0, -2, fa, 32);
  const goo = cyl(2.45, 2.45, 0.1, sm(0xf2ede0), -1.5, 2.45, -2, fa, 32);
  const hopper = mesh(new THREE.ConeGeometry(1.6, 2.4, 24), sm(0x4a4e56, { metalness: 0.5 }), -1.5, 8, -2, fa); hopper.rotation.x = Math.PI;
  sign(['CARBON', 'BLACK'], 2.6, 1.2, { bg: '#1b1b1f', fg: '#ffffff' }, -1.5, 9.6, -0.6, fa);
  const powder = particles(1500, (i, t, v) => { const k = (i / 1500 + t * 1.2) % 1; const on = t > lineT(4) + 0.2; v.set(-1.5 + Math.sin(i * 1.7) * 0.5 * k, 6.8 - k * 4.2, -2 + Math.cos(i * 2.3) * 0.5 * k); if (!on) v.y = -99; }, { color: 0x111111, size: 0.12, opacity: 0.9 }, fa);
  const mech2 = guy(MECH); mech2.position.set(2.3, 0, 3.2); fa.add(mech2);
  const sootJar = new THREE.Group(); sootJar.position.set(2.6, 0, -1); fa.add(sootJar); cyl(0.5, 0.5, 1.2, sm(0x1b1b1f), 0, 1.0, 0, sootJar, 16); box(1.4, 1.0, 1.4, sm(0x8a6a4a), 0, 0, 0, sootJar);
  sign(['SOOT', '(very fine)'], 1.4, 0.7, { bg: '#ffffff', fg: '#1b1b1f' }, 0, 2.6, 0.55, sootJar);

  // ---------------- lab: strength / heat / sunlight ----------------
  const lb = defineSet('lab', { sky: { top: 0x26314a, horizon: 0x3a4a6a }, hemi: [0xffffff, 0x404858, 1.0], sun: [0xffffff, 2.0], sunDir: [0.5, 0.8, 0.6], shadowSize: 15, tilt: 0.2, sat: 1.4, exposure: 0.9 });
  box(40, 0.2, 30, 0x3a4560, 0, -0.2, 0, lb);
  const hero = tire(0x1c1c1e, { R: 1.3, r: 0.42 }); hero.position.set(-1.2, 2.2, -1); lb.add(hero);
  const badge = (txt, col, x, y) => { const s2 = sign([txt], 3.2, 0.9, { bg: col, fg: '#ffffff' }, x, y, 0.2, lb); return s2; };
  const b1 = badge('STRONGER', '#2f8a3a', -1.2, 4.6), b2 = badge('HANDLES HEAT', '#d9483b', -1.2, 5.6), b3 = badge('BLOCKS UV', '#7b3fe4', -1.2, 6.6);
  const heat = particles(400, (i, t, v) => { const k = (i / 400 + t * 0.8) % 1; const on = t > lineT(7) && t < lineT(8) + 0.4; v.set(-1.2 + Math.sin(i * 2.1) * 1.6, 0.6 + k * 3.5, -1 + Math.cos(i * 1.3) * 0.6); if (!on) v.y = -99; }, { color: 0xff8a3d, size: 0.18, opacity: 0.8, additive: true }, lb);
  const sunD = sphere(0.9, sm(0xffd23f, { emissive: 0xffb020, emissiveIntensity: 1.2 }), 4.2, 7.5, -3, lb, 20);
  const rays = []; for (let i = 0; i < 3; i++) { const r = box(0.12, 0.12, 5.5, sm(0xffd23f, { emissive: 0xffb020, emissiveIntensity: 1.5 }), 0, 0, 0, lb); r.castShadow = false; rays.push(r); }
  const mech3 = guy(MECH); mech3.position.set(2.6, 0, 2.6); lb.add(mech3);

  // ---------------- highway ----------------
  const hw = defineSet('highway', { sky: { top: 0x3f86e0, horizon: 0xd6ecff }, sunDir: [0.4, 0.6, 0.5], fog: [0xcfe6fa, 200, 1600], hemi: [0xd8ecff, 0x7a9a50, 0.85], sun: [0xfff2d8, 2.6], shadowSize: 50, tilt: 0.3, sat: 1.45, exposure: 0.85 });
  terrain({ size: 3000, seg: 60, parent: hw, height: (x, z) => Math.abs(x) < 14 ? 0 : 2 * fbm(x * 0.02, z * 0.02), color: (x, y, z) => Math.abs(x) < 14 ? (Math.abs(x) < 0.25 && Math.floor(z / 6) % 2 === 0 ? '#f2f0e6' : '#55585e') : (fbm(x * 0.02, z * 0.02) > 0.5 ? '#7cbf4a' : '#6aae3e') });
  const flow = []; for (let i = 0; i < 40; i++) flow.push({ x: (i % 4 - 1.5) * 3.4, y: 0, z: -400 + i * 20, ry: i % 4 < 2 ? 0 : Math.PI, sp: 18 + (i % 3) * 4 });
  const traffic = carsInstanced(flow, hw, { seed: 3 });
  traffic.userData.update = (t) => traffic.userData.set((p) => ({ ...p, z: ((p.z + (p.ry ? -1 : 1) * t * p.sp + 400) % 800 + 800) % 800 - 400 }));
  const odo2 = sign(['50,000+ MILES'], 4.4, 1.1, { bg: '#1b1b1f', fg: '#7dff8a' }, 9, 4.2, 10, hw); cyl(0.12, 0.12, 3.6, 0x777777, 9, 0, 9.9, hw);
  const mech4 = guy(MECH); mech4.position.set(10.6, 0, 18); hw.add(mech4);

  // ---------------- whitewall close-up ----------------
  const ww = defineSet('whitewall', { ...WARM, exposure: 0.9 });
  box(40, 0.2, 30, 0x8a6a4a, 0, -0.2, 0, ww); box(40, 12, 0.4, 0xb8a080, 0, 0, -6, ww);
  const lamp2 = new THREE.PointLight(0xffd9a0, 120, 25, 1.4); lamp2.position.set(0, 7, 4); ww.add(lamp2);
  const wwt = tire(0x1c1c1e, { R: 1.4, r: 0.45, whitewall: true, hub: 0xd8dce2 }); wwt.position.set(-1.0, 1.9, -1); ww.add(wwt);
  const mech5 = guy(MECH); mech5.position.set(2.0, 0, 2.6); ww.add(mech5);

  // ---------------- shots ----------------
  const T = (i) => (i <= 0 ? 0 : lineT(i) - 0.08);
  const talk = (g, t, pose) => { g.state.talk = mouth(t); if (pose) g.state.pose = pose; };
  const S = (a, b, o) => shot({ t0: T(a), t1: b >= 99 ? 999 : T(b), ...o });
  S(0, 2, { set: 'garage', from: [3.0, 1.8, 11.5], to: [2.6, 1.8, 10.5], look: [-0.6, 1.9, 0], fov: 46, focus: 0.5, update: (t) => talk(mech1, t, t > lineT(1) ? 'point' : 'explain') });
  S(2, 4, { set: 'garage', from: [6.4, 1.8, 7], to: [6.0, 1.7, 6.2], look: [3.4, 1.4, -1.4], fov: 46, focus: 0.5, update: (t) => { talk(mech1, t, 'shrug'); const k = smooth(lineT(2) + 1.2, lineT(2) + 1.8, t); worn.userData.t.material = k > 0.5 ? crackMat : worn.userData.t.material; worn.position.y = 1.15 - k * 0.5; worn.rotation.x = k * 1.2; odo.visible = t > lineT(3); } });
  S(4, 6, { set: 'factory', from: [3.6, 2.2, 12], to: [3.2, 2.4, 10.8], look: [-0.6, 2.8, -1], fov: 48, focus: 0.5, update: (t) => { talk(mech2, t, 'point'); const k = smooth(lineT(4) + 0.5, lineT(5) + 1.5, t); goo.material = sm(new THREE.Color(0xf2ede0).lerp(new THREE.Color(0x1c1c1e), k).getHex()); } });
  S(6, 9, { set: 'lab', from: [3.6, 2.6, 12], to: [3.2, 2.8, 11], look: [0.0, 3.2, 0], fov: 50, focus: 0.5, update: (t) => { talk(mech3, t, 'point'); hero.rotation.z = t * 0.8; b1.visible = t > lineT(6); b2.visible = t > lineT(7); b3.visible = t > lineT(8); rays.forEach((r, i) => { r.visible = t > lineT(8); const a = V(4.2, 7.5, -3), bb = V(-1.2 + (i - 1) * 0.6, 2.8, -1); r.position.lerpVectors(a, bb, 0.5); r.lookAt(bb); r.scale.z = a.distanceTo(bb) / 5.5; }); } });
  S(9, 11, { set: 'highway', from: [14, 2.0, 30], to: [13.4, 2.0, 28.5], look: [8, 2.0, 12], fov: 50, focus: 0.5, update: (t) => talk(mech4, t, 'explain') });
  S(11, 99, { set: 'whitewall', from: [2.0, 1.9, 9.5], to: [1.8, 1.9, 8.8], look: [0.2, 1.9, 0], fov: 46, focus: 0.5, update: (t) => { talk(mech5, t, 'point'); wwt.rotation.z = t * 0.5; const k = smooth(lineT(13) - 0.1, lineT(13) + 0.6, t); wwt.userData.ww.position.z = 0.28 + k * 2.5; wwt.userData.ww.rotation.y = k * 0.6; } });
}
