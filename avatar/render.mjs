// Renders avatar/<variant>.png (1080x1080) for each variant.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, r));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const v of ['gold', 'red', 'cctv']) {
  const pg = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  await pg.goto(`http://localhost:${server.address().port}/avatar/index.html?v=${v}`);
  await pg.waitForFunction(() => window.ready, null, { timeout: 120000 });
  await pg.screenshot({ path: path.join(root, 'avatar', `${v}.png`), clip: { x: 0, y: 0, width: 1080, height: 1080 } });
  console.log('rendered', v); await pg.close();
}
await b.close(); server.close();
