// EP09 — A billionaire put a dome over the city.
export async function build(K) {
  const { THREE, scene, camera, skyMat, hemi, sun, defineSet, shot, box, cyl, sphere, mesh, sign, terrain, person, crowd, car, carsInstanced, city, tree, particles, rng, fbm, clamp, smooth, lerp, mat } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // shared world outside the sets: city, ground, three domes
  const W = new THREE.Group(); scene.add(W); W.visible = false;
  city({ parent: W, nx: 9, nz: 9, seed: 71, hmax: 80, skip: (x, z) => Math.abs(x) < 30 && Math.abs(z) < 30 });
  box(80, 0.3, 80, 0xb8b4ab, 0, -0.1, 0, W);
  terrain({ size: 6000, seg: 80, parent: W, height: (x, z) => Math.hypot(x, z) < 520 ? -0.3 : 20 * fbm(x * 0.002, z * 0.002) * Math.min(1, (Math.hypot(x, z) - 520) / 400), color: (x, y, z) => fbm(x * 0.01, z * 0.01) > 0.5 ? '#7aa04a' : '#6a9440' });
  const dome = (R, col, op) => {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: op, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    const frame = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.001, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2)), new THREE.LineBasicMaterial({ color: 0x9aa4b0, transparent: true, opacity: 0.55 }));
    g.add(glass, frame); return g;
  };
  const D1 = dome(260, 0xcfe8ff, 0.12); W.add(D1);
  const D2 = dome(700, 0xd8d0ff, 0.14); D2.position.set(380, 0, -200); W.add(D2);
  const D3 = dome(2200, 0xffe8cc, 0.1); D3.position.set(0, 0, -400); W.add(D3);
  const city2 = new THREE.Group(); W.add(city2); city({ parent: city2, nx: 6, nz: 6, seed: 72, hmax: 60, x: 700, z: -380 });
  // billboards
  const bb = (lines, x, z, ry, col = '#1f5fc7') => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; W.add(g); for (const dx of [-4, 4]) cyl(0.3, 0.3, 7, 0x777777, dx, 0, 0, g); sign(lines, 12, 5, { bg: col, fg: '#ffffff', border: '#ffffff' }, 0, 9.5, 0.3, g); return g; };
  const temp = bb(['22°C', 'ALWAYS'], -12, -22, 0.3);
  const sunset = bb(['SUNSETS', 'PREMIUM · $4.99'], 12, -24, -0.3, '#d9483b');
  const snowS = bb(['SNOW', 'SAT–SUN · $12'], -14, 20, 2.6, '#3b6fd9');
  const pl = []; const rp = rng(19); for (let i = 0; i < 80; i++) pl.push({ x: -24 + rp() * 48, y: 0, z: -18 + rp() * 36, ry: rp() * 6.28 });
  crowd(pl, W, { seed: 8 });
  const umbr = []; for (let i = 0; i < 14; i++) { const p = person({ rand: rng(1000 + i) }, W); p.position.set(-14 + (i % 7) * 4.2, 0, 4 + Math.floor(i / 7) * 5); p.rotation.y = i; p.pose({ armR: -2.8 }); const u = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.32, 10, 1, true), mat([0xd9483b, 0x3b6fd9, 0xf2c14e, 0x2e3440][i % 4], { side: THREE.DoubleSide, flatShading: false })); u.add(c); const st = box(0.02, 1.0, 0.02, 0x333333, 0, -1.0, 0, u); u.position.set(0, -0.3, 0); u.rotation.x = Math.PI; p.userData.armR.add(u); umbr.push(p); }
  const sci = []; for (let i = 0; i < 3; i++) { const p = person({ shirt: 0xffffff, pants: 0x3b3b3b }, W); p.position.set(-4 + i * 2.4, 0, -4); p.rotation.y = Math.PI + 0.2 * i; sci.push(p); }
  const scope = new THREE.Group(); scope.position.set(0, 0, -6); W.add(scope); for (let i = 0; i < 3; i++) { const l = box(0.05, 1.5, 0.05, 0x333333, Math.cos(i * 2.1) * 0.3, 0, Math.sin(i * 2.1) * 0.3, scope); l.rotation.z = Math.cos(i * 2.1) * 0.2; } const tube = cyl(0.12, 0.16, 1.4, 0xf5f5f0, 0, 1.4, 0, scope, 12); tube.rotation.x = -0.9;
  // weather particles
  const snow = particles(4000, (i, t, v) => { const k = (i * 0.618 + t * 0.08) % 1; v.set(-50 + ((i * 37.3) % 100) + Math.sin(t + i) * 1.5, 50 - k * 50, -50 + ((i * 53.1) % 100)); }, { color: 0xffffff, size: 0.35, opacity: 0.9 }, W);
  const rain = particles(5000, (i, t, v) => { const k = (i * 0.618 + t * 1.6) % 1; v.set(-50 + ((i * 37.3) % 100), 50 - k * 50, -50 + ((i * 53.1) % 100)); }, { color: 0xc9d6e6, size: 0.22, opacity: 0.6 }, W);

  const C = (o = {}) => ({ sky: { top: 0x3f7fd6, horizon: 0xcfe6ff }, sunDir: [0.4, 0.62, -0.5], fog: [0xcfe6ff, 300, 4000], hemi: [0xcfe3ff, 0x6b5a48, 1.05], sun: [0xfff4e0, 2.8], shadowCenter: [0, 0, 0], shadowSize: 140, tilt: 0.85, ...o });
  defineSet('day', C());
  defineSet('evening', C());
  defineSet('snow', C({ sky: { top: 0x9aa8b8, horizon: 0xdfe6ee }, fog: [0xdfe6ee, 120, 1500], sun: [0xeef2f8, 1.2], hemi: [0xe8eef6, 0x8a94a4, 1.2] }));
  defineSet('rain', C({ sky: { top: 0x5a6574, horizon: 0x9aa3ad }, fog: [0x8a939d, 100, 1800], sun: [0xd8dde4, 0.7], hemi: [0xb4bcc6, 0x3a3f46, 1.0] }));
  defineSet('grey', C({ sky: { top: 0x6a6e76, horizon: 0xa8acb2 }, fog: [0x9a9ea6, 600, 12000], sun: [0xe0e2e6, 1.0], hemi: [0xc8ccd2, 0x5a5a5a, 1.0] }));

  const show = (o) => (t) => { W.visible = true; D2.visible = o.d2 || false; city2.visible = D2.visible; D3.visible = o.d3 || false; snow.visible = !!o.snow; rain.visible = !!o.rain; umbr.forEach((p) => (p.visible = !!o.rain)); sci.forEach((p) => (p.visible = !!o.sci)); scope.visible = !!o.sci; };
  const S = (o) => shot({ ...o, update: (t, u, e) => { show(o)(t); if (o.up) o.up(t, u, e); } });
  S({ t0: 0, t1: 6.8, set: 'day', from: [520, 300, 620], to: [420, 220, 480], look: [0, 60, 0], fov: 40, focus: 0.45 });
  S({ t0: 6.8, t1: 9.6, set: 'day', from: [6, 2, 26], to: [5, 2, 24], look: [0, 40, -60], lookTo: [0, 140, -120], fov: 50, focus: 0.5 });
  S({ t0: 9.6, t1: 12.6, set: 'day', from: [-4, 3, 4], to: [-6, 3, 0], look: [-12, 9, -22], fov: 46, focus: 0.55 });
  S({ t0: 12.6, t1: 15.3, set: 'day', from: [200, 30, 300], to: [180, 26, 270], look: [0, 60, 0], fov: 42, focus: 0.5 });
  S({ t0: 15.3, t1: 18.6, set: 'evening', from: [4, 3, 2], to: [6, 3, -2], look: [12, 9, -24], fov: 46, focus: 0.55,
    up: (t) => { skyMat.uniforms.top.value.setHex(0x3f7fd6); skyMat.uniforms.horizon.value.setHex(0xcfe6ff); hemi.intensity = 1.05; sun.intensity = 2.8; skyMat.uniforms.stars.value = 0; } });
  S({ t0: 18.6, t1: 25.1, set: 'evening', from: [2, 1.8, 24], to: [2, 1.8, 22], look: [0, 30, -60], lookTo: [0, 60, -100], fov: 52, focus: 0.5,
    up: (t) => { const off = t > 21.95 ? 1 : 0; const dusk = smooth(18.6, 21.9, t) * (1 - off); skyMat.uniforms.top.value.setHex(0x3f7fd6).lerp(new THREE.Color(0x2a3f8a), dusk).lerp(new THREE.Color(0x000000), off); skyMat.uniforms.horizon.value.setHex(0xcfe6ff).lerp(new THREE.Color(0xff9a5a), dusk).lerp(new THREE.Color(0x05060a), off); hemi.intensity = lerp(1.05, 0.7, dusk) * (off ? 0.06 : 1); sun.intensity = lerp(2.8, 1.4, dusk) * (off ? 0 : 1); skyMat.uniforms.stars.value = 0; } });
  S({ t0: 25.1, t1: 28.7, set: 'snow', from: [-6, 3, 4], to: [-8, 3, 8], look: [-14, 8, 20], fov: 46, focus: 0.55, snow: true });
  S({ t0: 28.7, t1: 35.5, set: 'day', from: [600, 380, 900], to: [900, 700, 1400], look: [150, 80, -100], lookTo: [300, 100, -200], fov: 42, focus: 0.45, d2: true });
  S({ t0: 35.5, t1: 45.6, set: 'rain', from: [8, 2.4, 26], to: [6, 2.2, 20], look: [0, 3, 0], lookTo: [0, 30, -60], fov: 48, focus: 0.55, d2: true, rain: true });
  S({ t0: 45.6, t1: 52.5, set: 'grey', from: [800, 420, 1200], to: [1700, 1100, 2900], look: [100, 150, -300], fov: 44, focus: 0.45, d2: true, d3: true });
  S({ t0: 52.5, t1: 60, set: 'grey', from: [4, 1.8, 2], to: [3.5, 1.7, 0.5], look: [0, 3, -6], lookTo: [0, 30, -14], fov: 48, focus: 0.55, d2: true, d3: true, sci: true,
    up: (t) => sci.forEach((p, i) => p.pose({ head: -0.5, armR: i === 1 ? -2.6 : 0 })) });
}
