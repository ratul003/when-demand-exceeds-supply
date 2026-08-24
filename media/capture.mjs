/**
 * Records the film.
 *
 * Beats are scheduled relative to narration line ids (S('c1-2') = when that line
 * starts speaking), not absolute seconds, so rewriting a line and re-running
 * build_vo.py re-times the whole sheet automatically.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.FILM_URL || 'http://localhost:4311/';
// FORMAT=tall renders the same beat sheet into a 4:5 frame for phone feeds.
// The director letterboxes the page and enlarges the type on its own once the
// viewport is narrow, so only the frame size changes here.
const TALL = process.env.FORMAT === 'tall';
const SFX = TALL ? '-tall' : '';
const SOC_W = Number(process.env.SOCIAL_W || 1440);
const SIZE = TALL ? { width: SOC_W, height: Math.round(SOC_W * 1.25) }
                  : { width: 1920, height: 1080 };
const OUT = path.join(HERE, `raw${SFX}`);

const timeline = JSON.parse(fs.readFileSync(path.join(HERE, 'timeline.json'), 'utf8'));
const L = Object.fromEntries(timeline.lines.map((l) => [l.id, l]));
const S = (id, off = 0) => +(L[id].start + off).toFixed(3);
const E = (id, off = 0) => +(L[id].end + off).toFixed(3);
const TOTAL = E('c4-3', 6.3); // last word, plus the end card hold

// What the viewer reads; the narration text is spelled out for the speech engine.
const CAPTIONS = {
  'c0-1': '23:08. Forty-seven people are waiting to talk to someone.',
  'c0-2': 'Three experts are online. All three are already on a call.',
  'c0-3': 'Twelve more are offline, and none of them know any of this is happening.',
  'c1-1': 'This is where a two-sided marketplace quietly loses money, and most of them cannot see it happen.',
  'c1-2': 'Supply is fixed at 18 sessions an hour. Push demand past that and the queue does not grow. It compounds.',
  'c1-3': 'At 3× demand, the wait crosses 30 minutes. Yellow.',
  'c1-4': 'At 5.5×, it is over an hour. Red. By the time tomorrow’s report shows it, those customers are gone.',
  'c2-1': 'So I built the layer that watches for it.',
  'c2-2': 'Delay time and dropout rate are the two triggers. When either one crosses, the system answers on both sides at once.',
  'c2-3': 'Prices surge by category. +10% on astrology, +18% on mental health.',
  'c2-4': 'Every dollar of that surge is ring-fenced. It does not go to margin. It funds the bonus that brings experts back online.',
  'c2-5': 'Then the push fires. Tiered, naming how many people are waiting and what three sessions are worth tonight.',
  'c3-1': 'With no incentive, 8% of experts respond. At $16 a session, 55% do.',
  'c3-2': 'That gap is the entire system.',
  'c3-3': 'Without the engine, the queue peaks at 65 and stays there.',
  'c3-4': 'With it, nine experts accept, the delay drops from 34 minutes to 18, and the engine switches itself off.',
  'c3-5': '$420 of surge collected. $380 paid out. The whole response cost the platform $40.',
  'c4-1': 'Five modules. Demand signals, health scoring, surge pricing, incentives, and a router that decides what a human actually needs to handle.',
  'c4-2': 'One config file. Four marketplace presets.',
  'c4-3': 'I built it as a product manager, without an engineering team, because the alternative was watching the queue and doing nothing.',
};

const F = (sel) => `[data-film="${sel}"]`;

// ── Beat sheet ────────────────────────────────────────────────────────────────
const beats = [
  // COLD OPEN — the scene the rest of the film argues from
  [0.0, 'veil', 1, 0],
  [0.4, 'open', 1],
  [S('c0-2', 0.05), 'open', 2],
  [S('c0-3', 0.05), 'open', 3],
  [E('c0-3', -1.0), 'open', 0],
  [E('c0-3', -0.6), 'card', 'EQUILIBRIUM', 'When Demand Exceeds Supply',
    'A live operations layer for a two-sided expert marketplace', 1500],
  [E('c0-3', 0.7), 'cam', F('queue'), { dur: 10, fill: 0.60, fillY: 0.52 }],
  [E('c0-3', 0.9), 'veil', 0, 950],
  [E('c0-3', 1.2), 'mark', true],
  [E('c0-3', 1.3), 'chapter', '01', 'The Problem'],

  // CH1 · THE PROBLEM — drive the queue from healthy to critical
  [S('c1-1', 0.05), 'cam', F('queue'), { dur: 3200, fill: 0.90, fillY: 0.86 }],
  [S('c1-2', 0.40), 'point', F('queue-slider'), { dur: 700 }],
  [S('c1-2', 1.60), 'slider', F('queue-slider'), 1.6, { dur: 2600 }],
  [S('c1-2', 5.20), 'slider', F('queue-slider'), 2.2, { dur: 1900 }],
  [S('c1-3', 0.30), 'slider', F('queue-slider'), 3.0, { dur: 1800 }],
  [S('c1-3', 2.60), 'cam', F('queue'), { dur: 1600, fill: 0.94, fillY: 0.90 }],
  [S('c1-4', 0.40), 'slider', F('queue-slider'), 5.6, { dur: 2900 }],
  [S('c1-4', 3.90), 'hideCursor'],
  [S('c1-4', 4.20), 'cam', F('queue'), { dur: 2200, fill: 0.98, fillY: 0.95 }],

  // CH2 · THE RESPONSE
  [S('c2-1', -1.30), 'card', 'CHAPTER 02', 'The Response', '', 1150],
  [S('c2-1', -0.90), 'chapter', '02', 'The Response'],
  [S('c2-1', -0.60), 'cam', F('barometer'), { dur: 10, fill: 0.72, fillY: 0.66 }],
  [S('c2-1', 0.50), 'cam', F('barometer'), { dur: 2400, fill: 0.90, fillY: 0.86 }],
  [S('c2-2', 1.90), 'press', F('baro-yellow'), { dur: 700 }],
  [S('c2-2', 5.10), 'press', F('baro-red'), { dur: 650 }],
  [S('c2-2', 7.10), 'hideCursor'],
  [S('c2-3', 0.40), 'cam', F('surge-matrix'), { dur: 1700, fill: 0.88, fillY: 0.80 }],
  [S('c2-4', 0.40), 'cam', F('self-financing'), { dur: 1700, fill: 0.96, fillY: 0.68 }],
  [S('c2-5', 0.30), 'cam', F('notif'), { dur: 1700, fill: 0.90, fillY: 0.82 }],
  [S('c2-5', 3.50), 'press', F('notif-red'), { dur: 700 }],
  [S('c2-5', 5.90), 'hideCursor'],

  // CH3 · THE PAYOFF
  [S('c3-1', -1.25), 'card', 'CHAPTER 03', 'The Payoff', '', 1100],
  [S('c3-1', -0.95), 'chapter', '03', 'The Payoff'],
  [S('c3-1', -0.65), 'cam', F('impact'), { dur: 10, fill: 0.74, fillY: 0.68 }],
  [S('c3-1', 0.25), 'cam', F('impact'), { dur: 2100, fill: 0.90, fillY: 0.86 }],
  [S('c3-1', 0.30), 'press', F('impact-response'), { dur: 700 }],
  [S('c3-1', 2.60), 'hideCursor'],
  [S('c3-2', 0.15), 'cam', F('impact'), { dur: 1900, fill: 0.96, fillY: 0.92 }],
  [S('c3-3', 0.05), 'press', F('impact-timeline'), { dur: 700 }],
  [S('c3-3', 2.25), 'hideCursor'],
  [S('c3-4', 4.70), 'cam', F('scenario'), { dur: 1800, fill: 0.90, fillY: 0.80 }],
  [S('c3-4', 6.70), 'press', F('scenario-5'), { dur: 700 }],
  [S('c3-5', 0.25), 'cam', F('impact'), { dur: 1700, fill: 0.90, fillY: 0.86 }],
  [S('c3-5', 1.45), 'press', F('impact-pnl'), { dur: 700 }],
  [S('c3-5', 3.65), 'hideCursor'],
  [S('c3-5', 4.05), 'cam', F('self-financing'), { dur: 2100, fill: 0.96, fillY: 0.68 }],

  // CH4 · THE SYSTEM — each module lights as it is named
  [S('c4-1', -1.20), 'card', 'CHAPTER 04', 'The System', '', 1100],
  [S('c4-1', -0.90), 'chapter', '04', 'The System'],
  [S('c4-1', -0.60), 'cam', F('pipeline'), { dur: 10, fill: 0.74, fillY: 0.66 }],
  [S('c4-1', 0.25), 'cam', F('pipeline'), { dur: 2000, fill: 0.90, fillY: 0.78 }],
  [S('c4-1', 1.85), 'press', F('node-signals'), { dur: 600 }],
  [S('c4-1', 3.35), 'press', F('node-health'), { dur: 520 }],
  [S('c4-1', 4.75), 'press', F('node-surge'), { dur: 520 }],
  [S('c4-1', 6.15), 'press', F('node-incentive'), { dur: 520 }],
  [S('c4-1', 7.55), 'press', F('node-router'), { dur: 520 }],
  [S('c4-1', 9.05), 'hideCursor'],
  [S('c4-2', 0.30), 'cam', F('presets'), { dur: 1600, fill: 0.90, fillY: 0.80 }],
  [S('c4-2', 1.90), 'press', F('preset-telehealth'), { dur: 600 }],
  [S('c4-3', -0.40), 'press', F('preset-tutoring'), { dur: 600 }],
  [S('c4-3', 1.00), 'hideCursor'],
  [S('c4-3', 1.40), 'cam', F('pipeline'), { dur: 3600, fill: 0.46, fillY: 0.42 }],
  [E('c4-3', -1.50), 'chapter', null],
  [E('c4-3', -1.30), 'mark', false],
  [E('c4-3', 0.40), 'endcard'],
];

// Captions come straight off the measured narration timeline.
timeline.lines.forEach((l, i) => {
  const next = timeline.lines[i + 1];
  const off = Math.min(l.end + 0.3, next ? next.start - 0.15 : l.end + 0.3);
  beats.push([Math.max(0, l.start - 0.12), 'caption', CAPTIONS[l.id] || l.text]);
  beats.push([off, 'caption', null]);
});
beats.sort((a, b) => a[0] - b[0]);

// ── Record ────────────────────────────────────────────────────────────────────
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--force-color-profile=srgb', '--hide-scrollbars'],
});
const context = await browser.newContext({
  viewport: SIZE,
  // Rasterise at 2x. The camera scales the page up, and a 1x raster scaled
  // by the compositor is what made the earlier cut look soft.
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: SIZE },
});
const page = await context.newPage();
page.on('console', (m) => { if (m.text().includes('[film]')) console.log('  !', m.text()); });

await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800); // hydrate before the page is lifted onto the stage
await page.evaluate(fs.readFileSync(path.join(HERE, 'director.js'), 'utf8'));

// Fail loudly on a stale selector rather than shooting a film with dead beats.
const targets = [...new Set(beats
  .filter((b) => typeof b[2] === 'string' && b[2].startsWith('[data-film'))
  .map((b) => b[2]))];
const missing = await page.evaluate((sels) => sels.filter((s) => !document.querySelector(s)), targets);
if (missing.length) { console.error('MISSING TARGETS:', missing); await browser.close(); process.exit(1); }

console.log(`rolling · ${beats.length} beats · ${SIZE.width}x${SIZE.height} · ${TOTAL.toFixed(1)}s`);
await page.evaluate(({ beats, total }) => window.FILM.run(beats, total * 1000), { beats, total: TOTAL });

await context.close();
await browser.close();
const file = fs.readdirSync(OUT).find((f) => f.endsWith('.webm'));
fs.renameSync(path.join(OUT, file), path.join(HERE, `raw${SFX}.webm`));
fs.writeFileSync(path.join(HERE, `beats${SFX}.json`), JSON.stringify({ total: TOTAL, beats }, null, 1));
console.log(`wrote raw${SFX}.webm`);
