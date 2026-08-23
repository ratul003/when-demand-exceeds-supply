import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const r = await p.goto('https://when-demand-exceeds-supply.vercel.app/', { waitUntil: 'domcontentloaded' });
console.log('page status:', r.status());
await p.waitForTimeout(4000);
console.log('title:', await p.title());
const has = await p.evaluate(() => !!document.querySelector('video source[src="/film.mp4"]'));
console.log('film element present:', has);
const head = await p.evaluate(async () => {
  const res = await fetch('/film.mp4', { method: 'HEAD' });
  return { status: res.status, len: res.headers.get('content-length') };
});
console.log('film.mp4:', JSON.stringify(head));
await b.close();
