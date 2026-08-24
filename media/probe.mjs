import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 1800 } });
await p.goto('http://localhost:4311/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);

// Is React live at all? The barometer is the control that demonstrably works.
const baro = () => p.evaluate(() => document.querySelector('[data-film="barometer"]').innerText.slice(0, 40).replace(/\n/g, ' '));
console.log('barometer before:', await baro());
await p.evaluate(() => document.querySelector('[data-film="baro-red"]').click());
await p.waitForTimeout(400);
console.log('barometer after :', await baro());

// Does a click event even reach the scenario button?
console.log('scenario listener test:', await p.evaluate(() => {
  const el = document.querySelector('[data-film="scenario-5"]');
  let seen = false;
  el.addEventListener('click', () => { seen = true; }, { once: true });
  el.click();
  return seen ? 'click event fires on the element' : 'no click event at all';
}));
await p.waitForTimeout(400);
console.log('scenario detail :', await p.evaluate(() => {
  const m = document.querySelector('[data-film="scenario"]').innerText.match(/(Demand spike begins|Supply recovers)/);
  return m ? m[1] : '?';
}));
await b.close();
