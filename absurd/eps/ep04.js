// EP04 — Mount Everest got an escalator.
export async function build(K) {
  const { THREE, camera, defineSet, shot, box, cyl, sphere, mesh, sign, textTex, terrain, person, crowd, particles, rng, fbm, clamp, smooth, lerp, mat } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // steps texture (stripes) shared by escalators
  const sc = document.createElement('canvas'); sc.width = 64; sc.height = 64; const sg = sc.getContext('2d');
  sg.fillStyle = '#4a4e56'; sg.fillRect(0, 0, 64, 64); sg.fillStyle = '#8a8f98'; for (let i = 0; i < 64; i += 8) sg.fillRect(0, i, 64, 3); sg.fillStyle = '#ffd23f'; sg.fillRect(0, 0, 4, 64); sg.fillRect(60, 0, 4, 64);

  const H = (x, z) => {
    const d = Math.hypot(x, z * 1.15);
    let h = 1000 * Math.exp(-d / 380) + (fbm(x * 0.006, z * 0.006) - 0.5) * 140 * smooth(30, 200, d) + (fbm(x * 0.04, z * 0.04) - 0.5) * 16;
    return Math.min(h, 962);
  };
  function buildMountain(G, winter) {
    terrain({ size: 4200, seg: 260, parent: G, height: H, color: (x, y, z) => { const s = fbm(x * 0.02, z * 0.02); return y > 300 + s * 200 ? (s > 0.63 ? '#8c8e96' : '#f4f7fb') : y > 150 ? (s > 0.5 ? '#6f6a66' : '#dfe5ee') : '#5d5a55'; } });
    const B = V(0, H(0, 760) + 6, 760), S = V(0, 966, 24);
    const esc = (off, dir, stopped) => {
      const a = B.clone().add(V(off, 0, 0)), b = S.clone().add(V(off, 0, 0)); const L = a.distanceTo(b);
      const g = new THREE.Group(); g.position.copy(a).lerp(b, 0.5); g.lookAt(b); G.add(g);
      box(3.4, 0.8, L, 0xb8bec8, 0, -0.8, 0, g);
      const st = new THREE.CanvasTexture(sc); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(1, L / 3); st.colorSpace = THREE.SRGBColorSpace;
      const steps = new THREE.Mesh(new THREE.PlaneGeometry(2.6, L), new THREE.MeshStandardMaterial({ map: st, roughness: 0.6 })); steps.rotation.x = -Math.PI / 2; steps.rotation.z = Math.PI / 2 * 0; steps.position.y = 0.02; g.add(steps);
      st.rotation = 0; st.center.set(0.5, 0.5);
      for (const x of [-1.5, 1.5]) { box(0.25, 1.0, L, 0xd8dde4, x, 0, 0, g); box(0.18, 0.12, L, 0x1d1d1d, x, 1.0, 0, g); }
      g.userData.update = (t) => { if (!stopped(t)) st.offset.y = (t * 0.25 * dir) % 1; };
      // pillars down to the ground
      for (let s = 0.03; s < 0.98; s += 0.035) { const p = a.clone().lerp(b, s); const gy = H(p.x, p.z); if (p.y - gy > 3) { const c = cyl(0.5, 0.6, p.y - gy, 0x9aa0aa, p.x, gy, p.z, G, 8); c.castShadow = false; } }
      return { a, b, L, g };
    };
    const up = esc(0, -1, (t) => winter), down = esc(4.6, 1, (t) => winter);
    // riders standing on the right
    const N = 420, list = []; const r = rng(winter ? 9 : 3);
    for (let i = 0; i < N; i++) list.push({ s: i / N + r() * 0.0008, x: 0, y: 0, z: 0, ph: r() * 6.28 });
    const riders = crowd(list, G, { seed: winter ? 8 : 2 });
    const dirv = S.clone().sub(B).normalize(); const ry = Math.atan2(dirv.x, dirv.z);
    riders.userData.set((p) => { const pos = B.clone().lerp(S, p.s); return { x: pos.x + 0.65, y: pos.y + 0.05, z: pos.z, ry }; });
    riders.userData.update = (t) => riders.userData.set((p) => {
      const s = winter ? p.s : (p.s + t * 0.0016) % 1; const pos = B.clone().lerp(S, s);
      return { x: pos.x + (winter ? Math.sin(p.ph) * 0.5 : 0.65), y: pos.y + 0.05 + (winter ? Math.abs(Math.sin(t * 4 + p.ph)) * 0.12 : 0), z: pos.z, ry };
    });
    // climbers on the down escalator, walking up against it
    const climbers = [];
    for (let i = 0; i < 6; i++) { const c = person({ shirt: [0xff8a3d, 0xd9483b, 0xf2c14e][i % 3], hat: 0xffd23f, rand: rng(70 + i) }, G); climbers.push(c); c.userData.s = 0.18 + i * 0.006; }
    const climbUpdate = (t) => climbers.forEach((c, i) => { const p = B.clone().lerp(S, c.userData.s + Math.sin(t * 0.7 + i) * 0.0004); c.position.set(p.x + 4.6, p.y + 0.05, p.z); c.rotation.y = ry; c.walk(t * 7 + i, 1); c.rotation.x = -0.25; });
    climbUpdate(0);
    return { B, S, up, down, riders, ry, climbers, climbUpdate };
  }

  // ---------------- summer mountain ----------------
  const sumCfg = { sky: { top: 0x1f4f9a, horizon: 0xbfd6ee, bottom: 0xe6eef6 }, sunDir: [0.6, 0.5, 0.5], fog: [0xd7e4f0, 900, 8000], hemi: [0xd6e6ff, 0x8090a8, 1.2], sun: [0xffffff, 3.0], shadowCenter: [0, 600, 300], shadowSize: 600, tilt: 0.85, exposure: 0.95 };
  const ev = defineSet('everest', sumCfg);
  const M = buildMountain(ev, false);
  const at = (s, dx = 0, dy = 0) => M.B.clone().lerp(M.S, s).add(V(dx, dy, 0));
  // food court on a platform at s = 0.5
  const fcP = at(0.5); const FC = new THREE.Group(); FC.position.set(fcP.x - 18, fcP.y - 0.6, fcP.z); ev.add(FC);
  box(28, 1, 22, 0xd8dde4, 0, -1, 0, FC);
  for (const [x, z] of [[-12, -9], [12, -9], [-12, 9], [12, 9]]) cyl(0.8, 0.8, 120, 0x9aa0aa, x, -121, z, FC, 8);
  const stalls = [['NOODLE PEAK', 0xd9483b], ['YETI BURGER', 0x3b6fd9], ['THIN AIR TACOS', 0x4caf6a]];
  stalls.forEach(([n, c], i) => { const x = -9 + i * 9; box(7, 3.2, 3, c, x, 0, -9, FC); sign(n, 6.4, 1.1, { bg: '#ffffff', fg: '#' + c.toString(16).padStart(6, '0') }, x, 3.9, -7.45, FC); });
  sign(['FOOD COURT', '6,000 m'], 9, 3, { bg: '#1d1d1d', fg: '#ffd23f' }, 0, 8, -10.4, FC);
  cyl(0.15, 0.15, 6, 0x777777, -3.5, 0, -10.6, FC); cyl(0.15, 0.15, 6, 0x777777, 3.5, 0, -10.6, FC);
  const tables = [];
  for (let i = 0; i < 6; i++) { const x = -8 + (i % 3) * 8, z = 1 + Math.floor(i / 3) * 6; cyl(1.1, 1.1, 0.1, 0xf5f5f0, x, 1.0, z, FC, 16); cyl(0.08, 0.08, 1.0, 0x777777, x, 0, z, FC, 6); const u = mesh(new THREE.ConeGeometry(1.8, 0.7, 8), [0xd9483b, 0x3b6fd9, 0xf2c14e][i % 3], x, 3.0, z, FC); cyl(0.04, 0.04, 2.8, 0x777777, x, 0, z, FC, 6); tables.push([x, z]); }
  const eater = person({ shirt: 0xff8a3d, hat: 0xd9483b }, FC); eater.position.set(-8, 0, 2.6); eater.rotation.y = Math.PI; eater.pose({ armR: -1.3 });
  const bowl = new THREE.Group(); bowl.position.set(-8, 1.1, 1.3); FC.add(bowl);
  cyl(0.35, 0.22, 0.25, 0xffffff, 0, 0, 0, bowl, 12); cyl(0.33, 0.33, 0.04, 0xcfe8ff, 0, 0.22, 0, bowl, 12);
  const spoon = box(0.06, 0.9, 0.06, 0xc0c0c0, 0.05, 0.2, 0, bowl); spoon.rotation.z = 0.1;
  for (let i = 0; i < 6; i++) { const ic = mesh(new THREE.ConeGeometry(0.04, 0.25, 4), mat(0xcfefff, { roughness: 0.1 }), -0.3 + i * 0.12, -0.05, 0.35, bowl); ic.rotation.x = Math.PI; }
  const diners = []; for (let i = 0; i < 9; i++) { const [x, z] = tables[(i + 1) % 6]; const d = person({ rand: rng(90 + i), hat: [0xd9483b, 0x3b6fd9, 0xf2c14e][i % 3] }, FC); d.position.set(x + Math.cos(i * 2.1) * 1.6, 0, z + Math.sin(i * 2.1) * 1.6); d.rotation.y = -i * 2.1 - Math.PI / 2; diners.push(d); }
  // summit: gift shop + snaking selfie line + flag
  const SU = new THREE.Group(); SU.position.set(0, 962, 0); ev.add(SU);
  box(9, 4, 6, 0xd9483b, -9, 0, -8, SU); box(9.6, 0.5, 6.6, 0xffd23f, -9, 4, -8, SU);
  sign('SUMMIT GIFTS', 8.4, 1.3, { bg: '#ffd23f', fg: '#d9483b' }, -9, 3.0, -4.95, SU);
  cyl(0.08, 0.08, 6, 0xdddddd, 6, 0, -4, SU); const fl = sign(['TOP', '8,849 m'], 2.4, 1.4, { bg: '#ffffff', fg: '#1d1d1d', border: '#d9483b' }, 7.25, 5.2, -4, SU);
  sign(['SELFIE SPOT', 'WAIT: 4 HRS ▸'], 4, 2, { bg: '#1d1d1d', fg: '#ffd23f' }, 2, 2.8, 8, SU); cyl(0.08, 0.08, 2.4, 0x777777, 2, 0, 8, SU);
  const line = []; const rl = rng(12);
  for (let i = 0; i < 230; i++) { const a = i * 0.16, rr = 3 + i * 0.075; line.push({ x: 6 + Math.cos(a) * rr, y: 0, z: -4 + Math.sin(a) * rr, ry: a + Math.PI }); }
  crowd(line.filter((p) => Math.hypot(p.x, p.z) < 23), SU, { seed: 13 });
  const selfie = person({ shirt: 0xe86fa8, hat: 0x3b6fd9 }, SU); selfie.position.set(-2, 0, 14); selfie.rotation.y = 0.3; selfie.pose({ armR: -2.2, armRz: -0.3 });
  const phone = box(0.12, 0.22, 0.03, 0x111111, 0, -0.6, 0.05, selfie.userData.armR);
  const flash = new THREE.PointLight(0xffffff, 0, 8); flash.position.set(-2, 2.4, 15); SU.add(flash);

  // ---------------- winter mountain ----------------
  const ew = defineSet('winter', { ...sumCfg, sky: { top: 0x5d6b7c, horizon: 0xc9d2dc, bottom: 0xe6eef6 }, fog: [0xc9d2dc, 200, 2500], sun: [0xe8eef6, 1.2], hemi: [0xdfe6ef, 0x7a8494, 1.2] });
  const MW = buildMountain(ew, true);
  particles(4000, (i, t, v) => { const k = (i * 0.618 + t * 0.12) % 1; const c = MW.B.clone().lerp(MW.S, 0.35); v.set(c.x - 70 + ((i * 37.3) % 140) + Math.sin(t * 2 + i) * 3, c.y + 60 - k * 120, c.z - 70 + ((i * 53.1) % 140)); }, { color: 0xffffff, size: 0.6, opacity: 0.85 }, ew);
  const ooo = new THREE.Group(); const oP = MW.B.clone().lerp(MW.S, 0.012); ooo.position.set(oP.x - 3.5, H(oP.x - 3.5, oP.z), oP.z); ew.add(ooo);
  cyl(0.1, 0.1, 3, 0x777777, 0, 0, 0, ooo); sign(['OUT OF ORDER', 'PLEASE USE STAIRS'], 3, 1.4, { bg: '#ffd23f', fg: '#1d1d1d', border: '#1d1d1d' }, 0, 3.2, 0.06, ooo);

  // ---------------- K2 elevator ----------------
  const k2 = defineSet('k2', { sky: { top: 0x2a5aa8, horizon: 0xc9dcf0 }, sunDir: [-0.5, 0.5, 0.5], fog: [0xd0dfee, 600, 6000], hemi: [0xd6e6ff, 0x707a88, 1.15], sun: [0xffffff, 3.0], shadowCenter: [0, 400, 120], shadowSize: 400, tilt: 0.85, exposure: 0.95 });
  const HK = (x, z) => { const d = Math.hypot(x, z); return 860 * Math.exp(-d / 210) + (fbm(x * 0.01, z * 0.01) - 0.5) * 90 * smooth(20, 120, d); };
  terrain({ size: 3000, seg: 220, parent: k2, height: HK, color: (x, y, z) => { const s = fbm(x * 0.03, z * 0.03); return y > 260 + s * 160 ? (s > 0.6 ? '#7c7f88' : '#f2f5fa') : '#5d5a55'; } });
  const EL = new THREE.Group(); EL.position.set(0, 0, 150); k2.add(EL);
  const shaftH = 800;
  const shaft = cyl(3, 3, shaftH, mat(0xbfe3ff, { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3 }), 0, HK(0, 150) - 5, 0, EL, 16); shaft.castShadow = false;
  for (let y = 0; y < shaftH; y += 40) cyl(3.2, 3.2, 0.6, 0x9aa0aa, 0, HK(0, 150) - 5 + y, 0, EL, 16);
  const car = box(4, 4.2, 4, 0xd9dde4, 0, HK(0, 150) + 1, 0, EL);
  const ooo2 = sign(['OUT OF ORDER'], 6, 1.4, { bg: '#ffd23f', fg: '#1d1d1d', border: '#1d1d1d' }, 0, HK(0, 150) + 8, 3.3, EL);
  // ladder along the shaft + repairman
  for (let y = 0; y < 600; y += 0.6) box(1.2, 0.06, 0.06, 0x777777, 0, HK(0, 150) + y, 3.6, EL).castShadow = false;
  for (const x of [-0.6, 0.6]) box(0.08, 600, 0.08, 0x777777, x, HK(0, 150), 3.6, EL).castShadow = false;
  const rep = person({ shirt: 0x3b6fd9, pants: 0x1d2b4a, hat: 0xffd23f }, EL); rep.rotation.y = Math.PI;
  const tool = box(0.5, 0.3, 0.25, 0xd9483b, 0, -0.8, 0, rep.userData.armL);
  const repY = (t) => HK(0, 150) + 14 + (t - 52) * 0.5;
  rep.userData.update = (t) => { rep.position.set(0, repY(t), 4.1); const c = Math.sin(t * 5); rep.userData.armR.rotation.x = -2.6 + c * 0.4; rep.userData.armL.rotation.x = -2.2 - c * 0.4; rep.userData.legL.rotation.x = -0.4 + c * 0.4; rep.userData.legR.rotation.x = -0.4 - c * 0.4; };

  // ---------------- shots ----------------
  const S0 = M.S, B0 = M.B;
  shot({ t0: 0, t1: 6.8, set: 'everest', from: [700, 700, 1500], to: [480, 760, 1000], look: [0, 640, 300], lookTo: [0, 760, 200], fov: 40, focus: 0.45 });
  shot({ t0: 6.8, t1: 9.6, set: 'everest', from: [60, 920, 140], to: [40, 990, 60], look: [0, 900, 120], lookTo: [0, 966, 0], fov: 44, focus: 0.5 });
  const rideP = (s) => at(s);
  shot({ t0: 9.6, t1: 12.6, set: 'everest', from: [120, 300, 900], to: [140, 360, 820], look: [0, 420, 500], fov: 40, focus: 0.5 });
  shot({ t0: 12.6, t1: 15.7, set: 'everest', from: [0, 0, 0], look: [0, 0, 0], fov: 44, focus: 0.55, band: 0.14,
    update: (t) => { const p = at(0.3 + (t - 12.6) * 0.001); camera.position.set(p.x - 6, p.y + 4.5, p.z + 9); camera.lookAt(at(0.29)); } });
  shot({ t0: 15.7, t1: 19.0, set: 'everest', from: [0, 0, 0], look: [0, 0, 0], fov: 44, focus: 0.5,
    update: (t) => { const k = (t - 15.7) / 3.3; camera.position.copy(FC.position).add(V(-34 + k * 8, 18 - k * 4, 28 - k * 6)); camera.lookAt(FC.position.clone().add(V(0, 2, -2))); } });
  shot({ t0: 19.0, t1: 21.9, set: 'everest', from: [0, 0, 0], look: [0, 0, 0], fov: 40, focus: 0.55, band: 0.14,
    update: (t) => { const k = (t - 19) / 2.9; camera.position.copy(FC.position).add(V(-8 + 2.5 - k * 0.4, 2.6, 1.3 - 2.6 + k * 0.4)); camera.lookAt(FC.position.clone().add(V(-8, 1.2, 1.3))); camera.position.add(V(0, 0, 0)); } });
  shot({ t0: 21.9, t1: 28.5, set: 'everest', from: [50, 1010, 60], to: [32, 990, 42], look: [0, 964, 0], fov: 42, focus: 0.5 });
  shot({ t0: 28.5, t1: 31.9, set: 'everest', from: [-7.5, 964.2, 19.5], to: [-8, 964.2, 19], look: [-2, 963.6, 13.5], fov: 46, focus: 0.55, band: 0.14,
    update: (t) => { flash.intensity = [29.9, 30.6].some((c) => Math.abs(t - c) < 0.08) ? 60 : 0; } , flash: (t) => [29.9, 30.6].some((c) => Math.abs(t - c) < 0.06) ? 0.35 : 0 });
  const atW = (s) => MW.B.clone().lerp(MW.S, s);
  shot({ t0: 31.9, t1: 35.2, set: 'winter', from: [0, 0, 0], look: [0, 0, 0], fov: 42, focus: 0.55,
    update: (t) => { const p = atW(0.02); camera.position.set(p.x - 12, p.y + 4, p.z + 14); camera.lookAt(p.x, p.y + 2, p.z - 10); } });
  shot({ t0: 35.2, t1: 42.1, set: 'winter', from: [0, 0, 0], look: [0, 0, 0], fov: 44, focus: 0.5,
    update: (t) => { const k = (t - 35.2) / 6.9; const p = atW(0.36); camera.position.set(p.x + 30 - k * 10, p.y + 10 + k * 30, p.z + 26 + k * 40); camera.lookAt(atW(0.36 - k * 0.1)); } });
  shot({ t0: 42.1, t1: 48.7, set: 'everest', from: [0, 0, 0], look: [0, 0, 0], fov: 42, focus: 0.55, band: 0.14,
    update: (t) => { M.climbUpdate(t); const p = at(0.192); camera.position.set(p.x + 12, p.y + 3.5, p.z + 8); camera.lookAt(p.x + 3, p.y + 1.2, p.z - 2); } });
  shot({ t0: 48.7, t1: 52.0, set: 'k2', from: [700, 500, 1400], to: [500, 420, 1000], look: [0, 450, 150], fov: 40, focus: 0.5 });
  shot({ t0: 52.0, t1: 55.3, set: 'k2', from: [12, HK(0, 150) + 6, 166], to: [10, HK(0, 150) + 7, 162], look: [0, HK(0, 150) + 6, 150], fov: 44, focus: 0.55, band: 0.14 });
  shot({ t0: 55.3, t1: 60, set: 'k2', from: [0, 0, 0], look: [0, 0, 0], fov: 40, focus: 0.5,
    update: (t) => { const y = repY(t); const k = (t - 55.3) / 4.7; camera.position.set(14 + k * 30, y - 2 + k * 40, 170 + k * 60); camera.lookAt(0, y - k * 20, 154); } });
}
