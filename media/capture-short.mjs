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
const TOTAL = E('s11', 2.2);

const CAPTIONS = {
  s1: '23:08. Forty-seven waiting. Three experts online, all on a call. Twelve more offline, and nobody told them.',
  s2: 'An on-demand marketplace for live expert sessions. Astrology, mental health, relationship and financial coaching. 3M downloads, 300 vetted experts.',
  s3: 'The marketplace had no mechanism for what happens when 50 customers arrive at 11pm and 3 experts are free.',
  s4: 'The queue grows. Customers leave. Experts never know the demand was there. And the platform absorbs the whole cost of that mismatch, in lost revenue, in dropout, in trust.',
  s5: 'At foodpanda I raised the incentive and riders appeared. You cannot do that to a therapist. But those twelve never declined. Nobody asked them.',
  s6: 'So I designed Equilibrium. Something that detected the imbalance early, responded automatically, and paid for itself, before the marketplace had an engineering team to build it.',
  s7: 'Five modules. Demand signals, health scoring, surge pricing, incentives, and a router that decides what a human has to handle.',
  s8: 'Either trigger crossing prices the surge and pushes every expert who can help. Every dollar of it is ring-fenced to pay them.',
  s9: 'Replayed against a real evening: Red at minute 8, supply closed within four minutes of detection.',
  s10: 'Queue peak down 48%. Delay from 34 minutes to 18. Net cost to the platform, $40.',
  s11: 'Watch the full film, then go and drive it yourself.',
};

const F = (sel) => `[data-film="${sel}"]`;

// One shot per claim: the business, the gap, the cost, the insight, the build,
// the modules, the mechanism, the proof, the impact, the invitation.
const beats = [
  [0.0, 'veil', 1, 0],
  [0.05, 'open', 1],
  [S('s1', 3.10), 'open', 2],
  [S('s1', 5.40), 'open', 3],
  [E('s1', -0.30), 'open', 0],

  // What the business sells, then how big it is.
  [E('s1', 0.20), 'cam', F('surge-matrix'), { dur: 10, fill: 0.94, fillY: 0.90 }],
  [E('s1', 0.35), 'veil', 0, 650],
  [E('s1', 0.55), 'mark', true],
  [S('s2', 4.60), 'cam', F('wins'), { dur: 1400, fill: 0.97, fillY: 0.55 }],

  // The gap, and what it costs: the queue compounding with nothing to stop it.
  [S('s3', 0.10), 'cam', F('queue'), { dur: 1500, fill: 0.97, fillY: 0.92 }],
  [S('s3', 1.90), 'point', F('queue-slider'), { dur: 500 }],
  [S('s3', 2.60), 'slider', F('queue-slider'), 2.6, { dur: 1800 }],
  [S('s4', 0.40), 'slider', F('queue-slider'), 5.6, { dur: 3200 }],
  [S('s4', 4.10), 'hideCursor'],

  // The insight: they were never asked.
  [S('s5', 3.40), 'cam', F('notif'), { dur: 1500, fill: 0.92, fillY: 0.92 }],

  // What was built, then the five modules themselves.
  [S('s6', 0.10), 'cam', F('pipeline'), { dur: 1500, fill: 0.97, fillY: 0.92 }],
  [S('s7', 0.30), 'press', F('node-signals'), { dur: 420 }],
  [S('s7', 1.10), 'press', F('node-health'), { dur: 380 }],
  [S('s7', 1.90), 'press', F('node-surge'), { dur: 380 }],
  [S('s7', 2.70), 'press', F('node-incentive'), { dur: 380 }],
  [S('s7', 3.50), 'press', F('node-router'), { dur: 380 }],
  [S('s7', 4.30), 'hideCursor'],

  // How it fires, and how it pays for itself.
  [S('s8', 0.10), 'cam', F('barometer'), { dur: 1400, fill: 0.94, fillY: 0.92 }],
  [S('s8', 1.50), 'press', F('baro-red'), { dur: 500 }],
  [S('s8', 3.00), 'hideCursor'],
  [S('s8', 3.40), 'cam', F('self-financing'), { dur: 1500, fill: 0.99, fillY: 0.92 }],

  // Proof, then impact.
  [S('s9', 0.10), 'cam', F('scenario'), { dur: 1400, fill: 0.97, fillY: 0.92 }],
  [S('s9', 1.60), 'press', F('scenario-5'), { dur: 520 }],
  [S('s9', 2.80), 'hideCursor'],
  [S('s10', 0.10), 'cam', F('impact'), { dur: 1400, fill: 0.97, fillY: 0.92 }],

  // Pull back over the whole thing, then hand over the address.
  [S('s11', -1.30), 'cam', F('pipeline'), { dur: 2600, fill: 0.44, fillY: 0.42 }],
  [S('s11', -0.20), 'mark', false],
  [S('s11', 0.30), 'endcard'],
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
