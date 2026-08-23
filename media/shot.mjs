import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:4311/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.locator('#film').scrollIntoViewIfNeeded();
await p.waitForTimeout(700);
await p.locator('#film').screenshot({ path: 'shot-film.png' });
await b.close();
