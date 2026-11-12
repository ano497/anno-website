export const usesHumans = true;
export async function build(K) {
  const { THREE, defineSet, shot, terrain, tree, person, realPerson, box, sign, fbm, CLIPNAMES } = K;
  console.error('clips', CLIPNAMES.join(','));
  const tr = defineSet('t', { sky: { top: 0x4a8ad8, horizon: 0xe2f0ff }, sunDir: [0.5, 0.55, 0.5], fog: [0xd8ebf7, 300, 2500], hemi: [0xd8ecff, 0x5f7d3a, 1.0], sun: [0xfff4dc, 2.9], shadowSize: 20, tilt: 0.5 });
  terrain({ size: 400, seg: 60, parent: tr, height: () => 0, color: (x, y, z) => fbm(x * 0.3, z * 0.3) > 0.5 ? '#6fae46' : '#5f9e3c' });
  tree(tr, 0, -8, 2.2, { round: true });
  const specs = [['Michelle', 'idle', null], ['Soldier', 'idle', null], ['Michelle', 'walk', 0x8fb4ff], ['Soldier', 'walk', 0xd0c0a0], ['Michelle', 'agree', 0xffc0c0], ['Xbot', 'idle', null]];
  specs.forEach(([m, c, tint], i) => { const p = realPerson({ model: m, clip: c, tint, offset: i * 0.37 }); p.position.set(-3 + i * 1.3, 0, 0); tr.add(p); });
  const old = person({}, tr); old.position.set(5.2, 0, 0);
  shot({ t0: 0, t1: 60, set: 't', from: [1, 1.7, 7], look: [1, 1.0, 0], fov: 40, tilt: 0 });
}
