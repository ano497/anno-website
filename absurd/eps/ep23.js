// EP23 — They deliver houses now (retention edit)
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, person, crowd, city, tree, particles, rng, fbm, clamp, smooth, lerp, mat, DATA } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const T = (i) => DATA.subs[i][0];
  const sm = (c, o = {}) => mat(c, { flatShading: false, roughness: 0.6, ...o });
  const TEAL = '#12a38a';
  const brand = (lines, w, h, x, y, z, p, o = {}) => sign(lines, w, h, { bg: TEAL, fg: '#ffffff', border: '#ffffff', ...o }, x, y, z, p);
  // a little house
  function house(col = 0xf2e2c4, roof = 0xd9483b) {
    const g = new THREE.Group();
    box(6, 4, 5, sm(col), 0, 0, 0, g);
    const r = mesh(new THREE.ConeGeometry(4.8, 2.6, 4), sm(roof), 0, 5.3, 0, g); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.78);
    box(1.1, 2, 0.1, sm(0x6b4a2f), 0, 0, 2.52, g);
    for (const x of [-1.9, 1.9]) box(1.1, 1.0, 0.1, sm(0x9fd3ff, { roughness: 0.15 }), x, 2.1, 2.52, g);
    box(0.7, 1.4, 0.7, sm(0x8a5a3a), 1.6, 5.2, -0.6, g);
    return g;
  }
  // a quad drone
  function drone() {
    const g = new THREE.Group(); box(1.6, 0.4, 1.6, sm(0x1b1b1f), 0, 0, 0, g);
    const rotors = [];
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) { box(1.2, 0.1, 0.14, sm(0x333333), x / 2, 0.2, z / 2, g).rotation.y = Math.atan2(z, x); const rr = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16), new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); rr.rotation.x = -Math.PI / 2; rr.position.set(x, 0.35, z); g.add(rr); rotors.push(rr); }
    const light = sphere(0.12, sm(0x2fe0a0, { emissive: 0x2fe0a0 }), 0, -0.25, 0.8, g, 8);
    return g;
  }
  // house carried by 4 drones with cables
  function carried(col, roof) {
    const g = new THREE.Group(); const h = house(col, roof); g.add(h); h.position.y = -10;
    for (const [x, z] of [[-3, -2.5], [3, -2.5], [-3, 2.5], [3, 2.5]]) { const d = drone(); d.position.set(x * 1.3, 0, z * 1.3); g.add(d); const c = box(0.05, 6, 0.05, sm(0x222222), x * 1.15, -6, z * 1.15, g); c.castShadow = false; }
    return g;
  }
  const C = { sky: { top: 0x3f86e0, horizon: 0xd6ecff }, sunDir: [0.45, 0.6, 0.4], fog: [0xcfe6fa, 300, 3000], hemi: [0xd8ecff, 0x7a9a50, 0.85], sun: [0xfff2d8, 2.6], shadowCenter: [0, 0, 0], shadowSize: 120, tilt: 0.35, sat: 1.45, exposure: 0.88 };

  // ---------------- suburb ----------------
  const sb = defineSet('suburb', C);
  terrain({ size: 3000, seg: 60, parent: sb, height: () => 0, color: (x, y, z) => Math.abs(z) < 4 ? '#55585e' : (fbm(x * 0.05, z * 0.05) > 0.5 ? '#7cbf4a' : '#6aae3e') });
  const cols = [0xf2e2c4, 0xd8e8f2, 0xf2d0c0, 0xe6f2d8, 0xfff2c8], roofs = [0xd9483b, 0x3b4a6a, 0x6b4a2f, 0x2f8a3a];
  const lots = []; for (let i = -6; i <= 6; i++) for (const z of [-14, 14]) { if (i === 0 && z === 14) { lots.push(null); continue; } const h = house(cols[(i + 20) % 5], roofs[(i + 21) % 4]); h.position.set(i * 14, 0, z); h.rotation.y = z > 0 ? Math.PI : 0; sb.add(h); lots.push(h); if (i !== -1 && i !== 0 && i !== -3 && i !== -4) tree(sb, i * 14 + 5, z * 1.35, 1.4, { round: true }); }
  const emptyLot = sign(['YOUR HOUSE', 'ARRIVING 7:00 AM'], 6, 2.4, { bg: '#ffffff', fg: TEAL, border: TEAL }, 0, 3, 13, sb); emptyLot.rotation.y = Math.PI; cyl(0.1, 0.1, 2, 0x777777, 0, 0, 13.1, sb);
  const fam = []; for (let i = 0; i < 3; i++) { const p = person({ rand: rng(600 + i), scale: i === 2 ? 0.6 : 1 }, sb); p.position.set(-2 + i * 1.6, 0, 8); p.rotation.y = 0; fam.push(p); }
  const phone = brand(['📱 HOUSEDROP', '1 HOUSE · $199', 'ARRIVES 7 AM'], 6, 4, -9, 7, 8, sb, { font: "'DejaVu Sans', 'Noto Color Emoji', sans-serif" });
  // incoming house
  const inbound = carried(0xf2e2c4, 0xd9483b); sb.add(inbound);
  const upside = house(0xd8e8f2, 0x3b4a6a); upside.rotation.z = Math.PI; upside.position.set(28, 7.6, 14); sb.add(upside);
  // stranger's backyard + review
  const yard = new THREE.Group(); yard.position.set(-42, 0, -14); sb.add(yard);
  const wrong = house(0xfff2c8, 0x2f8a3a); wrong.position.set(0, 0, 9); wrong.rotation.y = 0.4; yard.add(wrong); wrong.visible = false;
  const stranger = person({ shirt: 0x6b7a8f, hairColor: 0x8a8a8a }, yard); stranger.position.set(4, 0, 15); stranger.rotation.y = -2.5; stranger.pose({ armR: -1.4 });
  const review = sign(['★☆☆☆☆', '"A house blocked', 'my pool."'], 6, 3.2, { bg: '#ffffff', fg: '#1b1b1f', border: '#f2c14e' }, 4, 6, 16, yard); review.rotation.y = -2.5 + Math.PI;
  const pool = box(5, 0.1, 3, sm(0x4fc0e8, { roughness: 0.1 }), 0, 0.02, 12, yard);

  // ---------------- sky traffic over the city ----------------
  const sk = defineSet('skyline', { ...C, shadowSize: 300 });
  city({ parent: sk, nx: 8, nz: 8, seed: 31, hmax: 70 });
  const fleet = []; const R = rng(4);
  for (let i = 0; i < 26; i++) { const c = carried(cols[i % 5], roofs[i % 4]); c.userData = { x: -200 + R() * 400, z: -200 + R() * 400, y: 95 + R() * 50, sp: 6 + R() * 6, dir: R() > 0.5 ? 1 : -1 }; sk.add(c); fleet.push(c); }
  const fly = (t, stuck) => fleet.forEach((c, i) => { const u = c.userData; const x = stuck ? u.x : ((u.x + t * u.sp * u.dir + 300) % 600 + 600) % 600 - 300; c.position.set(x, u.y + Math.sin(t + i) * (stuck ? 0.6 : 1.2), u.z); c.rotation.z = stuck ? Math.sin(t * 0.8 + i) * 0.05 : 0; c.children.forEach((d) => { if (d.children.length > 4) d.children.forEach((r) => { if (r.geometry && r.geometry.type === 'CircleGeometry') r.rotation.z = t * 40; }); }); });
  const horns = brand(['STRIKE', 'DRONE DRIVERS UNION'], 16, 6, 0, 80, 60, sk, { bg: '#d9483b', border: '#ffffff' });
  const strikers = []; for (let i = 0; i < 12; i++) { const p = person({ rand: rng(700 + i), shirt: 0x12a38a }, sk); p.position.set(-10 + i * 1.8, 0.1, 40); p.rotation.y = Math.PI; if (i % 3 === 0) { cyl(0.04, 0.04, 2.6, 0x8a6a4a, 0.3, 0, 0, p); sign(['ON', 'STRIKE'], 1.2, 0.8, { bg: '#f5f1e6', fg: '#d9483b' }, 0.3, 2.8, -0.03, p).rotation.y = Math.PI; } strikers.push(p); }
  // residents in a stuck house + mail helicopter
  const stuckHome = carried(0xf2d0c0, 0x6b4a2f); stuckHome.position.set(0, 120, 0); sk.add(stuckHome);
  const res = person({ shirt: 0xff8a3d }, stuckHome); res.position.set(1.9, -10 + 1.4, 2.7); res.pose({ armR: -2.6 });
  const eta = brand(['DELIVERY ESTIMATE', '3–5 YEARS'], 10, 4, 0, -1.5, 3.4, stuckHome);

  // ---------------- shots ----------------
  const S = (set, i0, i1, o) => shot({ t0: T(i0), t1: i1 >= DATA.subs.length ? 999 : T(i1), set, focus: 0.5, band: 0.18, ...o });
  S('suburb', 0, 1, { from: [-14, 4, 30], to: [-12, 4, 27], look: [-9, 6, 8], fov: 52, update: () => { inbound.visible = false; } });
  S('suburb', 1, 2, { from: [0, 3, 30], to: [0, 3.2, 27], look: [0, 3, 13], fov: 52, update: () => { inbound.visible = false; fam.forEach((p) => p.pose({ head: -0.2 })); } });
  S('skyline', 2, 4, { from: [40, 110, 160], to: [20, 115, 120], look: [0, 105, 0], fov: 50, update: (t) => fly(t, false) });
  S('suburb', 4, 5, { from: [36, 3, 34], to: [34, 3, 31], look: [28, 4, 14], fov: 50, update: () => { inbound.visible = false; } });
  S('suburb', 5, 7, { from: [-30, 5, 34], to: [-33, 4.5, 30], look: [-42, 3, -2], fov: 52, update: (t) => { inbound.visible = true; const k = smooth(T(5), T(6) + 0.8, t); inbound.position.set(-42, lerp(40, 10.3, k), -5 + 0); fam.forEach((p) => p.pose({ head: 0 })); } });
  S('suburb', 7, 8, { from: [-30.5, 3.4, 10], to: [-31, 3.4, 9.2], look: [-38, 4.6, 1.5], fov: 50, update: () => { inbound.position.set(-42, 10.3, -5); } });
  S('skyline', 8, 9, { from: [10, 3, 56], to: [8, 3.2, 52], look: [0, 4, 40], lookTo: [0, 30, 0], fov: 52, update: (t) => fly(t, true) });
  S('skyline', 9, 10, { from: [40, 128, 80], to: [50, 135, 100], look: [0, 112, 0], fov: 52, update: (t) => fly(t, true) });
  S('skyline', 10, 99, { from: [12, 118, 22], to: [10, 117, 18], look: [0, 112, 0], fov: 50, update: (t) => { fly(t, true); stuckHome.position.y = 120 + Math.sin(t) * 0.5; } });
}
