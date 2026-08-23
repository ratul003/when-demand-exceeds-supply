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

const timeline = JSON.parse(fs.readFileSync(path.join(HERE, 'timeline-short.json'), 'utf8'));
const L = Object.fromEntries(timeline.lines.map((l) => [l.id, l]));
const S = (id, off = 0) => +(L[id].start + off).toFixed(3);
const E = (id, off = 0) => +(L[id].end + off).toFixed(3);
const TOTAL = E('s7', 2.0);

// Exactly what he says, so the captions and the voice never disagree.
const CAPTIONS = {
  s1: '23:08. Forty-seven people waiting. Three experts online, all on a call.',
  s2: 'Twelve more are offline. Nobody told them.',
  s3: 'Supply is fixed. Push demand past it and the queue compounds. At 5.5×, the wait is over an hour.',
  s4: 'So it surges by category, and ring-fences every dollar to pay the experts who come back online. The response funds itself.',
  s5: 'Without it the queue peaks at 65 and stays there. With it, nine experts accept and the delay halves.',
  s6: '$420 in. $380 out. Net cost, $40.',
  s7: 'You cannot surge-price a therapist. But you can make sure nobody finds out too late.',
};

const F = (sel) => `[data-film="${sel}"]`;

// Two title cards do the work the recording does not: card A states the thesis
// so the closing line is earned, card B names the system so "it" in line 4 has
// something to refer to. Cheaper than asking for another take, and a card reads
// better than narration for a claim this short.
const beats = [
  [0.0, 'veil', 1, 0],
  [0.3, 'open', 1],
  [S('s1', 3.20), 'open', 2],
  [S('s2', 0.05), 'open', 3],
  [E('s2', 0.15), 'open', 0],
  [E('s2', 0.35), 'card', 'WHY THIS ONE IS DIFFERENT',
    'Raising the price<br>summons a driver.', 'It does not summon a licence.', 1350],
  [E('s2', 1.45), 'cam', F('queue'), { dur: 10, fill: 0.97, fillY: 0.92 }],
  [E('s2', 1.80), 'veil', 0, 600],
  [E('s2', 2.00), 'mark', true],

  // The queue goes critical while he describes it.
  [S('s3', 1.00), 'point', F('queue-slider'), { dur: 550 }],
  [S('s3', 1.80), 'slider', F('queue-slider'), 5.6, { dur: 4400 }],
  [S('s3', 6.50), 'hideCursor'],

  [E('s3', 0.35), 'card', 'SO I BUILT', 'Equilibrium',
    'Five modules that watch both sides and answer in seconds', 1550],
  [E('s3', 1.50), 'cam', F('pipeline'), { dur: 10, fill: 0.97, fillY: 0.92 }],

  // Card B claims five modules; this shows them.
  [S('s4', 0.20), 'press', F('node-signals'), { dur: 420 }],
  [S('s4', 0.90), 'press', F('node-health'), { dur: 380 }],
  [S('s4', 1.60), 'press', F('node-surge'), { dur: 380 }],
  [S('s4', 2.30), 'press', F('node-incentive'), { dur: 380 }],
  [S('s4', 3.00), 'press', F('node-router'), { dur: 380 }],
  [S('s4', 3.70), 'hideCursor'],
  [S('s4', 4.10), 'cam', F('self-financing'), { dur: 1500, fill: 0.99, fillY: 0.92 }],

  [S('s5', 0.10), 'cam', F('impact'), { dur: 1500, fill: 0.97, fillY: 0.92 }],

  // Voice and picture state the same three numbers together.
  [S('s6', 0.10), 'cam', F('scenario'), { dur: 1400, fill: 0.97, fillY: 0.92 }],
  [S('s6', 1.40), 'press', F('scenario-5'), { dur: 520 }],

  [S('s7', -0.50), 'hideCursor'],
  [S('s7', -0.30), 'mark', false],
  [S('s7', 0.90), 'endcard'],
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
  viewport: { width: 1080, height: 1350 },   // 4:5, the LinkedIn feed ratio
  // Rasterise at 2x. The camera scales the page up, and a 1x raster scaled
  // by the compositor is what made the earlier cut look soft.
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: { width: 1080, height: 1350 } },
});
const page = await context.newPage();
page.on('console', (m) => { if (m.text().includes('[film]')) console.log('  !', m.text()); });

await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
await page.evaluate(fs.readFileSync(path.join(HERE, 'director.js'), 'utf8'));

const targets = [...new Set(beats
  .filter((b) => typeof b[2] === 'string' && b[2].startsWith('[data-film'))
  .map((b) => b[2]))];
const missing = await page.evaluate((sels) => sels.filter((s) => !document.querySelector(s)), targets);
if (missing.length) { console.error('MISSING TARGETS:', missing); await browser.close(); process.exit(1); }

console.log(`rolling · ${beats.length} beats · 1080x1350 · ${TOTAL.toFixed(1)}s`);
await page.evaluate(({ beats, total }) => window.FILM.run(beats, total * 1000), { beats, total: TOTAL });

await context.close();
await browser.close();
const file = fs.readdirSync(OUT).find((f) => f.endsWith('.webm'));
fs.renameSync(path.join(OUT, file), path.join(HERE, 'raw-short.webm'));
fs.writeFileSync(path.join(HERE, 'beats-short.json'), JSON.stringify({ total: TOTAL, beats }, null, 1));
console.log('wrote raw-short.webm');
