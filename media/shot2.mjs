import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:4312/writing/you-cannot-surge-price-a-therapist', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
const figs = p.locator('figure');
console.log('widgets rendered:', await figs.count());
await p.screenshot({ path: 'art-top.png' });
for (let i = 0; i < await figs.count(); i++) {
  await figs.nth(i).scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  await figs.nth(i).screenshot({ path: `art-w${i}.png` });
}
// drive the queue slider to prove it is live
await figs.nth(0).scrollIntoViewIfNeeded();
await p.locator('input[type=range]').evaluate((el) => {
  const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  s.call(el, '4.8'); el.dispatchEvent(new Event('input', { bubbles: true }));
});
await p.waitForTimeout(500);
await figs.nth(0).screenshot({ path: 'art-w0-driven.png' });
const scrollX = await p.evaluate(() => { window.scrollTo(9999, 0); return window.scrollX; });
console.log('horizontal overflow scrollX:', scrollX);
await b.close();
