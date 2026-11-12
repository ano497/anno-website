// Renders the scene frame-by-frame in headless Chromium and pipes PNGs into ffmpeg.
// Usage: node capture.mjs [out.mp4]            -> full video
//        node capture.mjs --stills 1,6,9        -> stills/<t>.png
//        node capture.mjs --range 0 450 seg0.mp4  -> frames [0,450) as a video-only segment
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/index.html`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => m.type() === 'error' && console.error('page:', m.text()));
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.goto(url);
await page.waitForFunction(() => window.sceneReady === true, null, { timeout: 120000 });
const clip = { x: 0, y: 0, width: 1080, height: 1920 };

const args = process.argv.slice(2);
if (args[0] === '--stills') {
  fs.mkdirSync(path.join(root, 'stills'), { recursive: true });
  for (const t of args[1].split(',').map(Number)) {
    await page.evaluate((t) => window.renderAt(t), t);
    await page.screenshot({ path: path.join(root, 'stills', `${t}.png`), clip });
    console.log('still', t);
  }
} else {
  const { DURATION, FPS } = await page.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }));
  let from = 0, to = Math.round(DURATION * FPS), out = path.join(root, 'video.mp4');
  if (args[0] === '--range') { from = +args[1]; to = +args[2]; out = args[3]; }
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    await page.evaluate((t) => window.renderAt(t), i / FPS);
    const buf = await page.screenshot({ clip, type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((i - from) % 60 === 0) console.log(`[${from}-${to}] frame ${i}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', out);
}
await browser.close();
server.close();
