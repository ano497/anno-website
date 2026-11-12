// EP07 — Someone turned the Sahara into a parking lot.
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, person, crowd, car, carsInstanced, particles, rng, fbm, clamp, smooth, lerp, mat } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // asphalt with painted bays (texture repeats every 2 rows: 5.5 m bays x 2.6 m wide, 7 m aisle)
  const lc = document.createElement('canvas'); lc.width = 256; lc.height = 512; const lg = lc.getContext('2d');
  lg.fillStyle = '#3c3d40'; lg.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 4000; i++) { lg.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},0.05)`; lg.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); }
  lg.fillStyle = '#f2f0e6'; lg.fillRect(0, 0, 6, 150); lg.fillRect(0, 362, 6, 150); lg.fillRect(0, 148, 256, 5); lg.fillRect(0, 359, 256, 5);
  const lt = new THREE.CanvasTexture(lc); lt.wrapS = lt.wrapT = THREE.RepeatWrapping; lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8;
  // bay geometry in world units: tile = 2.6 m wide x 18 m deep (two 5.5 m rows + 7 m aisle)
  const TW = 2.6, TD = 18;
  const lotMat = (sz) => { const t = lt.clone(); t.needsUpdate = true; t.repeat.set(sz / TW, sz / TD); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); };
  const sandH = (x, z, flat) => { const d = Math.max(Math.abs(x), Math.abs(z)) - flat; return d < 0 ? -0.2 : Math.min(60, d * 0.15) * (0.5 + fbm(x * 0.004, z * 0.004)) + 8 * fbm(x * 0.01, z * 0.01) * Math.min(1, d / 100); };
  const bayX = (i) => (i + 0.5) * TW, rowZ = (k) => Math.floor(k / 2) * TD + (k % 2 ? 18 - 2.75 : 2.75);
  const SUN = { sky: { top: 0x3f86d6, horizon: 0xf3e2c4 }, sunDir: [0.5, 0.6, 0.3], fog: [0xf0dcbc, 600, 5000], hemi: [0xd8e6ff, 0xc9a26a, 1.1], sun: [0xfff0d6, 3.1], shadowCenter: [0, 0, 0], shadowSize: 120, tilt: 0.85 };

  // ---------------- the lot ----------------
  const lot = defineSet('lot', SUN);
  const LS = 3000;
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(LS, LS), lotMat(LS)); lp.rotation.x = -Math.PI / 2; lp.receiveShadow = true; lot.add(lp);
  terrain({ size: 9000, seg: 160, parent: lot, height: (x, z) => sandH(x, z, LS / 2), color: (x, y, z) => fbm(x * 0.01, z * 0.01) > 0.5 ? '#e2b77a' : '#d9a865' });
  // cars filling bays near the camera area (instanced)
  const R = rng(4); const parked = [];
  for (let k = 0; k < 44; k++) for (let i = -40; i < 40; i++) { if (R() < 0.04 || i === -1 || i === 0) continue; const x = bayX(i), z = rowZ(k) - 100; if (x > 52 && x < 96 && z > 192 && z < 218) continue; parked.push({ x, y: 0, z, ry: k % 2 ? Math.PI : 0 }); }
  const lotCars = carsInstanced(parked, lot, { seed: 2 });
  // far-field: endless coloured specks (cheap boxes)
  const far = []; const RF = rng(9);
  for (let k = 0; k < 160; k++) for (let i = -90; i < 90; i++) { if (RF() < 0.08 || i === -1 || i === 0) continue; const z = rowZ(k) - 1400; if (z > -110 && z < 300 && i >= -40 && i < 40) continue; far.push([bayX(i), z]); }
  const farIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1.3, 4.2), new THREE.MeshStandardMaterial({ roughness: 0.5 }), far.length);
  { const M = new THREE.Matrix4(), c = new THREE.Color(), cols = [0xd9483b, 0x3b6fd9, 0xf5f5f0, 0x2e3440, 0xf2c14e, 0x4caf6a, 0x9aa0a8]; far.forEach(([x, z], i) => { M.makeTranslation(x, 0.65, z); farIM.setMatrixAt(i, M); farIM.setColorAt(i, c.set(cols[i % 7])); }); }
  farIM.castShadow = true; lot.add(farIM);
  // entrance sign
  const EN = new THREE.Group(); EN.position.set(-115, 0, 160); lot.add(EN);
  for (const x of [-9, 9]) cyl(0.6, 0.6, 12, 0xf2c14e, x, 0, 0, EN);
  sign(['SAHARA PARKING', '40,000,000,000 SPACES'], 22, 6, { bg: '#1f5fc7', fg: '#ffffff', border: '#f2c14e' }, 0, 14, 0.7, EN);
  const P = sign('P', 5, 5, { bg: '#1f5fc7', fg: '#ffffff', size: 700 }, 14, 9, 0.7, EN);
  // the line painter (empty part of the lot: off to the west)
  const paintZone = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x3c3d40, roughness: 0.9 })); paintZone.rotation.x = -Math.PI / 2; paintZone.position.set(-300, 0.02, 0); lot.add(paintZone);
  const painted = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), lotMat(200)); painted.rotation.x = -Math.PI / 2; painted.position.set(-300, 0.03, 40); lot.add(painted);
  const cart = new THREE.Group(); cart.position.set(-300, 0, -20); lot.add(cart);
  box(0.8, 0.8, 1.2, 0xf2c14e, 0, 0.1, 0, cart); for (const x of [-0.4, 0.4]) { const w = cyl(0.2, 0.2, 0.1, 0x1a1a1a, x, 0, 0.5, cart, 10); w.rotation.z = Math.PI / 2; w.position.y = 0.2; }
  const painter = person({ shirt: 0xff8a3d, hat: 0xf2c14e }, cart); painter.position.set(0, 0, -1.2); painter.pose({ armL: -0.8, armR: -0.8 });
  const freshLine = box(0.12, 0.02, 1, 0xf2f0e6, 0, 0, 0.9, cart);
  // circling car + traffic
  const circ = car(0xd9483b, lot); circ.userData.update = (t) => { const z = 160 - ((t - 19.4) * 9) % 140; circ.position.set(bayX(-1) + 1.3 + 1.0, 0, z); circ.rotation.y = 0; };
  const driver = person({ shirt: 0xf5f5f0 }, circ); driver.position.set(-0.4, 0.3, 0.2); driver.scale.setScalar(0.8); driver.userData.legL.rotation.x = driver.userData.legR.rotation.x = -1.4;
  // K-4000: tents, laundry, a sign, kids
  const town = new THREE.Group(); town.position.set(60, 0, 200); lot.add(town);
  const tentCols = [0xd9483b, 0x3b6fd9, 0xf2c14e, 0x4caf6a, 0xe86fa8];
  for (let i = 0; i < 12; i++) { const t2 = mesh(new THREE.ConeGeometry(1.6, 2.2, 4), mat(tentCols[i % 5], { flatShading: false }), (i % 6) * TW * 1.5, 1.1, Math.floor(i / 6) * 11 + 1.6, town); t2.rotation.y = Math.PI / 4; }
  for (let i = 0; i < 6; i++) { const l = box(4, 0.02, 0.02, 0xffffff, i * 4, 2, 6.5, town); for (let k = 0; k < 4; k++) box(0.5, 0.7, 0.03, tentCols[(i + k) % 5], i * 4 - 1.5 + k, 1.3, 6.5, town); }
  const tsign = new THREE.Group(); tsign.position.set(-4, 0, 12); town.add(tsign); cyl(0.08, 0.08, 2.6, 0x777777, 0, 0, 0, tsign);
  sign(['WELCOME TO', 'K-4000', 'pop. 312'], 3.4, 2.2, { bg: '#2f8a3a', fg: '#ffffff', border: '#ffffff' }, 0, 3.2, 0.05, tsign);
  const residents = []; for (let i = 0; i < 10; i++) { const p = person({ rand: rng(400 + i), scale: i % 3 === 0 ? 0.6 : 1 }, town); p.position.set(2 + (i % 5) * 3, 0, 5 + Math.floor(i / 5) * 3); p.rotation.y = i; residents.push(p); }
  const grill = cyl(0.4, 0.3, 0.9, 0x1d1d1d, 8, 0, 9, town, 10);
  // camel shuttles
  const camel = (col) => {
    const g = new THREE.Group(); const sm = mat(col, { flatShading: false, roughness: 0.9 });
    const bodyM = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), sm); bodyM.scale.set(0.55, 0.5, 1.1); bodyM.position.y = 1.7; g.add(bodyM);
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), sm); hump.position.set(0, 2.2, -0.1); g.add(hump);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 10), sm); neck.position.set(0, 2.1, 1.05); neck.rotation.x = 0.7; g.add(neck);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), sm); hd.scale.set(0.8, 0.8, 1.5); hd.position.set(0, 2.6, 1.55); g.add(hd);
    const legs = []; for (const [x, z] of [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]]) { const lgp = new THREE.Group(); lgp.position.set(x, 1.4, z); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 1.4, 8), sm); l.position.y = -0.7; lgp.add(l); g.add(lgp); legs.push(lgp); }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const seat = box(1.4, 0.3, 1.6, 0xd9483b, 0, 2.15, -0.5, g); seat.scale.set(1, 1, 1);
    sign('SHUTTLE', 1.6, 0.4, { bg: '#f2c14e', fg: '#1d1d1d' }, 0.72, 1.8, 0, g).rotation.y = Math.PI / 2;
    g.walk = (ph) => legs.forEach((l, i) => (l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.35));
    return g;
  };
  const camels = []; for (let i = 0; i < 3; i++) { const c = camel(0xc9945a); c.position.set(bayX(-1) + 2.3, 0, 120 + i * 5); lot.add(c); camels.push(c); const rider = person({ rand: rng(500 + i) }, c); rider.position.set(0, 2.0, -0.5); rider.userData.legL.rotation.set(-1.4, 0, -0.3); rider.userData.legR.rotation.set(-1.4, 0, 0.3); rider.scale.setScalar(0.9); }
  const fare = new THREE.Group(); fare.position.set(bayX(-1) - 1.2, 0, 112); lot.add(fare); cyl(0.08, 0.08, 2.4, 0x777777, 0, 0, 0, fare);
  sign(['CAMEL SHUTTLE', 'FARE: $3 / DUNE'], 3.2, 1.4, { bg: '#ffffff', fg: '#b5532e', border: '#b5532e' }, 0, 3.0, 0.05, fare);
  camels.forEach((c, i) => (c.userData.update = (t) => { c.position.z = 120 + i * 5 - (t - 29.3) * 1.4; c.walk(t * 4 + i); }));

  // ---------------- buried (sandstorm) set ----------------
  const bur = defineSet('buried', { ...SUN, sky: { top: 0xc9a46e, horizon: 0xe6c99a }, fog: [0xdcb784, 40, 400], sun: [0xffe6c0, 1.6], hemi: [0xf2dcb8, 0xb08850, 1.2] });
  const bp = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), lotMat(800)); bp.rotation.x = -Math.PI / 2; bur.add(bp);
  const bc = []; for (let k = 0; k < 12; k++) for (let i = -14; i < 14; i++) bc.push({ x: bayX(i), y: 0, z: rowZ(k) - 60, ry: k % 2 ? Math.PI : 0 });
  carsInstanced(bc, bur, { seed: 7 });
  // sand mounds over the cars
  const mound = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe2b77a, roughness: 1 }), bc.length);
  { const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S2 = new THREE.Vector3(); const rm = rng(3); bc.forEach((p, i) => { S2.set(1.6 + rm() * 0.5, 0.8 + rm() * 0.7, 2.8 + rm() * 0.6); M.compose(V(p.x + (rm() - 0.5), 0, p.z), q, S2); mound.setMatrixAt(i, M); }); }
  mound.receiveShadow = mound.castShadow = true; bur.add(mound);
  const moundUp = (t) => { const k = smooth(36, 39.5, t); mound.scale.set(1, Math.max(0.02, k), 1); mound.visible = k > 0.02; };
  particles(6000, (i, t, v) => { const k = (i * 0.618 + t * 0.6) % 1; v.set(-60 + k * 120, 0.2 + ((i * 7.31) % 1) * 6, -60 + ((i * 53.1) % 120)); }, { color: 0xe8c48c, size: 0.35, opacity: 0.6 }, bur);
  const shovelers = []; for (let i = 0; i < 6; i++) { const p = person({ rand: rng(600 + i), hat: 0xf2c14e }, bur); p.position.set(bayX(-6 + i * 2) + 1.3, 0, rowZ(1) - 60 + 2); p.rotation.y = -Math.PI / 2; const sh = box(0.06, 1.2, 0.06, 0x8a6a4a, 0, -0.9, 0.1, p.userData.armR); box(0.3, 0.05, 0.35, 0x9aa0a8, 0, -1.5, 0.2, p.userData.armR); shovelers.push(p); }
  // shovel parking lot
  const SL = new THREE.Group(); SL.position.set(0, 0, 40); bur.add(SL);
  const slp = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ color: 0x3c3d40, roughness: 0.9 })); slp.rotation.x = -Math.PI / 2; slp.position.y = 0.04; SL.add(slp);
  for (let i = 0; i < 14; i++) { box(0.05, 0.02, 2.2, 0xf2f0e6, -7 + i * 1.0, 0.05, -1.5, SL); if (i < 13) { const g = new THREE.Group(); g.position.set(-6.5 + i * 1.0, 0, -1.6); g.rotation.x = -0.35; box(0.05, 1.3, 0.05, 0x8a6a4a, 0, 0, 0, g); box(0.3, 0.4, 0.04, 0x9aa0a8, 0, -0.2, 0, g); SL.add(g); } }
  const slS = new THREE.Group(); slS.position.set(-7.8, 0, 0.5); SL.add(slS); cyl(0.06, 0.06, 2, 0x777777, 0, 0, 0, slS);
  sign(['SHOVEL PARKING', 'MAX 2 HRS'], 2.6, 1.0, { bg: '#1f5fc7', fg: '#ffffff' }, 0, 2.4, 0.04, slS);

  // ---------------- final: man finds a free spot ----------------
  const fin = defineSet('final', { ...SUN, shadowSize: 40 });
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lotMat(600)); fp.rotation.x = -Math.PI / 2; fin.add(fp);
  terrain({ size: 4000, seg: 60, parent: fin, height: (x, z) => sandH(x, z, 300), color: () => '#e0b06e' });
  const fc = []; const RC = rng(21); for (let k = 0; k < 16; k++) for (let i = -20; i < 20; i++) { if (k === 1 && i === 0) continue; if (k === 1 && i === 1) continue; fc.push({ x: bayX(i), y: 0, z: rowZ(k) - 100, ry: k % 2 ? 0 : Math.PI }); }
  carsInstanced(fc, fin, { seed: 12 });
  const old = car(0xb59a72, fin); old.position.set(bayX(1), 0, rowZ(1) - 100); old.rotation.y = 0;
  old.children[0].material = mat(0xc9ad80, { flatShading: false, roughness: 1 });
  const dust = sphere(1, mat(0xe2b77a, { flatShading: false, roughness: 1 }), 0, 0.2, 0, old, 12); dust.scale.set(1.2, 0.5, 2.3);
  const sticker = sign(['PARKED', '03 · 2031'], 0.8, 0.45, { bg: '#ffffff', fg: '#1d1d1d' }, -0.5, 1.15, -2.2, old); sticker.rotation.y = Math.PI;
  const AZ = -91; const man = person({ shirt: 0x6b7a8f, hairColor: 0x8a8a8a, pants: 0x4a5568 }, fin); man.position.set(bayX(0), 0, AZ);
  const keys = box(0.06, 0.12, 0.02, 0xc0c0c0, 0, -0.66, 0.05, man.userData.armR);

  // ---------------- shots ----------------
  shot({ t0: 0, t1: 6.8, set: 'lot', from: [900, 500, 1600], to: [500, 260, 900], look: [0, 0, 0], fov: 40, focus: 0.45 });
  shot({ t0: 6.8, t1: 9.6, set: 'lot', from: [-60, 18, 200], to: [-80, 14, 175], look: [-115, 12, 160], fov: 42, focus: 0.5 });
  shot({ t0: 9.6, t1: 12.8, set: 'lot', from: [40, 60, 140], to: [400, 900, 1400], look: [0, 0, -200], fov: 44, focus: 0.45 });
  shot({ t0: 12.8, t1: 16.1, set: 'lot', from: [-293, 2.4, -26], to: [-293, 2.4, -24], look: [-300, 0.8, -19], fov: 42, focus: 0.55, band: 0.14,
    update: (t) => { const z = -20 + (t - 12.8) * 0.5; cart.position.z = z; painter.walk(t * 6, 0.6); painter.pose({ armL: -0.8, armR: -0.8 }); freshLine.scale.z = 1 + (t - 12.8) * 1.2; freshLine.position.z = 0.9 - (t - 12.8) * 0.6; } });
  shot({ t0: 16.1, t1: 19.4, set: 'lot', from: [30, 40, 260], to: [20, 30, 220], look: [0, 0, 100], fov: 44, focus: 0.5 });
  shot({ t0: 19.4, t1: 22.7, set: 'lot', from: [0, 0, 0], look: [0, 0, 0], fov: 44, focus: 0.55, update: (t) => { camera.position.set(circ.position.x + 6, 4, circ.position.z + 12); camera.lookAt(circ.position.x, 1, circ.position.z - 4); } });
  shot({ t0: 22.7, t1: 29.3, set: 'lot', from: [80, 9, 232], to: [72, 6, 222], look: [66, 1.4, 206], fov: 44, focus: 0.55, update: (t) => residents.forEach((p, i) => { if (i % 2) p.walk(t * 5 + i, 0.6); }) });
  shot({ t0: 29.3, t1: 35.7, set: 'lot', from: [bayX(-1) + 10, 3.5, 128], to: [bayX(-1) + 9, 3.5, 118], look: [bayX(-1) + 1, 2, 112], fov: 42, focus: 0.55 });
  shot({ t0: 35.7, t1: 42.3, set: 'buried', from: [30, 14, 40], to: [20, 8, 20], look: [0, 1, -20], fov: 44, focus: 0.5, update: (t) => { moundUp(t); shovelers.forEach((p) => (p.visible = t > 39)); } });
  shot({ t0: 42.3, t1: 45.8, set: 'buried', from: [-30, 30, 90], to: [-20, 20, 70], look: [0, 0, 30], fov: 44, focus: 0.5, update: (t) => { moundUp(60); shovelers.forEach((p, i) => { p.visible = true; p.pose({ armR: -1.2 + Math.sin(t * 4 + i) * 0.5, armL: -1.0 }); }); } });
  shot({ t0: 45.8, t1: 49.1, set: 'buried', from: [3, 2.2, 47], to: [2, 1.9, 45], look: [0, 0.6, 38.5], fov: 44, focus: 0.55, band: 0.14, update: () => moundUp(60) });
  shot({ t0: 49.1, t1: 52.7, set: 'final', from: [0, 0, 0], look: [0, 0, 0], fov: 44, focus: 0.55,
    update: (t) => { const k = smooth(49.1, 52.2, t); man.position.set(lerp(bayX(-7), bayX(0), k), 0, AZ); man.rotation.y = Math.PI / 2 - smooth(51.6, 52.4, t) * Math.PI / 2 * -1 * 0 + (t > 52 ? -Math.PI / 2 * 0 : 0); man.walk(t * 6, 1 - smooth(51.8, 52.4, t)); camera.position.set(man.position.x - 7, 2.4, AZ - 4); camera.lookAt(man.position.x + 2, 1.2, AZ + 2); } });
  shot({ t0: 52.7, t1: 60, set: 'final', from: [bayX(-2), 1.8, AZ - 3.5], to: [bayX(-1.6), 1.75, AZ - 3.2], look: [bayX(0.6), 1.1, rowZ(1) - 100 - 1.5], fov: 44, focus: 0.55, band: 0.15,
    update: (t) => { man.position.set(bayX(0), 0, AZ + 1.5); man.rotation.y = 0.5; man.pose({ head: 0.25, armR: -0.4 }); } });
}
