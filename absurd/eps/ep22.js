// EP22 — Gravity is now a subscription (retention edit)
export async function build(K) {
  const { THREE, scene, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, person, crowd, city, tree, particles, rng, fbm, clamp, smooth, lerp, mat, DATA } = K;
  const T = (i) => DATA.subs[i][0];
  const sm = (c, o = {}) => mat(c, { flatShading: false, roughness: 0.6, ...o });
  const PURPLE = '#7b3fe4';
  const brand = (lines, w, h, x, y, z, p, o = {}) => sign(lines, w, h, { bg: PURPLE, fg: '#ffffff', border: '#ffd23f', ...o }, x, y, z, p);

  const C = { sky: { top: 0x3f86e0, horizon: 0xd6ecff }, sunDir: [0.4, 0.62, 0.45], fog: [0xcfe6fa, 250, 2500], hemi: [0xd8ecff, 0x7a9a50, 0.85], sun: [0xfff2d8, 2.6], shadowCenter: [0, 0, 0], shadowSize: 70, tilt: 0.35, sat: 1.45, exposure: 0.88 };
  const pk = defineSet('park', C);
  city({ parent: pk, nx: 7, nz: 7, seed: 91, hmax: 55, skip: (x, z) => Math.abs(x) < 50 && Math.abs(z) < 50 });
  terrain({ size: 100, seg: 30, parent: pk, height: () => 0.05, color: (x, y, z) => fbm(x * 0.1, z * 0.1) > 0.5 ? '#7cbf4a' : '#6aae3e' });
  for (let i = 0; i < 16; i++) tree(pk, -40 + (i % 8) * 11, i < 8 ? -36 : 36, 1.5, { round: true, leaf: 0x4f9a3c });
  // floating people
  const R = rng(7), flo = [];
  for (let i = 0; i < 26; i++) { const p = person({ rand: rng(100 + i) }, pk); p.userData.base = [-9 + R() * 18, -6 + R() * 16]; p.userData.ph = R() * 6; p.userData.h = 1.5 + R() * 6; flo.push(p); }
  const floatAll = (t, on) => flo.forEach((p, i) => { const [x, z] = p.userData.base; const k = on; p.position.set(x + Math.sin(t * 0.4 + i) * k, k * (p.userData.h + Math.sin(t * 1.2 + p.userData.ph) * 0.6), z); p.rotation.set(k * Math.sin(t * 0.6 + i) * 0.6, i, k * Math.cos(t * 0.5 + i) * 0.5); p.pose({ armL: -1.6 * k + Math.sin(t * 3 + i) * 0.3 * k, armR: -1.8 * k, armLz: 0.5 * k, armRz: -0.5 * k }); });
  const board = new THREE.Group(); board.position.set(0, 0, -22); pk.add(board);
  for (const x of [-6, 6]) cyl(0.4, 0.4, 9, 0x777777, x, 0, 0, board);
  const gplan = brand(['GRAVITY+', '$9.99 / MONTH', 'free plan: float 10 min/hr'], 18, 8, 0, 13, 0.5, board);
  const adBoard = sign(['AD · 0:30', 'SKIP ▸▸ (premium)'], 18, 8, { bg: '#1b1b1f', fg: '#ffd23f', border: '#ffffff' }, 0, 13, 0.55, board);
  // benches with people tied on
  const benches = [];
  for (let i = 0; i < 3; i++) { const b = new THREE.Group(); b.position.set(-8 + i * 8, 0, 10); pk.add(b); box(3, 0.2, 0.9, sm(0x8a5a2a), 0, 0.8, 0, b); box(3, 0.9, 0.15, sm(0x8a5a2a), 0, 1.0, -0.4, b); for (const x of [-1.3, 1.3]) box(0.12, 0.8, 0.8, sm(0x333333), x, 0, 0, b);
    const p = person({ rand: rng(300 + i), shirt: [0x2e3440, 0x6b7a8f, 0x9a6b4a][i] }, b); p.userData.tie = true; b.userData.p = p;
    const rope = box(0.04, 1, 0.04, sm(0xd8c08a), 0, 0, 0, b); b.userData.rope = rope; benches.push(b); }
  const benchUp = (t) => benches.forEach((b, i) => { const p = b.userData.p; const h = 1.8 + Math.sin(t * 1.4 + i) * 0.3; p.position.set(Math.sin(t + i) * 0.3, h, 0.2); p.rotation.set(Math.sin(t + i) * 0.4, 0, Math.cos(t * 0.8 + i) * 0.4); p.pose({ armL: -1.2, armR: -2.8, armRz: -0.3 }); const r = b.userData.rope; r.scale.y = h; r.position.set(p.position.x * 0.5, 0.9 + h / 2 - 0.5, 0.1); });
  // basketball court
  const ct = new THREE.Group(); ct.position.set(26, 0, 8); pk.add(ct);
  box(16, 0.06, 26, sm(0xd98c55), 0, 0.05, 0, ct); box(0.1, 0.07, 26, sm(0xffffff), 0, 0.06, 0, ct);
  for (const z of [-12, 12]) { cyl(0.12, 0.12, 4, 0x777777, 0, 0, z, ct); box(1.8, 1.1, 0.08, sm(0xffffff), 0, 4, z * 0.97, ct); const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 20), sm(0xff6a1a)); hoop.rotation.x = Math.PI / 2; hoop.position.set(0, 3.6, z * 0.93); ct.add(hoop); }
  const players = []; for (let i = 0; i < 6; i++) { const p = person({ rand: rng(400 + i), shirt: i % 2 ? 0xd9483b : 0x3b6fd9, shortSleeve: true }, ct); players.push(p); }
  const ball = sphere(0.24, sm(0xe8762a), 0, 0, 0, ct, 14);
  const hoopUp = (t) => { players.forEach((p, i) => { const k = 1; p.position.set(-4 + (i % 3) * 4, 2 + i * 1.3 + Math.sin(t * 1.3 + i) * 0.8, -4 + Math.floor(i / 3) * 8); p.rotation.set(Math.sin(t + i) * 0.6, i, Math.sin(t * 0.7 + i) * 0.8); p.pose({ armL: -2.4, armR: -2.6 }); }); ball.position.set(Math.sin(t) * 3, 9 + Math.sin(t * 2) * 1.5, Math.cos(t) * 2); };
  // birds
  const birds = particles(80, (i, t, v) => { const a = t * 0.8 + i * 0.4; v.set(Math.cos(a * (1 + (i % 3) * 0.2)) * (6 + i % 7), 8 + Math.sin(a * 3 + i) * 2 + (i % 5), Math.sin(a) * (6 + i % 5) - 4); }, { color: 0x1b1b1f, size: 0.35, opacity: 0.9, square: true }, pk);
  // the gym HQ tower that floats away
  const hq = new THREE.Group(); hq.position.set(-30, 0, -10); pk.add(hq);
  box(14, 40, 14, sm(0x7b3fe4, { roughness: 0.4 }), 0, 0, 0, hq); box(14.4, 2, 14.4, sm(0xffd23f), 0, 40, 0, hq);
  brand(['GRAVITY CO.', 'HQ'], 12, 4, 0, 34, 7.1, hq);
  const base = box(15, 1.2, 15, sm(0x8a8478), -30, 0, -10, pk);
  const expired = sign(['SUBSCRIPTION', 'EXPIRED'], 9, 3.2, { bg: '#d9483b', fg: '#ffffff', border: '#ffffff' }, 0, 24, 7.12, hq);
  // final: everyone holding on to poles
  const holders = []; for (let i = 0; i < 8; i++) { const g = new THREE.Group(); g.position.set(-10 + i * 2.8, 0, 4); pk.add(g); cyl(0.07, 0.07, 3.2, 0x9aa0a8, 0, 0, 0, g, 8); const p = person({ rand: rng(500 + i) }, g); g.userData.p = p; holders.push(g); }
  const holdUp = (t, on) => holders.forEach((g, i) => { g.visible = on; const p = g.userData.p; p.position.set(0.3, 2.4, 0); p.rotation.set(0, 0, -Math.PI / 2 + Math.sin(t * 3 + i) * 0.15); p.pose({ armL: 0, armR: 0, armLz: 1.4, armRz: -1.4 }); p.userData.legL.rotation.x = Math.sin(t * 5 + i) * 0.3; p.userData.legR.rotation.x = -Math.sin(t * 5 + i) * 0.3; });

  // ---------------- shots ----------------
  const vis = (o) => { flo.forEach((p) => (p.visible = !!o.float)); benches.forEach((b) => (b.visible = !!o.bench)); ct.visible = !!o.court; birds.visible = !!o.birds; adBoard.visible = !!o.ad; gplan.visible = !o.ad; expired.visible = !!o.expired; };
  const S = (i0, i1, o) => shot({ t0: T(i0), t1: i1 >= DATA.subs.length ? 999 : T(i1), set: 'park', focus: 0.5, band: 0.18, ...o, update: (t, u, e) => { vis(o); holdUp(t, !!o.hold); if (o.float) floatAll(t, o.floatK ? o.floatK(t) : 1); if (o.bench) benchUp(t); if (o.court) hoopUp(t); hq.position.y = o.hqUp ? Math.pow(Math.max(0, t - T(10)), 1.6) * 6 : 0; o.up && o.up(t, u, e); } });
  S(0, 1, { from: [-18, 4, 30], to: [-22, 6, 26], look: [-30, 26, -10], fov: 50, expired: false });
  S(1, 2, { from: [0, 5, -6], to: [0, 6, -9], look: [0, 12, -22], fov: 52 });
  S(2, 3, { float: true, floatK: (t) => smooth(T(2), T(2) + 1.2, t), from: [2.5, 1.6, 17], to: [2, 2.2, 14.5], look: [0, 4.5, 2], fov: 56 });
  S(3, 4, { bench: true, from: [1, 2.4, 20], to: [0.5, 2.4, 18.5], look: [0, 2.2, 10], fov: 50 });
  S(4, 5, { court: true, from: [42, 5, 10], to: [40, 6, 9], look: [26, 6, 8], fov: 56 });
  S(5, 7, { float: true, ad: true, floatK: (t) => smooth(T(6), T(6) + 0.8, t), from: [3, 3, 14], to: [2, 4, 10], look: [0, 10, -22], fov: 56 });
  S(7, 8, { float: true, ad: true, from: [0, 9, 6], to: [0, 10, 4], look: [0, 12, -22], fov: 52 });
  S(8, 9, { float: true, birds: true, from: [10, 8, 16], to: [8, 9, 14], look: [0, 8, -2], fov: 52 });
  S(9, 11, { expired: true, hqUp: true, from: [-10, 3, 34], to: [-12, 3, 30], look: [-30, 22, -10], lookTo: [-30, 50, -10], fov: 52 });
  S(11, 99, { hold: true, from: [-3, 2.8, 10], to: [-3, 2.8, 9], look: [-4, 2.4, 4], fov: 52 });
}
