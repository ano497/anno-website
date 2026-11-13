// EP21 — Airlines now charge for oxygen (retention edit)
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, person, crowd, particles, rng, fbm, clamp, smooth, lerp, mat, DATA } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const T = (i) => DATA.subs[i][0], E = (i) => DATA.subs[i][1];
  const sm = (c, o = {}) => mat(c, { flatShading: false, roughness: 0.6, ...o });
  const ORANGE = '#ff6a1a', NAVY = '#1b2340';
  const brand = (lines, w, h, x, y, z, p, o = {}) => sign(lines, w, h, { bg: ORANGE, fg: '#ffffff', border: '#ffffff', ...o }, x, y, z, p);

  // ---------------- gate / tarmac ----------------
  const gt = defineSet('gate', { sky: { top: 0x3f86e0, horizon: 0xd6ecff }, sunDir: [0.5, 0.6, 0.4], fog: [0xcfe6fa, 300, 3000], hemi: [0xd8ecff, 0x7a7a70, 0.85], sun: [0xfff2d8, 2.6], shadowSize: 60, tilt: 0.35, sat: 1.4, exposure: 0.88 });
  terrain({ size: 3000, seg: 40, parent: gt, height: () => 0, color: (x, y, z) => z < -30 ? '#7cbf4a' : '#6a6e76' });
  // terminal glass wall + crowd at the gate
  box(80, 12, 0.4, sm(0x9fc8e8, { transparent: true, opacity: 0.4, roughness: 0.05 }), 0, 0, 6, gt);
  box(80, 0.3, 20, sm(0xd8d4cc), 0, 0, 16, gt);
  const banner = brand(['SKYLOW', 'FLIGHTS $1'], 16, 6, -6, 8.5, 6.3, gt);
  const fees = new THREE.Group(); fees.position.set(10, 0, 6.3); gt.add(fees);
  sign(['FEES', 'SEAT ........ $49', 'SEATBELT .... $12', 'WINDOW ....... $9', 'OXYGEN ....... ???'], 9, 8, { bg: '#ffffff', fg: NAVY, border: ORANGE, borderW: 18 }, 0, 5.5, 0, fees);
  const q = []; const r = rng(3); for (let i = 0; i < 90; i++) q.push({ x: -26 + (i % 30) * 1.8 + r() * 0.4, y: 0.3, z: 10 + Math.floor(i / 30) * 2.2, ry: Math.PI });
  crowd(q, gt, { seed: 4 });
  // the plane outside
  const jet = new THREE.Group(); jet.position.set(0, 4, -18); gt.add(jet);
  const body = sm(0xffffff, { roughness: 0.35 }); const f = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 40, 28), body); f.rotation.z = Math.PI / 2; jet.add(f);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), body); nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 1.6, 1); nose.position.x = 20; jet.add(nose);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.42, 2.42, 40, 28, 1, true, Math.PI * 0.4, Math.PI * 0.2), sm(0xff6a1a)); stripe.rotation.z = Math.PI / 2; jet.add(stripe);
  box(8, 0.4, 34, body, -2, -1, 0, jet); const fin = box(5, 7, 0.4, sm(0xff6a1a), -19, 1.2, 0, jet); fin.rotation.z = 0.35;
  sign('SKYLOW', 10, 1.8, { fg: '#ff6a1a' }, 4, 0.6, 2.45, jet);

  // ---------------- cabin ----------------
  const cb = defineSet('cabin', { sky: { top: 0x000000, horizon: 0x000000 }, hemi: [0xfff6ea, 0x6a5a4a, 0.9], sun: [0xfff2e0, 1.2], sunDir: [0.2, 1, 0.3], shadowSize: 14, tilt: 0.35, sat: 1.35, exposure: 0.95, fog: [0x2a2a30, 30, 80] });
  const CW = 6, CL = 40;
  box(CW, 0.2, CL, sm(0x3a4a7a), 0, -0.2, 0, cb); box(CW + 2, 0.2, CL, sm(0xcfc8bc), 0, 3.4, 0, cb);
  for (const s of [-1, 1]) { const w = box(0.3, 3.6, CL, sm(0xf2eee6), s * (CW / 2 + 0.15), -0.2, 0, cb); }
  const lights = []; for (let z = -16; z <= 16; z += 8) { const l = new THREE.PointLight(0xfff2e0, 7, 10, 1.6); l.position.set(0, 2.6, z); cb.add(l); }
  // windows on the left wall
  const winMat = new THREE.MeshBasicMaterial({ color: 0xbfe0ff });
  const wins = []; for (let i = 0; i < 9; i++) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.26, 20), winMat); w.scale.y = 1.4; w.rotation.y = Math.PI / 2; w.position.set(-CW / 2 + 0.01, 1.7, -14 + i * 3.4); cb.add(w); wins.push(w); }
  const fakeWin = sign(['WINDOW', '(picture)'], 0.7, 0.9, { bg: '#ffffff', fg: '#555555', border: '#1b1b1f', borderW: 30 }, -CW / 2 + 0.03, 1.7, -0.4, cb); fakeWin.rotation.y = Math.PI / 2;
  const winTag = sign(['VIEW $9'], 0.9, 0.35, { bg: ORANGE, fg: '#ffffff' }, -CW / 2 + 0.04, 2.35, 3.0, cb); winTag.rotation.y = Math.PI / 2;
  // seats + passengers
  const seats = [], pax = [];
  for (let row = 0; row < 9; row++) for (const x of [-2.1, -1.4, 1.4, 2.1]) {
    const z = -14 + row * 3.4; const s = new THREE.Group(); s.position.set(x, 0, z); cb.add(s);
    box(0.62, 0.45, 0.6, sm(0x1b2340), 0, 0.45, 0, s); box(0.62, 1.1, 0.16, sm(0x1b2340), 0, 0.9, 0.32, s); box(0.5, 0.3, 0.06, sm(0xffffff), 0, 1.75, 0.34, s);
    seats.push(s);
    const p = person({ rand: rng(row * 7 + x * 3 + 50) }, cb); p.position.set(x, 0.42, z - 0.05); p.rotation.y = Math.PI;
    p.userData.legL.rotation.x = p.userData.legR.rotation.x = -1.45; p.position.y = 0.25; pax.push(p);
  }
  // seatbelt coin slot close to camera
  const belt = new THREE.Group(); belt.position.set(1.4, 0.95, 0.9 + 3.4 * 4); cb.add(belt);
  box(0.5, 0.06, 0.12, sm(0x777777, { metalness: 0.7 }), 0, 0, 0, belt); box(0.22, 0.16, 0.08, sm(0xc0c0c0, { metalness: 0.8 }), 0.2, 0.05, 0, belt);
  const beltTag = sign(['INSERT $12'], 0.5, 0.18, { bg: ORANGE, fg: '#ffffff' }, 0.2, 0.22, 0.05, belt);
  // oxygen masks with card readers (drop at T(5))
  const masks = [];
  for (let row = 0; row < 9; row++) for (const x of [-1.75, 1.75]) {
    const g = new THREE.Group(); g.position.set(x, 3.3, -14 + row * 3.4 - 0.2); cb.add(g);
    const tube = box(0.03, 1, 0.03, sm(0xdddddd), 0, -1, 0, g); const cup = cyl(0.12, 0.16, 0.18, sm(0xffd23f), 0, -1.2, 0, g, 12);
    const reader = box(0.26, 0.36, 0.06, sm(0x222222), 0.32, -1.25, 0, g); const scr = sign(['$4/MIN'], 0.22, 0.12, { bg: '#0b1630', fg: '#7dff8a' }, 0.32, -1.0, 0.035, g);
    g.userData = { tube, cup, reader, scr }; masks.push(g);
  }
  const dropMasks = (t) => { const k = smooth(T(5) + 0.6, T(5) + 1.0, t); masks.forEach((g, i) => { const b = Math.sin(t * 6 + i) * 0.05 * (1 - smooth(T(5) + 1.0, T(5) + 2.0, t)); g.userData.tube.scale.y = Math.max(0.01, k); g.userData.tube.position.y = -0.5 * k; g.userData.cup.position.y = -1.0 * k - 0.1 + b; g.userData.reader.position.y = -1.05 * k + b; g.userData.scr.position.y = -0.82 * k + b; g.visible = k > 0.01; }); };
  const o2sign = brand(['PREMIUM O₂', '$4 / MINUTE'], 2.4, 1.0, 0, 2.7, -15.5, cb);
  // breath-holders: puffed cheeks
  const puff = (t) => pax.forEach((p, i) => { const k = t > T(8) && t < T(10) ? 1 : 0; p.userData.head.scale.set(1 + 0.22 * k, 1 + 0.05 * k, 1 + 0.12 * k); });
  // pilot + cockpit door at the front (z = -17)
  box(CW, 3.6, 0.2, sm(0xe8e2d6), 0, -0.2, -18, cb);
  const door = box(1.2, 2.6, 0.12, sm(0xcfc8b8), 0, 0, -17.85, cb);
  const pilot = person({ shirt: 0xffffff, pants: 0x1b2340, hat: 0x1b2340, hairColor: 0x7a7a7a }, cb); pilot.position.set(0, 0, -17.2);
  const landSign = brand(['LANDING', 'PREMIUM ONLY'], 1.3, 0.7, 0, -0.75, 0.15, null); pilot.userData.armR.add(landSign); landSign.rotation.x = Math.PI;
  const cards = []; pax.forEach((p, i) => { const c = box(0.16, 0.1, 0.01, sm([0xf2c14e, 0x3b6fd9, 0xd9483b][i % 3], { metalness: 0.4 }), 0, -0.68, 0.06, p.userData.armR); cards.push(c); c.visible = false; });
  const holdout = pax[18];

  // ---------------- sky: the plane circling forever ----------------
  const sk = defineSet('sky', { sky: { top: 0x2f6fd0, horizon: 0xf2d6b8 }, sunDir: [0.6, 0.25, 0.4], fog: [0xf2d6b8, 400, 3000], hemi: [0xd8ecff, 0x8a6a50, 0.9], sun: [0xffd8a8, 2.4], shadowSize: 40, tilt: 0.3, sat: 1.4, exposure: 0.9 });
  const rc = rng(9); for (let i = 0; i < 40; i++) { const c = sphere(10 + rc() * 12, sm(0xfff6ee, { roughness: 1 }), -300 + rc() * 600, -30 - rc() * 20, -300 + rc() * 600, sk, 12); c.scale.y = 0.45; c.castShadow = false; }
  const jet2 = jet.clone(); jet2.position.set(0, 0, 0); jet2.scale.setScalar(0.6); sk.add(jet2);
  const orbit = (t) => { const a = t * 0.35; jet2.position.set(Math.cos(a) * 60, 6 + Math.sin(t * 0.7) * 2, Math.sin(a) * 60); jet2.rotation.set(0, -a - Math.PI / 2, 0); jet2.rotateX(-0.35); };

  // ---------------- shots ----------------
  const cab = (i0, i1, o) => shot({ t0: T(i0), t1: i1 >= DATA.subs.length ? 999 : T(i1), set: 'cabin', focus: 0.5, band: 0.2, ...o, update: (t, u, e) => { dropMasks(t); puff(t); o.up && o.up(t, u, e); } });
  shot({ t0: T(0), t1: T(1), set: 'gate', from: [-8, 3.0, 24], to: [-7, 3.0, 22], look: [-6, 7, 6], fov: 52, focus: 0.5 });
  shot({ t0: T(1), t1: T(2), set: 'gate', from: [12, 3.0, 18], to: [11.4, 3.2, 16.5], look: [10, 5.5, 6.3], fov: 50, focus: 0.5 });
  cab(2, 3, { from: [1.0, 1.6, 17.2], to: [1.2, 1.5, 16.6], look: [1.4, 0.95, 14.5], fov: 50 });
  cab(3, 4, { from: [-1.4, 1.8, 4.6], to: [-1.8, 1.8, 4.0], look: [-3.0, 2.0, 3.0], fov: 48 });
  cab(4, 5, { from: [-1.4, 1.8, 1.6], to: [-1.8, 1.8, 1.0], look: [-3.0, 1.7, -0.4], fov: 48 });
  cab(5, 7, { from: [0, 2.0, -15.5], to: [0, 2.0, -13.5], look: [0, 1.4, 10], fov: 56 });
  cab(7, 8, { from: [0.6, 2.4, 0.4], to: [0.5, 2.3, -0.4], look: [1.9, 2.2, -4.3], fov: 48 });
  cab(8, 9, { from: [0, 1.6, -8.6], to: [0, 1.6, -8.0], look: [0, 1.2, 4], fov: 50 });
  cab(9, 10, { from: [0, 2.0, 4], to: [0, 2.0, 2], look: [0, 1.6, -17], fov: 50, up: (t) => { pax[22].pose({ armR: -2.8 }); } });
  cab(10, 12, { from: [0, 1.8, -12.5], to: [0, 1.8, -13.6], look: [0, 1.4, -17.2], fov: 50, up: (t) => { door.position.x = smooth(T(10), T(10) + 0.5, t) * 1.2; pilot.visible = t > T(10) + 0.3; pilot.pose({ armR: t > T(11) ? -2.6 : 0 }); landSign.visible = t > T(11); } });
  cab(12, 13, { from: [0, 2.2, -16], to: [0, 2.1, -15], look: [0, 1.2, 4], fov: 54, up: (t) => { pilot.visible = false; cards.forEach((c) => (c.visible = true)); pax.forEach((p, i) => p.pose({ armR: i === 18 ? 0 : -2.7 })); } });
  cab(13, 14, { from: [-0.4, 1.5, -6.2], to: [-0.3, 1.5, -6.6], look: [-1.4, 1.2, -1.2], fov: 44, up: (t) => { cards.forEach((c, i) => (c.visible = i !== 18)); holdout.pose({ armL: -0.6, armR: -0.6 }); } });
  shot({ t0: T(14), t1: 999, set: 'sky', from: [0, 0, 0], look: [0, 0, 0], fov: 44, focus: 0.5, update: (t) => { orbit(t); const p = jet2.position; camera.position.set(p.x * -0.15, p.y + 6, p.z * -0.15); camera.lookAt(p.x, p.y + 2, p.z); } });
}
