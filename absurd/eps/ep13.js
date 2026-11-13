// EP13 — Why ship bottoms are red (explainer)
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, water, particles, rng, fbm, clamp, smooth, lerp, mat, guy, lineT, mouth } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const SAIL = { height: 2.7, job: 'sailor', hat: 'sailor', outfit: { body: '#ffffff', stripes: '#1e2c4f', bandana: '#d9483b' } };
  const sm = (c, o = {}) => mat(c, { flatShading: false, roughness: 0.75, ...o });
  const SEA = { sky: { top: 0x3f86e0, horizon: 0xd6ecff }, sunDir: [0.5, 0.55, 0.5], fog: [0xcfe6fa, 300, 3000], hemi: [0xd8ecff, 0x2a5a7a, 0.85], sun: [0xfff2d8, 2.6], shadowCenter: [0, 0, 0], shadowSize: 70, tilt: 0.25, sat: 1.45, exposure: 0.85 };
  // cargo ship: hull along x; red below y=2 (shown above the water when empty)
  function cargo(o = {}) {
    const g = new THREE.Group(); const L = 70, W = 12;
    box(L, 3.0, W, sm(o.bottom ?? 0xb8322a), 0, -2.5, 0, g);
    box(L, 6, W, sm(0x1d2b4a), 0, 0.5, 0, g);
    const bow = mesh(new THREE.CylinderGeometry(W / 2, W / 2, 9, 3, 1), sm(0x1d2b4a), L / 2 + 1.8, 3.5, 0, g); bow.rotation.y = Math.PI / 2 * 0; bow.rotation.z = Math.PI / 2; bow.scale.set(1, 1, 1); bow.position.y = 3.5;
    const bowR = mesh(new THREE.CylinderGeometry(W / 2, W / 2, 3, 3, 1), sm(o.bottom ?? 0xb8322a), L / 2 + 1.8, -1.0, 0, g); bowR.rotation.z = Math.PI / 2;
    box(L, 0.4, W + 0.2, sm(0xf5f5f0), 0, 6.5, 0, g);
    box(10, 12, W - 1, sm(0xf5f5f0), -L / 2 + 7, 6.9, 0, g); box(10.4, 1, W - 0.6, sm(0x1d2b4a), -L / 2 + 7, 18.9, 0, g);
    for (let i = 0; i < 9; i++) for (let k = 0; k < 2; k++) for (let l = 0; l < 3; l++) box(5.6, 2.5, 3.6, sm([0xd9483b, 0x3b6fd9, 0xf2c14e, 0x2f8a3a, 0xff8a3d, 0x7b3fe4][(i + k * 2 + l) % 6]), -L / 2 + 16 + i * 6, 6.9 + k * 2.6, -3.8 + l * 3.8, g);
    sign(['SEA STAR'], 10, 2, { fg: '#ffffff' }, L / 2 - 8, 3, W / 2 + 0.05, g);
    return g;
  }

  // ---------------- port ----------------
  const pt = defineSet('port', SEA);
  water({ size: 3000, seg: 80, color: 0x1f78b4, amp: 0.4, freq: 0.06, y: 0, parent: pt });
  const ship = cargo(); ship.position.set(0, 2.2, -16); pt.add(ship);
  ship.userData.update = (t) => { ship.position.y = 2.2 + Math.sin(t * 0.8) * 0.15; };
  box(90, 2.2, 12, sm(0x8a8f98), 0, 0, 10, pt);
  for (let i = 0; i < 8; i++) cyl(0.35, 0.4, 0.8, sm(0x333333), -36 + i * 10, 2.2, 4.6, pt, 10);
  const sailor = guy(SAIL); sailor.position.set(19.5, 2.2, 12.5); pt.add(sailor);
  const arrow = sign(['RED ↓'], 4.4, 1.4, { bg: '#ffffff', fg: '#b8322a', border: '#b8322a' }, 26, 6.2, -9.2, pt);
  const others = []; for (const [col, x] of [[0x2f8a3a, -140], [0x1d2b4a, 150]]) { const s2 = cargo({ bottom: col }); s2.position.set(x, 2.2, -120); s2.scale.setScalar(0.8); pt.add(s2); others.push(s2); }

  // ---------------- underwater hull ----------------
  const uw = defineSet('under', { sky: { top: 0x0a3a5a, horizon: 0x1a6a8a, bottom: 0x05202e, sunColor: 0x000000, glow: 0 }, sunDir: [0.2, 1, 0.3], fog: [0x0e5a7a, 8, 70], hemi: [0x6ac0e0, 0x0a2a3a, 1.0], sun: [0xbfe8ff, 1.4], shadowSize: 30, tilt: 0.25, sat: 1.4, exposure: 0.95 });
  const hull = box(60, 12, 1, sm(0xb8322a), 0, -2, -4, uw);
  box(200, 0.2, 200, sm(0xc9b48a), 0, -14, 0, uw);
  const R1 = rng(4), barn = [];
  const bGeo = new THREE.ConeGeometry(0.35, 0.5, 8); bGeo.rotateX(Math.PI / 2);
  const barnIM = new THREE.InstancedMesh(bGeo, sm(0xd8d0c0), 500); barnIM.castShadow = true; uw.add(barnIM);
  const algae = []; for (let i = 0; i < 120; i++) { const a = box(0.12, 1.2 + R1() * 1.6, 0.05, sm(0x3f8a3a), -20 + R1() * 40, -3 - R1() * 6, -3.4, uw); a.userData.p = R1() * 6; algae.push(a); }
  const mussels = []; for (let i = 0; i < 60; i++) { const m2 = sphere(0.25, sm(0x1d2440), -18 + R1() * 36, -2 - R1() * 8, -3.4, uw, 8); m2.scale.set(0.6, 1.2, 0.5); mussels.push(m2); }
  for (let i = 0; i < 500; i++) barn.push([-22 + R1() * 44, -1 - R1() * 9, R1()]);
  const growth = (t) => {
    const k = smooth(lineT(2), lineT(3) + 1.5, t); const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S2 = new THREE.Vector3();
    barn.forEach(([x, y, r], i) => { const s = clamp(k * 1.6 - r * 0.6, 0, 1); S2.setScalar(Math.max(0.001, s)); M.compose(V(x, y, -3.3), q, S2); barnIM.setMatrixAt(i, M); });
    barnIM.instanceMatrix.needsUpdate = true;
    algae.forEach((a, i) => { a.visible = i / algae.length < k * 1.2 - 0.1; a.rotation.z = Math.sin(t * 1.5 + a.userData.p) * 0.2; });
    mussels.forEach((m2, i) => (m2.visible = i / mussels.length < k * 1.3 - 0.3));
  };
  const bubbles = particles(300, (i, t, v) => { const k = (i / 300 + t * 0.2) % 1; v.set(-20 + ((i * 37.3) % 40), -12 + k * 14, -2 + ((i * 3.1) % 6)); }, { color: 0xbfefff, size: 0.18, opacity: 0.6 }, uw);
  const diver = guy({ ...SAIL, hat: null }); diver.position.set(1.4, -8.4, 5.5); uw.add(diver);
  const mask = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.01, 4), sm(0x000000)); diver.add(mask);

  // ---------------- drag + fuel ----------------
  const dr = defineSet('drag', SEA);
  water({ size: 3000, seg: 80, color: 0x1f78b4, amp: 0.5, freq: 0.06, y: 0, parent: dr });
  const dship = cargo(); dship.position.set(0, -0.6, 0); dr.add(dship);
  const wake = particles(1200, (i, t, v) => { const k = (i / 1200 + t * 0.5) % 1; v.set(36 - k * 90, 0.3 + Math.random() * 0.2, (i % 2 ? 1 : -1) * (6 + k * 14) + Math.sin(i) * 1.5); }, { color: 0xffffff, size: 0.5, opacity: 0.7 }, dr);
  const fuel = new THREE.Group(); fuel.position.set(24, 15, 0); dr.add(fuel);
  const fc = document.createElement('canvas'); fc.width = 512; fc.height = 256; const fg = fc.getContext('2d'); const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
  const fpl = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: ft })); fuel.add(fpl);
  const drawFuel = (k) => { fg.fillStyle = '#1b1b1f'; fg.fillRect(0, 0, 512, 256); fg.fillStyle = '#ffffff'; fg.font = 'bold 54px DejaVu Sans'; fg.textAlign = 'center'; fg.fillText('FUEL', 256, 70); fg.strokeStyle = '#ffffff'; fg.lineWidth = 6; fg.strokeRect(40, 110, 432, 90); fg.fillStyle = k < 0.35 ? '#d9483b' : '#2f8a3a'; fg.fillRect(48, 118, 416 * k, 74); ft.needsUpdate = true; };
  const dragGuy = guy(SAIL); dragGuy.position.set(33.5, 5.9, 0.5); dr.add(dragGuy);

  // ---------------- old wooden ship with copper ----------------
  const od = defineSet('old', { ...SEA, sky: { top: 0x6a9ad0, horizon: 0xf2e2c4 }, hemi: [0xf2e6d0, 0x2a5a7a, 0.9], sun: [0xffe6c0, 2.6] });
  water({ size: 3000, seg: 80, color: 0x2a7a9a, amp: 0.6, freq: 0.06, y: 0, parent: od });
  const wood = new THREE.Group(); wood.position.set(0, 0.6, -6); od.add(wood);
  box(36, 3.2, 9, sm(0xc87a3a, { metalness: 0.75, roughness: 0.35 }), 0, -2.6, 0, wood);
  box(36, 4, 9, sm(0x6b4a2f), 0, 0.6, 0, wood);
  for (let i = 0; i < 10; i++) box(0.1, 3.2, 9.05, sm(0xa8622a, { metalness: 0.7, roughness: 0.4 }), -16 + i * 3.6, -2.6, 0, wood);
  for (const [x, h] of [[-9, 22], [2, 26], [12, 18]]) { cyl(0.35, 0.45, h, sm(0x5a3a22), x, 4.6, 0, wood, 10); for (let s = 0; s < 3; s++) { const sl = box(0.15, h * 0.22, 9 - s * 1.6, sm(0xf5efe0), x + 0.4, 6 + s * h * 0.25, 0, wood); } }
  const plaque = sign(['COPPER', 'SHEATHING'], 6, 2, { bg: '#f5f1e6', fg: '#a8622a', border: '#a8622a' }, -4, 1.2, 4.7, wood);
  const critters = particles(240, (i, t, v) => { const k = (i / 240 + t * 0.3) % 1; const on = t > lineT(8) - 0.2; const x = -14 + (i % 24) * 1.2, back = on ? Math.sin(k * Math.PI) * 3.5 : 0; v.set(x, -1.6 - (i % 3) * 0.6, -6 + 4.8 + back); }, { color: 0x8a8a6a, size: 0.4, opacity: 0.95 }, od);
  const oldSailor = guy(SAIL); oldSailor.position.set(5, 2.3, 0.6); od.add(oldSailor);

  // ---------------- dry dock painting ----------------
  const dd = defineSet('dock', { ...SEA, fog: [0xcfe6fa, 200, 2000] });
  box(200, 0.2, 200, sm(0x8a8f98), 0, -0.2, 0, dd);
  const dhull = new THREE.Group(); dhull.position.set(0, 0, -8); dd.add(dhull);
  box(70, 8, 12, sm(0x9aa0a8), 0, 2, 0, dhull);
  const paintC = document.createElement('canvas'); paintC.width = 1024; paintC.height = 128; const pg = paintC.getContext('2d'); const pt2 = new THREE.CanvasTexture(paintC); pt2.colorSpace = THREE.SRGBColorSpace;
  const paintPlane = new THREE.Mesh(new THREE.PlaneGeometry(70, 8), new THREE.MeshStandardMaterial({ map: pt2, roughness: 0.6 })); paintPlane.position.set(0, 6, 6.02); dhull.add(paintPlane);
  box(70, 8, 12, sm(0x1d2b4a), 0, 10, 0, dhull);
  for (let i = 0; i < 6; i++) box(1.2, 2, 1.2, sm(0x5a3a22), -30 + i * 12, 0, 0, dhull);
  const drawPaint = (k) => { pg.fillStyle = '#9aa0a8'; pg.fillRect(0, 0, 1024, 128); pg.fillStyle = '#b8322a'; pg.fillRect(0, 0, 1024 * k, 128); pt2.needsUpdate = true; };
  const roller = new THREE.Group(); dd.add(roller); cyl(0.5, 0.5, 2.4, sm(0xb8322a), 0, 0, 0, roller, 16).rotation.x = Math.PI / 2; box(0.1, 4, 0.1, sm(0x8a6a4a), 0, -4, 0.3, roller);
  const painter = guy(SAIL); dd.add(painter);
  const can = cyl(0.6, 0.6, 1.0, sm(0xb8322a), 6, 0, 2, dd, 16); sign(['COPPER', 'PAINT'], 1.2, 0.6, { bg: '#ffffff', fg: '#b8322a' }, 6, 0.6, 2.62, dd);

  // ---------------- shots ----------------
  const T = (i) => (i <= 0 ? 0 : lineT(i) - 0.08);
  const talk = (g, t, pose) => { g.state.talk = mouth(t); if (pose) g.state.pose = pose; };
  const S = (a, b, o) => shot({ t0: T(a), t1: b >= 99 ? 999 : T(b), ...o });
  S(0, 2, { set: 'port', from: [17.5, 4.0, 21], to: [17.2, 4.0, 20], look: [22, 3.6, -14], fov: 52, focus: 0.5, update: (t) => { talk(sailor, t, t > lineT(1) ? 'shrug' : 'point'); arrow.visible = t > 1.0; others.forEach((o) => (o.visible = false)); } });
  S(2, 4, { set: 'under', from: [3, -6.0, 14], to: [2.6, -6.2, 12.5], look: [0, -5.2, -3], fov: 48, focus: 0.5, update: (t) => { growth(t); talk(diver, t, 'point'); } });
  S(4, 6, { set: 'drag', from: [45, 9.0, 15], to: [44, 9.0, 14], look: [29, 9.5, 0], fov: 52, focus: 0.5, update: (t) => { talk(dragGuy, t, 'explain'); drawFuel(1 - smooth(lineT(4), lineT(6), t) * 0.8); fuel.lookAt(camera.position); } });
  S(6, 9, { set: 'old', from: [8.5, 3.6, 12], to: [8, 3.5, 11], look: [2, 1.2, -3], fov: 50, focus: 0.5, update: (t) => { talk(oldSailor, t, t > lineT(7) ? 'point' : 'explain'); wood.position.y = 0.6 + Math.sin(t) * 0.2; } });
  S(9, 11, { set: 'dock', from: [7, 2.4, 16], to: [6.5, 2.4, 15], look: [0.5, 3.6, -4], fov: 52, focus: 0.5, update: (t) => { const k = smooth(lineT(9), lineT(11) - 0.2, t); drawPaint(k); const x = -35 + k * 70; roller.position.set(x * 0.15, 6 + Math.sin(t * 6) * 1.6, -1.6); painter.position.set(x * 0.15 + 1.2, 0, 0.2); talk(painter, t, 'point'); } });
  S(11, 99, { set: 'port', from: [17.5, 4.0, 21], to: [19, 5, 26], look: [12, 4, -30], fov: 52, focus: 0.5, update: (t) => { talk(sailor, t, t > lineT(12) ? 'shrug' : 'explain'); arrow.visible = false; others.forEach((o) => (o.visible = true)); } });
}
