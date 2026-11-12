// EP03 — Someone bought the ocean.
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, textTex, terrain, water, person, crowd, city, tree, particles, rng, fbm, clamp, smooth, lerp, mat } = K;
  const BLUE = '#0f5fb8', YEL = '#ffd23f';
  const bbSign = (lines, w, h, x, y, z, p, o = {}) => sign(lines, w, h, { bg: BLUE, fg: '#ffffff', border: YEL, ...o }, x, y, z, p);

  // ---------------- beach ----------------
  const be = defineSet('beach', { sky: { top: 0x3a86e0, horizon: 0xd8eeff }, sunDir: [0.3, 0.6, -0.5], fog: [0xd6ecfb, 400, 3000],
    hemi: [0xd6ebff, 0xc9b48a, 1.15], sun: [0xfff3dc, 3.0], shadowCenter: [0, 0, 0], shadowSize: 90, tilt: 0.85 });
  const shoreZ = (x) => -10 + Math.sin(x * 0.02) * 4;
  terrain({ size: 1600, seg: 200, parent: be, height: (x, z) => { const d = z - shoreZ(x); return d < 0 ? -2 + d * 0.06 : Math.min(9, d * 0.08 + Math.max(0, d - 70) * 0.1) + (fbm(x * 0.05, z * 0.05) - 0.5) * 0.6; },
    color: (x, y, z) => y > 7 ? '#7aa04a' : y > -0.4 ? (fbm(x * 0.2, z * 0.2) > 0.5 ? '#efd9a6' : '#e8cf98') : '#d8c08a' });
  const hAt = (x, z) => { const d = z - shoreZ(x); return d < 0 ? 0 : Math.min(9, d * 0.08 + Math.max(0, d - 70) * 0.1); };
  // two oceans: premium waves (left of the rope) and the free flat side
  const wPrem = water({ size: 800, sizeZ: 900, seg: 80, color: 0x1f86c2, amp: 1.0, freq: 0.08, x: -400, z: -460, y: -0.3, parent: be });
  const wFree = water({ size: 800, sizeZ: 900, seg: 20, color: 0x3d93c4, amp: 0.0, x: 400, z: -460, y: -0.3, parent: be });
  // buoy rope between them
  for (let i = 0; i < 40; i++) { const b = sphere(0.45, i % 2 ? 0xffffff : 0xd9483b, 0, 0.2, -12 - i * 4, be, 8); }
  const PS = new THREE.Group(); PS.position.set(-8, 0, -12); be.add(PS); cyl(0.12, 0.12, 4.5, 0x666666, 0, -1, 0, PS);
  bbSign(['WAVES', 'PREMIUM ONLY'], 4, 2, 0, 3.2, 0.06, PS);
  const FS = new THREE.Group(); FS.position.set(8, 0, -12); be.add(FS); cyl(0.12, 0.12, 4.5, 0x666666, 0, -1, 0, FS);
  sign(['FREE', 'OCEAN'], 3, 1.6, { bg: '#ffffff', fg: '#555555', border: '#999999' }, 0, 3.0, 0.06, FS);
  // fence + turnstiles + booth
  const FN = new THREE.Group(); FN.position.set(0, hAt(0, 30), 30); be.add(FN);
  for (let i = -60; i <= 60; i++) { if (Math.abs(i) < 3) continue; const h = 3; box(0.12, h, 0.12, 0xdddddd, i, 0, 0, FN); }
  for (const y of [1.2, 2.6]) { box(57, 0.08, 0.08, 0xdddddd, -31.5, y, 0, FN); box(57, 0.08, 0.08, 0xdddddd, 31.5, y, 0, FN); }
  const turn = [];
  for (const x of [-1.8, 0, 1.8]) {
    const g = new THREE.Group(); g.position.set(x, 0, 0); FN.add(g);
    box(0.4, 1.1, 1.2, 0xb8c2cc, -0.55, 0, 0, g); const arm = new THREE.Group(); arm.position.set(-0.3, 0.95, 0); g.add(arm);
    for (let k = 0; k < 3; k++) { const a = box(0.6, 0.06, 0.06, 0xdddddd, 0.3, 0, 0, arm); a.parent.children[k].rotation.x = k * 2.09; }
    turn.push(arm);
  }
  const BO = new THREE.Group(); BO.position.set(-7, hAt(-7, 31), 31); be.add(BO);
  box(4, 3, 3, 0x0f5fb8, 0, 0, 0, BO); box(4.4, 0.4, 3.4, 0xffd23f, 0, 3, 0, BO);
  bbSign(['BLUEBAY', 'SWIM $9/HR'], 4.4, 2, 0, 4.6, 1.6, BO);
  const gate = bbSign(['OCEAN ENTRANCE'], 7, 1.2, 0, 4.2, 0.06, FN);
  for (const x of [-3.4, 3.4]) cyl(0.12, 0.12, 4.8, 0xdddddd, x, 0, 0, FN);
  // giant billboard on the beach
  const BB = new THREE.Group(); BB.position.set(30, hAt(30, 10), 10); BB.rotation.y = -0.3; be.add(BB);
  for (const x of [-8, 8]) cyl(0.5, 0.5, 14, 0x777777, x, 0, 0, BB);
  bbSign(['THE OCEAN™', 'NOW BY BLUEBAY'], 26, 9, 0, 17, 0.6, BB, { borderW: 30 });
  // queue at the turnstiles (beach side z>30)
  const q = []; const rq = rng(5);
  for (let i = 0; i < 160; i++) { const lane = Math.floor(i / 20), k = i % 20; q.push({ x: (lane % 2 ? 19 - k : k) * 0.8 - 8, y: Math.min(9, (36 + lane * 1.6 + 10 - shoreZ(0)) * 0.08) * 0 + 0.0, z: 33 + lane * 1.6, ry: Math.PI }); }
  const queue = crowd(q, be, { seed: 6 });
  queue.userData.set((p) => ({ ...p, y: Math.min(9, (p.z - shoreZ(p.x)) * 0.08) }));
  // swimmers + a parking meter in the water
  const swim = [];
  for (let i = 0; i < 8; i++) { const s = person({ rand: rng(50 + i), shirt: 0xf2c14e }, be); s.position.set(-30 + i * 4.2, -1.3, -26 - (i % 3) * 5); s.pose({ armL: -2.6, armR: -0.4 }); swim.push(s); }
  const MT = new THREE.Group(); MT.position.set(-20, -2, -24); be.add(MT);
  cyl(0.1, 0.1, 3.3, 0x777777, 0, 0, 0, MT); box(0.7, 0.9, 0.5, 0x0f5fb8, 0, 3.3, 0, MT);
  sign(['$9/HR', '00:41'], 0.6, 0.5, { bg: '#0b1630', fg: '#7dff8a' }, 0, 3.8, 0.26, MT);
  const meterSwimmer = person({ shirt: 0xe86fa8, hairColor: 0x2a1d14 }, be); meterSwimmer.position.set(-19, -1.35, -23); meterSwimmer.rotation.y = -0.4; meterSwimmer.pose({ armR: -1.4 });
  // tide schedule board
  const TB = new THREE.Group(); TB.position.set(12, hAt(12, 6), 6); TB.rotation.y = -0.2; be.add(TB);
  cyl(0.15, 0.15, 6, 0x777777, -2, 0, 0, TB); cyl(0.15, 0.15, 6, 0x777777, 2, 0, 0, TB);
  bbSign(['FREE TIDE', 'IN 06:00 · OUT 18:00', 'PREMIUM: ANYTIME'], 6, 3.6, 0, 5, 0.2, TB);
  // the loophole man: bathtub on the sand, own buckets of water
  const LM = new THREE.Group(); LM.position.set(-14, 0, 14); LM.rotation.y = 0.4; be.add(LM);
  LM.userData.update = () => { LM.position.y = Math.min(9, (14 - shoreZ(-14)) * 0.08); };
  const tub = new THREE.Group(); LM.add(tub);
  box(2.4, 0.9, 1.2, 0xf5f5f5, 0, 0.15, 0, tub); for (const [x, z] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) sphere(0.12, 0xc9a35a, x, 0.12, z, tub, 6);
  box(2.2, 0.05, 1.0, 0x56b6e8, 0, 0.92, 0, tub);
  for (let i = 0; i < 6; i++) { const b = cyl(0.25, 0.2, 0.5, i % 2 ? 0xd9483b : 0x3b6fd9, 1.8 + (i % 3) * 0.6, 0, -0.6 + Math.floor(i / 3) * 1.1, LM, 10); }
  sign(['MY WATER', '(PERSONAL)'], 1.6, 0.8, { bg: '#ffffff', fg: '#1d1d1d', border: '#1d1d1d' }, -1.9, 1.3, 0.2, LM);
  cyl(0.04, 0.04, 1.2, 0x8a6a4a, -1.9, 0, 0.16, LM);
  const tubMan = person({ shirt: 0xf1c7a5, hairColor: 0x7a7a7a }, tub); tubMan.position.set(0.3, -0.25, 0); tubMan.rotation.y = -Math.PI / 2;
  tubMan.userData.legL.rotation.x = tubMan.userData.legR.rotation.x = -1.4; tubMan.pose({ armL: -0.3, armR: -2.6 });
  const duck = sphere(0.14, 0xffd23f, -0.6, 1.0, 0.1, tub, 8);
  const lawyer = person({ shirt: 0x2e3440, pants: 0x2e3440, hairColor: 0x111111 }, LM); lawyer.position.set(-6, 0, 5);
  const brief = box(0.5, 0.35, 0.12, 0x5a3a24, 0, -0.85, 0, lawyer.userData.armR);
  const suit = sign(['NOTICE OF', 'LAWSUIT'], 0.7, 0.5, { bg: '#ffffff', fg: '#8a1f1f' }, 0, -0.75, 0.1, lawyer.userData.armL);

  // ---------------- open sea with a toll gate ----------------
  const sea = defineSet('sea', { sky: { top: 0x3a7fd0, horizon: 0xdbeaf5 }, sunDir: [-0.4, 0.5, -0.6], fog: [0xd5e6f2, 500, 4000], hemi: [0xd6ebff, 0x2a5a7a, 1.1], sun: [0xfff3dc, 2.8], shadowCenter: [0, 0, 0], shadowSize: 140, tilt: 0.8 });
  water({ size: 3000, seg: 110, color: 0x1a6fa8, amp: 0.9, freq: 0.05, parent: sea });
  const ship = new THREE.Group(); sea.add(ship);
  const hull = new THREE.Shape(); hull.moveTo(-9, 0); hull.lineTo(9, 0); hull.lineTo(10, 6); hull.lineTo(-10, 6); hull.closePath();
  box(18, 6, 80, 0x1d2b4a, 0, -2, 0, ship); const bow = mesh(new THREE.CylinderGeometry(0.1, 9, 16, 3), 0x1d2b4a, 0, 1, 47, ship); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI; bow.scale.set(1, 1, 0.38);
  box(18.2, 1, 80.2, 0xffffff, 0, 3.5, 0, ship);
  for (let d = 0; d < 5; d++) box(16 - d * 1.5, 3, 62 - d * 7, 0xf5f5f0, 0, 4.5 + d * 3, -4 - d * 2, ship);
  for (let d = 0; d < 5; d++) for (const s of [-1, 1]) for (let i = 0; i < 14 - d * 2; i++) box(0.05, 0.9, 1.4, 0x2a4f7a, s * (8 - d * 0.75 + 0.03), 5.6 + d * 3, -32 + d * 5 + i * 4, ship);
  cyl(2.2, 2.6, 7, 0xd9483b, 0, 19.5, -18, ship, 16); cyl(2.3, 2.3, 1.2, 0x1d1d1d, 0, 26.2, -18, ship, 16);
  const declined = sign(['CARD DECLINED'], 26, 4.5, { bg: '#d9483b', fg: '#ffffff' }, 0, 34, -18, ship); declined.rotation.y = Math.PI / 2;
  ship.position.set(0, 0, 0); ship.rotation.y = 0.15;
  ship.userData.update = (t) => { ship.position.y = Math.sin(t * 0.8) * 0.4; ship.rotation.z = Math.sin(t * 0.6) * 0.012; declined.visible = t > 27.0; };
  // toll barrier buoys + gate + queue of ships
  const TG = new THREE.Group(); TG.position.set(0, 0, 70); sea.add(TG);
  for (let i = -25; i <= 25; i++) sphere(0.8, i % 2 ? 0xffd23f : 0x0f5fb8, i * 5, 0.3, 0, TG, 8);
  for (const x of [-14, 14]) { cyl(1.2, 1.4, 14, 0x0f5fb8, x, -2, 0, TG); }
  box(30, 1.2, 1.2, 0xd9483b, 0, 9, 0, TG);
  bbSign(['BLUEBAY OCEAN TOLL', 'SHIPS: MONTHLY PLAN'], 24, 5, 0, 15, 0.8, TG);
  const smalls = [];
  for (let i = 0; i < 5; i++) { const b = new THREE.Group(); box(4, 2, 12, [0xd9483b, 0xf5f5f0, 0x4caf6a, 0xf2c14e, 0x8e5bd6][i], 0, -0.5, 0, b); box(3, 2, 4, 0xffffff, 0, 1.5, -1, b); b.position.set(-40 + i * 18, 0, 110 + (i % 2) * 12); sea.add(b); smalls.push(b); b.userData.update = (t) => { b.position.y = Math.sin(t + i) * 0.35; }; }

  // ---------------- rain town + bill ----------------
  const rn = defineSet('rain', { sky: { top: 0x5a6574, horizon: 0x9aa3ad }, sunDir: [0.2, 0.8, 0.3], fog: [0x8a939d, 60, 500], hemi: [0xb4bcc6, 0x3a3f46, 1.0], sun: [0xd8dde4, 0.8], shadowSize: 60, tilt: 0.8 });
  city({ parent: rn, nx: 5, nz: 5, seed: 22, hmin: 6, hmax: 14, block: 26, road: 10, colors: [0xd6c4b0, 0xc9b8a0, 0xb8c4cc, 0xe0d2c0] });
  const clouds = new THREE.Group(); rn.add(clouds); const rc = rng(31);
  for (let i = 0; i < 40; i++) { const c = sphere(10 + rc() * 12, mat(0x7a828c, { roughness: 1 }), -120 + rc() * 240, 55 + rc() * 10, -120 + rc() * 240, clouds, 8); c.scale.y = 0.5; c.castShadow = false; }
  particles(5000, (i, t, v) => { const k = (i * 0.618 + t * 1.8) % 1; v.set(-60 + ((i * 37.3) % 120), 50 - k * 50, -60 + ((i * 53.1) % 120)); }, { color: 0xc9d6e6, size: 0.25, opacity: 0.55 }, rn);
  const MB = new THREE.Group(); MB.position.set(3, 0, 18); rn.add(MB);
  cyl(0.08, 0.08, 1.1, 0x555555, 0, 0, 0, MB); box(0.6, 0.5, 0.9, 0x3b6fd9, 0, 1.1, 0, MB);
  const bill = new THREE.Group(); bill.position.set(0, 1.5, 0.6); MB.add(bill);
  box(1.2, 0.02, 0.8, 0xf5f5f0, 0, 0, 0, bill);
  const billS = sign(['BLUEBAY · INVOICE', 'Rain (March): $47.20', 'Puddles: $3.10'], 1.1, 0.7, { bg: '#ffffff', fg: '#0f5fb8' }, 0, 0.02, 0, bill); billS.rotation.x = -Math.PI / 2;
  const reader = person({ shirt: 0xff8a3d }, rn); reader.position.set(3.6, 0, 19.4); reader.rotation.y = Math.PI + 0.4; reader.pose({ armL: -1.2, armR: -1.2, head: 0.4 });
  const umb = (p, col) => { const u = new THREE.Group(); const c = mesh(new THREE.ConeGeometry(0.9, 0.35, 8, 1, true), col, 0, 0.0, 0, u); c.material = mat(col, { side: THREE.DoubleSide }); cyl(0.02, 0.02, 1.0, 0x333333, 0, -1.0, 0, u); u.position.set(0, -0.3, 0); u.rotation.x = Math.PI; p.userData.armR.add(u); return u; };

  // ---------------- living room ----------------
  const lr = defineSet('room', { sky: { top: 0x000000, horizon: 0x000000 }, hemi: [0xfff2e0, 0x5a4a3a, 0.8], sun: [0xfff2e0, 0], tilt: 0.7, exposure: 1.1 });
  box(14, 0.2, 12, 0x8a6a4a, 0, -0.2, 0, lr); box(14, 5, 0.2, 0xe8dcc6, 0, 0, -6, lr); box(0.2, 5, 12, 0xdccfb6, -7, 0, 0, lr);
  const lamp = new THREE.PointLight(0xffd9a8, 60, 20, 1.5); lamp.position.set(2, 4, 0); lr.add(lamp);
  box(4.2, 0.6, 1.4, 0x3b6fd9, 0, 0.3, -4.6, lr); box(4.2, 1.2, 0.4, 0x3b6fd9, 0, 0.6, -5.3, lr); for (const x of [-2.1, 2.1]) box(0.4, 1.0, 1.4, 0x3b6fd9, x, 0.3, -4.6, lr);
  box(3.6, 2.1, 0.12, 0x1d1d1d, -6.9, 1.4, -1, lr).rotation.y = Math.PI / 2;
  const tvS = sign(['BREAKING:', 'RAIN BILLS DOUBLE'], 3.2, 1.8, { bg: '#0f5fb8', fg: '#ffffff' }, -6.82, 2.45, -1, lr); tvS.rotation.y = Math.PI / 2;
  box(1.6, 0.5, 0.9, 0x6b4a2f, 0, 0, -2.6, lr); cyl(0.12, 0.1, 0.2, 0xffffff, 0.3, 0.5, -2.6, lr);
  const sitters = [];
  for (const [x, c, uc] of [[-1.1, 0xd9483b, 0xf2c14e], [0.9, 0x4caf6a, 0xd9483b]]) {
    const p = person({ shirt: c }, lr); p.position.set(x, 0.55, -4.5); p.userData.legL.rotation.x = p.userData.legR.rotation.x = -1.45; p.position.y = 0.25; p.pose({ armR: -2.8 }); umb(p, uc); sitters.push(p);
  }
  const dog = new THREE.Group(); box(0.5, 0.4, 0.9, 0xc9a35a, 0, 0.3, 0, dog); box(0.35, 0.35, 0.4, 0xc9a35a, 0, 0.65, 0.55, dog); dog.position.set(2.5, 0, -2.4); lr.add(dog);
  const dU = new THREE.Group(); const dc = mesh(new THREE.ConeGeometry(0.55, 0.25, 8, 1, true), mat(0x3b6fd9, { side: THREE.DoubleSide }), 0, 1.6, 0, dU); cyl(0.015, 0.015, 0.7, 0x333333, 0, 0.95, 0, dU); dog.add(dU);

  // ---------------- lake ----------------
  const lk = defineSet('lake', { sky: { top: 0x4a8ad8, horizon: 0xe2f0ff }, sunDir: [0.5, 0.5, 0.3], fog: [0xd8ebf7, 300, 2500], hemi: [0xd8ecff, 0x5f7d3a, 1.1], sun: [0xfff4dc, 2.8], shadowSize: 80, tilt: 0.85 });
  terrain({ size: 2000, seg: 140, parent: lk, height: (x, z) => { const d = Math.hypot(x * 0.8, z); return d < 140 ? -4 : Math.min(20, (d - 140) * 0.2) + 8 * fbm(x * 0.01, z * 0.01); }, color: (x, y) => y < -1 ? '#c9b48a' : '#5f9e3c' });
  water({ size: 400, seg: 40, color: 0x2a7fb8, amp: 0.15, y: -0.5, parent: lk });
  for (let i = 0; i < 30; i++) { const a = i / 30 * 6.28; tree(lk, Math.cos(a) * 200, Math.sin(a) * 175, 2.5 + (i % 3) * 0.5); }
  const flag = new THREE.Group(); flag.position.set(0, -0.5, 0); lk.add(flag);
  cyl(0.6, 0.8, 1.5, 0x8a6a4a, 0, -0.5, 0, flag); cyl(0.08, 0.08, 9, 0xdddddd, 0, 0, 0, flag);
  const fA = sign(['INDEPENDENT', 'LAKE'], 4, 2.4, { bg: '#4caf6a', fg: '#ffffff' }, 2.0, 7.6, 0, flag);
  const fB = bbSign(['BLUEBAY', 'LAKES™'], 4, 2.4, 2.0, 7.6, 0, flag);
  flag.userData.update = (t) => { fA.visible = t < 45.8; fB.visible = t >= 45.8; const w = Math.sin(t * 4) * 0.12; fA.rotation.y = fB.rotation.y = w; };

  // ---------------- shots ----------------
  shot({ t0: 0, t1: 6.6, set: 'beach', from: [70, 60, 120], to: [55, 34, 85], look: [10, 8, 0], lookTo: [10, 10, 0], fov: 40, focus: 0.5 });
  shot({ t0: 6.6, t1: 8.5, set: 'beach', from: [40, 30, 60], to: [60, 140, 220], look: [0, 0, -150], fov: 40, focus: 0.45 });
  shot({ t0: 8.5, t1: 11.2, set: 'beach', from: [6, 6.8, 44], to: [5, 6.4, 41], look: [0, 4.4, 30], fov: 42, focus: 0.55, band: 0.14,
    update: (t) => { turn.forEach((a, i) => a.rotation.x = Math.floor((t * 1.6 + i * 0.4)) * 2.09 + smooth(0, 0.3, (t * 1.6 + i * 0.4) % 1) * 2.09); queue.userData.set((p, i) => { const adv = Math.min(1.6, (t - 8.5) * 0.6); return { ...p, z: p.z - (i < 20 ? adv : 0), y: Math.min(9, (p.z - shoreZ(p.x)) * 0.08) }; }); } });
  shot({ t0: 11.2, t1: 14.4, set: 'beach', from: [-14, 1.2, -16], to: [-15, 1.0, -18], look: [-19.5, 1.5, -23.5], fov: 40, focus: 0.55, band: 0.14 });
  shot({ t0: 14.4, t1: 17.0, set: 'beach', from: [0, 9, 14], to: [0, 10, 12], look: [0, 0, -40], fov: 46, focus: 0.55 });
  shot({ t0: 17.0, t1: 20.4, set: 'beach', from: [18, 4, 18], to: [16, 4.5, 15], look: [12, 4.5, 6], fov: 42, focus: 0.5 });
  shot({ t0: 20.4, t1: 23.4, set: 'sea', from: [60, 25, 190], to: [40, 20, 160], look: [0, 8, 70], fov: 42, focus: 0.5 });
  shot({ t0: 23.4, t1: 29.7, set: 'sea', from: [90, 30, 60], to: [75, 28, 40], look: [0, 18, -5], lookTo: [0, 26, -18], fov: 42, focus: 0.5 });
  shot({ t0: 29.7, t1: 33.0, set: 'rain', from: [30, 20, 60], to: [20, 14, 45], look: [0, 10, 0], lookTo: [3, 4, 18], fov: 44, focus: 0.5 });
  shot({ t0: 33.0, t1: 35.9, set: 'rain', from: [3.2, 3.2, 21], to: [3.1, 2.8, 20.3], look: [3, 1.5, 18.6], fov: 40, focus: 0.55, band: 0.15, update: (t) => { bill.position.y = 1.5 + smooth(33, 33.6, t) * 0.4; } });
  shot({ t0: 35.9, t1: 42.1, set: 'room', from: [3, 2.2, 4], to: [2, 2.0, 2.5], look: [0, 1.5, -4.5], fov: 46, focus: 0.55, band: 0.14 });
  shot({ t0: 42.1, t1: 48.5, set: 'lake', from: [18, 6, 30], to: [10, 5, 18], look: [0, 6, 0], fov: 42, focus: 0.5 });
  shot({ t0: 48.5, t1: 55.3, set: 'beach', from: [-9, 3.8, 20.5], to: [-10.5, 3.4, 18.8], look: [-14, 2.6, 14], fov: 40, focus: 0.55, band: 0.14,
    update: (t) => { lawyer.visible = false; tubMan.userData.armR.rotation.x = -2.6 + Math.sin(t * 2) * 0.2; } });
  shot({ t0: 55.3, t1: 60, set: 'beach', from: [-7.5, 3.6, 22.5], to: [-8, 3.4, 21.5], look: [-15, 2.5, 16.2], fov: 48, focus: 0.55, band: 0.14,
    update: (t) => { lawyer.visible = true; const k = smooth(55.3, 57.5, t); lawyer.position.set(-6 + k * 3, 0, 5 - k * 2.5); lawyer.rotation.y = 2.4; lawyer.walk(t * 6, 1 - smooth(57.2, 57.6, t)); lawyer.pose({ armL: t > 57.6 ? -1.4 : 0, armR: lawyer.userData.armR.rotation.x }); } });
}
