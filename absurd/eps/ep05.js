// EP05 — A company trademarked the color blue.
export async function build(K) {
  const { THREE, scene, camera, defineSet, shot, box, cyl, sphere, mesh, sign, textTex, terrain, water, person, crowd, car, city, tree, particles, rng, fbm, clamp, smooth, lerp, mat } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const BLUE = 0x2f6fe0;

  // the city lives outside the sets so several sets (blue sky / covered sky / grey) can share it
  const C = new THREE.Group(); scene.add(C); C.visible = false;
  city({ parent: C, nx: 8, nz: 8, seed: 41, hmax: 70, skip: (x, z) => Math.abs(x) < 30 && Math.abs(z) < 30, colors: [0xd9cfc0, 0xe8e2d6, 0x6f9be8, 0xd6b7a0, 0xb9c4cc, 0x4f86e8, 0xe0d2b4] });
  box(80, 0.3, 80, 0xb8b4ab, 0, -0.1, 0, C);
  // HQ tower
  const HQ = new THREE.Group(); HQ.position.set(46, 0, -46); C.add(HQ);
  box(22, 120, 22, BLUE, 0, 0, 0, HQ); box(23, 2, 23, 0xffffff, 0, 120, 0, HQ);
  sign(['BLU™', 'INCORPORATED'], 18, 8, { bg: '#ffffff', fg: '#2f6fe0' }, 0, 108, 11.1, HQ);
  // cars along the plaza road
  const cars = []; const rc = rng(5);
  for (let i = 0; i < 14; i++) { const c = car(i % 3 === 0 ? BLUE : [0xd9483b, 0xf5f5f0, 0x2e3440, 0xf2c14e][i % 4], C); c.position.set(-3 + (i % 2) * 6, 0, -150 + i * 22 + (i > 4 ? 100 : 0)); c.rotation.y = i % 2 ? Math.PI : 0; cars.push(c); }
  const tagged = cars[3]; tagged.position.set(14, 0, 22); tagged.rotation.y = Math.PI / 2;
  const tag = sign(['UNLICENSED', 'BLUE'], 2.6, 1.2, { bg: '#ffffff', fg: '#d9483b', border: '#d9483b' }, 0, 1.6, 2.12, tagged); tag.rotation.y = 0;
  const tag2 = sign(['FINE: $900'], 1.8, 0.5, { bg: '#d9483b', fg: '#ffffff' }, 0, 0.75, 2.11, tagged);
  // people: grey jeans pair
  const j1 = person({ shirt: 0xf5f5f0, pants: 0x8a8a8a }, C); j1.position.set(-6, 0, 20); j1.rotation.y = 0.3;
  const j2 = person({ shirt: 0xd9483b, pants: 0x8a8a8a }, C); j2.position.set(-4.6, 0, 20.5); j2.rotation.y = -0.2;
  const jS = sign(['JEANS', 'NOW IN GREY'], 3.4, 1.6, { bg: '#ffffff', fg: '#555555', border: '#555555' }, -8.5, 2.4, 18.9, C); cyl(0.07, 0.07, 1.8, 0x777777, -8.5, 0, 18.85, C);
  // beige police
  const cop = person({ shirt: 0xd8c39a, pants: 0xc9b388, hat: 0xc9b388 }, C); cop.position.set(10, 0, -18); cop.rotation.y = -0.6; cop.pose({ armR: -0.3 });
  const pcar = car(0xe8d9b5, C); pcar.position.set(14, 0, -22); pcar.rotation.y = -0.3;
  box(1.2, 0.25, 0.4, 0xd9483b, 0, 1.6, -0.2, pcar); sign('POLICE', 3, 0.5, { fg: '#8a6a3a' }, 1.0, 0.5, 0, pcar).rotation.y = Math.PI / 2;
  // fruit stand
  const FS = new THREE.Group(); FS.position.set(-18, 0, -14); FS.rotation.y = 0.5; C.add(FS);
  box(5, 1.1, 2, 0x8a6a4a, 0, 0, 0, FS); box(5.4, 0.2, 2.4, 0xd9483b, 0, 3, 0, FS); for (const x of [-2.5, 2.5]) cyl(0.06, 0.06, 3, 0x777777, x, 0, 1, FS, 6);
  for (let i = 0; i < 4; i++) { const cr = box(1.0, 0.35, 1.0, 0xc9a35a, -1.8 + i * 1.2, 1.1, 0, FS); for (let k = 0; k < 9; k++) sphere(0.12, [0x777777, 0xd9483b, 0xf2c14e, 0x4caf6a][i], -1.8 + i * 1.2 - 0.3 + (k % 3) * 0.3, 1.55, -0.3 + Math.floor(k / 3) * 0.3, FS, 6); }
  sign(['BERRIES', '(formerly ████berries)'], 2.6, 0.9, { bg: '#ffffff', fg: '#1d1d1d' }, -1.8, 2.3, 1.02, FS);
  // lawyers on a rooftop at the plaza edge
  const roof = new THREE.Group(); roof.position.set(-30, 24, 28); C.add(roof); box(14, 24, 12, 0xd9cfc0, 0, -24, 0, roof);
  const lawyers = [];
  for (let i = 0; i < 3; i++) { const l = person({ shirt: 0x2e3440, pants: 0x2e3440, hairColor: 0x111111 }, roof); l.position.set(-2 + i * 2, 0, 2); l.rotation.y = Math.PI * 0.85; lawyers.push(l); box(0.45, 0.32, 0.1, 0x5a3a24, 0, -0.85, 0, l.userData.armL); }
  // city hall + giant letter
  const CHG = new THREE.Group(); CHG.position.set(0, 0, -34); C.add(CHG);
  box(34, 1.4, 12, 0xe8e2d6, 0, 0, 2, CHG); box(30, 14, 10, 0xe8e2d6, 0, 1.4, -2, CHG);
  for (let i = 0; i < 6; i++) cyl(0.7, 0.8, 11, 0xffffff, -12.5 + i * 5, 1.4, 3.4, CHG);
  sign('CITY HALL', 16, 2, { fg: '#555555' }, 0, 13.4, 3.1, CHG);
  const env = new THREE.Group(); env.position.set(0, 0, 9.5); env.rotation.x = -0.3; CHG.add(env);
  box(7, 4.6, 0.2, 0xf5f1e6, 0, 0, 0, env); sign(['CEASE & DESIST', 'RE: THE SKY'], 6.2, 3.4, { bg: '#f5f1e6', fg: '#8a1f1f', border: '#8a1f1f' }, 0, 2.3, 0.11, env);
  const seal = cyl(0.55, 0.55, 0.06, 0xd9483b, 2.6, 0.5, 0.12, env, 16); seal.rotation.x = Math.PI / 2;
  // plaza crowd
  const pl = []; const rp = rng(9); for (let i = 0; i < 70; i++) pl.push({ x: -26 + rp() * 52, y: 0, z: -10 + rp() * 34, ry: rp() * 6.28 });
  const plazaCrowd = crowd(pl, C, { seed: 3 });
  // tarp + blimps (only in the covered sets)
  const COV = new THREE.Group(); C.add(COV);
  const tarp = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 30, 30), mat(0x8a8d92, { side: THREE.DoubleSide, roughness: 1 }));
  tarp.rotation.x = -Math.PI / 2; tarp.position.y = 176; COV.add(tarp);
  { const p = tarp.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -((x * 0.013) % 1 + 1) % 1 * 0 - Math.abs(Math.sin(x * 0.02) * Math.sin(y * 0.02)) * 10); } tarp.geometry.computeVertexNormals(); }
  const blimps = []; const rb = rng(14);
  for (let i = 0; i < 60; i++) { const b = new THREE.Group(); const e = sphere(1, 0xc9ccd2, 0, 0, 0, b, 14); e.scale.set(5, 5, 14); box(2, 1.4, 4, 0x555555, 0, -6, 0, b); b.position.set(-650 + rb() * 1300, 150 + rb() * 8, -650 + rb() * 1300); b.rotation.y = rb() * 6.28; COV.add(b); blimps.push(b); for (let k = 0; k < 4; k++) { const cbl = box(0.05, 12, 0.05, 0x333333, (k % 2 ? 1 : -1) * 3, -12, (k < 2 ? 1 : -1) * 8, b); cbl.castShadow = false; } }
  // grey billboard for the ending
  const GB = new THREE.Group(); GB.position.set(-12, 0, -22); GB.rotation.y = 0.35; C.add(GB);
  for (const x of [-5, 5]) cyl(0.3, 0.3, 9, 0x777777, x, 0, 0, GB);
  sign(['GREY™', 'LICENSE DUE: FRIDAY'], 16, 6, { bg: '#e6e6e6', fg: '#333333', border: '#333333' }, 0, 12, 0.35, GB);
  const worried = []; for (let i = 0; i < 5; i++) { const w = person({ rand: rng(200 + i) }, C); w.position.set(-16 + i * 2.2, 0, -10 + (i % 2)); w.rotation.y = Math.PI + 0.35; w.pose({ head: -0.35 }); worried.push(w); }

  const cityCfg = (o = {}) => ({ sky: { top: 0x2f6fe0, horizon: 0xcfe3ff }, sunDir: [0.4, 0.65, 0.4], fog: [0xcfe3ff, 300, 1600], hemi: [0xcfe3ff, 0x6b5a48, 1.05], sun: [0xfff4e0, 2.8], shadowCenter: [0, 0, 0], shadowSize: 140, tilt: 0.85, ...o });
  defineSet('blue', cityCfg());
  defineSet('covered', cityCfg({ sky: { top: 0x7c8088, horizon: 0x9a9ea6 }, fog: [0x8e9298, 150, 900], hemi: [0xc8ccd2, 0x5a5a5a, 1.0], sun: [0xe8eaee, 0.7] }));
  defineSet('grey', cityCfg({ sat: 0.0, sky: { top: 0x8a8d92, horizon: 0xb4b7bc }, fog: [0xa0a3a8, 250, 1400] }));
  // ocean + park sets
  const oc = defineSet('ocean', { sky: { top: 0x2f6fe0, horizon: 0xd8eeff }, sunDir: [0.3, 0.6, -0.5], fog: [0xd6ecfb, 400, 3000], hemi: [0xd6ebff, 0xc9b48a, 1.15], sun: [0xfff3dc, 3.0], shadowSize: 60, tilt: 0.85 });
  terrain({ size: 1600, seg: 120, parent: oc, height: (x, z) => z > 0 ? Math.min(6, z * 0.06) : -2 + z * 0.05, color: () => '#ecd7a2' });
  water({ size: 1600, seg: 80, color: 0x1f6fd0, amp: 0.7, freq: 0.07, y: -0.2, z: -400, parent: oc });
  const inv = new THREE.Group(); inv.position.set(0, 0.2, 4); inv.rotation.x = -0.25; oc.add(inv);
  cyl(0.08, 0.08, 1.4, 0x8a6a4a, 0, 0, -0.05, inv); sign(['INVOICE: THE OCEAN', 'Blue usage: 361M km²', 'TOTAL DUE: $∞'], 3.2, 2.1, { bg: '#f5f1e6', fg: '#2f6fe0', border: '#2f6fe0' }, 0, 2.2, 0, inv);
  const buoy = new THREE.Group(); buoy.position.set(6, 0, -18); oc.add(buoy); sphere(1.1, 0xffd23f, 0, 0.3, 0, buoy, 12); cyl(0.08, 0.08, 3, 0x777777, 0, 0, 0, buoy);
  sign(['PAYMENT', 'PENDING'], 2.4, 1.2, { bg: '#ffffff', fg: '#d9483b', border: '#d9483b' }, 0, 3.4, 0.05, buoy);
  buoy.userData.update = (t) => { buoy.position.y = Math.sin(t * 1.5) * 0.4 - 0.4; buoy.rotation.z = Math.sin(t * 1.2) * 0.12; };
  const pk = defineSet('park', { sky: { top: 0x2f6fe0, horizon: 0xe2f0ff }, sunDir: [0.5, 0.55, 0.5], fog: [0xd8ebf7, 200, 1500], hemi: [0xd8ecff, 0x5f7d3a, 1.15], sun: [0xfff4dc, 2.9], shadowSize: 50, tilt: 0.85 });
  terrain({ size: 1200, seg: 80, parent: pk, height: (x, z) => 3 * fbm(x * 0.02, z * 0.02), color: (x, y, z) => fbm(x * 0.05, z * 0.05) > 0.5 ? '#6fae46' : '#5f9e3c' });
  const rt = rng(30);
  for (let i = 0; i < 26; i++) {
    const x = -30 + rt() * 60, z = -40 + rt() * 50; const tr = tree(pk, x, z, 1.4 + rt() * 0.6, { round: true, leaf: 0x3f8f3a, y: 1.4 });
    const tg = new THREE.Group(); tg.position.set(0.6, 1.2, 0.4); tr.add(tg); box(0.02, 0.5, 0.02, 0xffffff, 0, 0, 0, tg);
    sign(['GREEN™', `PAYMENT ${1 + (i % 12)}/12`], 1.1, 0.6, { bg: '#ffffff', fg: '#2f8a3a', border: '#2f8a3a' }, 0, -0.3, 0.02, tg);
  }

  // ---------------- shots ----------------
  const S = (o) => shot({ ...o, update: (t, u, e) => { C.visible = ['blue', 'covered', 'grey'].includes(o.set); COV.visible = o.set !== 'blue'; GB.visible = o.set === 'grey' && t > 53; worried.forEach((w) => (w.visible = GB.visible)); if (o.up) o.up(t, u, e); } });
  S({ t0: 0, t1: 6.8, set: 'blue', from: [180, 120, 220], to: [120, 80, 120], look: [46, 60, -46], lookTo: [46, 90, -46], fov: 42, focus: 0.45 });
  S({ t0: 6.8, t1: 9.8, set: 'blue', from: [20, 2.4, 30], to: [19, 2.2, 28], look: [14, 1.2, 22], fov: 42, focus: 0.55, band: 0.14 });
  S({ t0: 9.8, t1: 12.4, set: 'blue', from: [-3, 1.5, 26], to: [-3.4, 1.3, 25], look: [-5.4, 0.9, 20.2], fov: 42, focus: 0.55, band: 0.14 });
  S({ t0: 12.4, t1: 15.2, set: 'blue', from: [6, 1.8, -10], to: [6.6, 1.7, -11.5], look: [11, 1.4, -19], fov: 42, focus: 0.55, band: 0.14 });
  S({ t0: 15.2, t1: 18.3, set: 'blue', from: [-13, 2.6, -7], to: [-14, 2.4, -8.5], look: [-18.4, 1.7, -13.4], fov: 42, focus: 0.55, band: 0.14 });
  S({ t0: 18.3, t1: 21.0, set: 'blue', from: [-24, 26, 40], to: [-25, 25.6, 38], look: [-30, 25.5, 29], fov: 42, focus: 0.55, band: 0.14,
    up: (t) => lawyers.forEach((l, i) => { const k = smooth(18.6 + i * 0.2, 19.2 + i * 0.2, t); l.pose({ head: -0.6 * k, armR: -2.6 * smooth(19.8, 20.3, t) * (i === 1 ? 1 : 0) }); }) });
  S({ t0: 21.0, t1: 24.4, set: 'blue', from: [-30, 26, 31], to: [-30, 26, 31], look: [-20, 120, -100], lookTo: [-10, 400, -300], fov: 50, focus: 0.5, tilt: 0.4 });
  S({ t0: 24.4, t1: 27.7, set: 'blue', from: [8, 4.5, -12], to: [6, 4, -15], look: [0, 1.2, -26], fov: 44, focus: 0.55 });
  S({ t0: 27.7, t1: 31.2, set: 'covered', from: [6, 2, 20], to: [5, 2.2, 18], look: [0, 40, -30], lookTo: [0, 160, -60], fov: 54, focus: 0.5 });
  S({ t0: 31.2, t1: 34.1, set: 'covered', from: [300, 260, 420], to: [240, 240, 340], look: [0, 170, 0], fov: 46, focus: 0.5 });
  shot({ t0: 34.1, t1: 37.4, set: 'ocean', from: [2, 2.6, 11], to: [1.5, 2.4, 9], look: [0, 2.0, 4], fov: 44, focus: 0.55, band: 0.14, update: () => (C.visible = false) });
  shot({ t0: 37.4, t1: 40.3, set: 'ocean', from: [10, 3, 4], to: [9, 2.8, 2], look: [6, 1.5, -18], fov: 40, focus: 0.55, update: () => (C.visible = false) });
  shot({ t0: 40.3, t1: 46.9, set: 'park', from: [16, 5, 26], to: [8, 3, 14], look: [0, 3, -10], lookTo: [0, 2.4, -14], fov: 44, focus: 0.55, update: () => (C.visible = false) });
  S({ t0: 46.9, t1: 50.4, set: 'blue', from: [150, 100, 180], to: [110, 70, 120], look: [0, 20, 0], fov: 42, focus: 0.45, sat: (t) => lerp(1.18, 0, smooth(47.6, 49.4, t)) });
  S({ t0: 50.4, t1: 53.1, set: 'grey', from: [-170, 170, 210], to: [-140, 140, 170], look: [0, 0, 0], fov: 44, focus: 0.55 });
  S({ t0: 53.1, t1: 60, set: 'grey', from: [-6, 2.4, 2], to: [-7, 2.8, 0], look: [-12, 8, -22], fov: 46, focus: 0.5 });
}
