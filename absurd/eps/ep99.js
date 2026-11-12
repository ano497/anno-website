export async function build(K) {
  const { THREE, defineSet, shot, terrain, tree, person, crowd, car, fbm, rng } = K;
  const tr = defineSet('t', { sky: { top: 0x4a8ad8, horizon: 0xe2f0ff }, sunDir: [0.5, 0.55, 0.5], fog: [0xd8ebf7, 300, 2500], hemi: [0xd8ecff, 0x5f7d3a, 1.0], sun: [0xfff4dc, 2.9], shadowSize: 20, tilt: 0.6 });
  terrain({ size: 400, seg: 60, parent: tr, height: () => 0, color: (x, y, z) => fbm(x * 0.3, z * 0.3) > 0.5 ? '#6fae46' : '#5f9e3c' });
  tree(tr, 0, -8, 2.2, { round: true }); tree(tr, -6, -12, 2, {}); tree(tr, 7, -14, 2.4, { round: true, leaf: 0x5a9e3a });
  for (let i = 0; i < 6; i++) { const p = person({ rand: rng(10 + i) }, tr); p.position.set(-3 + i * 1.2, 0, 0); p.rotation.y = 0.3 - i * 0.12; if (i === 2) p.walk(0.9); if (i === 4) p.pose({ armR: -2.6 }); }
  const l = []; for (let i = 0; i < 40; i++) l.push({ x: -6 + (i % 10) * 1.2, y: 0, z: -3 - Math.floor(i / 10) * 1.3, ry: (i * 0.7) % 6 });
  crowd(l, tr, { seed: 3 });
  const c = car(0xd9483b, tr); c.position.set(3.5, 0, 3); c.rotation.y = 0.9;
  const c2 = car(0x3b6fd9, tr); c2.position.set(-3.5, 0, 3.4); c2.rotation.y = -2.3;
  shot({ t0: 0, t1: 2, set: 't', from: [1, 2.4, 10], look: [0.5, 1.0, 0], fov: 42, tilt: 0.5, band: 0.18 }); shot({ t0: 2, t1: 60, set: 't', from: [7, 1.8, 7], look: [3.5, 0.8, 3], fov: 40, tilt: 0.3, band: 0.2 });
}
