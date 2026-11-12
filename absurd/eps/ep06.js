// EP06 — A hotel opened at the bottom of the ocean.
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, water, person, crowd, particles, rng, fbm, clamp, smooth, lerp, mat } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const GOLD = '#d9b45a', NAVY = '#0b1a33';

  // fish: one instanced school (body + tail), coloured per fish
  function school(n, colors, size, parent, posFn) {
    const body = new THREE.SphereGeometry(0.5, 8, 6); body.scale(0.45, 0.6, 1.0);
    const tail = new THREE.ConeGeometry(0.35, 0.5, 4); tail.rotateX(-Math.PI / 2); tail.translate(0, 0, -0.65);
    const geo = K.THREE.BufferGeometryUtils ? null : null;
    const im = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: 0.5, flatShading: true }), n);
    const it = new THREE.InstancedMesh(tail, new THREE.MeshStandardMaterial({ roughness: 0.5, flatShading: true }), n);
    const c = new THREE.Color(); for (let i = 0; i < n; i++) { c.set(colors[i % colors.length]); im.setColorAt(i, c); it.setColorAt(i, c); }
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), P2 = new THREE.Vector3(), up = V(0, 1, 0), m4 = new THREE.Matrix4();
    const g = new THREE.Group(); g.add(im, it); parent.add(g); im.frustumCulled = it.frustumCulled = false;
    g.userData.update = (t) => {
      for (let i = 0; i < n; i++) {
        const s = posFn(i, t, P); posFn(i, t + 0.05, P2);
        m4.lookAt(P2, P, up); q.setFromRotationMatrix(m4); S.setScalar(s || size); M.compose(P, q, S); im.setMatrixAt(i, M); it.setMatrixAt(i, M);
      }
      im.instanceMatrix.needsUpdate = it.instanceMatrix.needsUpdate = true;
    };
    g.userData.update(0); return g;
  }

  // ---------------- surface ----------------
  const su = defineSet('surface', { sky: { top: 0x3a86e0, horizon: 0xd8eeff }, sunDir: [0.4, 0.5, -0.6], fog: [0xd6ecfb, 400, 3500], hemi: [0xd6ebff, 0x2a5a7a, 1.1], sun: [0xfff3dc, 2.8], shadowSize: 80, tilt: 0.85 });
  water({ size: 3000, seg: 100, color: 0x1a6fa8, amp: 0.7, freq: 0.05, parent: su });
  const PL = new THREE.Group(); su.add(PL);
  cyl(18, 18, 2.4, 0xe8e8ee, 0, -1, 0, PL, 24); cyl(18.4, 18.4, 0.4, 0xd9b45a, 0, 1.4, 0, PL, 24);
  cyl(5, 5, 12, mat(0xbfe3ff, { transparent: true, opacity: 0.45, roughness: 0.05 }), 0, 1.4, 0, PL, 16);
  cyl(5.4, 5.4, 1, 0xd9b45a, 0, 13.4, 0, PL, 16);
  sign(['LUXSTAY', 'OCEAN FLOOR HOTEL'], 12, 4, { bg: NAVY, fg: GOLD, border: GOLD }, 0, 18.5, 0, PL);
  cyl(0.25, 0.25, 4, 0xd9b45a, 0, 13.4, 0, PL);
  const depth = sign(['▼ 11 km', 'LOBBY'], 3.6, 1.8, { bg: '#ffffff', fg: NAVY, border: NAVY }, 7, 3.6, 12, PL); cyl(0.1, 0.1, 3, 0x777777, 7, 1.6, 11.9, PL);
  const rating = sign(['★ 4.9', 'NO HUMANS', 'FISH ONLY'], 5, 3.6, { bg: '#ffffff', fg: '#8a1f1f', border: '#8a1f1f' }, -6, 4.4, 15, PL); cyl(0.1, 0.1, 3, 0x777777, -6, 1.6, 14.9, PL);
  const guests = []; for (let i = 0; i < 6; i++) { const g = person({ rand: rng(300 + i) }, PL); g.position.set(-10 + i * 2.2, 1.6, 12 + (i % 2) * 1.2); g.rotation.y = Math.PI * 0.9; guests.push(g); const bag = box(0.45, 0.6, 0.25, [0xd9483b, 0x3b6fd9, 0x2e3440][i % 3], 0, -0.9, 0, g.userData.armR); }
  PL.userData.update = (t) => { PL.position.y = Math.sin(t * 0.7) * 0.2; rating.visible = t > 52; depth.visible = t < 52; guests.forEach((g, i) => { g.visible = t > 52; g.pose({ head: 0.3, armL: t > 57 ? -0.4 : 0 }); }); };

  // ---------------- deep sea ----------------
  const dp = defineSet('deep', { sky: { top: 0x020814, horizon: 0x041428, bottom: 0x020814, sunColor: 0x000000, glow: 0 }, sunDir: [0, 1, 0.2], fog: [0x041428, 30, 260], hemi: [0x2a5a9a, 0x02060c, 0.55], sun: [0x6a9ad0, 0.5], shadowSize: 80, tilt: 0.8, exposure: 1.1 });
  terrain({ size: 1200, seg: 100, parent: dp, height: (x, z) => 4 * fbm(x * 0.02, z * 0.02) + Math.max(0, Math.hypot(x, z) - 120) * 0.25, color: (x, y, z) => fbm(x * 0.1, z * 0.1) > 0.55 ? '#3a3f4a' : '#4a4e58' });
  const HT = new THREE.Group(); dp.add(HT);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x0a1424, emissive: 0xffd9a0, emissiveIntensity: 0, roughness: 0.3 });
  box(40, 3, 24, 0xd8dde4, 0, 0, 0, HT);
  for (let f = 0; f < 4; f++) {
    box(36 - f * 4, 5, 20 - f * 2, 0xe8ecf2, 0, 3 + f * 5, 0, HT);
    for (let i = 0; i < 8 - f; i++) for (const s of [-1, 1]) { const w = mesh(new THREE.CircleGeometry(1.0, 16), winMat, -15 + f * 2 + i * 4.2, 5.6 + f * 5, s * (10 - f + 0.05), HT); if (s < 0) w.rotation.y = Math.PI; w.castShadow = false; }
  }
  const dome = mesh(new THREE.SphereGeometry(8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xbfe3ff, { transparent: true, opacity: 0.4, roughness: 0.05 }), 0, 23, 0, HT);
  sign('LUXSTAY', 14, 2.6, { bg: NAVY, fg: GOLD }, 0, 6.2, 12.1, HT);
  const ropeTube = cyl(2.5, 2.5, 600, mat(0xbfe3ff, { transparent: true, opacity: 0.3, roughness: 0.05 }), 0, 23, 0, HT, 12); ropeTube.castShadow = false;
  const car = box(3.6, 3.6, 3.6, 0xd9b45a, 0, 0, 0, HT); car.castShadow = false;
  const hotelLights = []; for (const [x, z] of [[-18, 14], [18, 14], [-18, -14], [18, -14]]) { const l = new THREE.SpotLight(0xffe2b0, 0, 120, 0.7, 0.5, 1.2); l.position.set(x, 4, z); l.target.position.set(x * 2.5, 0, z * 3); HT.add(l, l.target); hotelLights.push(l); }
  const glow = new THREE.PointLight(0xffd9a0, 0, 120, 1.2); glow.position.set(0, 14, 16); HT.add(glow);
  // roof "pool" sign + ladder + swimmer
  sign(['POOL ▸'], 4, 1.4, { bg: '#ffffff', fg: NAVY }, -10, 25, 6.1, HT); cyl(0.08, 0.08, 2, 0x777777, -10, 23, 6, HT);
  for (let k = 0; k < 6; k++) box(1.2, 0.08, 0.08, 0xd8dde4, -6, 23 + k * 0.4, 7, HT); for (const x of [-6.6, -5.4]) box(0.08, 2.6, 0.08, 0xd8dde4, x, 23, 7, HT);
  const swimmer = person({ shirt: 0xd9483b, pants: 0xd9483b }, HT); swimmer.position.set(-8, 23, 6); swimmer.rotation.y = 0.4;
  const goggles = box(0.3, 0.08, 0.05, 0x1d1d1d, 0, 1.68, 0.14, swimmer);
  // fish: small school, then big fish
  const smallF = school(220, [0xffb03b, 0xff6a3d, 0x5fd0ff, 0xf2e14e, 0xffffff], 0.8, dp, (i, t, P) => { const a = t * (0.35 + (i % 7) * 0.03) + i * 1.7; const r = 18 + (i % 13) * 2.2; P.set(Math.cos(a) * r, 8 + (i % 11) * 1.6 + Math.sin(t + i) * 1.2, 14 + Math.sin(a) * r * 0.5); return 0.6 + (i % 5) * 0.15; });
  const bigF = school(9, [0x5a6a7a, 0x6a7a8a], 4, dp, (i, t, P) => { const a = -t * 0.18 + i * 0.7; P.set(Math.cos(a) * (40 + i * 4), 12 + i * 2, Math.sin(a) * (34 + i * 3)); return 3.5 + (i % 3); });
  dp.userData = {};
  const lightsOn = (t) => smooth(24.8, 25.2, t);
  HT.userData.update = (t) => {
    const on = lightsOn(t); winMat.emissiveIntensity = on * 1.6; hotelLights.forEach((l) => (l.intensity = on * 900)); glow.intensity = on * 350;
    const cy = 23 + 300 - ((t * 9) % 300); car.position.set(0, cy, 0);
    smallF.visible = t > 27.4; bigF.visible = t > 30.3;
  };

  // ---------------- hotel room ----------------
  const rm = defineSet('room', { sky: { top: 0x000000, horizon: 0x000000 }, hemi: [0xfff2e0, 0x5a4a3a, 0.55], sun: [0x000000, 0], tilt: 0.7, exposure: 1.05 });
  box(10, 0.2, 10, 0x6b4a3a, 0, -0.2, 0, rm); box(10, 4, 0.3, 0xe8dcc6, 0, 0, -5, rm); box(0.3, 4, 10, 0xdccfb6, -5, 0, 0, rm); box(0.3, 4, 10, 0xdccfb6, 5, 0, 0, rm); box(10, 0.2, 10, 0xf2ece0, 0, 4, 0, rm);
  const port = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: 0x01040a })); port.position.set(0, 2.1, -4.83); rm.add(port);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.14, 8, 32), mat(0xd9b45a, { metalness: 0.6, roughness: 0.3 })); ring.position.set(0, 2.1, -4.8); rm.add(ring);
  const lampR = new THREE.PointLight(0xffd9a8, 30, 14, 1.4); lampR.position.set(2.5, 3, 1); rm.add(lampR);
  box(3, 0.6, 4.2, 0xf5f5f0, 2.5, 0, 0.5, rm); box(3, 1.4, 0.3, 0x8a6a4a, 2.5, 0, -1.6, rm); box(2.8, 0.25, 0.8, 0xffffff, 2.5, 0.6, -1.0, rm);
  const guest = person({ shirt: 0xf5f5f0, pants: 0x3b6fd9 }, rm); guest.position.set(0.6, 0, -2.2); guest.rotation.y = Math.PI;
  sign(['OCEAN VIEW', 'SUITE'], 1.6, 0.6, { bg: NAVY, fg: GOLD }, -3.5, 2.6, -4.83, rm);
  // room-service elevator interior
  const el = defineSet('lift', { sky: { top: 0x000000, horizon: 0x000000 }, hemi: [0xfff0d8, 0x4a3a2a, 0.9], sun: [0x000000, 0], tilt: 0.7 });
  box(4, 0.2, 4, 0x3a2a20, 0, -0.2, 0, el); box(4, 3.2, 0.2, 0xd9b45a, 0, 0, -2, el); box(0.2, 3.2, 4, 0xc9a44a, -2, 0, 0, el); box(0.2, 3.2, 4, 0xc9a44a, 2, 0, 0, el);
  const lampE = new THREE.PointLight(0xfff0d8, 25, 8, 1.3); lampE.position.set(0, 2.8, 0.5); el.add(lampE);
  const disp = sign(['DEPTH 6,214 m', 'ARRIVAL 2h 07m'], 1.8, 0.7, { bg: '#0b0f1e', fg: '#ff6a3d' }, 0, 2.6, -1.89, el);
  const waiter = person({ shirt: 0xffffff, pants: 0x1d1d1d, hairColor: 0x111111 }, el); waiter.position.set(0.3, 0, -0.6); waiter.pose({ armL: -1.4, armR: -1.4 });
  const tray = new THREE.Group(); tray.position.set(0.3, 1.25, -0.1); el.add(tray); cyl(0.45, 0.45, 0.04, 0xc0c0c0, 0, 0, 0, tray, 16); const cl = mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8d8d8, { metalness: 0.7, roughness: 0.3 }), 0, 0.04, 0, tray);
  const beard = box(0.24, 0.25, 0.1, 0x9a9a9a, 0, 1.52, 0.13, waiter);
  // ---------------- lobby with a whale ----------------
  const lb = defineSet('lobby', { sky: { top: 0x000000, horizon: 0x000000 }, hemi: [0xfff2e0, 0x3a3020, 0.7], sun: [0x000000, 0], tilt: 0.75, exposure: 1.05, fog: [0x0, 60, 120] });
  box(40, 0.2, 30, 0xe8dcc6, 0, -0.2, 0, lb); box(40, 12, 0.4, 0x0b1a33, 0, 0, -15, lb); box(0.4, 12, 30, 0x12223e, -20, 0, 0, lb); box(0.4, 12, 30, 0x12223e, 20, 0, 0, lb);
  for (const x of [-10, 10]) { const p = new THREE.PointLight(0xffe2b0, 160, 40, 1.4); p.position.set(x, 10, 2); lb.add(p); }
  box(10, 1.2, 2, 0xd9b45a, 9, 0, -9, lb); sign('RECEPTION', 6, 1, { bg: NAVY, fg: GOLD }, 9, 4.2, -14.7, lb);
  const recep = person({ shirt: 0x0b1a33, hairColor: 0x2a1d14 }, lb); recep.position.set(9, 0, -10.5); recep.pose({ head: -0.3 });
  const whale = new THREE.Group(); whale.position.set(-4, 5, -2); whale.rotation.y = 0.5; lb.add(whale);
  const wb = sphere(1, 0x4a5f7a, 0, 0, 0, whale, 20); wb.scale.set(5, 4, 12);
  const belly = sphere(1, 0xc9d2dc, 0, -1.6, 1, whale, 16); belly.scale.set(4.2, 2.6, 9.5);
  const wt = mesh(new THREE.ConeGeometry(4, 3, 4), 0x4a5f7a, 0, 0, -13, whale); wt.rotation.x = -Math.PI / 2; wt.scale.set(1.6, 1, 0.25);
  for (const s of [-1, 1]) { sphere(0.45, 0x111111, s * 4.4, 0.6, 7.5, whale, 10); const fin = box(4, 0.3, 2, 0x4a5f7a, s * 5.5, -2.2, 2, whale); fin.rotation.z = s * 0.4; }
  const smile = box(6, 0.15, 0.2, 0x1d1d1d, 0, -1.0, 11.6, whale);
  const review = new THREE.Group(); review.position.set(12, 7, -14.7); lb.add(review);
  sign(['★☆☆☆☆', '"Too bright.', 'Too many humans."', '— Whale, lobby'], 9, 6, { bg: '#ffffff', fg: '#1d1d1d', border: '#d9b45a' }, 0, 0, 0, review);
  const fishQ = school(14, [0xffb03b, 0xff6a3d, 0x5fd0ff, 0xf2e14e], 1.4, lb, (i, t, P) => { P.set(9 + 1.2, 1.4 + (i % 2) * 0.4, -6 + i * 1.6); return 1.2; });
  const shells = []; for (let i = 0; i < 9; i++) { const sh = sphere(0.25, [0xf5d5c0, 0xf2c1a8, 0xffe8d6][i % 3], 7 + (i % 5) * 0.5, 1.4, -8.6 + Math.floor(i / 5) * 0.5, lb, 8); sh.scale.set(1, 0.4, 1); shells.push(sh); }
  lb.userData = {};
  whale.userData.update = (t) => { whale.position.y = 5 + Math.sin(t * 0.8) * 0.3; whale.rotation.z = Math.sin(t * 0.6) * 0.04; review.visible = t > 39.6; fishQ.visible = t > 49; shells.forEach((s) => (s.visible = t > 49.6)); };
  // fish in windows (exterior)
  const winFish = school(30, [0xffb03b, 0xff6a3d, 0x5fd0ff, 0xf2e14e], 1.4, dp, (i, t, P) => { const f = i % 4, k = Math.floor(i / 4); P.set(-15 + f * 2 + k * 4.2, 5.6 + f * 5, 10 - f + 1.2 + Math.sin(t * 2 + i) * 0.2); return 1.1; });
  winFish.userData.update0 = winFish.userData.update;
  winFish.userData.update = (t) => { winFish.visible = t > 46; if (winFish.visible) winFish.userData.update0(t); };

  // ---------------- shots ----------------
  shot({ t0: 0, t1: 6.8, set: 'surface', from: [60, 26, 80], to: [40, 18, 56], look: [0, 8, 0], fov: 42, focus: 0.5 });
  shot({ t0: 6.8, t1: 9.6, set: 'deep', from: [14, 200, 30], to: [14, 60, 40], look: [0, 120, 0], lookTo: [0, 10, 0], fov: 46, focus: 0.5 });
  shot({ t0: 9.6, t1: 12.6, set: 'room', from: [2.5, 2.2, 3.5], to: [2, 2.1, 2.5], look: [0, 2, -4.8], fov: 44, focus: 0.55, band: 0.15 });
  shot({ t0: 12.6, t1: 15.4, set: 'deep', from: [12, 160, 22], to: [10, 150, 20], look: [0, 120, 0], fov: 44, focus: 0.5, update: (t) => { car.position.y = 150 - (t - 12.6) * 2; } });
  shot({ t0: 15.4, t1: 18.3, set: 'lift', from: [1.2, 1.7, 1.8], to: [1.0, 1.65, 1.5], look: [0.2, 1.5, -1], fov: 50, focus: 0.55, band: 0.15 });
  shot({ t0: 18.3, t1: 21.6, set: 'deep', from: [-2, 28, 20], to: [-3, 27, 17], look: [-8, 24, 6], fov: 44, focus: 0.55 });
  shot({ t0: 21.6, t1: 24.6, set: 'room', from: [1.6, 1.8, 0.6], to: [1.4, 1.8, 0.2], look: [0.2, 1.8, -4.8], fov: 46, focus: 0.55, band: 0.15, update: (t) => { guest.pose({ armR: -1.6, armL: -0.3 }); } });
  shot({ t0: 24.6, t1: 27.5, set: 'deep', from: [40, 18, 70], to: [34, 16, 60], look: [0, 10, 0], fov: 44, focus: 0.5 });
  shot({ t0: 27.5, t1: 33.3, set: 'deep', from: [30, 14, 50], to: [50, 22, 80], look: [0, 10, 8], fov: 44, focus: 0.5 });
  shot({ t0: 33.3, t1: 39.7, set: 'lobby', from: [14, 6, 22], to: [10, 5.5, 17], look: [-3, 4, -2], fov: 50, focus: 0.5 });
  shot({ t0: 39.7, t1: 46.1, set: 'lobby', from: [6, 6, 4], to: [7, 6.5, 0], look: [12, 7, -14.7], fov: 46, focus: 0.5, band: 0.16 });
  shot({ t0: 46.1, t1: 49.6, set: 'deep', from: [10, 12, 32], to: [6, 13, 26], look: [-6, 12, 10], fov: 44, focus: 0.5 });
  shot({ t0: 49.6, t1: 52.7, set: 'lobby', from: [14, 3, 2], to: [13, 2.8, 0], look: [9, 1.5, -8], fov: 46, focus: 0.55, band: 0.15 });
  shot({ t0: 52.7, t1: 60, set: 'surface', from: [-2, 5, 26], to: [-4, 4.5, 22], look: [-6, 3.6, 14], fov: 44, focus: 0.55 });
}
