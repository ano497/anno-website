// EP08 — Countries started selling their landmarks.
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, water, person, crowd, car, carsInstanced, city, tree, particles, rng, fbm, clamp, smooth, lerp, mat } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const BRONZE = 0x6b5440;
  const DAY = { sky: { top: 0x3f7fd6, horizon: 0xd6e8fa }, sunDir: [0.45, 0.6, 0.45], fog: [0xd6e8fa, 300, 2500], hemi: [0xd6e8ff, 0x7a6a50, 1.1], sun: [0xfff2d8, 2.9], shadowCenter: [0, 0, 0], shadowSize: 120, tilt: 0.85 };

  // generic lattice tower: four curved legs, bracing rings, platforms, spire
  function latticeTower(parent, H = 120) {
    const g = new THREE.Group(); const m = mat(BRONZE, { flatShading: false, roughness: 0.7, metalness: 0.3 });
    const legR = (y) => 22 * Math.pow(1 - y / H, 2.2) + 1.2;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2; const pts = [];
      for (let k = 0; k <= 12; k++) { const y = k / 12 * H * 0.92; pts.push(V(Math.cos(a) * legR(y), y, Math.sin(a) * legR(y))); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 1.1 - 0.0, 8), m); tube.castShadow = true; g.add(tube);
    }
    for (let k = 1; k < 18; k++) {
      const y = k / 18 * H * 0.9; const r = legR(y) * 1.414;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.25, 4, 4), m); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const bx = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, legR(y) * 1.6, 4), m); bx.position.set(Math.cos(a) * legR(y) * 0.72, y + 2, Math.sin(a) * legR(y) * 0.72); bx.rotation.set(0, -a, Math.PI / 4); g.add(bx); }
    }
    for (const [y, s2] of [[H * 0.18, 26], [H * 0.45, 13]]) { const p = box(s2, 1.6, s2, m, 0, y, 0, g); }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(15, 0.9, 8, 24, Math.PI), m); arch.position.y = H * 0.02; g.add(arch);
    const arch2 = arch.clone(); arch2.rotation.y = Math.PI / 2; g.add(arch2);
    cyl(0.3, 1.4, H * 0.12, m, 0, H * 0.9, 0, g, 8);
    if (parent) parent.add(g); return g;
  }

  // ---------------- old city plaza (tower, then the empty spot) ----------------
  const pl = defineSet('plaza', DAY);
  city({ parent: pl, nx: 8, nz: 8, seed: 61, hmin: 14, hmax: 30, skip: (x, z) => Math.abs(x) < 60 && Math.abs(z) < 60, colors: [0xe8dcc6, 0xdccfb6, 0xd6c4a8, 0xe2d6c0] });
  box(130, 0.3, 130, 0xc9bfa8, 0, -0.1, 0, pl);
  for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if ((Math.abs(i) > 1 || Math.abs(k) > 1) && i !== 0) tree(pl, i * 14, k * 14, 1.6, { round: true, leaf: 0x4f8f3a });
  const T1 = latticeTower(pl); T1.scale.setScalar(0.6);
  const pad = box(30, 0.6, 30, 0xb8ae96, 0, 0, 0, pl);
  const cranes = []; for (const [x, z, ry] of [[-30, -20, 0.6], [28, 24, -2.4]]) { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; pl.add(c); box(2.4, 90, 2.4, 0xf2c14e, 0, 0, 0, c); box(60, 2, 2, 0xf2c14e, 15, 90, 0, c); box(0.15, 30, 0.15, 0x333333, 40, 60, 0, c); cranes.push(c); }
  const wasHere = new THREE.Group(); wasHere.position.set(0, 0.6, 16); pl.add(wasHere); cyl(0.1, 0.1, 2.2, 0x777777, 0, 0, 0, wasHere);
  sign(['THE TOWER', 'WAS HERE ✦'], 3.2, 1.6, { bg: '#ffffff', fg: '#6b5440', border: '#6b5440' }, 0, 2.6, 0.05, wasHere);
  const tourists = []; for (let i = 0; i < 14; i++) { const p = person({ rand: rng(700 + i), hat: i % 4 === 0 ? 0xf2c14e : undefined }, pl); const a = -0.9 + i * 0.13; p.position.set(Math.sin(a) * (24 + (i % 3) * 2), 0.0, 22 + Math.cos(a) * 4 + (i % 3) * 2); p.rotation.y = Math.PI + a * 0.5; p.pose({ armR: -1.6, armL: -1.5, head: -0.25 }); box(0.12, 0.22, 0.02, 0x111111, 0, -0.62, 0.06, p.userData.armR); tourists.push(p); }
  const tourBus = car(0xd9483b, pl, { len: 11 }); tourBus.position.set(-48, 0, 30); tourBus.rotation.y = Math.PI / 2; tourBus.scale.set(1.3, 1.6, 1);

  // ---------------- desert convoy ----------------
  const ds = defineSet('desert', { ...DAY, sky: { top: 0x3f86d6, horizon: 0xf3e2c4 }, fog: [0xf0dcbc, 400, 4000], hemi: [0xd8e6ff, 0xc9a26a, 1.1] });
  terrain({ size: 6000, seg: 120, parent: ds, height: (x, z) => Math.abs(x) < 14 ? 0 : 20 * fbm(x * 0.004, z * 0.004) * Math.min(1, (Math.abs(x) - 14) / 60), color: (x) => Math.abs(x) < 7 ? '#3c3d40' : '#e2b77a' });
  const convoy = new THREE.Group(); ds.add(convoy);
  const pieces = [];
  for (let i = 0; i < 6; i++) {
    const tr = new THREE.Group(); tr.position.set(-3, 0, -i * 40); convoy.add(tr);
    box(3, 3, 4, 0xf5f5f0, 0, 0.6, 12, tr); box(3.2, 1.2, 20, 0x4a4e56, 0, 0.6, 0, tr);
    for (let k = 0; k < 4; k++) for (const x of [-1.5, 1.5]) { const w = cyl(0.6, 0.6, 0.5, 0x1a1a1a, x, 0, -8 + k * 6, tr, 10); w.rotation.z = Math.PI / 2; w.position.y = 0.6; }
    const piece = latticeTower(null, 120); piece.scale.setScalar(0.12 + (i === 0 ? 0.05 : 0)); piece.rotation.x = Math.PI / 2; piece.position.set(0, 3.2, -6); tr.add(piece);
    const wide = sign('WIDE LOAD', 3, 0.6, { bg: '#f2c14e', fg: '#1d1d1d' }, 0, 2.2, -10.1, tr); wide.rotation.y = Math.PI;
    pieces.push(tr);
  }
  convoy.userData.update = (t) => { convoy.position.z = (t - 6.8) * 6; };

  // ---------------- mall with a clock tower ----------------
  const ml = defineSet('mall', { sky: { top: 0x000000, horizon: 0x000000 }, hemi: [0xfff6e8, 0x8a7a68, 1.0], sun: [0xfff2d8, 1.6], sunDir: [0.2, 1, 0.3], shadowSize: 60, tilt: 0.8, exposure: 1.05, fog: [0xefe6d6, 80, 260] });
  box(120, 0.3, 80, 0xe8e2d6, 0, -0.2, 0, ml);
  for (const s2 of [-1, 1]) { box(120, 30, 1, 0xf2ece0, 0, 0, s2 * 40, ml); for (let f = 0; f < 3; f++) { box(120, 0.8, 8, 0xdcd4c4, 0, 7 + f * 7, s2 * 36, ml); for (let i = 0; i < 8; i++) { const c = [0xd9483b, 0x3b6fd9, 0x2f8a3a, 0xf2c14e, 0x8e5bd6][(i + f) % 5]; box(12, 5.5, 0.3, c, -50 + i * 14, f * 7 + 1.0, s2 * 39.4, ml); } } }
  box(120, 1, 80, mat(0xbfe3ff, { transparent: true, opacity: 0.35 }), 0, 30, 0, ml);
  const CT = new THREE.Group(); ml.add(CT);
  box(7, 26, 7, 0xd6c4a0, 0, 0, 0, CT); box(8, 7, 8, 0xc9b48a, 0, 26, 0, CT);
  const roof = mesh(new THREE.ConeGeometry(5.6, 9, 4), 0x4f7a6a, 0, 37.5, 0, CT); roof.rotation.y = Math.PI / 4;
  const hands = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group(); f.rotation.y = i * Math.PI / 2; CT.add(f);
    const face = new THREE.Mesh(new THREE.CircleGeometry(2.8, 32), new THREE.MeshStandardMaterial({ color: 0xfaf6ea, emissive: 0xfff4d8, emissiveIntensity: 0.3 })); face.position.set(0, 29.5, 4.02); f.add(face);
    for (let k = 0; k < 12; k++) { const tk = box(0.12, 0.45, 0.05, 0x1d1d1d, Math.sin(k / 12 * 6.28) * 2.4, 29.3 + Math.cos(k / 12 * 6.28) * 2.4, 4.05, f); tk.rotation.z = -k / 12 * 6.28; }
    const hh = new THREE.Group(); hh.position.set(0, 29.5, 4.08); f.add(hh); box(0.2, 1.4, 0.05, 0x1d1d1d, 0, 0, 0, hh).position.y = 0.6;
    const mh = new THREE.Group(); mh.position.set(0, 29.5, 4.1); f.add(mh); box(0.12, 2.2, 0.05, 0x1d1d1d, 0, 0, 0, mh).position.y = 1.0;
    hands.push([hh, mh]);
  }
  const plus = sign(['+15 MIN', 'SHOP FASTER'], 6, 2.4, { bg: '#d9483b', fg: '#ffffff' }, 0, 21, 3.6, CT);
  const realtor = new THREE.Group(); realtor.position.set(7, 0, 8); ml.add(realtor); cyl(0.08, 0.08, 2.6, 0xffffff, 0, 0, 0, realtor);
  sign(['SOLD', 'to MEGAMALL'], 2.6, 1.5, { bg: '#d9483b', fg: '#ffffff', border: '#ffffff' }, 0, 2.4, 0.05, realtor);
  const shoppers = []; const RS = rng(8); for (let i = 0; i < 120; i++) shoppers.push({ x: -55 + RS() * 110, y: 0, z: -30 + RS() * 60, ry: RS() > 0.5 ? Math.PI / 2 : -Math.PI / 2, sp: 2 + RS() * 2.5, ph: RS() * 100 });
  const shopC = crowd(shoppers, ml, { seed: 5 });
  const bags = new THREE.Group(); ml.add(bags);
  ml.userData = {};
  CT.userData.update = (t) => { const mins = 600 + t * 40; hands.forEach(([h, m]) => { m.rotation.z = -(mins % 60) / 60 * 6.28; h.rotation.z = -(mins / 720) * 6.28; }); shopC.userData.set((p) => { const x = ((p.x + 55 + (p.ry > 0 ? 1 : -1) * t * p.sp * (t > 22.8 ? 2.2 : 1) + p.ph) % 110 + 110) % 110 - 55; return { x, y: 0, z: p.z, ry: p.ry, bob: Math.abs(Math.sin(t * 9 + p.ph)) * 0.05 }; }); };

  // ---------------- pyramid gym ----------------
  const py = defineSet('pyramid', { ...DAY, sky: { top: 0x3f86d6, horizon: 0xf3e2c4 }, fog: [0xf0dcbc, 300, 3000], hemi: [0xd8e6ff, 0xc9a26a, 1.1], shadowCenter: [0, 30, 0], shadowSize: 120 });
  terrain({ size: 4000, seg: 80, parent: py, height: (x, z) => Math.hypot(x, z) < 120 ? 0 : 14 * fbm(x * 0.005, z * 0.005), color: () => '#e2b77a' });
  const steps = 24; for (let i = 0; i < steps; i++) box(100 - i * 4, 2.6, 100 - i * 4, i % 2 ? 0xd9b77e : 0xcfac72, 0, i * 2.6, 0, py);
  sign(['PYRAMID FITNESS', 'OPEN 24/7 · 4,000 YEARS'], 40, 7, { bg: '#d9483b', fg: '#ffffff', border: '#ffffff' }, 0, 20, 30.5, py);
  const climbers = []; for (let i = 0; i < 22; i++) { const p = person({ rand: rng(800 + i), shirt: [0xff3d7f, 0x3dd0ff, 0xd9ff3d, 0xff8a3d][i % 4], pants: 0x1d1d1d, shortSleeve: true }, py); climbers.push(p); p.userData.lvl = 2 + (i * 7) % 18; p.userData.x = -30 + (i * 13) % 60; }
  const pyUpdate = (t) => climbers.forEach((p, i) => { const L = p.userData.lvl + ((t * 0.4 + i * 0.37) % 1); const lv = Math.floor(L); p.position.set(p.userData.x * (1 - lv / 26), lv * 2.6 + 2.6, 50 - lv * 2 - 0.6); p.rotation.y = Math.PI; p.walk(t * 9 + i, 1.2); p.userData.legL.rotation.x -= 0.6; p.userData.legR.rotation.x -= 0.6; });
  const water2 = new THREE.Group(); water2.position.set(14, 0, 62); py.add(water2); box(3, 1, 1.2, 0xffffff, 0, 0, 0, water2); sign(['SMOOTHIES'], 3, 0.8, { bg: '#2f8a3a', fg: '#ffffff' }, 0, 2.6, 0.62, water2);

  // ---------------- statue at a dealership ----------------
  const dl = defineSet('dealer', DAY);
  terrain({ size: 3000, seg: 40, parent: dl, height: () => 0, color: (x, y, z) => Math.abs(z) < 8 ? '#3c3d40' : '#8fb35a' });
  box(120, 0.2, 60, 0x55585e, 0, 0, -40, dl);
  const showroom = new THREE.Group(); showroom.position.set(-30, 0, -60); dl.add(showroom);
  box(50, 10, 20, mat(0xbfe3ff, { transparent: true, opacity: 0.5, roughness: 0.05 }), 0, 0, 0, showroom); box(52, 1.2, 22, 0xf5f5f0, 0, 10, 0, showroom);
  sign('DREAMCAR MOTORS', 30, 4, { bg: '#1f5fc7', fg: '#ffffff' }, 0, 13.6, 11.1, showroom);
  const dc = []; for (let i = 0; i < 24; i++) dc.push({ x: -50 + (i % 12) * 7, y: 0.2, z: -30 - Math.floor(i / 12) * 9, ry: 0 }); carsInstanced(dc, dl, { seed: 31 });
  for (let i = 0; i < 12; i++) { cyl(0.05, 0.05, 6, 0x777777, -54 + i * 9, 0, -22, dl, 6); const fl = mesh(new THREE.ConeGeometry(0.5, 1.6, 3), [0xd9483b, 0x3b6fd9, 0xf2c14e][i % 3], -54 + i * 9, 5.2, -22, dl); fl.rotation.z = Math.PI / 2; }
  const ST = new THREE.Group(); ST.position.set(30, 0, -36); dl.add(ST);
  box(14, 10, 14, 0xc9c2b0, 0, 0, 0, ST);
  const patina = 0x6fae98;
  const statue = person({ shirt: patina, pants: patina, skin: patina, hairColor: patina, shoes: patina, shortSleeve: false, longHair: true, scale: 14 }, ST);
  statue.scale.setScalar(14); statue.position.y = 10; statue.pose({ armR: -2.9, armL: -0.4 });
  const crown = new THREE.Group(); crown.position.set(0, 1.74, 0); statue.add(crown); for (let i = 0; i < 7; i++) { const sp = mesh(new THREE.ConeGeometry(0.03, 0.16, 4), patina, Math.sin(i * 0.5 - 1.5) * 0.12, 0.06, Math.cos(i * 0.5 - 1.5) * 0.12, crown); sp.rotation.set(Math.cos(i * 0.5 - 1.5) * 0.6, 0, -Math.sin(i * 0.5 - 1.5) * 0.6); }
  const saleSign = new THREE.Group(); saleSign.position.set(0, -0.75, 0); statue.userData.armR.add(saleSign);
  box(0.03, 0.5, 0.03, 0x777777, 0, -0.1, 0, saleSign); sign(['SALE', '0% APR'], 0.6, 0.35, { bg: '#d9483b', fg: '#ffffff' }, 0, -0.45, 0.02, saleSign).rotation.x = Math.PI;
  const balloons = []; for (let i = 0; i < 9; i++) { const b = sphere(1.2, mat([0xd9483b, 0x3b6fd9, 0xf2c14e][i % 3], { flatShading: false, roughness: 0.3 }), 20 + i * 3, 13 + (i % 3) * 2, -28, dl, 14); b.scale.y = 1.2; balloons.push(b); }
  dl.userData = {};
  ST.userData.update = (t) => balloons.forEach((b, i) => (b.position.y = 13 + (i % 3) * 2 + Math.sin(t * 1.5 + i) * 0.4));

  // ---------------- the island being towed ----------------
  const is = defineSet('island', { sky: { top: 0x3a86e0, horizon: 0xd8eeff }, sunDir: [0.4, 0.55, 0.5], fog: [0xd6ecfb, 600, 5000], hemi: [0xd6ebff, 0x2a5a7a, 1.1], sun: [0xfff3dc, 2.9], shadowCenter: [0, 0, 0], shadowSize: 160, tilt: 0.85 });
  water({ size: 4000, seg: 100, color: 0x1a6fa8, amp: 0.8, freq: 0.05, parent: is });
  const IL = new THREE.Group(); is.add(IL);
  terrain({ size: 260, seg: 70, parent: IL, height: (x, z) => { const d = Math.hypot(x, z * 1.2); return d < 100 ? 2 + 14 * Math.max(0, 1 - d / 100) * fbm(x * 0.02, z * 0.02) * 1.6 : -4; }, color: (x, y) => y < 2.6 ? '#ecd7a2' : '#5f9e3c' });
  const RI = rng(15); const houses = [];
  for (let i = 0; i < 26; i++) { const a = RI() * 6.28, d = 20 + RI() * 55; const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8; const h = new THREE.Group(); h.position.set(x, 3 + Math.max(0, 14 * (1 - Math.hypot(x, z * 1.2) / 100) * 0.5), z); h.rotation.y = RI() * 6; IL.add(h); box(5, 4, 5, [0xf5f1e6, 0xf2d8b8, 0xd8e8f2][i % 3], 0, 0, 0, h); const rf = mesh(new THREE.ConeGeometry(4.2, 2.6, 4), [0xd9483b, 0xb5532e][i % 2], 0, 5.3, 0, h); rf.rotation.y = Math.PI / 4; houses.push(h); }
  for (let i = 0; i < 30; i++) { const a = RI() * 6.28, d = 10 + RI() * 70; tree(IL, Math.cos(a) * d, Math.sin(a) * d * 0.8, 1.6, { round: true, y: 4 }); }
  const sold = sign(['SOLD'], 30, 8, { bg: '#d9483b', fg: '#ffffff', border: '#ffffff' }, 0, 30, 0, IL); cyl(0.6, 0.6, 26, 0x777777, 0, 4, -0.3, IL);
  const tugs = []; for (let i = 0; i < 4; i++) { const b = new THREE.Group(); b.position.set(-30 + i * 20, 0, -150); is.add(b); box(5, 2.4, 12, 0xd9483b, 0, -0.6, 0, b); box(4, 3, 4, 0xf5f5f0, 0, 1.8, 1, b); cyl(0.6, 0.6, 3, 0x1d1d1d, 0, 4.8, 1, b, 10); const rope = box(0.15, 0.15, 60, 0xc9a35a, 0, 0.8, 34, b); tugs.push(b); }
  IL.userData.update = (t) => { const z = -(t - 38.9) * 3; IL.position.z = z; tugs.forEach((b, i) => { b.position.z = z - 150; b.position.y = Math.sin(t * 1.3 + i) * 0.3; }); };
  // town square on the island (separate small set)
  const sq = defineSet('square', { ...DAY, fog: [0xd6e8fa, 120, 900], shadowSize: 50 });
  terrain({ size: 600, seg: 40, parent: sq, height: () => 0, color: (x, y, z) => Math.abs(x) < 20 && Math.abs(z) < 20 ? '#d8cbb0' : '#6fae46' });
  water({ size: 3000, seg: 30, color: 0x1a6fa8, amp: 0.4, y: -1, parent: sq });
  const church = new THREE.Group(); church.position.set(0, 0, -26); sq.add(church);
  box(14, 12, 12, 0xf5f1e6, 0, 0, 0, church); box(6, 26, 6, 0xf5f1e6, 0, 0, 6, church); const sp2 = mesh(new THREE.ConeGeometry(4.4, 8, 4), 0xb5532e, 0, 30, 6, church); sp2.rotation.y = Math.PI / 4;
  sign(['25:73'], 4.6, 2.4, { bg: '#1d1d1d', fg: '#ff6a3d' }, 0, 21, 9.05, church);
  for (const [x, z, ry] of [[-9, 6, 0.4], [9, 4, -0.5]]) { const st = new THREE.Group(); st.position.set(x, 0, z); st.rotation.y = ry; sq.add(st); cyl(0.08, 0.08, 3, 0x777777, 0, 0, 0, st); sign(['ꝏ⟟⌇ ⍜⏁⌰', '⟒⊑ ⏚⎍⌇ ☌'], 2.6, 1.2, { bg: '#1f5fc7', fg: '#ffffff', font: "'DejaVu Sans', sans-serif" }, 0, 3.0, 0.05, st); }
  const citizens = []; for (let i = 0; i < 12; i++) { const p = person({ rand: rng(900 + i) }, sq); const a = i / 12 * 6.28; p.position.set(Math.cos(a) * 7, 0, 2 + Math.sin(a) * 5); p.rotation.y = -a + Math.PI; citizens.push(p); }
  const flagG = new THREE.Group(); flagG.position.set(14, 0, -8); sq.add(flagG); cyl(0.15, 0.15, 14, 0xdddddd, 0, 0, 0, flagG);
  const flag = sign(['NAME: TBD'], 6, 3.6, { bg: '#ffffff', fg: '#1d1d1d', border: '#1d1d1d' }, 3.1, 12, 0, flagG);
  flagG.userData.update = (t) => { flag.rotation.y = Math.sin(t * 3) * 0.15; };

  // ---------------- shots ----------------
  shot({ t0: 0, t1: 6.8, set: 'plaza', from: [90, 50, 120], to: [70, 40, 90], look: [0, 40, 0], fov: 42, focus: 0.45, update: (t) => { T1.visible = true; pad.visible = false; wasHere.visible = false; tourists.forEach((p) => (p.visible = false)); T1.position.y = smooth(3.4, 6.8, t) * 6; } });
  shot({ t0: 6.8, t1: 10.0, set: 'desert', from: [30, 14, 60], to: [26, 12, 50], look: [-3, 3, 0], fov: 44, focus: 0.5 });
  shot({ t0: 10.0, t1: 16.3, set: 'plaza', from: [7, 2.2, 44], to: [6, 2.0, 38], look: [0, 1.8, 2], fov: 44, focus: 0.5, update: (t) => { T1.visible = false; pad.visible = true; wasHere.visible = true; cranes.forEach((c) => (c.visible = false)); tourists.forEach((p) => (p.visible = true)); }, flash: (t) => [13.4, 14.4, 15.2].some((c) => Math.abs(t - c) < 0.05) ? 0.4 : 0 });
  shot({ t0: 16.3, t1: 19.4, set: 'mall', from: [14, 2.2, 22], to: [12, 2.2, 18], look: [6, 2.4, 8], lookTo: [2, 14, 0], fov: 46, focus: 0.55 });
  shot({ t0: 19.4, t1: 26.1, set: 'mall', from: [30, 8, 34], to: [20, 14, 22], look: [0, 22, 0], lookTo: [0, 28, 0], fov: 46, focus: 0.5 });
  shot({ t0: 26.1, t1: 32.5, set: 'pyramid', from: [90, 30, 150], to: [40, 28, 90], look: [0, 22, 0], lookTo: [0, 24, 30], fov: 44, focus: 0.5, update: pyUpdate });
  shot({ t0: 32.5, t1: 38.9, set: 'dealer', from: [70, 8, 30], to: [56, 12, 14], look: [30, 22, -36], lookTo: [30, 32, -36], fov: 46, focus: 0.5 });
  shot({ t0: 38.9, t1: 45.7, set: 'island', from: [260, 90, 140], to: [200, 70, 40], look: [0, 10, -60], lookTo: [0, 10, -100], fov: 42, focus: 0.5 });
  shot({ t0: 45.7, t1: 52.3, set: 'square', from: [4, 3, 22], to: [2, 3.4, 16], look: [0, 6, -10], lookTo: [0, 16, -18], fov: 46, focus: 0.5, update: (t) => citizens.forEach((p, i) => p.pose({ head: Math.sin(t + i) * 0.2, armL: i % 3 === 0 ? -0.8 : 0 })) });
  shot({ t0: 52.3, t1: 60, set: 'square', from: [6, 2.4, 14], to: [8, 3.0, 8], look: [16, 10, -8], fov: 46, focus: 0.5 });
}
