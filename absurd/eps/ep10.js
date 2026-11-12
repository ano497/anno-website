// EP10 — An app let people rent out their shadow.
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, water, person, crowd, car, city, tree, particles, rng, fbm, clamp, smooth, lerp, mat } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const APP = '#7b3fe4';
  const HOT = { sky: { top: 0x3f86e0, horizon: 0xfff0d8 }, sunDir: [-0.6, 0.42, 0.25], fog: [0xf6ead6, 300, 2200], hemi: [0xd8e6ff, 0x8a7a60, 0.42], sun: [0xfff0d0, 4.2], shadowCenter: [0, 0, 0], shadowSize: 60, tilt: 0.85, exposure: 1.05 };
  // a ghost: invisible, but still casts a shadow
  const ghostify = (g) => g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.colorWrite = false; o.material.depthWrite = false; o.castShadow = true; } });
  const appTag = (lines, w, h, x, y, z, p) => sign(lines, w, h, { bg: APP, fg: '#ffffff', border: '#ffffff' }, x, y, z, p);

  // ---------------- hot street ----------------
  const st = defineSet('street', HOT);
  terrain({ size: 2000, seg: 40, parent: st, height: () => 0, color: (x, y, z) => Math.abs(z) < 7 ? '#55585e' : '#cfc6b4' });
  city({ parent: st, nx: 6, nz: 2, block: 34, road: 14, seed: 81, hmin: 10, hmax: 24, z: -48, colors: [0xf2e2c4, 0xe8d0b0, 0xf5ead8, 0xdcc4a0] });
  // the renter: a tall-ish man in a hat, with paying customers sitting in his shadow
  const renter = person({ shirt: 0xff8a3d, hat: 0xf2c14e, scale: 1.05 }, st); renter.position.set(0, 0, 12); renter.rotation.y = 0.4; renter.pose({ armR: -1.2 });
  const phone = box(0.1, 0.18, 0.02, 0x111111, 0, -0.62, 0.06, renter.userData.armR);
  appTag(['SHADE', '$4 / HOUR'], 1.6, 0.9, 1.2, 2.2, 12, st);
  cyl(0.05, 0.05, 1.8, 0x777777, 1.2, 0, 11.98, st);
  const customers = []; for (let i = 0; i < 3; i++) { const p = person({ rand: rng(1100 + i) }, st); p.position.set(2.0 + i * 0.7, 0, 12.4 + i * 0.35); p.rotation.y = -1.8; p.userData.legL.rotation.x = p.userData.legR.rotation.x = -1.45; p.position.y = -0.45; customers.push(p); }
  // the basketball player and a queue in his long shadow
  const baller = person({ shirt: 0xd9483b, pants: 0xd9483b, shortSleeve: true, scale: 1.3 }, st); baller.scale.setScalar(1.3); baller.position.set(-20, 0, 14); baller.rotation.y = 1.2;
  const ball = sphere(0.14, mat(0xe8762a, { flatShading: false }), 0, -0.72, 0.1, baller.userData.armL, 14);
  const q = []; for (let i = 0; i < 14; i++) q.push({ x: -18 + i * 0.75, y: 0, z: 13.2 + Math.sin(i) * 0.25, ry: -Math.PI / 2 }); const queue = crowd(q, st, { seed: 22 });
  appTag(['★ TOP HOST', 'SHADE: $90/HR'], 2.4, 1.2, -20, 3.6, 16.5, st);
  const cash = particles(60, (i, t, v) => { const k = (i * 0.618 + t * 0.4) % 1; v.set(-20 + Math.sin(i) * 1.5, 3 + k * 4, 14 + Math.cos(i) * 1.5); }, { color: 0x5fd06a, size: 0.35, opacity: 0.9, square: true }, st);
  // short people's union
  const union = []; for (let i = 0; i < 12; i++) { const p = person({ rand: rng(1200 + i), scale: 0.72 }, st); p.scale.setScalar(0.72); p.position.set(12 + (i % 6) * 1.6, 0, 20 + Math.floor(i / 6) * 1.8); p.rotation.y = Math.PI; union.push(p); if (i % 2 === 0) { cyl(0.04, 0.04, 2.6, 0x8a6a4a, 0.3, 0, 0, p); sign(i % 4 ? ['SHADE', 'FOR ALL'] : ['SHORT', 'BUT', 'SERIOUS'], 1.2, 0.9, { bg: '#f5f1e6', fg: '#1d1d1d' }, 0.3, 2.8, 0.03, p).rotation.y = Math.PI; } }

  // ---------------- skyscraper shade ----------------
  const sk = defineSet('tower', { ...HOT, shadowSize: 240, shadowCenter: [-60, 0, 0], sunDir: [0.75, 0.3, 0.2] });
  terrain({ size: 3000, seg: 40, parent: sk, height: () => 0, color: (x, y, z) => Math.abs(z) % 60 < 10 ? '#55585e' : '#cfc6b4' });
  city({ parent: sk, nx: 8, nz: 4, block: 40, road: 14, seed: 82, hmin: 8, hmax: 18, x: -120, z: 0 });
  const tower = new THREE.Group(); tower.position.set(80, 0, 0); sk.add(tower);
  box(30, 260, 30, mat(0x9fc0dc, { roughness: 0.2, metalness: 0.4 }), 0, 0, 0, tower); box(31, 4, 31, 0xffffff, 0, 260, 0, tower);
  appTag(['LISTED: SHADE', '4 BLOCKS · $1/HR'], 26, 10, 0, 220, 15.2, tower);
  const shadeCrowd = []; const RC = rng(40); for (let i = 0; i < 400; i++) shadeCrowd.push({ x: -10 - RC() * 300, y: 0, z: -14 + RC() * 28, ry: RC() * 6.28 });
  crowd(shadeCrowd, sk, { seed: 41 });
  // cloud listing
  const cl = defineSet('cloud', { ...HOT, shadowSize: 300, sunDir: [0.1, 0.95, 0.1] });
  terrain({ size: 3000, seg: 60, parent: cl, height: (x, z) => 6 * fbm(x * 0.01, z * 0.01), color: (x, y, z) => fbm(x * 0.02, z * 0.02) > 0.5 ? '#8fb35a' : '#7aa04a' });
  const cloud = new THREE.Group(); cloud.position.set(0, 90, 0); cl.add(cloud); const rcl = rng(4);
  for (let i = 0; i < 14; i++) { const s2 = sphere(16 + rcl() * 14, mat(0xffffff, { flatShading: false, roughness: 1 }), -50 + rcl() * 100, rcl() * 12, -30 + rcl() * 60, cloud, 16); s2.castShadow = true; }
  appTag(['☁ CLOUD SHADE', 'FREE'], 40, 16, 0, 46, 40, cloud);
  const cc = []; const RR = rng(5); for (let i = 0; i < 300; i++) cc.push({ x: -50 + RR() * 100, y: 6 * fbm(0, 0) * 0, z: -30 + RR() * 60, ry: RR() * 6.28 });
  const cloudCrowd = crowd(cc, cl, { seed: 44 }); cloudCrowd.userData.set((p) => ({ ...p, y: 6 * fbm(p.x * 0.01, p.z * 0.01) }));

  // ---------------- winter: shadows shipped to Australia ----------------
  const pt = defineSet('port', { sky: { top: 0x8a98aa, horizon: 0xdfe6ee }, sunDir: [0.3, 0.3, 0.6], fog: [0xdfe6ee, 200, 1800], hemi: [0xe8eef6, 0x8a94a4, 1.1], sun: [0xeef2f8, 1.2], shadowSize: 120, tilt: 0.85 });
  water({ size: 3000, seg: 60, color: 0x3a6a8a, amp: 0.5, parent: pt });
  box(200, 3, 40, 0xb8b4ab, -60, -1, 40, pt);
  particles(3000, (i, t, v) => { const k = (i * 0.618 + t * 0.1) % 1; v.set(-80 + ((i * 37.3) % 160), 50 - k * 50, -20 + ((i * 53.1) % 100)); }, { color: 0xffffff, size: 0.5, opacity: 0.85 }, pt);
  const ship = new THREE.Group(); ship.position.set(0, 0, -10); pt.add(ship);
  box(20, 8, 120, 0x1d2b4a, 0, -4, 0, ship); box(18, 10, 14, 0xf5f5f0, 0, 4, -50, ship);
  const crateCols = [0x7b3fe4, 0x5a2fc0, 0x9a6af0];
  for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) for (let l = 0; l < 3; l++) { const c = box(5.6, 2.6, 12, crateCols[(i + k + l) % 3], -6 + l * 6, 4 + k * 2.7, -30 + i * 13, ship); }
  for (let i = 0; i < 6; i++) sign(['SHADOWS', '→ SYDNEY'], 10, 2.4, { bg: '#ffffff', fg: APP }, 9.05, 6.4, -30 + i * 13, ship).rotation.y = Math.PI / 2;
  ship.userData.update = (t) => { ship.position.z = -10 - Math.max(0, t - 39.6) * 3; ship.position.y = Math.sin(t) * 0.3; };
  const wsign = new THREE.Group(); wsign.position.set(-10, 0.5, 26); pt.add(wsign); cyl(0.1, 0.1, 3, 0x777777, 0, 0, 0, wsign);
  sign(['SHADE DEMAND', '▼ 97%'], 3.4, 1.6, { bg: '#ffffff', fg: '#d9483b', border: '#d9483b' }, 0, 3.4, 0.05, wsign);

  // ---------------- Sydney beach: my shadow, alone ----------------
  const sy = defineSet('beach', { ...HOT, sunDir: [0.5, 0.5, 0.4], shadowSize: 20, hemi: [0xd8e6ff, 0xc9b48a, 1.0] });
  terrain({ size: 1600, seg: 80, parent: sy, height: (x, z) => z < -20 ? -2 : Math.min(4, (z + 20) * 0.04), color: () => '#efd9a6' });
  water({ size: 1600, sizeZ: 800, seg: 60, color: 0x1f86c2, amp: 0.7, freq: 0.07, z: -420, y: -0.3, parent: sy });
  const ghost = person({ shirt: 0xffffff, scale: 1 }, sy); ghost.position.set(0, 0.8, 0); ghost.pose({ armR: -2.6, armL: -0.2 }); ghostify(ghost);
  const towel = box(1.2, 0.03, 2.2, 0xd9483b, 1.6, 0.8, 0.5, sy); for (let i = 0; i < 4; i++) box(1.2, 0.035, 0.25, 0xffffff, 1.6, 0.8, -0.3 + i * 0.5, sy);
  const um = new THREE.Group(); um.position.set(3.6, 0.8, -1); sy.add(um); cyl(0.04, 0.04, 2.4, 0xdddddd, 0, 0, 0, um); const umc = mesh(new THREE.ConeGeometry(1.6, 0.6, 12), mat(0xf2c14e, { flatShading: false }), 0, 2.5, 0, um);
  const tallGuy = person({ shirt: 0x2e3440, pants: 0xc2b28f, scale: 1.25 }, sy); tallGuy.scale.setScalar(1.25); tallGuy.position.set(-8, 0.8, 4); tallGuy.rotation.y = 0.9;
  const ghost2 = person({ shirt: 0xffffff }, sy); ghost2.position.set(-6.8, 0.8, 4.8); ghost2.rotation.y = 0.9; ghost2.pose({ armL: -1.0 }); ghostify(ghost2);
  const photoFrame = new THREE.Group(); sy.add(photoFrame);
  // ---------------- final: me, no shadow, sunburnt ----------------
  const me = person({ shirt: 0xf5f5f0, skin: 0xe8705a, pants: 0x4a5568, hairColor: 0x5a3a22 }, st); me.position.set(4, 0, 2); me.rotation.y = 0.2; me.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  const heat = particles(0, (i, t, v) => { const k = (i * 0.618 + t * 0.3) % 1; v.set(2 + ((i * 3.7) % 4), k * 3, 1 + ((i * 1.3) % 2)); }, { color: 0xffe8c0, size: 0.08, opacity: 0.25 }, st);

  // ---------------- shots ----------------
  const streetVis = (o) => { me.visible = !!o.me; heat.visible = !!o.me; union.forEach((p) => (p.visible = !!o.union)); };
  shot({ t0: 0, t1: 6.8, set: 'street', from: [14, 9, 32], to: [8, 6, 24], look: [0, 1, 12], fov: 42, focus: 0.5, update: () => streetVis({}) });
  shot({ t0: 6.8, t1: 9.6, set: 'street', from: [5.5, 1.6, 17], to: [5, 1.5, 15.6], look: [2, 0.8, 12.4], fov: 42, focus: 0.55, band: 0.14, update: () => streetVis({}) });
  shot({ t0: 9.6, t1: 16.3, set: 'street', from: [-6, 4, 26], to: [-10, 3.5, 22], look: [-18, 1.8, 14], fov: 44, focus: 0.55, update: (t) => { streetVis({}); baller.userData.armL.rotation.x = -0.3 + Math.abs(Math.sin(t * 5)) * 0.3; } });
  shot({ t0: 16.3, t1: 22.7, set: 'tower', from: [160, 60, 180], to: [40, 300, 260], look: [80, 160, 0], lookTo: [-90, 0, 0], fov: 44, focus: 0.5 });
  shot({ t0: 22.7, t1: 26.0, set: 'tower', from: [-40, 2.4, 22], to: [-44, 2.4, 20], look: [-60, 1.5, 0], fov: 46, focus: 0.55 });
  shot({ t0: 26.0, t1: 29.3, set: 'cloud', from: [160, 40, 200], to: [120, 34, 160], look: [0, 40, 0], lookTo: [0, 30, 0], fov: 44, focus: 0.5 });
  shot({ t0: 29.3, t1: 35.9, set: 'street', from: [15, 1.6, 30], to: [15, 1.5, 27], look: [15, 1.6, 20], fov: 46, focus: 0.55, band: 0.15, update: (t) => { streetVis({ union: true }); union.forEach((p, i) => { p.position.y = Math.abs(Math.sin(t * 4 + i)) * 0.1; }); } });
  shot({ t0: 35.9, t1: 42.7, set: 'port', from: [60, 26, 80], to: [50, 22, 60], look: [0, 6, -10], lookTo: [0, 6, -30], fov: 44, focus: 0.5 });
  shot({ t0: 42.7, t1: 49.3, set: 'beach', from: [3.5, 4.2, 6], to: [3, 3.8, 5], look: [0.6, 0.8, 0.4], fov: 44, focus: 0.55, flash: (t) => [46.2, 47.4].some((c) => Math.abs(t - c) < 0.05) ? 0.5 : 0 });
  shot({ t0: 49.3, t1: 55.8, set: 'beach', from: [-2, 3, 12], to: [-3, 2.8, 10], look: [-7.4, 0.8, 4], fov: 44, focus: 0.55, update: (t) => { tallGuy.walk(t * 4, 0.6); ghost2.walk(t * 4, 0.6); const k = (t - 49.3) * 0.5; tallGuy.position.x = -8 + k; ghost2.position.x = -6.8 + k; } });
  shot({ t0: 55.8, t1: 60, set: 'street', from: [7, 2.2, 8], to: [6.4, 2.0, 6.6], look: [4, 1.2, 2], fov: 42, focus: 0.55, band: 0.15, update: (t) => { streetVis({ me: true }); renter.visible = false; customers.forEach((p) => (p.visible = false)); me.pose({ armL: -0.3, armR: -0.3, head: 0.1 }); } });
}
