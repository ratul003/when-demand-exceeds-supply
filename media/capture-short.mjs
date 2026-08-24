/**
 * Records the <50s social cut, in a 4:5 frame for the LinkedIn feed.
 *
 * Same director and same beat-sheet discipline as the full film: times are
 * relative to narration line ids, so re-running build_vo.py (including with
 * Wahid's cloned ElevenLabs voice, which has different line durations)
 * re-times the whole cut automatically.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.FILM_URL || 'http://localhost:4311/';
const OUT = path.join(HERE, 'raw-short');
const SOC_W = Number(process.env.SOCIAL_W || 1440);

const timeline = JSON.parse(fs.readFileSync(path.join(HERE, 'timeline-short.json'), 'utf8'));
const L = Object.fromEntries(timeline.lines.map((l) => [l.id, l]));
const S = (id, off = 0) => +(L[id].start + off).toFixed(3);
const E = (id, off = 0) => +(L[id].end + off).toFixed(3);
const has = (id) => Boolean(L[id]);   // a line can be recorded but skipped
const TOTAL = E('s8', 1.6);

const CAPTIONS = {
  s1: '23:08. Forty-seven customers waiting, three experts online, twelve offline and nobody told them.',
  s2: 'A two-sided, on-demand marketplace for live expert sessions. Mental health, coaching, astrology. 3M downloads, 300 experts.',
  s3: 'No mechanism for a demand spike. The queue compounds, customers drop out, and the platform absorbs the cost.',
  s4: 'Expert supply is inelastic. You cannot surge-price a credential. But nobody asked those twelve.',
  s5: 'So I designed Equilibrium. Five modules: demand signals, health scoring, surge pricing, incentive engine, AI routing.',
  s6: 'Delay and dropout rate trigger it. Surge revenue is ring-fenced to fund the bonus, so the response is self-financing.',
  s7: 'Peak queue down 48%. Delay halved. Net platform cost, $40.',
  s8: 'Every module is live. Go and drive it.',
};

const F = (sel) => `[data-film="${sel}"]`;

// Sixty seconds, eight claims, one shot each. Nothing lingers.
const beats = [
  [0.0, 'veil', 1, 0],
  [0.05, 'open', 1],
  [S('s1', 2.60), 'open', 2],
  [S('s1', 4.30), 'open', 3],
  [E('s1', -0.30), 'open', 0],

  // The business: what it sells, then how big it is.
  [E('s1', 0.15), 'cam', F('surge-matrix'), { dur: 10, fill: 0.94, fillY: 0.90 }],
  [E('s1', 0.30), 'veil', 0, 550],
  [E('s1', 0.50), 'mark', true],
  [S('s2', 4.30), 'cam', F('wins'), { dur: 1200, fill: 0.97, fillY: 0.55 }],

  // Why: the queue compounding with nothing to stop it.
  [S('s3', 0.10), 'cam', F('queue'), { dur: 1300, fill: 0.97, fillY: 0.92 }],
  [S('s3', 1.50), 'point', F('queue-slider'), { dur: 450 }],
  [S('s3', 2.10), 'slider', F('queue-slider'), 5.6, { dur: 3600 }],
  [S('s3', 5.90), 'hideCursor'],

  // The insight: they were never asked.
  [S('s4', 2.60), 'cam', F('notif'), { dur: 1300, fill: 0.92, fillY: 0.92 }],

  // What: the five modules, named and lit.
  [S('s5', 0.10), 'cam', F('pipeline'), { dur: 1300, fill: 0.97, fillY: 0.92 }],
  [S('s5', 1.90), 'press', F('node-signals'), { dur: 380 }],
  [S('s5', 2.70), 'press', F('node-health'), { dur: 340 }],
  [S('s5', 3.40), 'press', F('node-surge'), { dur: 340 }],
  [S('s5', 4.10), 'press', F('node-incentive'), { dur: 340 }],
  [S('s5', 4.80), 'press', F('node-router'), { dur: 340 }],
  [S('s5', 5.50), 'hideCursor'],

  // How: the trigger, then the money that funds the response.
  [S('s6', 0.10), 'cam', F('barometer'), { dur: 1200, fill: 0.94, fillY: 0.92 }],
  [S('s6', 1.20), 'press', F('baro-red'), { dur: 420 }],
  [S('s6', 2.40), 'hideCursor'],
  [S('s6', 2.90), 'cam', F('self-financing'), { dur: 1300, fill: 0.99, fillY: 0.92 }],

  // Impact.
  [S('s7', 0.10), 'cam', F('impact'), { dur: 1200, fill: 0.97, fillY: 0.92 }],

  // Pull back while the impact line finishes, then bring the end card up
  // BEFORE the closing line so the address is readable while it is spoken.
  [S('s7', 3.20), 'cam', F('pipeline'), { dur: 1800, fill: 0.44, fillY: 0.42 }],
  [S('s8', -0.90), 'mark', false],
  [S('s8', -0.60), 'endcard'],
];

timeline.lines.forEach((l, i) => {
  const next = timeline.lines[i + 1];
  const off = Math.min(l.end + 0.3, next ? next.start - 0.12 : l.end + 0.3);
  beats.push([Math.max(0, l.start - 0.12), 'caption', CAPTIONS[l.id] || l.text]);
  beats.push([off, 'caption', null]);
});
beats.sort((a, b) => a[0] - b[0]);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--force-color-profile=srgb', '--hide-scrollbars'],
});
const context = await browser.newContext({
  // 4:5, the LinkedIn feed ratio. SOCIAL_W raises the render resolution;
  // the director sizes everything against the viewport width.
  viewport: { width: SOC_W, height: Math.round(SOC_W * 1.25) },
  // Rasterise at 2x. The camera scales the page up, and a 1x raster scaled
  // by the compositor is what made the earlier cut look soft.
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: { width: SOC_W, height: Math.round(SOC_W * 1.25) } },
});
const page = await context.newPage();
page.on('console', (m) => { if (m.text().includes('[film]')) console.log('  !', m.text()); });

await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
// ── Hydration gate ────────────────────────────────────────────────────────────
// Rebuilding the site while `next start` is already serving leaves the running
// server with stale chunks: the page renders perfectly but the client JS never
// attaches. Every camera move still works, so the film looks fine while the
// sliders and panels do nothing. Prove the page is live before rolling.
const hydrated = await page.evaluate(async () => {
  const read = () => document.querySelector('[data-film="barometer"]')?.innerText || '';
  const before = read();
  document.querySelector('[data-film="baro-red"]')?.click();
  await new Promise((r) => setTimeout(r, 350));
  const changed = read() !== before;
  document.querySelector('[data-film="baro-green"]')?.click();
  await new Promise((r) => setTimeout(r, 250));
  return changed;
});
if (!hydrated) {
  console.error('PAGE IS NOT HYDRATED - clicks do nothing.');
  console.error('Restart the server after any `next build`:');
  console.error('  lsof -ti:4311 | xargs kill -9; npx next start -p 4311');
  await browser.close();
  process.exit(1);
}

await page.evaluate(fs.readFileSync(path.join(HERE, 'director.js'), 'utf8'));

const targets = [...new Set(beats
  .filter((b) => typeof b[2] === 'string' && b[2].startsWith('[data-film'))
  .map((b) => b[2]))];
const missing = await page.evaluate((sels) => sels.filter((s) => !document.querySelector(s)), targets);
if (missing.length) { console.error('MISSING TARGETS:', missing); await browser.close(); process.exit(1); }

console.log(`rolling · ${beats.length} beats · ${SOC_W}x${Math.round(SOC_W * 1.25)} · ${TOTAL.toFixed(1)}s`);
await page.evaluate(({ beats, total }) => window.FILM.run(beats, total * 1000), { beats, total: TOTAL });

await context.close();
await browser.close();
const file = fs.readdirSync(OUT).find((f) => f.endsWith('.webm'));
fs.renameSync(path.join(OUT, file), path.join(HERE, 'raw-short.webm'));
fs.writeFileSync(path.join(HERE, 'beats-short.json'), JSON.stringify({ total: TOTAL, beats }, null, 1));
console.log('wrote raw-short.webm');
