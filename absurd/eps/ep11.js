// EP11 — Why airplane windows are round (explainer, 2D guy in a 3D world)
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, particles, rng, fbm, clamp, smooth, lerp, mat, guy, lineT, mouth } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const SKY = { sky: { top: 0x3f86e0, horizon: 0xd6ecff }, sunDir: [0.5, 0.6, 0.4], fog: [0xcfe6fa, 400, 4000], hemi: [0xd8ecff, 0x7a9a50, 0.85], sun: [0xfff2d8, 2.6], shadowCenter: [0, 0, 0], shadowSize: 60, tilt: 0.25, sat: 1.45, exposure: 0.82 };

  // an airliner: fuselage along +x, windows on the +z side
  function plane(o = {}) {
    const g = new THREE.Group(); const L = o.len || 30, R = 2; const body = mat(o.color || 0xf4f6f8, { flatShading: false, roughness: 0.35, metalness: o.metal ? 0.6 : 0.1 });
    const f = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 28), body); f.rotation.z = Math.PI / 2; f.castShadow = true; g.add(f);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), body); nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 1.6, 1); nose.position.x = L / 2; g.add(nose);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(R, 7, 28), body); tail.rotation.z = Math.PI / 2; tail.position.x = -L / 2 - 3.5; g.add(tail);
    const fin = box(4.5, 6, 0.4, body, -L / 2 - 2, R * 0.6, 0, g); fin.rotation.z = 0.35;
    if (o.stripe) { const s = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.02, R + 0.02, L, 28, 1, true, Math.PI * 0.42, Math.PI * 0.16), mat(o.stripe, { flatShading: false })); s.rotation.z = Math.PI / 2; g.add(s); }
    const wing = box(7, 0.35, 26, body, -1, -0.8, 0, g); wing.rotation.y = 0.0;
    const wt = box(3, 0.3, 9, body, -L / 2 - 1.5, 0.6, 0, g);
    if (!o.comet) for (const z of [-6, 6]) { const e = cyl(0.9, 0.9, 3.2, mat(0xc8ccd2, { flatShading: false, metalness: 0.5 }), 0, 0, 0, g, 16); e.rotation.z = Math.PI / 2; e.position.set(1.5, -1.8, z); }
    const wm = mat(0x1c2633, { flatShading: false, roughness: 0.15, metalness: 0.4 });
    for (let i = 0; i < (o.comet ? 9 : 16); i++) {
      const x = L / 2 - 6 - i * (o.comet ? 2.4 : 1.4);
      const w = o.square ? new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), wm) : new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), wm);
      if (!o.square) w.scale.y = 1.35;
      w.position.set(x, 0.5, R + 0.01); g.add(w);
    }
    const cw = box(1.2, 0.5, 0.05, wm, L / 2 + 1.0, 0.7, R * 0.92, g); cw.rotation.y = 0.5;
    return g;
  }

  // ---------------- tarmac (modern jet) ----------------
  const tm = defineSet('tarmac', SKY);
  terrain({ size: 3000, seg: 60, parent: tm, height: (x, z) => Math.abs(z) < 22 ? 0 : 0.3 * fbm(x * 0.05, z * 0.05), color: (x, y, z) => Math.abs(z) < 22 ? (Math.abs(z) < 0.4 && Math.floor(x / 8) % 2 === 0 ? '#f2f0e6' : '#5c6066') : (fbm(x * 0.02, z * 0.02) > 0.5 ? '#7cbf4a' : '#6aae3e') });
  const jet = plane({ stripe: 0x2f6fe0 }); jet.position.set(0, 3.4, -6); tm.add(jet);
  for (let i = 0; i < 3; i++) { const g2 = cyl(0.12, 0.12, 1.4, 0x333333, 9 - i * 9, 0, -6 + (i === 1 ? 0 : 0), tm, 8); }
  const pilot = guy({ height: 2.7, job: 'pilot', hat: 'pilot', outfit: { body: '#1e2c4f', buttons: '#f2c14e', collar: '#ffffff', tie: '#1b1b1f', wings: '#f2c14e' } });
  pilot.position.set(2.2, 0, 5); tm.add(pilot);

  // ---------------- 1950s airfield + Comet ----------------
  const OLD = { ...SKY, sky: { top: 0x6a9ad0, horizon: 0xf2e2c4 }, sat: 1.1, hemi: [0xf2e6d0, 0x8a7a50, 1.15], sun: [0xffe6c0, 2.6] };
  const of = defineSet('oldfield', OLD);
  terrain({ size: 3000, seg: 60, parent: of, height: (x, z) => Math.abs(z) < 20 ? 0 : 0.4 * fbm(x * 0.05, z * 0.05), color: (x, y, z) => Math.abs(z) < 20 ? '#8a8478' : '#9aae5a' });
  const comet = plane({ comet: true, square: true, metal: true, color: 0xd8dde4, len: 28 }); comet.position.set(0, 3.4, -6); of.add(comet);
  const hangar = new THREE.Group(); hangar.position.set(-40, 0, -40); of.add(hangar); const hg = mesh(new THREE.CylinderGeometry(14, 14, 40, 24, 1, false, 0, Math.PI), 0x9a9286, 0, 0, 0, hangar); hg.rotation.x = Math.PI / 2; hg.rotation.z = Math.PI / 2;
  sign(['COMET', '1952'], 6, 2.4, { bg: '#c9b48a', fg: '#3a2a1a' }, 10, 1.6, 4, of);
  cyl(0.1, 0.1, 1.6, 0x5a4a3a, 10, 0, 3.9, of);
  const pilot2 = guy({ height: 2.7, job: 'pilot', hat: 'pilot', outfit: { body: '#1e2c4f', buttons: '#f2c14e', collar: '#ffffff', tie: '#1b1b1f', wings: '#f2c14e' } }); pilot2.position.set(2.2, 0, 5); of.add(pilot2);

  // ---------------- Comet in the sky ----------------
  const sk = defineSet('sky', { ...SKY, fog: [0xd6ecff, 300, 3000], shadowSize: 40 });
  const cl = []; const rc = rng(9);
  for (let i = 0; i < 40; i++) { const c = sphere(8 + rc() * 10, mat(0xffffff, { flatShading: false, roughness: 1 }), -300 + rc() * 600, -40 - rc() * 30, -300 + rc() * 600, sk, 12); c.scale.y = 0.5; c.castShadow = false; cl.push(c); }
  const front = plane({ comet: true, square: true, metal: true, color: 0xd8dde4, len: 28 }); sk.add(front);
  const flyer = new THREE.Group(); sk.add(flyer);
  // a split version for the break-up: two halves
  const halfA = plane({ comet: true, square: true, metal: true, color: 0xd8dde4, len: 28 }); const halfB = halfA.clone();
  const clipA = new THREE.Plane(V(1, 0, 0), 0), clipB = new THREE.Plane(V(-1, 0, 0), 0);
  const clipIt = (o, p) => o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.clippingPlanes = [p]; m.material.side = THREE.DoubleSide; } });
  clipIt(halfA, clipA); clipIt(halfB, clipB); sk.add(halfA, halfB);
  const debris = particles(400, (i, t, v) => { const k = Math.max(0, t - lineT(4) - 0.9); v.set(Math.sin(i * 7.1) * k * 6, Math.cos(i * 3.3) * k * 4 - k * k * 2, Math.sin(i * 1.9) * k * 6); if (k <= 0) v.y = -999; }, { color: 0x9aa0a8, size: 0.35, opacity: 0.9, square: true }, sk);
  const breakup = (t) => { const k = Math.max(0, t - lineT(4) - 0.9); halfA.visible = halfB.visible = k > 0; front.visible = k <= 0; halfA.position.set(k * 2.5, -k * k * 1.2, 0); halfA.rotation.z = -k * 0.25; halfB.position.set(-k * 2.5, -k * k * 1.6, 0); halfB.rotation.z = k * 0.3; };
  K.renderer.localClippingEnabled = true;

  // ---------------- water tank test ----------------
  const tk = defineSet('tank', { sky: { top: 0x000000, horizon: 0x000000 }, exposure: 0.9, hemi: [0xe8f0ff, 0x4a5060, 0.9], sun: [0xffffff, 1.6], sunDir: [0.3, 1, 0.4], shadowSize: 40, tilt: 0.25, sat: 1.35, fog: [0x1c2230, 60, 200] });
  box(120, 0.2, 80, 0x6a6e76, 0, -0.2, 0, tk); box(120, 30, 0.5, 0x4a505a, 0, 0, -30, tk);
  for (const x of [-30, 0, 30]) { const l = new THREE.PointLight(0xfff2e0, 260, 60, 1.4); l.position.set(x, 22, 0); tk.add(l); }
  const glass = box(46, 12, 12, mat(0x6fc0e8, { transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 0, -8, tk); glass.castShadow = false;
  for (const x of [-23, 23]) for (const z of [-14, -2]) box(0.4, 12.4, 0.4, 0x8a8f98, x, 0, z, tk);
  const tankPlane = plane({ comet: true, square: true, metal: true, color: 0xd8dde4, len: 28 }); tankPlane.position.set(0, 5.5, -8); tankPlane.scale.setScalar(0.62); tk.add(tankPlane);
  const gauge = new THREE.Group(); gauge.position.set(-16, 0, 6); tk.add(gauge); box(3, 4, 1.5, 0x3a3f4a, 0, 0, 0, gauge);
  const gc = document.createElement('canvas'); gc.width = 256; gc.height = 256; const gg = gc.getContext('2d'); const gt = new THREE.CanvasTexture(gc);
  const gface = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ map: gt })); gface.position.set(0, 2.6, 0.78); gauge.add(gface);
  const drawGauge = (k) => { gg.fillStyle = '#f5f1e6'; gg.fillRect(0, 0, 256, 256); gg.strokeStyle = '#1b1b1f'; gg.lineWidth = 8; gg.beginPath(); gg.arc(128, 128, 110, 0, 7); gg.stroke(); gg.fillStyle = '#d9483b'; gg.beginPath(); gg.arc(128, 128, 110, -0.4, 0.4); gg.lineTo(128, 128); gg.fill(); gg.save(); gg.translate(128, 128); gg.rotate(-2.3 + k * 2.6); gg.fillStyle = '#1b1b1f'; gg.fillRect(-4, -96, 8, 100); gg.restore(); gg.font = 'bold 34px DejaVu Sans'; gg.textAlign = 'center'; gg.fillText('PSI', 128, 210); gt.needsUpdate = true; };
  const cyc = new THREE.Group(); tk.add(cyc);
  const counter = sign(['FLIGHTS: 0'], 8, 1.6, { bg: '#1b1b1f', fg: '#7dff8a' }, 12, 9, -1.9, tk);
  const engineer = guy({ height: 2.7, job: 'pilot', hat: 'pilot', outfit: { body: '#1e2c4f', buttons: '#f2c14e', collar: '#ffffff', tie: '#1b1b1f', wings: '#f2c14e' } }); engineer.position.set(12, 0, 16); tk.add(engineer);
  let flights = 0; const flightsTex = (n) => { counter.material.map = K.textTex([`FLIGHTS: ${n.toLocaleString()}`], { w: 1024, h: 205, bg: '#1b1b1f', fg: '#7dff8a' }); };

  // ---------------- stress diagram panel ----------------
  const dg = defineSet('diagram', { sky: { top: 0x2a3550, horizon: 0x3a4a6a }, hemi: [0xffffff, 0x404040, 1.2], sun: [0xffffff, 1.0], tilt: 0.15, sat: 1.25 });
  const dc = document.createElement('canvas'); dc.width = 1024; dc.height = 1280; const d = dc.getContext('2d'); const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), new THREE.MeshBasicMaterial({ map: dt })); panel.position.set(0, 6, 0); dg.add(panel);
  const r2 = rng(3); const rivets = Array.from({ length: 60 }, () => [r2() * 1024, r2() * 1280]);
  function drawPanel(t) {
    const L = (i) => lineT(i);
    const round = t >= L(11) - 0.15;
    const puff = Math.sin((t - L(7)) * 5) * 0.5 + 0.5;
    const gr = d.createLinearGradient(0, 0, 1024, 1280); gr.addColorStop(0, '#c9ced6'); gr.addColorStop(1, '#9aa2ad'); d.fillStyle = gr; d.fillRect(0, 0, 1024, 1280);
    d.fillStyle = '#7d848f'; for (const [x, y] of rivets) { d.beginPath(); d.arc(x, y, 6, 0, 7); d.fill(); }
    const cx = 512, cy = 600, w = 360, h = round ? 480 : 380;
    // stress lines
    const lines = 16;
    for (let i = 0; i < lines; i++) {
      const y = 140 + i * 66; d.lineWidth = 5; let hot = 0;
      d.beginPath();
      for (let x = 40; x <= 984; x += 12) {
        const dx = (x - cx) / (w / 2 + 40), dy = (y - cy) / (h / 2 + 40);
        const inside = round ? (dx * dx + dy * dy < 1) : (Math.abs(dx) < 1 && Math.abs(dy) < 1);
        let yy = y;
        if (inside) { yy = y < cy ? cy - h / 2 - 40 - (cy - y) * 0.15 : cy + h / 2 + 40 + (y - cy) * 0.15; }
        if (!round) { const near = Math.min(Math.hypot(x - (cx - w / 2), y - (cy - h / 2)), Math.hypot(x - (cx + w / 2), y - (cy - h / 2)), Math.hypot(x - (cx - w / 2), y - (cy + h / 2)), Math.hypot(x - (cx + w / 2), y - (cy + h / 2))); hot = Math.max(hot, 1 - near / 160); }
        yy += (t > L(7) ? puff * 6 : 0);
        x === 40 ? d.moveTo(x, yy) : d.lineTo(x, yy);
      }
      d.strokeStyle = round ? '#3b8fe0' : '#3b8fe0'; d.stroke();
    }
    // window
    d.fillStyle = '#1c2633'; d.strokeStyle = '#5a616c'; d.lineWidth = 22;
    d.beginPath(); if (round) d.ellipse(cx, cy, w / 2, h / 2, 0, 0, 7); else d.rect(cx - w / 2, cy - h / 2, w, h); d.fill(); d.stroke();
    // hot corners
    if (!round && t > L(9) - 0.2) {
      const glow = 0.5 + 0.5 * Math.sin(t * 8);
      for (const [x, y] of [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx - w / 2, cy + h / 2], [cx + w / 2, cy + h / 2]]) {
        const rg = d.createRadialGradient(x, y, 0, x, y, 140); rg.addColorStop(0, `rgba(255,60,40,${0.75 * (0.6 + 0.4 * glow)})`); rg.addColorStop(1, 'rgba(255,60,40,0)'); d.fillStyle = rg; d.fillRect(x - 140, y - 140, 280, 280);
      }
    }
    // cracks
    if (!round && t > L(10)) {
      const k = clamp((t - L(10)) / 2.0); d.strokeStyle = '#111'; d.lineWidth = 7;
      for (const [x, y, sx, sy] of [[cx + w / 2, cy - h / 2, 1, -1], [cx - w / 2, cy + h / 2, -1, 1], [cx + w / 2, cy + h / 2, 1, 1]]) {
        d.beginPath(); d.moveTo(x, y); let px = x, py = y; const rr2 = rng(Math.floor(x + y));
        for (let s = 0; s < 10 * k; s++) { px += sx * (18 + rr2() * 20); py += sy * (8 + rr2() * 22) * (rr2() > 0.5 ? 1 : -0.3); d.lineTo(px, py); } d.stroke();
      }
    }
    if (round && t > L(11)) { d.fillStyle = 'rgba(80,200,120,0.18)'; d.fillRect(0, 0, 1024, 1280); }
    dt.needsUpdate = true;
  }
  const diagGuy = guy({ height: 2.7, job: 'pilot', hat: 'pilot', outfit: { body: '#1e2c4f', buttons: '#f2c14e', collar: '#ffffff', tie: '#1b1b1f', wings: '#f2c14e' } }); diagGuy.position.set(-0.3, 1.5, 4.6); dg.add(diagGuy);
  box(30, 0.2, 20, 0x3a4560, 0, -0.2, 0, dg);

  // ---------------- cabin window close-up ----------------
  const cb = defineSet('cabin', { exposure: 0.8, sky: { top: 0x3f86e0, horizon: 0xd6ecff }, hemi: [0xfff2e0, 0x6a5a4a, 0.9], sun: [0xfff2d8, 1.2], sunDir: [0.2, 0.6, 1], tilt: 0.3, sat: 1.3, shadowSize: 10 });
  box(12, 6, 0.3, 0xe8e2d6, 0, 0, -1, cb);
  const winC = document.createElement('canvas'); winC.width = 512; winC.height = 700; const wg = winC.getContext('2d'); const wtx = new THREE.CanvasTexture(winC); wtx.colorSpace = THREE.SRGBColorSpace;
  wg.fillStyle = '#e8e2d6'; wg.fillRect(0, 0, 512, 700); wg.fillStyle = '#cfc8b8'; wg.beginPath(); wg.ellipse(256, 350, 200, 280, 0, 0, 7); wg.fill();
  const sg2 = wg.createLinearGradient(0, 100, 0, 600); sg2.addColorStop(0, '#5aa0ea'); sg2.addColorStop(0.7, '#cfe6ff'); sg2.addColorStop(1, '#ffffff'); wg.fillStyle = sg2; wg.beginPath(); wg.ellipse(256, 350, 160, 236, 0, 0, 7); wg.fill();
  wg.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, r] of [[200, 470, 50], [270, 480, 60], [330, 470, 45]]) { wg.beginPath(); wg.arc(x, y, r, 0, 7); wg.fill(); }
  wg.fillStyle = '#1b1b1f'; wg.beginPath(); wg.arc(256, 520, 7, 0, 7); wg.fill();
  wtx.needsUpdate = true;
  const wplane = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.9), new THREE.MeshBasicMaterial({ map: wtx })); wplane.position.set(0, 3.2, -0.84); cb.add(wplane);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 40), mat(0x3b8fe0, { flatShading: false, emissive: 0x3b8fe0 })); ring.position.set(0, 2.43, -0.8); ring.scale.setScalar(0.25); cb.add(ring);
  box(1.2, 1.2, 1.2, 0x2f4a8a, -3.4, 0, 0.6, cb);
  const cabGuy = guy({ height: 2.7, job: 'pilot', hat: 'pilot', outfit: { body: '#1e2c4f', buttons: '#f2c14e', collar: '#ffffff', tie: '#1b1b1f', wings: '#f2c14e' } }); cabGuy.position.set(1.3, 0, 2.2); cb.add(cabGuy);

  // ---------------- shots (timed to the narration lines) ----------------
  const T = (i) => (i <= 0 ? 0 : lineT(i) - 0.08);
  const talk = (g, t) => { g.state.talk = mouth(t); };
  const S = (a, b, o) => shot({ t0: T(a), t1: b >= 16 ? 999 : T(b), ...o });
  S(0, 1, { set: 'tarmac', from: [4.6, 1.8, 11.5], to: [4.2, 1.8, 10.5], look: [0.6, 1.9, 0], fov: 46, focus: 0.5, update: (t) => { talk(pilot, t); pilot.state.pose = t > 1.2 ? 'point' : 'idle'; } });
  S(1, 2, { set: 'oldfield', from: [4.6, 1.8, 11.5], to: [4.2, 1.8, 10.5], look: [0.6, 1.9, 0], fov: 46, focus: 0.5, update: (t) => { talk(pilot2, t); pilot2.state.pose = 'point'; } });
  S(2, 4, { set: 'sky', from: [0, 0, 0], look: [0, 0, 0], fov: 44, focus: 0.5, update: (t) => { front.position.set(0, 0, 0); front.rotation.set(0, 0, 0.04); const k = t - T(2); camera.position.set(-14 + k * 1.2, 3 + Math.sin(k) * 0.4, 22 - k * 0.6); camera.lookAt(4 + k, 0, 0); cl.forEach((c, i) => (c.position.x -= 0)); front.position.x = k * 0; } });
  S(4, 5, { set: 'sky', from: [-8, 4, 34], to: [-6, 3, 30], look: [0, -1, 0], fov: 44, focus: 0.5, update: (t) => breakup(t), flash: (t) => { const k = t - lineT(4) - 0.9; return k > 0 && k < 0.12 ? 0.6 * (1 - k / 0.12) : 0; } });
  S(5, 7, { set: 'tank', from: [15, 2.4, 25], to: [14.5, 2.4, 23], look: [5, 4.4, -4], fov: 48, focus: 0.5,
    update: (t) => { talk(engineer, t); engineer.state.pose = 'explain'; const k = Math.max(0, t - T(6)); const puff = 1 + 0.025 * Math.max(0, Math.sin(k * 6)); tankPlane.scale.set(0.62, 0.62 * puff, 0.62 * puff); drawGauge(Math.max(0, Math.sin(k * 6))); const n = Math.floor(k * 2.2); if (n !== flights) { flights = n; flightsTex(n * 1000); } } });
  S(7, 11, { set: 'diagram', from: [2.4, 6, 12.5], to: [1.6, 6, 11.5], look: [1.0, 5.4, 0], fov: 50, focus: 0.5, band: 0.3, update: (t) => { drawPanel(t); talk(diagGuy, t); diagGuy.state.pose = t > lineT(9) ? 'point' : 'explain'; diagGuy.state.flip = true; } });
  S(11, 13, { set: 'diagram', from: [1.6, 6, 11.5], to: [1.0, 6, 11], look: [0.6, 5.6, 0], fov: 50, focus: 0.5, band: 0.3, update: (t) => { drawPanel(t); talk(diagGuy, t); diagGuy.state.pose = 'shrug'; diagGuy.state.flip = true; } });
  S(13, 14, { set: 'tarmac', from: [3.6, 1.7, 9.8], to: [3.3, 1.7, 9.2], look: [0.8, 1.8, 0], fov: 46, focus: 0.5, update: (t) => { talk(pilot, t); pilot.state.pose = 'shrug'; } });
  S(14, 16, { set: 'cabin', from: [0.8, 2.1, 8.2], to: [0.6, 2.2, 7.0], look: [0.6, 2.6, -0.8], fov: 46, focus: 0.5, band: 0.3, update: (t) => { talk(cabGuy, t); cabGuy.state.pose = 'point'; cabGuy.state.flip = true; ring.scale.setScalar(0.25 + 0.05 * Math.sin(t * 6)); } });
}
