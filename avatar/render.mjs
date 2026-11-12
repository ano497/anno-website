// Renders avatar/<variant>.png (1080x1080) for each variant.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, r));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const jobs = process.argv[2] === 'banner' ? [['banner', 'red', 2560, 1440]] : ['gold', 'red', 'cctv'].map((v) => ['index', v, 1080, 1080]);
for (const [page, v, w, h] of jobs) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  await pg.goto(`http://localhost:${server.address().port}/avatar/${page}.html?v=${v}`);
  await pg.waitForFunction(() => window.ready, null, { timeout: 120000 });
  await pg.screenshot({ path: path.join(root, 'avatar', page === 'banner' ? 'banner.png' : `${v}.png`), clip: { x: 0, y: 0, width: w, height: h } });
  console.log('rendered', v); await pg.close();
}
await b.close(); server.close();
