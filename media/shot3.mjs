import { chromium } from 'playwright';
const OUT = '/Users/Wahid-Personal/Downloads/Claude/Medium/images';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2 });
await p.goto('https://wahid-ratul.vercel.app/writing/you-cannot-surge-price-a-therapist', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const figs = p.locator('figure');

const setRange = async (v) => p.locator('input[type=range]').evaluate((el, val) => {
  const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true }));
}, v);

// Queue, pushed into Red so the still carries the argument
await figs.nth(0).scrollIntoViewIfNeeded();
await setRange('5.6');
await p.waitForTimeout(600);
await figs.nth(0).screenshot({ path: `${OUT}/surge-queue-red.png` });

// Barometer, on Red
await figs.nth(1).scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
await figs.nth(1).getByRole('button', { name: /Red/ }).click();
await p.waitForTimeout(500);
await figs.nth(1).screenshot({ path: `${OUT}/surge-barometer-red.png` });

await figs.nth(2).scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await figs.nth(2).screenshot({ path: `${OUT}/surge-incentive-tiers.png` });

await figs.nth(3).scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await figs.nth(3).screenshot({ path: `${OUT}/surge-recovery.png` });

await b.close();
console.log('captured 4 stills');
