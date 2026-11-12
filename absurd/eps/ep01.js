// EP01 — A megastore opened inside the Grand Canyon.
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, water, person, crowd, car, tree, particles, rng, fbm, clamp, smooth, lerp, mat } = K;

  // ---------------- canyon ----------------
  const canyon = defineSet('canyon', {
    sky: { top: 0x3b78c9, horizon: 0xf3d9b8, bottom: 0xc98f64 }, sunDir: [0.55, 0.5, -0.4],
    fog: [0xe9c9a4, 1500, 9000], hemi: [0xbfd8ff, 0x9a5a35, 1.1], sun: [0xffe6c4, 3.0],
    shadowCenter: [0, -420, 0], shadowSize: 900, tilt: 0.9,
  });
  const cx = (z) => Math.sin(z * 0.0016) * 220;
  const canyonH = (x, z) => {
    const d = Math.abs(x - cx(z)) + (fbm(x * 0.004, z * 0.004) - 0.5) * 260;
    let h = -420 * (1 - smooth(210, 900, d));
    const step = 46; const q = Math.floor(h / step) * step; h = q + (h - q) * 0.22; // terraces
    return h + (fbm(x * 0.02, z * 0.02) - 0.5) * 10 * smooth(150, 400, d);
  };
  const band = ['#b5532e', '#d97a45', '#c4643a', '#e8b07a', '#a8482a', '#d98c55', '#efc893'];
  terrain({
    size: 4200, sizeZ: 5200, seg: 220, segZ: 260, parent: canyon, height: canyonH,
    color: (x, y, z) => y < -405 ? '#c9a27a' : y > -6 ? (fbm(x * 0.01, z * 0.01) > 0.5 ? '#8f8a52' : '#a59b62') : band[(Math.floor(-y / 46) + 7) % band.length],
  });
  // the store: 4 million sq ft box on the canyon floor
  const S = new THREE.Group(); S.position.set(cx(0), -420, 0); canyon.add(S);
  box(420, 42, 260, 0x2f63c7, 0, 0, 0, S);
  box(424, 6, 264, 0xe9eef5, 0, 42, 0, S);
  box(150, 30, 4, 0x13306b, 0, 0, 131, S); // entrance band
  const megaSign = (w, h, x, y, z, p) => sign('MEGAMART', w, h, { bg: '#2f63c7', fg: '#ffd23f', size: 0 | (1024 * h / w * 0.62), font: "'DejaVu Sans', sans-serif" }, x, y, z, p);
  megaSign(240, 30, 0, 64, 132.5, S);
  // rooftop units
  const rr = rng(4);
  for (let i = 0; i < 26; i++) box(10 + rr() * 8, 5, 8 + rr() * 6, 0xc9ced6, -190 + rr() * 380, 48, -110 + rr() * 210, S);
  // sliding doors and people
  for (let i = -2; i <= 2; i++) box(10, 9, 0.6, mat(0x9fd3ff, { roughness: 0.1, metalness: 0.4 }), i * 14, 0, 133, S);
  const r = rng(11), ppl = [];
  for (let i = 0; i < 520; i++) {
    const a = r() * Math.PI, d = 18 + Math.pow(r(), 0.7) * 120;
    ppl.push({ x: Math.cos(a) * d * 1.4, y: 0, z: 140 + Math.sin(a) * d * 0.9, ry: r() * 6.28, ph: r() * 6.28, sp: 0.6 + r() });
  }
  const crowdA = crowd(ppl, S, { seed: 3 });
  // cart corral
  for (let i = 0; i < 6; i++) box(1.0, 1.1, 1.6, mat(0xd8d8d8, { metalness: 0.6, roughness: 0.4 }), 60 + i * 1.3, 0, 150, S);

  // mule train on the canyon floor
  const mules = new THREE.Group(); canyon.add(mules);
  const muleList = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Group();
    box(0.7, 0.8, 1.9, 0x6b4a33, 0, 0.9, 0, m);
    const hd = box(0.4, 0.5, 0.8, 0x5a3d2a, 0, 1.55, 1.1, m); hd.rotation.x = -0.5;
    for (const [x, z] of [[-0.25, 0.7], [0.25, 0.7], [-0.25, -0.7], [0.25, -0.7]]) box(0.16, 0.95, 0.16, 0x4a3324, x, 0, z, m);
    const rider = person({ rand: rng(30 + i) }, m); rider.position.set(0, 0.95, -0.1); rider.scale.multiplyScalar(0.95);
    rider.userData.legL.rotation.set(-1.4, 0, -0.3); rider.userData.legR.rotation.set(-1.4, 0, 0.3); rider.position.y = 0.6;
    const bags = box(0.9, 0.45, 0.5, 0xffd23f, 0, 1.25, -0.8, m);
    mules.add(m); muleList.push(m);
  }
  const trailZ = (i, t) => 520 - i * 4.2 - (t - 13) * 1.1;
  const muleUpdate0 = (t) => muleList.forEach((m, i) => { const z = trailZ(i, t); m.position.set(cx(z) + 40 + Math.sin(z * 0.05) * 4, -420, z); m.rotation.y = Math.PI; m.position.y += Math.abs(Math.sin(t * 5 + i)) * 0.08; });

  const muleUpdate = (t) => { muleUpdate0(t); const z0 = 470; const x0 = cx(z0) + 40; camera.position.set(x0 + 16 - (t - 13) * 0.6, -420 + 5.5, z0 - 14 + (t - 13) * 0.4); camera.lookAt(x0, -418.5, z0 + 6); };
  // single parking space on the rim
  const rimZ = 120, rimX = cx(rimZ) + 760;
  const P = new THREE.Group(); P.position.set(rimX, canyonH(rimX, rimZ) + 0.2, rimZ); canyon.add(P);
  box(9, 0.2, 12, 0x3a3a3c, 0, 0, 0, P);
  box(0.25, 0.04, 6, 0xffffff, -1.6, 0.2, 0, P); box(0.25, 0.04, 6, 0xffffff, 1.6, 0.2, 0, P); box(3.45, 0.04, 0.25, 0xffffff, 0, 0.2, -3, P);
  const pc = car(0xd9483b, P); pc.position.set(0, 0.2, 0.2);
  cyl(0.08, 0.08, 3.2, 0x999999, 3.2, 0, -3.6, P);
  sign(['MEGAMART', 'PARKING'], 2.8, 1.6, { bg: '#2f63c7', fg: '#ffffff' }, 3.2, 3.6, -3.55, P).rotation.y = 0;
  sign(['SPACE 1 OF 1'], 2.8, 0.7, { bg: '#ffd23f', fg: '#13306b' }, 3.2, 2.4, -3.54, P);

  // ---------------- Niagara drive-through ----------------
  const falls = defineSet('falls', {
    sky: { top: 0x4a8ad8, horizon: 0xdcecff }, sunDir: [0.4, 0.6, 0.6], fog: [0xcfe4f5, 300, 2200],
    hemi: [0xd2e6ff, 0x4d6b3d, 1.1], sun: [0xfff3dc, 2.8], shadowCenter: [0, 0, 0], shadowSize: 160, tilt: 0.85,
  });
  const fallR = 70; // horseshoe radius, top at y=52
  const fallsH = (x, z) => {
    const d = Math.hypot(x, z - 20), n = (fbm(x * 0.02, z * 0.02) - 0.5) * 6;
    if (d < fallR && z > -60) return -2;
    if (z < 20) return 52 + n;
    return Math.abs(x) < fallR ? -2 : 52 + n;
  };
  terrain({ size: 1400, seg: 280, parent: falls, height: fallsH, color: (x, y) => y > 45 ? '#5d8f3e' : y > 10 ? '#6d6a5a' : y > -1 ? '#7a6a55' : '#4d4a44' });
  water({ size: 1400, seg: 60, color: 0x2f7ea0, amp: 0.4, y: 0, parent: falls });
  water({ size: 150, sizeZ: 700, seg: 40, color: 0x3a8db0, amp: 0.25, y: 53.5, z: -400, parent: falls });
  // falling water: curved sheet with scrolling streak texture
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#d7eef5'; g.fillRect(0, 0, 128, 512);
  const rs = rng(5); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rs() > 0.5 ? '255,255,255' : '120,180,200'},${0.3 + rs() * 0.5})`; g.fillRect(rs() * 128, rs() * 512, 1 + rs() * 3, 20 + rs() * 90); }
  const ft = new THREE.CanvasTexture(c); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(10, 1); ft.colorSpace = THREE.SRGBColorSpace;
  const sheet = new THREE.Mesh(new THREE.CylinderGeometry(fallR - 8, fallR - 6, 56, 48, 1, true, Math.PI * 0.5, Math.PI), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
  sheet.position.set(0, 26, 20); falls.add(sheet);
  const lip = new THREE.Mesh(new THREE.RingGeometry(fallR - 8, fallR + 12, 48, 1, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8cc9dc, roughness: 0.2, flatShading: true }));
  lip.rotation.x = -Math.PI / 2; lip.position.set(0, 53.8, 20); falls.add(lip);
  sheet.userData.update = (t) => { ft.offset.y = t * 0.9; };
  particles(900, (i, t, v) => { const a = Math.PI * (0.5 + ((i * 0.618) % 1)); const k = ((i * 0.37 + t * 0.25) % 1); const R = fallR - 10 - k * 18; v.set(Math.sin(a) * R, 1 + k * 22 + Math.sin(i) * 3, 20 + Math.cos(a) * R); }, { color: 0xffffff, size: 2.2, opacity: 0.35 }, falls);
  // drive-through booth at the brink + queue of cars
  const DT = new THREE.Group(); DT.position.set(-112, 52, -40); DT.rotation.y = Math.PI; falls.add(DT);
  box(14, 6, 8, 0xd9483b, 0, 0, 0, DT); box(15, 1.2, 9, 0xffd23f, 0, 6, 0, DT);
  sign('BURGERTOWN', 14, 2.6, { bg: '#d9483b', fg: '#ffd23f' }, 0, 9.0, 0, DT);
  sign(['ORDER', 'HERE'], 2.6, 2.2, { bg: '#ffd23f', fg: '#d9483b' }, 10, 3.2, 1, DT);
  cyl(0.15, 0.15, 3, 0x777777, 10, 0, 0.8, DT);
  const qc = [0x3b6fd9, 0xf5f5f0, 0x4caf6a, 0x2e3440, 0xf2c14e, 0x8e5bd6, 0xd9483b];
  for (let i = 0; i < 9; i++) { const cc = car(qc[i % qc.length], DT); cc.position.set(14, 0, -8 - i * 6.2); }
  // pick-up window at the bottom
  const PU = new THREE.Group(); PU.position.set(-30, -1.5, -14); falls.add(PU);
  box(10, 1, 6, 0x8a8a80, 0, 0, 0, PU); box(6, 4, 4, 0xd9483b, 0, 1, 0, PU);
  sign(['PICK UP'], 5, 1.4, { bg: '#ffd23f', fg: '#d9483b' }, 0, 6.0, 2.05, PU);
  const bag = box(1.2, 1.6, 0.8, 0xc9a06a, 0, 0, 0, falls); sign('B', 1.0, 1.0, { fg: '#d9483b' }, 0, 0.8, 0.41, bag);
  const bagUpdate = (t) => { const k = clamp((t - 26.8) / 2.9); bag.position.set(-40 + k * 8, 56 - k * k * 53, -40 + k * 22); bag.rotation.set(t * 3, t * 2, 0);
    camera.position.set(bag.position.x + 10, bag.position.y * 0.8 + 12, bag.position.z + 62); camera.lookAt(bag.position.x - 2, bag.position.y - 1, bag.position.z - 6); };
  const pu = person({ shirt: 0xd9483b, hat: 0xffd23f }, PU); pu.position.set(0, 1, 2.6); pu.pose({ armR: -1.3 });

  // ---------------- geyser gas station ----------------
  const gey = defineSet('geyser', {
    sky: { top: 0x3f7fd6, horizon: 0xdbe8f2 }, sunDir: [-0.5, 0.55, 0.3], fog: [0xd6e3ea, 200, 1500],
    hemi: [0xcfe3ff, 0x8a7a60, 1.1], sun: [0xfff1d6, 2.8], shadowCenter: [0, 0, 0], shadowSize: 60, tilt: 0.8,
  });
  terrain({ size: 1200, seg: 120, parent: gey, height: (x, z) => { const d = Math.hypot(x, z); return Math.max(0, 2.4 - d * 0.08) + (fbm(x * 0.03, z * 0.03) - 0.5) * 3 * smooth(30, 80, d) + smooth(150, 500, d) * 30 * fbm(x * 0.005, z * 0.005); },
    color: (x, y, z) => { const d = Math.hypot(x, z); return d < 10 ? '#e8dcc4' : d < 26 ? (fbm(x * 0.2, z * 0.2) > 0.5 ? '#d9a35a' : '#c97f3d') : d < 34 ? '#b9b29a' : (fbm(x * 0.01, z * 0.01) > 0.45 ? '#7b8a4c' : '#93955a'); } });
  // canopy
  const G = new THREE.Group(); gey.add(G);
  for (const [x, z] of [[-9, -6], [9, -6], [-9, 6], [9, 6]]) cyl(0.35, 0.35, 6.5, 0xeeeeee, x, 0, z, G);
  box(22, 1.4, 16, 0x1f9d55, 0, 6.5, 0, G); box(22.2, 0.5, 16.2, 0xffffff, 0, 6.3, 0, G);
  sign('PETROMAX', 12, 1.3, { bg: '#1f9d55', fg: '#ffffff' }, 0, 7.2, 8.05, G);
  for (const x of [-6, 6]) { box(1.2, 1.8, 0.8, 0xffffff, x, 2.4, 0, G); box(1.24, 0.5, 0.84, 0x1f9d55, x, 3.7, 0, G); }
  const shop = new THREE.Group(); shop.position.set(-22, 2.4, -14); gey.add(shop);
  box(14, 5, 9, 0xf2f2ea, 0, 0, 0, shop); box(14.4, 1, 9.4, 0x1f9d55, 0, 5, 0, shop);
  sign(['CAR WASH', 'FREE · EVERY 90 MIN'], 5.5, 2.6, { bg: '#ffffff', fg: '#1f9d55', border: '#1f9d55' }, 12, 4.5, 6, gey);
  cyl(0.15, 0.15, 3.5, 0x777777, 12, 0, 5.9, gey);
  const gc = car(0x3b6fd9, gey); gc.position.set(2.5, 2.3, 1); gc.rotation.y = Math.PI / 2;
  const driver = person({ shirt: 0xf5f5f0 }, gey); driver.position.set(5.6, 2.3, 3.4); driver.rotation.y = -0.6;
  const ERUPT = 34.0;
  const jet = particles(2600, (i, t, v) => {
    const k = (i / 2600 + t * 0.9) % 1; const on = smooth(ERUPT, ERUPT + 0.5, t);
    const a = i * 2.39996, s = 0.2 + k * 3.2;
    v.set(Math.cos(a) * s * 0.9 + (k > 0.7 ? Math.sin(i) * k * 4 : 0), 2.4 + k * 38 * on - (k > 0.75 ? (k - 0.75) * 30 : 0), Math.sin(a) * s * 0.9);
    if (on < 0.02) v.y = -50;
  }, { color: 0xffffff, size: 0.55, opacity: 0.75 }, gey);
  const steam = particles(500, (i, t, v) => { const k = (i / 500 + t * 0.12) % 1; v.set(Math.sin(i * 1.7) * (1 + k * 6), 2.5 + k * 16, Math.cos(i * 2.3) * (1 + k * 6)); }, { color: 0xffffff, size: 2.2, opacity: 0.18 }, gey);
  const spray = particles(900, (i, t, v) => { const k = (i / 900 + t * 1.6) % 1; const on = smooth(ERUPT + 0.6, ERUPT + 1.4, t); v.set(2.5 + Math.sin(i * 3.1) * 4, 2.3 + (1 - k) * 5 * on, 1 + Math.cos(i * 1.3) * 2.5); if (on < 0.02) v.y = -50; }, { color: 0xcfefff, size: 0.25, opacity: 0.7 }, gey);

  // ---------------- Everest parking garage ----------------
  const ev = defineSet('everest', {
    sky: { top: 0x1f4f9a, horizon: 0xbfd6ee, bottom: 0xe6eef6 }, sunDir: [0.6, 0.45, 0.4], fog: [0xd7e4f0, 800, 7000],
    hemi: [0xd6e6ff, 0x8090a8, 1.2], sun: [0xffffff, 3.2], shadowCenter: [0, 760, 60], shadowSize: 160, tilt: 0.8, exposure: 0.95,
  });
  const peak = (x, z) => { const d = Math.hypot(x * 1.0, z * 1.25); const ridge = Math.abs(x) * 0.25; return 900 * Math.exp(-d / 360) - ridge * 0.2 + (fbm(x * 0.008, z * 0.008) - 0.5) * 160 + (fbm(x * 0.05, z * 0.05) - 0.5) * 18; };
  terrain({ size: 4000, seg: 240, parent: ev, height: (x, z) => {
    let h = peak(x, z);
    const gd = Math.hypot(x - 10, z - 150); if (gd < 70) h = lerp(760, h, smooth(52, 70, gd)) ; // ledge for the garage
    return h;
  }, color: (x, y, z) => { const s = fbm(x * 0.02, z * 0.02); return y > 380 + s * 160 ? (s > 0.62 ? '#8c8e96' : '#f4f7fb') : y > 200 ? (s > 0.5 ? '#6f6a66' : '#e4e9f0') : '#5d5a55'; } });
  const GA = new THREE.Group(); GA.position.set(10, 760, 150); ev.add(GA);
  const lvls = 6;
  for (let l = 0; l < lvls; l++) {
    box(70, 1.2, 40, 0x9a9a98, 0, l * 4.2, 0, GA);
    for (const x of [-34, -12, 12, 34]) for (const z of [-19, 19]) box(1, 4.2, 1, 0x8a8a88, x, l * 4.2, z, GA);
    box(70, 1.1, 0.3, 0xb0b0ae, 0, l * 4.2 + 1.2, 20, GA);
    const rc = rng(40 + l);
    for (let i = 0; i < 12; i++) for (const row of [-9, 9]) { if (rc() < 0.12) continue; const cc = car([0xd9483b, 0x3b6fd9, 0xf5f5f0, 0x2e3440, 0xf2c14e, 0x4caf6a][Math.floor(rc() * 6)], GA); cc.position.set(-31 + i * 5.6, l * 4.2 + 1.2, row); cc.rotation.y = row > 0 ? Math.PI : 0; if (l === lvls - 1) cc.children[0].material = mat(0xf4f7fb); }
  }
  box(70, 0.6, 40, 0xf4f7fb, 0, lvls * 4.2, 0, GA);
  const pS = sign('P', 6, 6, { bg: '#1f5fc7', fg: '#ffffff', size: 800 }, 0, lvls * 4.2 + 6, 20.2, GA);
  cyl(0.3, 0.3, 6, 0x777777, 0, lvls * 4.2, 19.8, GA);
  sign(['LEVEL 8,849'], 14, 2.2, { bg: '#ffd23f', fg: '#1d1d1d' }, -22, 3.2, 20.25, GA);
  const lost = person({ shirt: 0xff8a3d, hat: 0xd9483b }, GA); lost.position.set(2, lvls * 4.2 + 0.6, 14); lost.rotation.y = 0.3;
  const snow = particles(1800, (i, t, v) => { const k = (i * 0.618 + t * 0.08) % 1; v.set(-60 + ((i * 37.3) % 120) + Math.sin(t + i) * 2, 800 - k * 60, 120 + ((i * 13.7) % 80)); }, { color: 0xffffff, size: 0.35, opacity: 0.8 }, ev);

  // ---------------- the last untouched tree ----------------
  const tr = defineSet('tree', {
    sky: { top: 0x4a8ad8, horizon: 0xe2f0ff }, sunDir: [0.5, 0.55, 0.5], fog: [0xd8ebf7, 300, 2500],
    hemi: [0xd8ecff, 0x5f7d3a, 1.15], sun: [0xfff4dc, 2.9], shadowCenter: [0, 0, 0], shadowSize: 70, tilt: 0.85,
  });
  terrain({ size: 2400, seg: 120, parent: tr, height: (x, z) => smooth(80, 600, Math.hypot(x, z)) * 40 * fbm(x * 0.004, z * 0.004), color: (x, y, z) => fbm(x * 0.03, z * 0.03) > 0.5 ? '#6fae46' : '#5f9e3c' });
  const T = tree(tr, 0, 0, 2.2, { round: true, leaf: 0x3f8f3a });
  // fence ring
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; cyl(0.08, 0.08, 1.1, 0xf5f5f0, Math.cos(a) * 9, 0, Math.sin(a) * 9, tr, 6); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.05, 4, 48), mat(0xd9483b)); ring.rotation.x = Math.PI / 2; ring.position.y = 1.0; tr.add(ring);
  // gift shop + ticket booth
  const GS = new THREE.Group(); GS.position.set(-26, 0, 18); GS.rotation.y = 0.5; tr.add(GS);
  box(16, 6, 10, 0xf2efe6, 0, 0, 0, GS); const roof = mesh(new THREE.ConeGeometry(11, 4, 4), 0xd9483b, 0, 8, 0, GS); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.68);
  sign('GIFT SHOP', 10, 1.8, { bg: '#d9483b', fg: '#ffffff' }, 0, 4.4, 5.05, GS);
  const TB = new THREE.Group(); TB.position.set(14, 0, 20); TB.rotation.y = -0.35; tr.add(TB);
  box(4, 3.2, 3, 0xffd23f, 0, 0, 0, TB); box(4.4, 0.4, 3.4, 0xd9483b, 0, 3.2, 0, TB);
  sign(['TICKETS', '$40'], 3.4, 2.0, { bg: '#ffffff', fg: '#d9483b', border: '#d9483b' }, 0, 4.8, 1.55, TB);
  sign(['TREE NOT INCLUDED'], 3.6, 0.5, { bg: '#1d1d1d', fg: '#ffd23f' }, 0, 2.2, 1.52, TB);
  const seller = person({ shirt: 0xd9483b }, TB); seller.position.set(0, 0, 0.6);
  // queue snaking away from the booth
  const q = []; const rq = rng(21);
  for (let i = 0; i < 380; i++) { const lane = Math.floor(i / 38), k = i % 38; const x = 14 + (lane % 2 ? 37 - k : k) * 0.85 - 16; const z = 26 + lane * 2.4; q.push({ x: x + (rq() - 0.5) * 0.2, y: 0, z: z + (rq() - 0.5) * 0.3, ry: lane % 2 ? -Math.PI / 2 : Math.PI / 2 }); }
  crowd(q, tr, { seed: 9 });
  for (let lane = 0; lane < 10; lane++) { const rope = box(34, 0.05, 0.05, 0xd9483b, -1.4, 0.95, 27.2 + lane * 2.4, tr); for (let k = 0; k < 6; k++) cyl(0.06, 0.08, 1.0, 0xc9a35a, -18 + k * 6.6, 0, 27.2 + lane * 2.4, tr, 6); }
  // two scientists in front of the tree
  const sc1 = person({ shirt: 0xffffff, pants: 0x3b3b3b }, tr); sc1.position.set(3, 0, 11); sc1.rotation.y = 0.6;
  const sc2 = person({ shirt: 0xffffff, pants: 0x3b3b3b }, tr); sc2.position.set(-2.5, 0, 11.5); sc2.rotation.y = -0.4;
  const exec = person({ shirt: 0x2e3440, pants: 0x2e3440 }, tr); exec.position.set(0.3, 0, 13.5); exec.rotation.y = Math.PI;

  // ---------------- shots ----------------
  const fx = cx(0), fy = -420;
  shot({ t0: 0, t1: 8.0, set: 'canyon', from: [fx - 1600, 520, 2300], to: [fx - 650, 60, 900], look: [fx, fy, 0], lookTo: [fx, fy + 10, 60], fov: 40, focus: 0.42 });
  shot({ t0: 8.0, t1: 10.6, set: 'canyon', from: [fx + 260, fy + 40, 520], to: [fx + 170, fy + 22, 330], look: [fx, fy + 30, 120], fov: 42, focus: 0.52,
    update: (t) => crowdA.userData.set((p) => { const w = (t * p.sp * 1.2 + p.ph); return { x: p.x + Math.sin(w * 0.3) * 4, y: 0, z: p.z + Math.cos(w * 0.25) * 3, ry: p.ry, bob: Math.abs(Math.sin(w * 4)) * 0.06 }; }) });
  shot({ t0: 10.6, t1: 13.0, set: 'canyon', from: [rimX - 14, P.position.y + 5, rimZ + 18], to: [rimX - 9, P.position.y + 3.6, rimZ + 13], look: [rimX, P.position.y + 1.5, rimZ - 1], fov: 38, focus: 0.55, band: 0.12 });
  shot({ t0: 13.0, t1: 16.8, set: 'canyon', from: [fx + 70, fy + 9, 420], to: [fx + 64, fy + 7, 444], look: [fx + 40, fy + 2, 490], lookTo: [fx + 40, fy + 2, 500], fov: 36, focus: 0.55, update: muleUpdate });
  shot({ t0: 16.8, t1: 20.6, set: 'canyon', from: [fx + 30, fy + 120, 480], to: [fx - 20, fy + 70, 300], look: [fx, fy + 10, 150], fov: 42, focus: 0.5,
    update: (t) => crowdA.userData.set((p) => { const w = (t * p.sp * 1.2 + p.ph); return { x: p.x + Math.sin(w * 0.3) * 4, y: 0, z: p.z + Math.cos(w * 0.25) * 3, ry: p.ry, bob: Math.abs(Math.sin(w * 4)) * 0.06 }; }) });
  shot({ t0: 20.6, t1: 23.5, set: 'canyon', from: [fx - 300, 200, 700], to: [fx - 900, 900, 2000], look: [fx, fy, 0], fov: 38, focus: 0.45 });
  shot({ t0: 23.5, t1: 26.8, set: 'falls', from: [-160, 78, -110], to: [-140, 70, -88], look: [-104, 56, -40], fov: 42, focus: 0.5 });
  shot({ t0: 26.8, t1: 30.0, set: 'falls', from: [10, 30, 130], to: [4, 20, 110], look: [-58, 50, -16], lookTo: [-48, 4, 2], fov: 46, focus: 0.5, update: bagUpdate });
  shot({ t0: 30.1, t1: 36.8, set: 'geyser', from: [32, 12, 34], to: [26, 18, 30], look: [0, 5, 0], lookTo: [0, 12, 0], fov: 42, focus: 0.5,
    update: (t) => { driver.pose({ armR: t > ERUPT + 0.8 ? -2.6 : 0, armL: t > ERUPT + 0.8 ? -2.4 : 0 }); } });
  shot({ t0: 36.9, t1: 40.5, set: 'everest', from: [420, 1000, 900], to: [190, 840, 470], look: [10, 768, 150], fov: 36, focus: 0.5 });
  shot({ t0: 40.5, t1: 43.2, set: 'everest', from: [26, 790, 186], to: [21, 788.5, 179], look: [12, 785.5, 164], lookTo: [12, 785.8, 164], fov: 40, focus: 0.55,
    update: (t) => { lost.rotation.y = 0.3 + Math.sin(t * 2.4) * 0.9; lost.pose({ armR: -1.4 }); } });
  shot({ t0: 43.3, t1: 49.2, set: 'tree', from: [6, 3.5, 34], to: [3, 3.0, 24], look: [0, 4, 0], fov: 38, focus: 0.5, band: 0.14,
    update: (t) => { exec.pose({ armR: t > 47 ? -1.2 : 0 }); sc1.pose({ armL: t > 47.4 ? -1.2 : 0 }); } });
  shot({ t0: 49.3, t1: 55.0, set: 'tree', from: [6, 9, 30], to: [40, 50, 110], look: [0, 3, 10], lookTo: [-2, 0, 20], fov: 40, focus: 0.47 });
  shot({ t0: 55.0, t1: 60, set: 'tree', from: [20, 2.8, 33.5], to: [18.4, 3.3, 30.5], look: [14, 3.4, 20], lookTo: [14, 3.2, 20], fov: 40, focus: 0.5, band: 0.14 });
}
