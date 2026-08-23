import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('https://when-demand-exceeds-supply.vercel.app/', { waitUntil: 'domcontentloaded' });
// The checkpoint runs JS then reloads; give it room to finish.
for (let i = 0; i < 12; i++) {
  await p.waitForTimeout(2500);
  const t = await p.title();
  if (!/Security Checkpoint/i.test(t)) { console.log(`cleared after ~${(i+1)*2.5}s`); break; }
  if (i === 11) console.log('still challenged after 30s');
}
console.log('title:', await p.title());
console.log('film element:', await p.evaluate(() => !!document.querySelector('video source[src="/film.mp4"]')));
console.log('film HEAD:', JSON.stringify(await p.evaluate(async () => {
  const r = await fetch('/film.mp4', { method: 'HEAD' });
  return { status: r.status, len: r.headers.get('content-length') };
})));
await b.close();
