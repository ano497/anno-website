// EP02 — A billionaire bought the Moon.
export async function build(K) {
  const { THREE, camera, skyMat, hemi, sun, defineSet, shot, box, cyl, sphere, mesh, sign, textTex, terrain, person, crowd, city, tree, particles, rng, fbm, clamp, smooth, lerp, mat } = K;

  // ---------- textures ----------
  function moonCanvas(ad, o = {}) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#d9d6cf'; g.beginPath(); g.arc(512, 512, 510, 0, Math.PI * 2); g.fill();
    const r = rng(9);
    for (let i = 0; i < 60; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 470, rr = 10 + r() * 60; g.fillStyle = `rgba(120,118,112,${0.15 + r() * 0.3})`; g.beginPath(); g.arc(512 + Math.cos(a) * d, 512 + Math.sin(a) * d, rr, 0, 6.28); g.fill(); }
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(150,148,140,0.35)'; g.beginPath(); g.arc(300 + r() * 420, 300 + r() * 420, 80 + r() * 90, 0, 6.28); g.fill(); }
    if (ad) ad(g);
    if (o.half) { const gr = g.createLinearGradient(380, 0, 560, 0); gr.addColorStop(0, 'rgba(8,10,20,0.93)'); gr.addColorStop(1, 'rgba(8,10,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(512, 512, 512, 0, 6.28); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const txt = (g, s, y, size, col, font = 'DejaVu Sans') => { g.font = `bold ${size}px '${font}'`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = size * 0.12; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeText(s, 512, y); g.fillStyle = col; g.fillText(s, 512, y); };
  const adSnacko = moonCanvas((g) => { g.fillStyle = '#e8332a'; g.beginPath(); g.ellipse(512, 470, 380, 170, -0.08, 0, 6.28); g.fill(); txt(g, 'SNACKO', 470, 170, '#ffd23f'); txt(g, 'NOW ON THE MOON', 700, 64, '#e8332a'); });
  const adMattress = moonCanvas((g) => { txt(g, 'MATTRESS', 400, 140, '#1f5fc7'); txt(g, 'MEGA SALE', 560, 140, '#e8332a'); txt(g, '70% OFF SLEEP', 720, 70, '#1d1d1d'); });
  const adPremium = moonCanvas((g) => { txt(g, 'UPGRADE TO', 400, 86, '#1d1d1d'); txt(g, 'FULL MOON', 520, 120, '#1f5fc7'); txt(g, '$4.99 / NIGHT', 660, 96, '#e8332a'); }, { half: true });
  const adEclipse = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#111215'; g.beginPath(); g.arc(512, 512, 510, 0, 6.28); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(140, 640, 744, 110);
    g.font = "bold 70px 'DejaVu Sans'"; g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.fillText('AD 1 of 1 · 2:59', 512, 460);
    g.fillStyle = '#6b6b6b'; g.fillText('SKIP ▸▸  (disabled)', 512, 712);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  function earthTex() {
    const w = 1024, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lon = x / w * Math.PI * 2, lat = (y / h - 0.5) * Math.PI;
      const px = Math.cos(lat) * Math.cos(lon) * 2.2, pz = Math.cos(lat) * Math.sin(lon) * 2.2, py = Math.sin(lat) * 2.2;
      const n = fbm(px + 5 + pz * 0.7, py * 1.3 + pz * 0.6, 5), cl = fbm(px * 2.5 + 11, py * 3 + pz * 2.5, 4);
      let r, gg, b; if (n > 0.53) { const k = n > 0.62 ? [150, 130, 90] : [70, 130, 60]; [r, gg, b] = k; } else { [r, gg, b] = [25, 70, 150]; }
      if (Math.abs(lat) > 1.25) [r, gg, b] = [235, 240, 245];
      if (cl > 0.58) { const a = Math.min(1, (cl - 0.58) * 6); r = lerp(r, 245, a); gg = lerp(gg, 245, a); b = lerp(b, 250, a); }
      const i = (y * w + x) * 4; im.data[i] = r; im.data[i + 1] = gg; im.data[i + 2] = b; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // ---------- auction room ----------
  const au = defineSet('auction', { sky: { top: 0x000000, horizon: 0x000000 }, hemi: [0xfff0dd, 0x302018, 0.35], sun: [0xffe2b8, 0.0], tilt: 0.75, exposure: 1.05, fog: [0x0, 60, 140] });
  box(40, 0.2, 60, 0x5a2a22, 0, -0.2, 0, au);
  box(40, 16, 0.5, 0x6e1f1f, 0, 0, -16, au);
  for (const x of [-20, 20]) box(0.5, 16, 60, 0x4a1717, x, 0, 0, au);
  box(40, 0.5, 60, 0x1a1210, 0, 16, 0, au);
  box(10, 1.2, 4, 0x3b2418, 0, 0, -11, au); // stage
  const pod = box(1.6, 1.4, 1.0, 0x5a3a24, -4, 1.2, -10.5, au);
  const auct = person({ shirt: 0x1d1d1d, pants: 0x1d1d1d, hairColor: 0x9a9a9a }, au); auct.position.set(-4, 1.2, -11.2);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.75), new THREE.MeshBasicMaterial({ map: textTex(['LOT 1: THE MOON', 'STARTING BID $1'], { w: 1024, h: 576, bg: '#0b0f1e', fg: '#ffffff', size: 74, draw: (g) => { g.fillStyle = '#dcd8cf'; g.beginPath(); g.arc(512, 200, 120, 0, 6.28); g.fill(); g.fillStyle = 'rgba(120,118,112,.5)'; g.beginPath(); g.arc(470, 170, 30, 0, 6.28); g.arc(560, 240, 22, 0, 6.28); g.fill(); g.translate(0, 120); } }) }));
  scr.position.set(2.5, 7.0, -15.6); au.add(scr);
  const spot = new THREE.SpotLight(0xffe2b8, 900, 60, 0.5, 0.6, 1.5); spot.position.set(0, 14, 6); spot.target.position.set(0, 0, -6); au.add(spot, spot.target); spot.castShadow = true;
  const spot2 = new THREE.SpotLight(0xffe2b8, 500, 50, 0.35, 0.5, 1.5); spot2.position.set(4, 14, 12); spot2.target.position.set(4, 0, 6); au.add(spot2, spot2.target);
  const chairs = [];
  for (let rI = 0; rI < 8; rI++) for (let cI = 0; cI < 10; cI++) {
    const x = -9 + cI * 2, z = -4 + rI * 2.4; if (Math.abs(x) < 1.5) continue;
    const ch = new THREE.Group(); box(1.1, 0.12, 1.0, 0xc9a35a, 0, 0.9, 0, ch); box(1.1, 1.2, 0.12, 0xc9a35a, 0, 0.9, 0.5, ch);
    for (const [a, b] of [[-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4]]) box(0.08, 0.9, 0.08, 0x777777, a, 0, b, ch);
    ch.position.set(x, 0, z); au.add(ch); chairs.push(ch);
  }
  const bidder = person({ shirt: 0x2e3440, pants: 0x2e3440, hairColor: 0xc9a35a }, au); bidder.position.set(5, 0, 7.6); bidder.rotation.y = Math.PI;
  const paddle = new THREE.Group(); cyl(0.04, 0.04, 0.5, 0x5a3a24, 0, -0.5, 0, paddle); sign('1', 0.5, 0.5, { bg: '#ffffff', fg: '#1d1d1d', size: 700 }, 0, 0.2, 0, paddle).rotation.y = Math.PI;
  paddle.position.set(0, -0.75, 0.1); bidder.userData.armR.add(paddle);
  const gavel = new THREE.Group(); cyl(0.03, 0.03, 0.45, 0x5a3a24, 0, -0.45, 0, gavel); const gh = cyl(0.09, 0.09, 0.3, 0x5a3a24, 0, 0, 0, gavel); gh.rotation.z = Math.PI / 2; gh.position.set(0, -0.6, 0);
  auct.userData.armR.add(gavel); gavel.position.set(0, -0.55, 0);

  // ---------- night city ----------
  const nightCfg = { sky: { top: 0x050a1c, horizon: 0x1c2a4a, bottom: 0x10121a, stars: 0.6, sunColor: 0x000000, glow: 0 }, sunDir: [-0.3, 0.6, -0.7], fog: [0x0f1628, 150, 900],
    hemi: [0x5a6fa0, 0x15131a, 0.7], sun: [0xbfd0ff, 0.9], shadowCenter: [0, 0, 0], shadowSize: 140, tilt: 0.85, exposure: 1.1 };
  const nt = defineSet('night', nightCfg);
  city({ parent: nt, night: true, nx: 9, nz: 9, seed: 5, hmax: 80, skip: (x, z) => (Math.abs(x) < 30 && Math.abs(z) < 30) || (Math.abs(x) < 60 && z < 0) });
  box(56, 0.3, 56, 0x4a4c52, 0, -0.1, 0, nt); // plaza
  city({ parent: nt, night: true, nx: 3, nz: 6, seed: 9, hmin: 6, hmax: 18, z: -200 });
  const moonMat = new THREE.MeshBasicMaterial({ map: adSnacko, transparent: true, fog: false }); moonMat.color.setScalar(1.25);
  const moonD = new THREE.Mesh(new THREE.CircleGeometry(240, 64), moonMat); moonD.position.set(0, 1300, -2000); nt.add(moonD);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(480, 64), new THREE.MeshBasicMaterial({ fog: false, transparent: true, depthWrite: false, opacity: 0.08, color: 0xbfd0ff, blending: THREE.AdditiveBlending })); halo.position.set(0, 1300, -2001); nt.add(halo); halo.visible = false;
  moonD.userData.update = (t) => { moonD.lookAt(camera.position); halo.lookAt(camera.position); moonMat.map = t < 19.6 ? adSnacko : t < 21.6 ? adMattress : t < 24.5 ? adPremium : adMattress; };
  // people on the plaza
  const R = rng(3); const plaza = [];
  for (let i = 0; i < 70; i++) plaza.push({ x: -20 + R() * 40, y: 0, z: -14 + R() * 30, ry: Math.PI + (R() - 0.5) * 0.6 });
  const pc = crowd(plaza, nt, { seed: 4 });
  // protest signs
  const protest = new THREE.Group(); nt.add(protest);
  const slog = ['GIVE BACK\nOUR MOON', 'NO ADS\nIN SPACE', 'MOON\nBLOCKER\nNOW', 'I CAME\nFOR THE\nTIDES'];
  for (let i = 0; i < 12; i++) {
    const p = plaza[i * 5]; const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    cyl(0.04, 0.04, 2.8, 0x8a6a4a, 0, 0, 0, g);
    sign(slog[i % 4].split('\n'), 1.4, 1.0, { bg: '#f5f1e6', fg: '#1d1d1d' }, 0, 2.9, 0.03, g);
    protest.add(g);
  }
  // courthouse with werewolves
  const CH = new THREE.Group(); CH.position.set(0, 0, -16); nt.add(CH);
  box(30, 1.5, 14, 0xd8d2c4, 0, 0, 0, CH); box(28, 1.2, 12, 0xd8d2c4, 0, 1.5, 0, CH);
  for (let i = 0; i < 8; i++) cyl(0.6, 0.7, 10, 0xe8e2d6, -12 + i * 3.4, 2.7, 4.5, CH);
  box(30, 2.2, 13, 0xd8d2c4, 0, 12.7, 0, CH);
  const ped = mesh(new THREE.CylinderGeometry(0.1, 15.5, 4, 3, 1), 0xe8e2d6, 0, 16.9, 0, CH); ped.rotation.y = Math.PI / 2; ped.scale.set(1, 1, 0.42);
  sign('COURT', 9, 1.6, { fg: '#2a2a2a' }, 0, 13.8, 6.6, CH).material.color.setScalar(1);
  box(26, 12, 8, 0xb8b0a0, 0, 2.7, -1, CH);
  const lamp = new THREE.PointLight(0xffd8a0, 140, 45, 1.6); lamp.position.set(4, 9, 16); CH.add(lamp);
  const wolves = new THREE.Group(); CH.add(wolves); const RW = rng(8); const wolfList = [];
  for (let i = 0; i < 22; i++) {
    const w = person({ shirt: [0x6b5a48, 0x7a7068, 0x5a4a3a, 0x8a7a68][i % 4], skin: 0x7a6656, hairColor: 0x5a4a3a }, wolves);
    for (const s of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(0.06, 0.18, 4), 0x5a4a3a, s * 0.09, 1.86, 0, w); }
    const snout = box(0.12, 0.1, 0.16, 0x7a6656, 0, 1.58, 0.15, w);
    w.position.set(-10 + RW() * 20, 0, 12 + RW() * 8); w.rotation.y = (RW() - 0.5) * 0.8;
    if (i % 3 === 0) { cyl(0.04, 0.04, 2.6, 0x8a6a4a, 0.3, 0, 0, w); sign(['AWOO', 'MEANS NO'], 1.2, 0.8, { bg: '#f5f1e6', fg: '#8a1f1f' }, 0.3, 2.7, 0.03, w); }
    wolfList.push(w);
  }
  const sadWolf = wolfList[1];

  // ---------- space ----------
  const sp = defineSet('space', { sky: { top: 0x000000, horizon: 0x000000, bottom: 0x000000, stars: 1.0, sunColor: 0xffffff, sunSize: 0.004, glow: 0.05 }, sunDir: [1, 0.25, 0.5], hemi: [0x223355, 0x000000, 0.15], sun: [0xffffff, 3.2], shadowSize: 400, tilt: 0.5, exposure: 1.0 });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 48), new THREE.MeshStandardMaterial({ map: earthTex(), roughness: 0.75 })); sp.add(earth);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(104, 48, 32), new THREE.MeshBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.13, side: THREE.BackSide, blending: THREE.AdditiveBlending })); sp.add(atm);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(27, 48, 32), new THREE.MeshStandardMaterial({ map: adSnacko, roughness: 0.95, emissive: 0xffffff, emissiveMap: adSnacko, emissiveIntensity: 0.25 }));
  moon.position.set(-260, 40, -150); sp.add(moon); moon.visible = false;
  const moonB = new THREE.Mesh(new THREE.CircleGeometry(27, 48), new THREE.MeshBasicMaterial({ map: adSnacko, transparent: true })); sp.add(moonB);
  moon.rotation.y = Math.PI / 2 + 0.55; // ad faces Earth
  earth.userData.update = (t) => { earth.rotation.y = t * 0.05; const k = smooth(52.7, 59.5, t); moon.position.set(-260 - k * 160, 40 + k * 18, -150 - k * 120); moonB.position.copy(moon.position); moonB.lookAt(camera.position); };

  // ---------- stars over a hill ----------
  const stars = defineSet('stars', { sky: { top: 0x02040c, horizon: 0x0e1830, bottom: 0x05060a, stars: 1.6, sunColor: 0x000000, glow: 0 }, sunDir: [0.2, 0.7, -0.5], hemi: [0x40507a, 0x0a0a10, 0.45], sun: [0x8090c0, 0.4], tilt: 0.7, fog: [0x0e1830, 200, 2000] });
  terrain({ size: 2000, seg: 80, parent: stars, height: (x, z) => 18 * fbm(x * 0.006, z * 0.006) - Math.max(0, z * 0.02), color: () => '#1a2230' });
  for (let i = 0; i < 9; i++) tree(stars, -60 + i * 14 + Math.sin(i) * 4, -40 - (i % 3) * 8, 2.2, { leaf: 0x0e1420, trunk: 0x0e1420, y: 6 });
  // Big Dipper → "The Big Deal"
  const dip = [[-6, 2.2], [-3.2, 1.6], [-0.8, 1.5], [1.3, 1.0], [2.0, -0.6], [5.0, -0.9], [5.6, 1.0]];
  const DPG = new THREE.Group(); DPG.position.set(0, 420, -900); stars.add(DPG); const S = 34;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, fog: false });
  const pts = dip.map(([x, y]) => new THREE.Vector3(x * S, y * S, 0)); pts.push(pts[3].clone());
  const dl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat); DPG.add(dl);
  for (const p of pts) { const s = new THREE.Mesh(new THREE.CircleGeometry(4.5, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); s.position.copy(p); DPG.add(s); }
  const bdl = sign(['THE BIG DEAL™'], 300, 50, { fg: '#ffd23f', font: "'DejaVu Serif', serif" }, 0, -100, 0, DPG); bdl.material.fog = false;
  const spons = sign(['sponsored by StarCorp'], 220, 22, { fg: '#ffffff' }, 0, -142, 0, DPG); spons.material.fog = false;
  const watcher = person({ shirt: 0x2e3440 }, stars); watcher.position.set(0, 0, 0); watcher.rotation.y = Math.PI; watcher.pose({ head: -0.5 });

  // ---------- observatory ----------
  const ob = defineSet('observatory', { sky: { top: 0x040818, horizon: 0x1c2848, bottom: 0x05060a, stars: 0.0, sunColor: 0x000000, glow: 0 }, sunDir: [0.4, 0.6, 0.5], hemi: [0x50608a, 0x0a0a10, 0.6], sun: [0x9fb0e0, 0.8], shadowSize: 60, tilt: 0.75, fog: [0x1c2848, 150, 1500] });
  terrain({ size: 1600, seg: 80, parent: ob, height: (x, z) => 30 * Math.exp(-Math.hypot(x, z) / 120) + 10 * fbm(x * 0.01, z * 0.01), color: () => '#2a3340' });
  const OB = new THREE.Group(); OB.position.set(0, 29, 0); ob.add(OB);
  cyl(9, 9, 8, 0xe8e8ee, 0, 0, 0, OB, 32);
  mesh(new THREE.SphereGeometry(9.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), 0xd9dde6, 0, 8, 0, OB);
  const scope = cyl(1.2, 1.4, 9, 0x3a3f4a, 0, 0, 0, OB); scope.position.set(0, 13, -4); scope.rotation.x = -0.7;
  const bill = new THREE.Group(); bill.position.set(16, 29, 6); bill.rotation.y = -0.5; ob.add(bill);
  cyl(0.3, 0.3, 8, 0x555555, 0, 0, 0, bill);
  sign(['SPACE+', 'SEE THE UNIVERSE', '$9.99 / MONTH'], 12, 6, { bg: '#0b1630', fg: '#ffd23f', border: '#ffd23f' }, 0, 11, 0.3, bill);
  const astro = person({ shirt: 0xffffff, pants: 0x3b3b3b }, ob); astro.position.set(6, 29, 12); astro.rotation.y = 0.3;
  // free-plan sky: one star
  const fr = defineSet('freesky', { sky: { top: 0x03050d, horizon: 0x10182c, bottom: 0x05060a, stars: 0, sunColor: 0x000000, glow: 0 }, hemi: [0x40507a, 0x0a0a10, 0.4], sun: [0x000000, 0], tilt: 0.4 });
  const one = new THREE.Mesh(new THREE.CircleGeometry(6, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); one.position.set(30, 700, -1000); fr.add(one);
  const oneGlow = new THREE.Mesh(new THREE.CircleGeometry(26, 32), new THREE.MeshBasicMaterial({ color: 0x9fc0ff, transparent: true, opacity: 0.25, fog: false, blending: THREE.AdditiveBlending })); oneGlow.position.set(30, 700, -1001); fr.add(oneGlow);
  const plan = sign(['FREE PLAN · 1 STAR', 'upgrade for more ▸'], 260, 60, { fg: '#ffd23f' }, 30, 620, -1000, fr); plan.material.fog = false;
  fr.userData.update = () => { one.lookAt(camera.position); oneGlow.lookAt(camera.position); plan.lookAt(camera.position); };
  terrain({ size: 1000, seg: 40, parent: fr, height: (x, z) => 6 * fbm(x * 0.01, z * 0.01), color: () => '#161c26' });

  // ---------- daytime eclipse ----------
  const ecCfg = { sky: { top: 0x3f7fd6, horizon: 0xcfe6ff, sunColor: 0xfff2d0, sunSize: 0.0, glow: 0.4 }, sunDir: [0, 0.45, -1], fog: [0xcfe6ff, 200, 1200], hemi: [0xcfe3ff, 0x6b5a48, 1.0], sun: [0xfff4e0, 2.6], shadowSize: 160, tilt: 0.85 };
  const ec = defineSet('eclipse', ecCfg);
  city({ parent: ec, night: false, nx: 9, nz: 9, seed: 5, hmax: 80, skip: (x, z) => (Math.abs(x) < 30 && Math.abs(z) < 30) || (Math.abs(x) < 60 && z < 0) });
  box(56, 0.3, 56, 0x9a968e, 0, -0.1, 0, ec);
  city({ parent: ec, night: false, nx: 3, nz: 6, seed: 9, hmin: 6, hmax: 18, z: -200 });
  const ecList = []; const RE = rng(12);
  for (let i = 0; i < 90; i++) ecList.push({ x: -22 + RE() * 44, y: 0, z: -16 + RE() * 34, ry: Math.PI + (RE() - 0.5) * 0.5 });
  crowd(ecList, ec, { seed: 6 });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(90, 64), new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false })); sunDisc.material.color.setScalar(3);
  const sunPos = new THREE.Vector3(0, 1.0, -1).normalize().multiplyScalar(2400); sunDisc.position.copy(sunPos); ec.add(sunDisc);
  const corona = new THREE.Mesh(new THREE.CircleGeometry(200, 64), new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false })); corona.position.copy(sunPos).multiplyScalar(1.001); ec.add(corona);
  const ecMoon = new THREE.Mesh(new THREE.CircleGeometry(92, 64), new THREE.MeshBasicMaterial({ map: adEclipse, fog: false, transparent: true })); ec.add(ecMoon);
  ec.userData.update = (t) => {
    const k = smooth(42.7, 47.2, t); // moon slides over the sun
    const dir = sunPos.clone().normalize(); const side = new THREE.Vector3(1, 0, 0);
    ecMoon.position.copy(sunPos).multiplyScalar(0.98).addScaledVector(side, (1 - k) * 260).addScaledVector(new THREE.Vector3(0, 1, 0), (1 - k) * 60);
    for (const m of [sunDisc, corona, ecMoon]) m.lookAt(camera.position);
    const dark = smooth(45.5, 47.5, t);
    hemi.intensity = lerp(1.0, 0.18, dark); sun.intensity = lerp(2.6, 0.15, dark);
    skyMat.uniforms.top.value.setHex(0x3f7fd6).lerp(new THREE.Color(0x05070f), dark);
    skyMat.uniforms.horizon.value.setHex(0xcfe6ff).lerp(new THREE.Color(0x4a3a40), dark);
    skyMat.uniforms.stars.value = dark * 0.5; corona.material.opacity = dark * 0.55;
  };

  // ---------- shots ----------
  shot({ t0: 0, t1: 7.2, set: 'auction', from: [0, 5, 18], to: [0, 4.2, 6], look: [1.5, 5.5, -15], lookTo: [2.5, 6, -15], fov: 46, focus: 0.45 });
  shot({ t0: 7.2, t1: 10.0, set: 'auction', from: [9, 3.2, 1.5], to: [8, 3.0, 2.5], look: [5, 2.0, 7.6], fov: 40, focus: 0.5,
    update: (t) => { const up = smooth(7.4, 7.8, t); bidder.pose({ armR: -2.9 * up }); const hit = Math.max(Math.exp(-Math.pow((t - 8.4) * 9, 2)), Math.exp(-Math.pow((t - 9.2) * 9, 2))); auct.pose({ armR: -1.6 + hit * 0.9 }); } });
  const M = [0, 1300, -2000];
  const vis = (court, plazaOn) => { CH.visible = court; pc.visible = plazaOn; protest.visible = plazaOn && !court; };
  shot({ t0: 10.0, t1: 13.2, set: 'night', from: [4, 1.7, 26], to: [3, 1.9, 22], look: [0, 30, -100], lookTo: [0, 330, -1000], fov: 50, focus: 0.55, band: 0.2, update: () => { vis(false, true); protest.visible = false; } });
  shot({ t0: 13.2, t1: 16.0, set: 'space', from: [150, 70, 220], to: [120, 60, 200], look: [-130, 20, -75], fov: 44, focus: 0.5 });
  shot({ t0: 16.0, t1: 18.2, set: 'night', from: [-1, 1.5, 14], to: [-1, 1.5, 13], look: [0, 330, -1000], fov: 50, focus: 0.5, band: 0.2, update: () => { vis(false, true); protest.visible = false; } });
  shot({ t0: 18.3, t1: 24.4, set: 'night', from: [10, 3.5, 30], to: [5, 3, 24], look: [0, 6, 0], lookTo: [0, 300, -1000], fov: 50, focus: 0.55,
    update: (t) => { vis(false, true); protest.children.forEach((g, i) => { g.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.25; }); } });
  shot({ t0: 24.5, t1: 27.6, set: 'night', from: [6, 3, 10], to: [4, 2.6, 6], look: [0, 3, -8], fov: 48, focus: 0.55, update: () => vis(true, false) });
  shot({ t0: 27.6, t1: 30.0, set: 'night', from: [2.2, 1.7, 3.5], to: [2.2, 1.7, 3.0], look: [0, 1.1, -6.5], fov: 40, focus: 0.55,
    update: (t) => { vis(true, false); wolfList.forEach((w, i) => { if (i !== 1) w.visible = false; }); sadWolf.position.set(0, 0, 8 + (t - 27.6) * 1.0); sadWolf.rotation.y = 0; sadWolf.walk(t * 6, 0.6); sadWolf.pose({ head: 0.5 }); } });
  shot({ t0: 30.1, t1: 36.6, set: 'stars', from: [0, 2.2, 8], to: [0, 2.5, 6], look: [0, 30, -100], lookTo: [0, 420, -900], fov: 52, focus: 0.45, band: 0.25 });
  shot({ t0: 36.7, t1: 40.0, set: 'observatory', from: [40, 36, 46], to: [32, 34, 38], look: [6, 34, 4], fov: 44, focus: 0.5 });
  shot({ t0: 40.0, t1: 42.7, set: 'freesky', from: [0, 8, 0], to: [0, 8, -10], look: [30, 700, -1000], fov: 40, focus: 0.5 });
  shot({ t0: 42.7, t1: 47.2, set: 'eclipse', from: [6, 1.8, 24], to: [4, 2.2, 20], look: [0, 30, -100], lookTo: [0, 1700, -1700], fov: 48, focus: 0.55, band: 0.22 });
  shot({ t0: 47.2, t1: 52.7, set: 'eclipse', from: [0, 2, 0], to: [0, 2, -40], look: [0, 1700, -1700], fov: 22, focus: 0.5, tilt: 0.3 });
  shot({ t0: 52.7, t1: 60, set: 'space', from: [60, 70, 230], to: [90, 90, 330], look: [-150, 20, -90], fov: 44, focus: 0.5, update: () => camera.lookAt(moon.position.clone().multiplyScalar(0.6)) });
}
