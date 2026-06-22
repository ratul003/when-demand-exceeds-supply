'use client'

import React, { useState, useEffect, useRef } from 'react'

const CYAN = '#06b6d4'

// ── Types ──────────────────────────────────────────────────────────────────────
type BarometerState = 'green' | 'yellow' | 'red'
type ModuleId = 'signals' | 'health' | 'surge' | 'incentive' | 'routing'
type PresetId = 'wellness' | 'telehealth' | 'tutoring' | 'freelance'

// ── Data ───────────────────────────────────────────────────────────────────────
const WIN_METRICS = [
  { raw: '3M+', label: 'App downloads enabled' },
  { raw: '300+', label: 'Vetted experts' },
  { raw: '5', label: 'Core modules' },
  { raw: '4', label: 'Marketplace presets' },
  { raw: '0', label: 'Net platform cost to run' },
]

const STORY_CHAPTERS = [
  { id: 'problem',      num: '01', label: 'The Problem'      },
  { id: 'barometer',   num: '02', label: 'The Intelligence'  },
  { id: 'surge',       num: '03', label: 'The Response'      },
  { id: 'dashboard',   num: '04', label: 'The Proof'         },
]

const BAROMETER_CONFIG: Record<BarometerState, {
  label: string; color: string; delayThreshold: string; dropoutThreshold: string
  status: string; supplyActions: string[]; demandActions: string[]; routingNote: string
}> = {
  green: {
    label: 'Green', color: '#22c55e',
    delayThreshold: '< 30 min', dropoutThreshold: '< 5%',
    status: 'Operating normally, nothing fires',
    supplyActions: [
      'Standard earnings visibility displayed',
      'Tiered membership benefits highlighted',
      'Guaranteed earnings messaging active for qualifying experts',
    ],
    demandActions: [
      'Base pricing, no surge',
      'Standard booking flow, no wait-time messaging',
    ],
    routingNote: 'AI handles low-complexity queries freely. No pressure to route around.',
  },
  yellow: {
    label: 'Yellow', color: '#f59e0b',
    delayThreshold: '30–60 min', dropoutThreshold: '5–10%',
    status: 'Supply pressure, incentive engine activates',
    supplyActions: [
      'Push to active, scheduled, and offline experts',
      '"X customers waiting right now", real-time earnings framing',
      'Revenue share boost + 1.5× rating multiplier unlocked',
      'Platform coins + surge fee share distributed to responders',
      'Referral programme kicks in',
    ],
    demandActions: [
      'Light surge fee on new bookings',
      '"High demand, booking now secures your slot"',
    ],
    routingNote: 'Standard queries → AI. High-urgency requests queued for available experts.',
  },
  red: {
    label: 'Red', color: '#ef4444',
    delayThreshold: '≥ 60 min', dropoutThreshold: '≥ 10%',
    status: 'Critical shortfall, maximum response',
    supplyActions: [
      'SMS + in-app + push across all expert tiers simultaneously',
      'High-earnings bonus tier unlocked',
      'Priority access badge for top responders',
      'Surge fee share maxed, highest incentive payout possible',
      'Auto-stop: everything pauses the moment supply recovers',
    ],
    demandActions: [
      'Full surge pricing, transparent disclosure to customers',
      'Estimated wait time shown at booking step',
      'Queue position indicator for customers who choose to wait',
    ],
    routingNote: 'AI absorbs all non-urgent demand. Human experts reserved for highest-urgency only.',
  },
}

const SCENARIO_STEPS = [
  {
    time: '23:00', icon: '📈',
    event: 'Demand spike begins',
    detail: 'Unique visitors triple in 20 minutes. Chat requests climb from 8 to 47. Queue depth: 31 open sessions, 3 experts available, all in active calls.',
    metric: 'Delay time: 12 min · State: 🟢',
    stateColor: '#22c55e',
  },
  {
    time: '23:08', icon: '🟡',
    event: 'Barometer turns Yellow',
    detail: 'Delay time crosses 30 minutes. The Health Scoring Engine triggers Yellow state. Mental health category is hardest hit: 18 customers waiting, 1 expert available.',
    metric: 'Delay time: 34 min · State: 🟡',
    stateColor: '#f59e0b',
  },
  {
    time: '23:08 +2s', icon: '💸',
    event: 'Surge pricing activates',
    detail: 'Category matrix fires: Mental Health +18%, Astrology +10%, Relationship +12%. Surge fees ring-fenced into expert incentive pool. Customer messaging updates immediately.',
    metric: 'Surge: +10–18% applied',
    stateColor: '#f59e0b',
  },
  {
    time: '23:08 +5s', icon: '📲',
    event: 'Incentive engine fires',
    detail: 'Push to 48 active, scheduled, and offline experts: "12 customers waiting. Complete 3 sessions to earn $80 bonus. Rating multiplier 1.5× active." Revenue share boost unlocked.',
    metric: '48 experts pinged',
    stateColor: '#f59e0b',
  },
  {
    time: '23:09', icon: '🤖',
    event: 'AI Router adjusts',
    detail: '31 queued sessions classified by NLP complexity. 19 standard queries → AI-powered agent (instant response). 12 high-complexity → human queue, prioritised by ERS score. Mental health sessions: always human, no exceptions.',
    metric: '19 → AI · 12 → Human queue',
    stateColor: '#f59e0b',
  },
  {
    time: '23:14', icon: '🟢',
    event: 'Supply recovers, auto-stop',
    detail: '9 experts accepted the push. Delay drops 34 → 18 minutes. Engine detects Green recovery. All incentives pause automatically. Surge collected: $420. Bonuses paid: $380. Net platform cost: $40.',
    metric: 'Delay: 18 min · State: 🟢 · Self-financed',
    stateColor: '#22c55e',
  },
]

const SURGE_CATEGORIES = [
  { name: 'Astrology',           thresholds: ['+5%',  '+10%', '+15%'] },
  { name: 'Relationship Coaching', thresholds: ['+8%', '+12%', '+20%'] },
  { name: 'Mental Health',       thresholds: ['+10%', '+18%', '+25%'] },
  { name: 'Financial Coaching',  thresholds: ['+8%',  '+15%', '+22%'] },
  { name: 'Reproductive Health', thresholds: ['+10%', '+18%', '+25%'] },
]

// ── Surge impact datasets ──────────────────────────────────────────────────────
const RECOVERY_WITH_EQ: { t: number; q: number }[] = [
  { t: 0, q: 0 }, { t: 5, q: 4 }, { t: 8, q: 31 }, { t: 10, q: 34 },
  { t: 12, q: 34 }, { t: 14, q: 28 }, { t: 16, q: 20 },
  { t: 18, q: 12 }, { t: 20, q: 5 }, { t: 22, q: 1 }, { t: 25, q: 0 },
]
const RECOVERY_WITHOUT_EQ: { t: number; q: number }[] = [
  { t: 0, q: 0 }, { t: 5, q: 4 }, { t: 8, q: 31 }, { t: 10, q: 43 },
  { t: 12, q: 54 }, { t: 14, q: 61 }, { t: 16, q: 64 },
  { t: 18, q: 65 }, { t: 20, q: 65 }, { t: 22, q: 63 }, { t: 25, q: 60 },
]
const SUPPLY_RESPONSE = [
  { tier: 'No incentive',            rate: 8,  color: '#475569', note: 'Organic, experts checking the app' },
  { tier: 'Yellow  ·  $8/session', rate: 38, color: '#f59e0b', note: '+1.5× rating · 10% rev share boost' },
  { tier: 'Red  ·  $16/session',   rate: 55, color: '#ef4444', note: '+2× rating · 20% rev share · SMS push' },
]
const PLATFORM_PNL = [
  { cat: 'Astrology',        surge: 840,  bonus: 672,  color: '#8b5cf6' },
  { cat: 'Mental Health',    surge: 1620, bonus: 1296, color: '#ec4899' },
  { cat: 'Relationship',     surge: 1100, bonus: 880,  color: '#06b6d4' },
  { cat: 'Financial Coach.', surge: 825,  bonus: 660,  color: '#22c55e' },
  { cat: 'Reproductive',     surge: 1015, bonus: 812,  color: '#f59e0b' },
]

const ROUTING_MATRIX = [
  {
    condition: 'Supply: Green', condColor: '#22c55e',
    low:  { label: 'AI Companion',     color: '#22c55e', note: 'Instant · no queue · no surge'        },
    high: { label: 'Human Expert',     color: CYAN,      note: 'Surge applies · immediate'             },
  },
  {
    condition: 'Supply: Yellow', condColor: '#f59e0b',
    low:  { label: 'AI + Queue Human', color: '#f59e0b', note: 'AI bridges the wait'                   },
    high: { label: 'Human Expert',     color: CYAN,      note: 'Prioritised in expert queue'           },
  },
  {
    condition: 'Supply: Red', condColor: '#ef4444',
    low:  { label: 'AI + Queue Human', color: '#f59e0b', note: 'AI absorbs non-urgent volume'          },
    high: { label: 'Human Expert',     color: CYAN,      note: 'Reserved for high-urgency only'        },
  },
  {
    condition: 'Crisis category', condColor: '#ef4444',
    low:  { label: 'Human (Always)',   color: '#ef4444', note: 'Hard rule · cannot be overridden'     },
    high: { label: 'Human (Always)',   color: '#ef4444', note: 'Hard rule · cannot be overridden'     },
  },
]

const PIPELINE_MODULES: { id: ModuleId; label: string; sub: string; color: string; desc: string; metrics: string[]; ai: string }[] = [
  {
    id: 'signals', label: 'Demand Signals', sub: 'Input layer', color: '#8b5cf6',
    desc: 'Five real-time indicators feed the engine: unique visitors, active page views, chat request count, chatbot sentiment (willingness-to-wait, −1 to +1), and queue depth. Segment-compatible event stream or direct API. The sentiment score is the non-obvious one, it teaches the engine what "high pressure" looks like per category.',
    metrics: ['Unique visitors (live)', 'Active page views vs. repeat', 'Chat request count', 'Chatbot sentiment (−1 to +1)', 'Queue depth per category'],
    ai: 'Sentiment score feeds threshold calibration. The engine learns the customer tolerance band for each category over time.',
  },
  {
    id: 'health', label: 'Health Scoring Engine', sub: 'Barometer core', color: CYAN,
    desc: 'Evaluates signals against per-category thresholds. Outputs Green, Yellow, or Red. Two independent trigger types: Delay Time (minutes to expert assignment) and Dropout Rate (% of visitors leaving). Either alone can flip the state. Operators configure which triggers to use per category.',
    metrics: ['Barometer state (Green / Yellow / Red)', 'Active trigger type', 'Per-category threshold config', 'State transition event log'],
    ai: 'Auto-calibration via sentiment: thresholds tighten in categories where customers tolerate shorter waits.',
  },
  {
    id: 'surge', label: 'Surge Pricing Calculator', sub: 'Demand-side response', color: '#f59e0b',
    desc: 'Maps category × delay time to a multiplier. The key insight: surge fees collected from customers fund the expert incentives on the supply side. The system is self-financing, the platform never carries the cost of a supply response at any scale.',
    metrics: ['Category × delay time matrix', 'Surge multiplier output', 'Self-financing balance', 'Revenue vs. incentive payout delta'],
    ai: 'Surge parameters can tune to demand elasticity, customers who convert despite surge vs. those who drop reveal the platform-specific tolerance curve.',
  },
  {
    id: 'incentive', label: 'Incentive Engine', sub: 'Supply-side response', color: '#22c55e',
    desc: 'Fires tiered notification payloads based on barometer state. Yellow: light push with earnings framing. Red: high-earnings alert across all channels (in-app, push, SMS, email). Auto-stops when supply recovers, no manual intervention needed. Webhook-compatible, fires to any notification service.',
    metrics: ['Tier (Yellow / Red)', 'Channel mix: in-app / push / SMS / email', 'Notification copy template', 'Supply recovery auto-stop trigger'],
    ai: 'Dynamic copy and amount: the engine adjusts based on each expert\'s historical response rate to past pushes.',
  },
  {
    id: 'routing', label: 'AI Escalation Router', sub: 'Routing layer', color: '#ec4899',
    desc: 'Rules-based routing for every incoming session: AI companion or human expert. Four signals: supply health score, NLP complexity (0–1), customer tier, category. Hard rules override signals for sensitive categories. Informed directly by how the platform\'s AI companion → expert escalation was designed.',
    metrics: ['Supply availability score', 'Query complexity (NLP, 0–1)', 'Customer tier', 'Category routing rules', 'Always-human overrides'],
    ai: 'Escalation feedback tightens complexity thresholds over time, poor CSAT on AI-handled sessions → router becomes more conservative.',
  },
]

const PRESETS: { id: PresetId; label: string; color: string; desc: string; tag: string; highlights: string[] }[] = [
  {
    id: 'wellness', label: 'wellness', color: CYAN, tag: 'Default · Origin',
    desc: 'Origin configuration. Five wellness categories, 30/60-min delay thresholds, 5/10% dropout thresholds. Sentiment calibration on. Mental health always routed to human experts.',
    highlights: ['30 / 60 min delay thresholds', 'Sentiment-calibrated barometer', 'Mental health: always human'],
  },
  {
    id: 'telehealth', label: 'telehealth', color: '#22c55e', tag: 'Healthcare',
    desc: 'Credential-weighted. Stricter thresholds (15/30 min). Higher surge multipliers to prioritise certified providers. Always-human rules for urgent care and crisis.',
    highlights: ['15 / 30 min (stricter)', 'Credential-tier weighting', 'Urgent care: always human'],
  },
  {
    id: 'tutoring', label: 'tutoring', color: '#f59e0b', tag: 'EdTech',
    desc: 'Retention-weighted. Looser thresholds (45/90 min). Subject-specific incentive ladders. Student tier gates AI routing, verified students see human options first.',
    highlights: ['45 / 90 min (looser)', 'Subject-specific incentive ladders', 'Retention score weighted'],
  },
  {
    id: 'freelance', label: 'freelance', color: '#8b5cf6', tag: 'Professional Services',
    desc: 'Response-time-weighted. Hourly bandwidth caps per expert. Portfolio-verified tier. No always-human categories. Suited for design, writing, engineering, legal.',
    highlights: ['Response time as primary signal', 'Hourly bandwidth caps', 'Portfolio-verified tier'],
  },
]

const INDUSTRY_BENCHMARKS = [
  {
    company: 'Uber', category: 'Ride-hailing', bg: '#1a1a1a',
    what: 'H3 hexagonal grid zones recalculate every 1–2 minutes. DeepETT demand model runs 2 million real-time forecasts per second. A 6% improvement in arrival-time accuracy → estimated $100M incremental annual revenue (Uber Eng Blog, 2026). Reinforcement learning now optimises driver allocation across 400+ cities simultaneously.',
    signal: 'D/S ratio per H3 zone · Weather · Events · Flight arrivals',
    gap: 'Hundreds of millions in infrastructure, built over a decade. None of it extractable.',
  },
  {
    company: 'DoorDash', category: 'Food delivery', bg: '#c62300',
    what: 'Their mobilisation system identifies supply gaps BEFORE they open, predicting required Dasher-hours, comparing to expected organic supply, issuing Peak Pay for exactly the shortfall. Proactive, not reactive. Published result: significant delivery quality improvement + reduced total cost.',
    signal: 'Projected Dasher-hours vs. expected organic supply (forward-looking)',
    gap: '"Anticipate and mobilise before the gap" is the core insight, published on their eng blog, tooling fully proprietary.',
  },
  {
    company: 'Instacart', category: 'Grocery delivery', bg: '#2d7a2e',
    what: 'SAGE (Supply Allocation and Generation Engine, 2020): treats pricing, incentives, and shopper outreach as ONE joint optimisation, not three separate triggers. Can mobilise shoppers with 1-hour lead time, including previously churned ones. Also nudges customers to off-peak times to smooth demand. ("Building for Balance," Instacart Eng Blog)',
    signal: 'Predicted shopper supply vs. required hours per zone · Customer order timing',
    gap: '"Treat all levers as one system" is the single most important published insight in marketplace ops. The system that acts on it: fully proprietary.',
  },
  {
    company: 'Zocdoc', category: 'Provider booking', bg: '#174080',
    what: '43% of bookings happen when the provider\'s office is closed, proof that always-on supply intelligence creates demand that would otherwise be lost. 200,000+ new patient appointments available within 24 hours. Zo AI converts incoming calls directly to booked appointments in real time. (Zocdoc, 2025)',
    signal: 'Provider schedule (two-way EHR sync) · Real-time availability',
    gap: 'Closest structural analog to this platform: two-sided marketplace for human expert time. Always-on layer is deeply embedded and not separable.',
  },
]

const ANALOG_BENCHMARKS = [
  {
    company: 'BetterHelp', category: 'Online therapy', bg: '#1b3a6b',
    scale: '25,000+ therapists · millions of clients',
    what: 'Fastest-growing therapy platform through the pandemic, matching clients to licensed therapists. Marketed as "quick access" to mental health support.',
    crisis: 'FTC settlement (Nov 2023, $7.8M): BetterHelp misrepresented therapist response times to millions of customers. The platform had more clients than therapists could serve. Matching delays stretched to 24+ hours, sometimes weeks, despite "fast matching" claims. Therapist burnout and attrition worsened the gap.',
    lesson: 'The symptom of flying blind: you over-promise response times, discover the supply gap through customer complaints, not operations. The barometer engine surfaces this in real time, before the FTC does.',
    lessonColor: '#ef4444',
  },
  {
    company: 'Chegg', category: 'Online tutoring', bg: '#e8600a',
    scale: '50,000+ human tutors at peak · tens of millions of students',
    what: 'Built one of the largest human tutor networks in EdTech. Students could book on-demand tutoring sessions across subjects and grade levels.',
    crisis: 'In 2022–23, Chegg\'s Q4 earnings calls documented explicit "supply side constraints": human tutors could not offer 24/7 availability, subject-specific gaps persisted through exam seasons, and per-session economics didn\'t hold at scale. By 2023–24, Chegg replaced its human tutor network with AI (ChegGPT). Not a strategic choice, a supply ceiling.',
    lesson: 'When expert supply is inelastic, the options are: build operational intelligence to use what you have more efficiently, or replace humans with AI. Chegg chose AI. Equilibrium is the other path.',
    lessonColor: '#f59e0b',
  },
  {
    company: 'Clarity.fm', category: 'Expert calls · pay-per-minute', bg: '#1a3a2a',
    scale: '180+ countries · pay-per-minute at $1–$15+/min by expert',
    what: 'The closest structural analog to the marketplace: live expert calls, pay-per-minute billing, non-interchangeable supply by domain. Experts set their own rates. Categories span entrepreneurship, marketing, law, finance, health.',
    crisis: 'Zero surge pricing. Zero demand signal routing. Expert rates are static regardless of demand. When a top expert goes offline, demand for that category has nowhere to go. No barometer. No incentive to pull supply back online. The platform manages supply-demand the same way it did at launch.',
    lesson: 'Same model as the marketplace, same vulnerability. Clarity.fm proves the category is viable. Equilibrium is the operational intelligence layer that Clarity.fm never built.',
    lessonColor: CYAN,
  },
]

const ELASTICITY_ROWS = [
  {
    dimension: 'Supply type',
    logistics: 'Interchangeable, any driver takes any delivery',
    expert: 'Specialised, a mental health coach ≠ an astrologer ≠ a financial advisor',
  },
  {
    dimension: 'Session duration',
    logistics: '5–30 min / delivery → high throughput per unit',
    expert: '30–90 min / session → an expert completes 4–8 sessions max per day',
  },
  {
    dimension: 'Surge response speed',
    logistics: 'Minutes, price goes up, drivers come online',
    expert: 'Hours to days, experts have prep, scheduling, and emotional labour limits',
  },
  {
    dimension: 'Hard capacity limit',
    logistics: 'Capital constraint only (need a car), fast to recruit, fast to scale',
    expert: 'Credentialing + licensing + daily session caps, cannot be priced away',
  },
  {
    dimension: 'Category crossover',
    logistics: 'Full, a DoorDash driver can switch restaurant → grocery same day',
    expert: 'None, you cannot reroute a Vedic astrology expert into mental health crisis support',
  },
]

const STACK_TOOLS = [
  { name: 'Python',      category: 'Core engine',       color: '#3776AB',
    svg: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3C8.5 3 9 5.5 9 5.5V8h5v1H6.5S3 8.6 3 14s3 5.5 3 5.5h2v-2.7S7.8 14 11 14h6s3 0 3-3V8s.5-5-6-5zm-1.5 2c.8 0 1.5.7 1.5 1.5S13.3 8 12.5 8 11 7.3 11 6.5 11.7 5 12.5 5z" fill="#3776AB"/><path d="M14 25c5.5 0 5-2.5 5-2.5V20h-5v-1h7.5S25 19.4 25 14s-3-5.5-3-5.5h-2v2.7s.2 2.8-3 2.8h-6s-3 0-3 3v3s-.5 5 6 5zm1.5-2c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z" fill="#FFD845"/></svg>` },
  { name: 'FastAPI',     category: 'API layer',         color: '#009688',
    svg: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14" r="10" fill="#009688"/><path d="M14 6l-5 9h5l-1 7 6-10h-5l1-6z" fill="white"/></svg>` },
  { name: 'React',       category: 'Operator dashboard',color: '#61DAFB',
    svg: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="14" cy="14" rx="3" ry="3" fill="#61DAFB"/><ellipse cx="14" cy="14" rx="11" ry="4.5" stroke="#61DAFB" stroke-width="1.5" fill="none"/><ellipse cx="14" cy="14" rx="11" ry="4.5" stroke="#61DAFB" stroke-width="1.5" fill="none" transform="rotate(60 14 14)"/><ellipse cx="14" cy="14" rx="11" ry="4.5" stroke="#61DAFB" stroke-width="1.5" fill="none" transform="rotate(120 14 14)"/></svg>` },
  { name: 'TypeScript',  category: 'Type safety',       color: '#3178C6',
    svg: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="22" height="22" rx="3" fill="#3178C6"/><path d="M8 13h5M10.5 13v8M17 13.5c-.5-.5-1.2-.5-1.8-.2-.8.4-.9 1.5 0 2 .8.5 2.3.6 2.3 2-.1 1.2-1.3 1.8-2.5 1.5-.7-.2-1.2-.7-1.5-1.3" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { name: 'PostgreSQL',  category: 'State store',       color: '#4169E1',
    svg: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="14" cy="8" rx="8" ry="4" fill="#4169E1" opacity="0.3"/><ellipse cx="14" cy="8" rx="8" ry="4" stroke="#4169E1" stroke-width="1.5" fill="none"/><path d="M6 8v12c0 2.2 3.6 4 8 4s8-1.8 8-4V8" stroke="#4169E1" stroke-width="1.5" fill="none"/><path d="M6 14c0 2.2 3.6 4 8 4s8-1.8 8-4" stroke="#4169E1" stroke-width="1" stroke-dasharray="3 2" fill="none"/></svg>` },
  { name: 'Redis',       category: 'Real-time cache',   color: '#DC382D',
    svg: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 16.5l9 4.5 9-4.5" stroke="#DC382D" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 12.5l9 4.5 9-4.5" stroke="#DC382D" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 8.5L14 13l9-4.5L14 4 5 8.5z" fill="#DC382D" opacity="0.25"/><path d="M5 8.5L14 13l9-4.5L14 4 5 8.5z" stroke="#DC382D" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>` },
  { name: 'WebSockets',  category: 'Live dashboard',    color: '#22c55e',
    svg: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 14c0-5 4-9 9-9" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/><path d="M8 14c0-3.3 2.7-6 6-6" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/><path d="M23 14c0 5-4 9-9 9" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/><path d="M20 14c0 3.3-2.7 6-6 6" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/><circle cx="14" cy="14" r="2" fill="#22c55e"/></svg>` },
  { name: 'Segment',     category: 'Event ingestion',   color: '#52BD94',
    svg: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 10c4-6 12-6 16 0" stroke="#52BD94" stroke-width="2.5" stroke-linecap="round"/><path d="M6 18c4 6 12 6 16 0" stroke="#52BD94" stroke-width="2.5" stroke-linecap="round"/><circle cx="14" cy="14" r="2.5" fill="#52BD94"/></svg>` },
]

const NAV_SECTIONS = [
  { id: 'problem',      label: 'The Problem'   },
  { id: 'industry',     label: 'Industry'      },
  { id: 'architecture', label: 'Architecture'  },
  { id: 'barometer',    label: 'Barometer'     },
  { id: 'surge',        label: 'Surge Pricing' },
  { id: 'incentives',   label: 'Incentives'    },
  { id: 'routing',      label: 'AI Routing'    },
  { id: 'dashboard',    label: 'Dashboard'     },
  { id: 'presets',      label: 'Configuration' },
  { id: 'outcomes',     label: 'Outcomes'      },
  { id: 'stack',        label: 'Tech Stack'    },
]

// ── Hooks ──────────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, trigger: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [trigger, target, duration])
  return val
}

// ── SectionNav ─────────────────────────────────────────────────────────────────
function SectionNav() {
  const LABELS: Record<string, string> = Object.fromEntries(NAV_SECTIONS.map((s) => [s.id, s.label]))
  const prettify = (id: string) => id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const [items, setItems] = useState<{ id: string; label: string }[]>([])
  const [active, setActive] = useState('')
  useEffect(() => {
    const found: { id: string; label: string }[] = []
    document.querySelectorAll<HTMLElement>('section[id]').forEach((sec) => {
      if (sec.dataset.rail === 'skip') return
      const h = sec.querySelector('h1, h2, h3')
      const heading = (h?.textContent || '').replace(/\s+/g, ' ').trim()
      const label = sec.dataset.rail || LABELS[sec.id] || heading || prettify(sec.id)
      if (label) found.push({ id: sec.id, label })
    })
    setItems(found)
    if (found[0]) setActive(found[0].id)
    const obs = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) setActive(e.target.id) },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    found.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])
  if (items.length === 0) return null
  return (
    <nav aria-label="Section navigation" className="hidden xl:flex" style={{ position: 'fixed', right: 26, top: '50%', transform: 'translateY(-50%)', zIndex: 50, flexDirection: 'column', gap: 5, maxHeight: '86vh', overflowY: 'auto' }}>
      {items.map((s) => {
        const on = active === s.id
        return (
          <a key={s.id} href={`#${s.id}`} aria-current={on ? 'true' : undefined}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, textDecoration: 'none', padding: '3px 0' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: on ? 700 : 500, color: on ? CYAN : 'var(--foreground-subtle, #475569)', whiteSpace: 'nowrap', transition: 'color .2s' }}>{s.label}</span>
            <span style={{ width: on ? 24 : 12, height: 3, borderRadius: 2, background: on ? CYAN : 'var(--border, rgba(255,255,255,0.15))', transition: 'all .2s', flexShrink: 0 }} />
          </a>
        )
      })}
    </nav>
  )
}

// ── AnimatedMetric ─────────────────────────────────────────────────────────────
function AnimatedMetric({ raw, label }: { raw: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [triggered, setTriggered] = useState(false)
  const numMatch = raw.match(/[\d.]+/)
  const num = numMatch ? parseFloat(numMatch[0]) : 0
  const prefix = raw.match(/^[^0-9]*/)?.[0] ?? ''
  const suffix = raw.match(/[^0-9.]+$/)?.[0] ?? ''
  const counted = useCountUp(num, 1400, triggered)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTriggered(true) }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  const display = num === 0 ? raw : `${prefix}${Number.isInteger(num) ? counted : counted.toFixed(1)}${suffix}`
  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ fontSize: '2.4rem', fontWeight: 800, color: CYAN, lineHeight: 1 }}>{display}</div>
      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

// ── BarometerGauge ─────────────────────────────────────────────────────────────
// SVG semicircle dial. Three colored arc segments, animated needle.
function BarometerGauge({ state }: { state: BarometerState }) {
  const needleAngles = { green: -58, yellow: 0, red: 58 }
  const stateColors  = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' }
  const angle = needleAngles[state]
  const color = stateColors[state]
  return (
    <svg viewBox="0 0 200 118" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto' }}>
      {/* Shadow arc */}
      <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" strokeLinecap="round"/>
      {/* Green segment (left third) */}
      <path d="M 20 105 A 80 80 0 0 1 60 35.7" fill="none" stroke="#22c55e" strokeWidth="18" strokeLinecap="round"
        opacity={state === 'green' ? 1 : 0.18} style={{ transition: 'opacity 0.5s' }}/>
      {/* Yellow segment (middle third) */}
      <path d="M 60 35.7 A 80 80 0 0 1 140 35.7" fill="none" stroke="#f59e0b" strokeWidth="18" strokeLinecap="round"
        opacity={state === 'yellow' ? 1 : 0.18} style={{ transition: 'opacity 0.5s' }}/>
      {/* Red segment (right third) */}
      <path d="M 140 35.7 A 80 80 0 0 1 180 105" fill="none" stroke="#ef4444" strokeWidth="18" strokeLinecap="round"
        opacity={state === 'red' ? 1 : 0.18} style={{ transition: 'opacity 0.5s' }}/>
      {/* Needle group, rotates around (100, 105) */}
      <g style={{ transformOrigin: '100px 105px', transform: `rotate(${angle}deg)`, transition: 'transform 0.55s cubic-bezier(0.34,1.4,0.64,1)' }}>
        <line x1="100" y1="105" x2="100" y2="32" stroke={color} strokeWidth="3" strokeLinecap="round" style={{ transition: 'stroke 0.4s' }}/>
        <line x1="100" y1="105" x2="100" y2="115" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" style={{ transition: 'stroke 0.4s' }}/>
      </g>
      {/* Hub */}
      <circle cx="100" cy="105" r="7" fill={color} style={{ transition: 'fill 0.4s' }}/>
      <circle cx="100" cy="105" r="3.5" fill="#0a0a0f"/>
      {/* Zone labels */}
      <text x="14"  y="116" fontSize="9" fill="#22c55e" textAnchor="middle" fontFamily="system-ui, sans-serif">Green</text>
      <text x="100" y="20"  fontSize="9" fill="#f59e0b" textAnchor="middle" fontFamily="system-ui, sans-serif">Yellow</text>
      <text x="186" y="116" fontSize="9" fill="#ef4444" textAnchor="middle" fontFamily="system-ui, sans-serif">Red</text>
    </svg>
  )
}

// ── LiveScenario ───────────────────────────────────────────────────────────────
// Interactive 6-step walkthrough of the system responding to a demand spike.
function LiveScenario() {
  const [step, setStep] = useState(0)
  const s = SCENARIO_STEPS[step]
  return (
    <div>
      {/* Step selector timeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, overflowX: 'auto' }}>
        {SCENARIO_STEPS.map((st, i) => (
          <React.Fragment key={i}>
            <button onClick={() => setStep(i)} style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', transition: 'all 0.2s',
                background: step === i ? `${st.stateColor}20` : 'rgba(255,255,255,0.04)',
                border: `2px solid ${step === i ? st.stateColor : 'rgba(255,255,255,0.1)'}`,
                boxShadow: step === i ? `0 0 14px ${st.stateColor}40` : 'none',
              }}>{st.icon}</div>
              <span style={{ fontSize: '0.62rem', color: step === i ? st.stateColor : '#475569', whiteSpace: 'nowrap' }}>{st.time}</span>
            </button>
            {i < SCENARIO_STEPS.length - 1 && (
              <div style={{ flex: 1, minWidth: 20, height: 2, background: i < step ? `${SCENARIO_STEPS[i].stateColor}50` : 'rgba(255,255,255,0.06)', transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        ))}
      </div>
      {/* Detail card */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.stateColor}30`, borderRadius: 14, padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.time}</div>
            <div style={{ fontWeight: 700, color: s.stateColor, fontSize: '1.1rem' }}>{s.event}</div>
          </div>
          <div style={{ padding: '6px 12px', background: `${s.stateColor}15`, border: `1px solid ${s.stateColor}30`, borderRadius: 8, fontSize: '0.75rem', color: s.stateColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {s.metric}
          </div>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>{s.detail}</p>
      </div>
      {/* Prev / Next */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: step === 0 ? '#334155' : '#94a3b8', cursor: step === 0 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', transition: 'all 0.15s' }}>← Prev</button>
        <button onClick={() => setStep(Math.min(SCENARIO_STEPS.length - 1, step + 1))} disabled={step === SCENARIO_STEPS.length - 1} style={{ padding: '8px 16px', borderRadius: 8, background: step === SCENARIO_STEPS.length - 1 ? 'rgba(255,255,255,0.02)' : `${CYAN}18`, border: `1px solid ${step === SCENARIO_STEPS.length - 1 ? 'rgba(255,255,255,0.08)' : CYAN + '40'}`, color: step === SCENARIO_STEPS.length - 1 ? '#334155' : CYAN, cursor: step === SCENARIO_STEPS.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', transition: 'all 0.15s' }}>Next →</button>
      </div>
    </div>
  )
}

// ── BarometerEngine ────────────────────────────────────────────────────────────
function BarometerEngine() {
  const [state, setState] = useState<BarometerState>('green')
  const cfg = BAROMETER_CONFIG[state]
  return (
    <div>
      {/* Gauge + state selector side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32, alignItems: 'center', marginBottom: 28 }}>
        <BarometerGauge state={state} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(['green', 'yellow', 'red'] as BarometerState[]).map(s => {
            const c = BAROMETER_CONFIG[s]
            return (
              <button key={s} onClick={() => setState(s)} style={{
                padding: '14px 18px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                border: `2px solid ${state === s ? c.color : 'rgba(255,255,255,0.08)'}`,
                background: state === s ? `${c.color}12` : 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, boxShadow: state === s ? `0 0 10px ${c.color}` : 'none', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: state === s ? c.color : '#64748b', fontSize: '0.9rem' }}>{c.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>{c.status}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      {/* Threshold row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[['Delay Time Trigger', cfg.delayThreshold], ['Dropout Rate Trigger', cfg.dropoutThreshold]].map(([lbl, val]) => (
          <div key={lbl} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{lbl}</div>
            <div style={{ color: cfg.color, fontWeight: 700, fontSize: '1.1rem', transition: 'color 0.4s' }}>{val}</div>
          </div>
        ))}
      </div>
      {/* Actions grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${cfg.color}18`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Supply-side, what experts receive</div>
          {cfg.supplyActions.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
              <span style={{ color: cfg.color, fontSize: '0.65rem', marginTop: 4, flexShrink: 0 }}>▸</span>
              <span style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.45 }}>{a}</span>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Demand-side, what customers see</div>
          {cfg.demandActions.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
              <span style={{ color: '#f59e0b', fontSize: '0.65rem', marginTop: 4, flexShrink: 0 }}>▸</span>
              <span style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.45 }}>{a}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 14, paddingTop: 12 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>AI Routing</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.55 }}>{cfg.routingNote}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PipelineArchitecture ───────────────────────────────────────────────────────
function PipelineArchitecture() {
  const [active, setActive] = useState<ModuleId>('health')
  const mod = PIPELINE_MODULES.find(m => m.id === active)!
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, overflowX: 'auto' }}>
        {PIPELINE_MODULES.map((m, i) => (
          <React.Fragment key={m.id}>
            <button onClick={() => setActive(m.id)} style={{
              flexShrink: 0, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
              border: `2px solid ${active === m.id ? m.color : 'rgba(255,255,255,0.08)'}`,
              background: active === m.id ? `${m.color}15` : 'rgba(255,255,255,0.02)',
              textAlign: 'center', minWidth: 124,
            }}>
              <div style={{ fontSize: '0.64rem', color: active === m.id ? m.color : '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.sub}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: active === m.id ? m.color : '#64748b' }}>{m.label}</div>
            </button>
            {i < PIPELINE_MODULES.length - 1 && <div style={{ flexShrink: 0, color: '#1e293b', fontSize: '1.2rem', margin: '0 2px' }}>→</div>}
          </React.Fragment>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${mod.color}28`, borderRadius: 14, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: mod.color, boxShadow: `0 0 10px ${mod.color}` }} />
          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{mod.label}</span>
          <span style={{ fontSize: '0.68rem', color: mod.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginLeft: 4 }}>{mod.sub}</span>
        </div>
        <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: 18 }}>{mod.desc}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Outputs</div>
            {mod.metrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: mod.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{m}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Learning layer</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>{mod.ai}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SelfFinancingFlow ──────────────────────────────────────────────────────────
function SelfFinancingFlow() {
  const [hov, setHov] = useState<number | null>(null)
  const nodes = [
    { label: 'Demand spike', sub: 'Queue depth rises', color: '#8b5cf6', icon: '📈' },
    { label: 'Surge fee collected', sub: 'From customer booking', color: '#f59e0b', icon: '💳' },
    { label: 'Ring-fenced pool', sub: 'Per-session allocation', color: CYAN, icon: '🏦' },
    { label: 'Expert bonus paid', sub: 'Revenue share boost', color: '#22c55e', icon: '💸' },
    { label: 'Supply recovers', sub: 'Pool depletes to zero', color: '#22c55e', icon: '✅' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
        {nodes.map((n, i) => (
          <React.Fragment key={n.label}>
            <div onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{
              flexShrink: 0, textAlign: 'center', padding: '16px 14px', borderRadius: 12, minWidth: 130,
              background: hov === i ? `${n.color}15` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${hov === i ? n.color + '40' : 'rgba(255,255,255,0.07)'}`,
              transition: 'all 0.2s', cursor: 'default',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{n.icon}</div>
              <div style={{ fontWeight: 600, color: n.color, fontSize: '0.82rem', marginBottom: 4 }}>{n.label}</div>
              <div style={{ fontSize: '0.7rem', color: '#475569' }}>{n.sub}</div>
            </div>
            {i < nodes.length - 1 && (
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px' }}>
                <div style={{ fontSize: '1.2rem', color: '#1e293b' }}>→</div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 18, padding: '14px 18px', background: `${CYAN}08`, border: `1px solid ${CYAN}20`, borderRadius: 10 }}>
        <span style={{ color: CYAN, fontWeight: 600, fontSize: '0.88rem' }}>Net platform cost at any scale of demand spike: </span>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>zero. Surge collected from customers always exceeds incentives paid to experts, the delta is margin, not cost.</span>
      </div>
    </div>
  )
}

// ── SurgeMatrix ────────────────────────────────────────────────────────────────
function SurgeMatrix() {
  const [hov, setHov] = useState<string | null>(null)
  const delays = ['0–30 min', '30–45 min', '45+ min']
  const delayColors = ['#22c55e', '#f59e0b', '#ef4444']
  const delayDescs  = ['Green zone, light pressure', 'Yellow zone, surge active', 'Red zone, max multiplier']
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
            <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.05)', fontWeight: 500 }}>Category</th>
            {delays.map((d, i) => (
              <th key={d} style={{ padding: '12px 18px', textAlign: 'center', fontSize: '0.72rem', color: delayColors[i], textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.07)', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : undefined, fontWeight: 600 }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SURGE_CATEGORIES.map((cat, ri) => (
            <tr key={cat.name} style={{ borderBottom: ri < SURGE_CATEGORIES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
              <td style={{ padding: '14px 18px', fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 500, borderRight: '1px solid rgba(255,255,255,0.05)' }}>{cat.name}</td>
              {cat.thresholds.map((t, ci) => {
                const key = `${ri}-${ci}`
                return (
                  <td key={ci} onMouseEnter={() => setHov(key)} onMouseLeave={() => setHov(null)}
                    style={{ padding: '14px 18px', textAlign: 'center', cursor: 'default', transition: 'background 0.15s', background: hov === key ? `${delayColors[ci]}14` : 'transparent', borderRight: ci < 2 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: delayColors[ci] }}>{t}</div>
                    {hov === key && <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 3 }}>{delayDescs[ci]}</div>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── SurgePricingImpact ─────────────────────────────────────────────────────────
type SurgePanel = 'timeline' | 'response' | 'pnl'

function SurgePricingImpact() {
  const [panel, setPanel] = useState<SurgePanel>('timeline')

  // SVG chart dimensions
  const W = 560, H = 210
  const padL = 50, padR = 16, padT = 16, padB = 40
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const tMax = 25, qMax = 70

  const xOf = (t: number) => padL + (t / tMax) * chartW
  const yOf = (q: number) => padT + chartH - (q / qMax) * chartH
  const toPoints = (data: { t: number; q: number }[]) =>
    data.map(d => `${xOf(d.t).toFixed(1)},${yOf(d.q).toFixed(1)}`).join(' ')

  const areaPoints = [
    `${xOf(0)},${yOf(0)}`,
    ...RECOVERY_WITHOUT_EQ.map(d => `${xOf(d.t).toFixed(1)},${yOf(d.q).toFixed(1)}`),
    `${xOf(25)},${yOf(0)}`,
  ].join(' ')

  const TABS: [SurgePanel, string][] = [
    ['timeline', 'Recovery Timeline'],
    ['response', 'Supply Response'],
    ['pnl',      'Platform P&L'],
  ]

  const gridQs = [0, 20, 40, 60]
  const eventMarkers = [
    { t: 8,  label: '🟡 Barometer Yellow', color: '#f59e0b' },
    { t: 14, label: 'Supply recovers',     color: '#22c55e' },
  ]

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px', marginBottom: 16 }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Surge pricing impact, statistical view</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setPanel(id)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            transition: 'all 0.15s',
            border: `2px solid ${panel === id ? CYAN : 'rgba(255,255,255,0.08)'}`,
            background: panel === id ? `${CYAN}15` : 'rgba(255,255,255,0.02)',
            color: panel === id ? CYAN : '#64748b',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Panel 1: Recovery Timeline ── */}
      {panel === 'timeline' && (
        <div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 14, alignItems: 'center' }}>
            {[
              { color: CYAN,     label: 'With Equilibrium',    dash: false },
              { color: '#ef4444', label: 'Without Equilibrium', dash: true  },
            ].map(leg => (
              <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="24" height="10" viewBox="0 0 24 10">
                  {leg.dash
                    ? <line x1="0" y1="5" x2="24" y2="5" stroke={leg.color} strokeWidth="2" strokeDasharray="4 2" />
                    : <line x1="0" y1="5" x2="24" y2="5" stroke={leg.color} strokeWidth="2.5" />}
                </svg>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{leg.label}</span>
              </div>
            ))}
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
            {/* Y grid + labels */}
            {gridQs.map(q => (
              <g key={q}>
                <line x1={padL} y1={yOf(q)} x2={W - padR} y2={yOf(q)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <text x={padL - 6} y={yOf(q) + 4} textAnchor="end" fontSize="9" fill="#475569" fontFamily="system-ui">{q}</text>
              </g>
            ))}
            {/* Y axis label */}
            <text x={12} y={padT + chartH / 2} textAnchor="middle" fontSize="8" fill="#475569"
              fontFamily="system-ui" transform={`rotate(-90, 12, ${padT + chartH / 2})`}>Queue depth</text>
            {/* X axis labels */}
            {[0, 5, 8, 14, 20, 25].map(t => (
              <text key={t} x={xOf(t)} y={H - 6} textAnchor="middle" fontSize="9" fill="#475569" fontFamily="system-ui">{t}m</text>
            ))}
            {/* Axes */}
            <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {/* Event markers */}
            {eventMarkers.map(ev => (
              <g key={ev.t}>
                <line x1={xOf(ev.t)} y1={padT} x2={xOf(ev.t)} y2={padT + chartH}
                  stroke={ev.color} strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
                <text x={xOf(ev.t) + 4} y={padT + 11} fontSize="8" fill={ev.color} fontFamily="system-ui">{ev.label}</text>
              </g>
            ))}
            {/* Loss zone, area under "without" curve */}
            <polygon points={areaPoints} fill="rgba(239,68,68,0.07)" />
            {/* Without line */}
            <polyline points={toPoints(RECOVERY_WITHOUT_EQ)} fill="none"
              stroke="#ef4444" strokeWidth="2" strokeOpacity="0.55" strokeDasharray="5 3" />
            {/* With line */}
            <polyline points={toPoints(RECOVERY_WITH_EQ)} fill="none" stroke={CYAN} strokeWidth="2.5" />
            {/* Annotations */}
            <text x={xOf(18) + 4} y={yOf(65) - 6} fontSize="9" fill="#ef4444" fontFamily="system-ui" fontWeight="600">Peak: 65</text>
            <text x={xOf(22) + 4} y={yOf(1) - 6} fontSize="9" fill={CYAN} fontFamily="system-ui" fontWeight="600">Recovered</text>
          </svg>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 16 }}>
            {[
              { label: 'Peak queue depth',   with: '34 sessions',        without: '65 sessions',            delta: '–48% peak reduction',           color: CYAN     },
              { label: 'Time to recovery',   with: '22 min',             without: 'Persists beyond window', delta: 'Fully cleared in-window',        color: '#22c55e' },
              { label: 'Dropout exposure',   with: 'Contained',          without: '~30% demand at risk',    delta: 'Sessions and revenue protected',  color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '13px 15px' }}>
                <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>{s.label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>With</span>
                  <span style={{ fontSize: '0.75rem', color: CYAN, fontWeight: 700 }}>{s.with}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Without</span>
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>{s.without}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: s.color, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>{s.delta}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Panel 2: Supply Response Rate ── */}
      {panel === 'response' && (
        <div>
          <div style={{ background: 'rgba(6,182,212,0.04)', borderLeft: '3px solid #06b6d4', borderRadius: '0 10px 10px 0', padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: '0.68rem', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>The hardest design decision</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              Three incentive tiers felt right on paper. The real question was whether the Yellow tier would generate enough supply response on its own - or whether the system would skip straight to Red every time demand spiked. I modelled the acceptance rate curves and found Yellow alone handled 70% of spikes. Red was a backstop, not a default.
            </p>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 24, maxWidth: 620 }}>
            Expert acceptance rate by incentive tier. The base organic rate reflects experts who happen to open the app during a spike. Yellow and Red tiers measure the incremental supply unlocked, modelled from Beta-distributed response behaviour across the expert pool.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {SUPPLY_RESPONSE.map(r => (
              <div key={r.tier}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2e8f0' }}>{r.tier}</div>
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>{r.note}</div>
                  </div>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: r.color, lineHeight: 1 }}>{r.rate}%</span>
                </div>
                <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 6,
                    width: `${r.rate}%`,
                    background: `linear-gradient(90deg, ${r.color}80, ${r.color})`,
                  }} />
                  {r.rate > 8 && (
                    <div style={{ position: 'absolute', top: 0, left: '8%', width: 1, height: '100%', background: 'rgba(255,255,255,0.25)' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div style={{ padding: '16px 18px', background: `${CYAN}08`, border: `1px solid ${CYAN}20`, borderRadius: 12 }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: CYAN, marginBottom: 6 }}>4.75×</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.55 }}>Yellow tier (38%) vs organic base (8%). +30pp absolute lift from structured incentives alone.</div>
            </div>
            <div style={{ padding: '16px 18px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12 }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ef4444', marginBottom: 6 }}>6.9×</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.55 }}>Red tier (55%) vs organic base (8%). Multi-channel push (in-app + push + SMS) drives the incremental lift.</div>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.55, marginTop: 12 }}>
            Modelled as Beta distributions: Yellow Beta(3, 5) mean ≈ 38%; Red Beta(5, 4) mean ≈ 55%. Both configurable per marketplace, platforms with higher expert engagement see higher base rates.
          </p>
        </div>
      )}

      {/* ── Panel 3: Platform P&L ── */}
      {panel === 'pnl' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 24, maxWidth: 620 }}>
            Per-category surge P&L during an 11pm spike. Each bar shows surge fees collected from customers (full bar extent) vs. expert bonuses paid (filled portion). The gap is platform surplus, self-financing in every category, at every scale.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PLATFORM_PNL.map(row => {
              const maxVal = Math.max(...PLATFORM_PNL.map(r => r.surge)) * 1.06
              const surgeW  = (row.surge / maxVal) * 100
              const bonusW  = (row.bonus / maxVal) * 100
              const surplus = row.surge - row.bonus
              const marginPct = Math.round((surplus / row.surge) * 100)
              return (
                <div key={row.cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#e2e8f0' }}>{row.cat}</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>collected: <span style={{ color: row.color, fontWeight: 700 }}>${row.surge}</span></span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>paid: <span style={{ color: '#94a3b8', fontWeight: 600 }}>${row.bonus}</span></span>
                      <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>+{marginPct}% margin</span>
                    </div>
                  </div>
                  <div style={{ position: 'relative', height: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 5 }}>
                    <div style={{ position: 'absolute', top: 2, left: 0, width: `${surgeW}%`, height: 'calc(100% - 4px)', background: `${row.color}20`, borderRadius: 3, border: `1px solid ${row.color}30` }} />
                    <div style={{ position: 'absolute', top: 2, left: 0, width: `${bonusW}%`, height: 'calc(100% - 4px)', background: row.color, opacity: 0.7, borderRadius: 3 }} />
                    <div style={{ position: 'absolute', top: 0, left: `${bonusW + 1}%`, height: '100%', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.62rem', color: '#22c55e', fontWeight: 700, whiteSpace: 'nowrap' }}>+${surplus} surplus</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {(() => {
            const totalSurge   = PLATFORM_PNL.reduce((a, r) => a + r.surge, 0)
            const totalBonus   = PLATFORM_PNL.reduce((a, r) => a + r.bonus, 0)
            const totalSurplus = totalSurge - totalBonus
            return (
              <div style={{ marginTop: 20, padding: '16px 20px', background: `${CYAN}08`, border: `1px solid ${CYAN}20`, borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Surge collected',  value: `$${totalSurge.toLocaleString()}`,                  color: CYAN      },
                  { label: 'Bonuses paid',     value: `$${totalBonus.toLocaleString()}`,                   color: '#f59e0b' },
                  { label: 'Net platform cost', value: `+$${totalSurplus.toLocaleString()} surplus`,       color: '#22c55e' },
                ].map(stat => (
                  <div key={stat.label}>
                    <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            )
          })()}
          <p style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.55, marginTop: 12 }}>
            Surge fees at Yellow tier using wellness marketplace default multipliers. Expert bonuses at $8/session, 60% acceptance rate. Surplus scales with spike intensity, larger spikes generate proportionally larger margin.
          </p>
        </div>
      )}
    </div>
  )
}

// ── NotificationMockup ─────────────────────────────────────────────────────────
function NotificationMockup() {
  const [notifState, setNotifState] = useState<'yellow' | 'red'>('yellow')
  const notifications = {
    yellow: {
      stateColor: '#f59e0b', icon: '🟡', label: 'Yellow state · Push notification',
      title: '12 customers waiting right now',
      body: 'Complete 3 sessions to earn your $80 bonus. Rating multiplier 1.5× active until supply recovers.',
      cta: 'Open Expert App →', channels: ['Push notification'],
    },
    red: {
      stateColor: '#ef4444', icon: '🔴', label: 'Red state · Push + SMS',
      title: '🔴 High demand alert',
      body: 'Highest earnings tier now active. Every session tonight earns max bonus + priority badge. 48 experts pinged.',
      cta: 'Go online now, 23:08 →', channels: ['Push notification', 'SMS'],
    },
  }
  const n = notifications[notifState]
  return (
    <div className="notif-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 32, alignItems: 'start' }}>
      {/* Left: toggles + payload */}
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          {(['yellow', 'red'] as const).map(s => {
            const ns = notifications[s]
            return (
              <button key={s} onClick={() => setNotifState(s)} style={{
                flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                border: `2px solid ${notifState === s ? ns.stateColor : 'rgba(255,255,255,0.08)'}`,
                background: notifState === s ? `${ns.stateColor}12` : 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: notifState === s ? ns.stateColor : '#64748b', marginBottom: 2 }}>{ns.icon} {s === 'yellow' ? 'Yellow state' : 'Red state'}</div>
                <div style={{ fontSize: '0.7rem', color: '#475569' }}>{ns.channels.join(' + ')}</div>
              </button>
            )
          })}
        </div>
        {/* Payload detail */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Notification copy template (YAML)</div>
          <pre style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.7, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap' }}>
{notifState === 'yellow'
? `yellow:
  channels: [in_app, push]
  template: >
    {{ waiting_count }} customers waiting right now.
    Complete {{ session_target }} sessions to earn
    {{ incentive_summary }}.
    Rating multiplier {{ multiplier }}× active.`
: `red:
  channels: [in_app, push, sms, email]
  template: >
    {{ state_emoji }} High demand alert.
    {{ incentive_summary_lucrative }}

auto_stop:
  trigger: supply_health == 'green'
  action: pause_all_active_incentives`}
          </pre>
        </div>
      </div>
      {/* Right: phone mockup */}
      <div className="notif-phone" style={{ position: 'sticky', top: 80 }}>
        <div style={{ background: '#111122', borderRadius: 28, padding: '14px', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', maxWidth: 260 }}>
          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#475569', marginBottom: 14, padding: '0 4px' }}>
            <span>23:08</span>
            <span>5G ●●● 100%</span>
          </div>
          {/* Notification banner */}
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '12px 14px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: CYAN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0a0a0f' }}>C</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Expert App</span>
              </div>
              <span style={{ fontSize: '0.62rem', color: '#334155' }}>now</span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 5, transition: 'all 0.3s' }}>{n.title}</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.55, marginBottom: 10, transition: 'all 0.3s' }}>{n.body}</div>
            <div style={{ fontSize: '0.72rem', color: CYAN, fontWeight: 600 }}>{n.cta}</div>
          </div>
          {/* Channel pills */}
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10 }}>
            {n.channels.map(ch => (
              <span key={ch} style={{ fontSize: '0.6rem', color: '#475569', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 10 }}>{ch}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RoutingMatrix ──────────────────────────────────────────────────────────────
function RoutingMatrix() {
  const [hov, setHov] = useState<string | null>(null)
  return (
    <div>
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.05)', fontWeight: 500 }}>Supply state</th>
              <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>Low complexity (&lt; 0.4)</th>
              <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 600 }}>High complexity (≥ 0.7)</th>
            </tr>
          </thead>
          <tbody>
            {ROUTING_MATRIX.map((row, ri) => (
              <tr key={row.condition} style={{ borderBottom: ri < ROUTING_MATRIX.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
                <td style={{ padding: '14px 18px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.condColor, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#e2e8f0' }}>{row.condition}</span>
                  </div>
                </td>
                {[row.low, row.high].map((cell, ci) => {
                  const key = `${ri}-${ci}`
                  return (
                    <td key={ci} onMouseEnter={() => setHov(key)} onMouseLeave={() => setHov(null)}
                      style={{ padding: '14px 18px', textAlign: 'center', borderRight: ci === 0 ? '1px solid rgba(255,255,255,0.05)' : undefined, background: hov === key ? `${cell.color}10` : 'transparent', transition: 'background 0.15s', cursor: 'default' }}>
                      <div style={{ fontWeight: 700, color: cell.color, fontSize: '0.88rem', marginBottom: 3 }}>{cell.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#475569' }}>{cell.note}</div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>NLP complexity score</div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>0–0.4: general questions, scheduling, basic info. 0.7+: crisis signals, trauma history, nuanced emotional context. Score adapts based on escalation CSAT feedback.</div>
        </div>
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10 }}>
          <div style={{ fontSize: '0.68rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Hard rules override the matrix</div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Mental health crisis, crisis keywords detected, and any operator-defined "always human" categories bypass all routing logic. No exceptions.</div>
        </div>
      </div>
    </div>
  )
}

// ── DashboardPreview ───────────────────────────────────────────────────────────
function DashboardPreview() {
  const panels = [
    {
      label: 'Demand Panel', color: '#8b5cf6',
      rows: [{ name: 'Unique visitors', pct: 72 }, { name: 'Active page views', pct: 58 }, { name: 'Chat requests', pct: 85 }, { name: 'Chatbot sentiment', pct: 63 }],
    },
    {
      label: 'Matching Panel', color: CYAN,
      rows: [{ name: 'Assigned', pct: 68 }, { name: 'Waiting', pct: 41 }, { name: 'In live session', pct: 77 }, { name: 'Fill rate', pct: 82 }],
    },
    {
      label: 'Supply Panel', color: '#22c55e',
      rows: [{ name: 'Expert utilization', pct: 74 }, { name: 'Idle time', pct: 29 }, { name: 'Actual vs planned', pct: 91 }, { name: 'Assignee time', pct: 55 }],
    },
  ]
  const visuals = [
    { label: 'Category Demand Heatmap', desc: 'Hourly active users across all categories', color: '#8b5cf6' },
    { label: 'Delay Barometer', desc: 'Live Green / Yellow / Red platform state', color: CYAN },
    { label: 'Hourly D&S Trend', desc: 'Demand vs supply gap over time', color: '#f59e0b' },
    { label: 'Sentiment Chart', desc: 'Willingness-to-wait per category (−1 to +1)', color: '#22c55e' },
    { label: 'Availability Calendar', desc: 'Expert schedules as building blocks', color: '#ec4899' },
  ]
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['#22c55e', 'Green'], ['#f59e0b', 'Yellow'], ['#ef4444', 'Red']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#334155' }}>Live · WebSocket · 30s refresh</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {panels.map((p, pi) => (
          <div key={p.label} style={{ padding: '16px', background: '#0a0a0f', borderRight: pi < 2 ? '1px solid rgba(255,255,255,0.06)' : undefined, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.68rem', color: p.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, fontWeight: 600 }}>{p.label}</div>
            {p.rows.map(r => (
              <div key={r.name} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{r.name}</span>
                  <span style={{ fontSize: '0.72rem', color: p.color }}>{r.pct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ width: `${r.pct}%`, height: '100%', borderRadius: 2, background: p.color, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        {visuals.map((v, i) => (
          <div key={v.label} style={{ padding: '14px', background: '#080810', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.06)' : undefined, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.66rem', color: v.color, fontWeight: 600, marginBottom: 5 }}>{v.label}</div>
            <div style={{ fontSize: '0.66rem', color: '#334155', lineHeight: 1.4, marginBottom: 10 }}>{v.desc}</div>
            <div style={{ height: 28, borderRadius: 5, background: `${v.color}08`, border: `1px solid ${v.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.58rem', color: `${v.color}50`, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Chart</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ConfigPresets ──────────────────────────────────────────────────────────────
function ConfigPresets() {
  const [active, setActive] = useState<PresetId>('wellness')
  const preset = PRESETS.find(p => p.id === active)!
  const yaml = `equilibrium:
  preset: ${preset.id}

  categories:
    - name: ${preset.id === 'wellness' ? 'astrology' : preset.id === 'telehealth' ? 'primary_care' : preset.id === 'tutoring' ? 'mathematics' : 'design'}
      delay_thresholds:
        yellow: ${preset.id === 'telehealth' ? 15 : preset.id === 'tutoring' ? 45 : 30}
        red:    ${preset.id === 'telehealth' ? 30 : preset.id === 'tutoring' ? 90 : 60}
      dropout_thresholds:
        yellow: ${preset.id === 'telehealth' ? 3 : preset.id === 'tutoring' ? 8 : 5}
        red:    ${preset.id === 'telehealth' ? 7 : preset.id === 'tutoring' ? 15 : 10}

  ai_escalation:
    always_human: ${preset.id === 'wellness' ? '[mental_health_crisis]' : preset.id === 'telehealth' ? '[urgent_care, crisis]' : '[]'}
    complexity_threshold: ${preset.id === 'tutoring' ? 0.5 : 0.7}

  webhooks:
    incentive_trigger: https://your-service/incentive
    surge_update:      https://your-service/surge`

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 20 }}>
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => setActive(p.id)} style={{
            padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
            border: `2px solid ${active === p.id ? p.color : 'rgba(255,255,255,0.08)'}`,
            background: active === p.id ? `${p.color}12` : 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ fontSize: '0.72rem', color: p.color, fontWeight: 700, fontFamily: 'monospace', marginBottom: 5 }}>{p.label}</div>
            <div style={{ fontSize: '0.65rem', color: '#475569', background: `${p.color}18`, padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>{p.tag}</div>
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${preset.color}28`, borderRadius: 12, padding: '20px' }}>
          <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 16 }}>{preset.desc}</p>
          {preset.highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: preset.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{h}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#060610', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px', overflow: 'auto' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>equilibrium.yaml</div>
          <pre style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.65, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap' }}>
            <span style={{ color: preset.color }}>equilibrium:</span>
            {'\n  preset: ' + preset.id}
            {'\n' + yaml.split('\n').slice(2).join('\n')}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ── QueuePressureSimulator ─────────────────────────────────────────────────────
function QueuePressureSimulator() {
  const [mult, setMult] = React.useState(1.0)

  const supply = 18      // sessions/hr — 3 experts at 6 sessions each
  const base   = 24      // demand at 1×
  const demand = base * mult
  const deficit = demand - supply

  const qAt10 = Math.max(0, (deficit / 60) * 10)
  const delay  = supply > 0 ? (qAt10 / supply) * 60 : 0

  const state: BarometerState =
    delay >= 60 ? 'red' : delay >= 30 ? 'yellow' : 'green'
  const sc    = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' }[state]
  const icon  = { green: '🟢', yellow: '🟡', red: '🔴' }[state]
  const callout: Record<BarometerState, string> = {
    green:  'Platform healthy. Nothing fires. Experts handle sessions normally.',
    yellow: 'Incentive engine activates. Surge pricing starts. Offline experts get pushed.',
    red:    'All channels fire simultaneously. Surge at max. AI absorbs non-urgent demand.',
  }

  const PW = 520, PH = 148
  const pL = 44, pR = 16, pT = 10, pB = 32
  const cW = PW - pL - pR
  const cH = PH - pT - pB
  const maxQ = Math.max(18, qAt10 * 1.5 + 3)
  const xs = (t: number) => pL + (t / 15) * cW
  const ys = (q: number) => pT + cH - Math.min(1, q / maxQ) * cH
  const yellowQ = 30 * supply / 60
  const redQ    = 60 * supply / 60

  const linePts = Array.from({ length: 31 }, (_, i) => {
    const t = i * 0.5
    return `${xs(t).toFixed(1)},${ys(Math.max(0, (deficit / 60) * t)).toFixed(1)}`
  }).join(' ')
  const areaPts = `${xs(0)},${ys(0)} ${linePts} ${xs(15)},${ys(0)}`

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${sc}22`, borderRadius: 16, padding: '24px 26px', marginTop: 32, transition: 'border-color 0.4s' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Try it yourself: drag the demand slider</div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>Demand multiplier</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: sc, transition: 'color 0.3s' }}>{mult.toFixed(1)}×</span>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{demand.toFixed(0)} sessions/hr arriving</span>
          </div>
        </div>
        <input type="range" min={1} max={4} step={0.1} value={mult}
          onChange={e => setMult(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: sc, cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#334155', marginTop: 4 }}>
          <span>1× · quiet evening</span><span>4× · 11pm spike</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Supply (fixed)',   value: `${supply}/hr`,               note: '3 experts online',        color: CYAN     },
          { label: 'Demand arriving',  value: `${demand.toFixed(0)}/hr`,     note: 'customers requesting',   color: deficit > 0 ? '#ef4444' : '#22c55e' },
          { label: 'Queue at 10 min', value: `${qAt10.toFixed(0)} sessions`, note: 'waiting, unassigned',    color: sc       },
          { label: 'Delay time',       value: `${Math.max(0, delay).toFixed(0)} min`, note: 'to expert',   color: sc       },
        ].map(m => (
          <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '11px 13px', border: `1px solid ${m.color}20`, transition: 'border-color 0.3s' }}>
            <div style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: m.color, transition: 'color 0.3s' }}>{m.value}</div>
            <div style={{ fontSize: '0.64rem', color: '#334155', marginTop: 2 }}>{m.note}</div>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: '100%', display: 'block', marginBottom: 14 }}>
        {[0, Math.round(maxQ * 0.4), Math.round(maxQ * 0.8)].map(q => (
          <g key={q}>
            <line x1={pL} y1={ys(q)} x2={PW - pR} y2={ys(q)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={pL - 5} y={ys(q) + 4} fontSize="8" fill="#334155" textAnchor="end" fontFamily="system-ui">{q}</text>
          </g>
        ))}
        {[0, 5, 10, 15].map(t => (
          <text key={t} x={xs(t)} y={PH - 5} fontSize="8" fill="#334155" textAnchor="middle" fontFamily="system-ui">{t}m</text>
        ))}
        {maxQ > yellowQ && <rect x={pL} y={ys(Math.min(maxQ, redQ))} width={cW} height={ys(yellowQ) - ys(Math.min(maxQ, redQ))} fill="rgba(245,158,11,0.05)" />}
        {maxQ > redQ    && <rect x={pL} y={pT} width={cW} height={ys(redQ) - pT} fill="rgba(239,68,68,0.05)" />}
        {maxQ > yellowQ && <>
          <line x1={pL} y1={ys(yellowQ)} x2={PW - pR} y2={ys(yellowQ)} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
          <text x={PW - pR - 3} y={ys(yellowQ) - 3} fontSize="7" fill="#f59e0b" textAnchor="end" fontFamily="system-ui">Yellow</text>
        </>}
        {maxQ > redQ && <>
          <line x1={pL} y1={ys(redQ)} x2={PW - pR} y2={ys(redQ)} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
          <text x={PW - pR - 3} y={ys(redQ) - 3} fontSize="7" fill="#ef4444" textAnchor="end" fontFamily="system-ui">Red</text>
        </>}
        <line x1={pL} y1={pT} x2={pL} y2={pT + cH} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        <line x1={pL} y1={pT + cH} x2={PW - pR} y2={pT + cH} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        <polygon points={areaPts} fill={`${sc}15`} style={{ transition: 'fill 0.4s' }} />
        <polyline points={linePts} fill="none" stroke={sc} strokeWidth="2.5" style={{ transition: 'stroke 0.4s' }} />
        <text x={10} y={pT + cH / 2} fontSize="8" fill="#334155" textAnchor="middle" fontFamily="system-ui" transform={`rotate(-90, 10, ${pT + cH / 2})`}>Queue</text>
      </svg>
      <div style={{ padding: '12px 16px', background: `${sc}10`, border: `1px solid ${sc}28`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.4s' }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: '0.84rem', color: sc, fontWeight: 600 }}>{callout[state]}</span>
      </div>
    </div>
  )
}

// ── ThresholdHeatmap ───────────────────────────────────────────────────────────
const HEAT_DELAYS   = ['< 15m', '15-30m', '30-45m', '45-60m', '> 60m']
const HEAT_DROPOUTS = ['< 3%',  '3-5%',   '5-8%',   '8-10%',  '> 10%']
const HEAT_DELAY_MAX   = [14, 29, 44, 59, 999]
const HEAT_DROPOUT_MAX = [2,   4,  7,   9, 999]

function heatState(di: number, ri: number): BarometerState {
  const d = HEAT_DELAY_MAX[di], r = HEAT_DROPOUT_MAX[ri]
  if (d >= 60 || r >= 10) return 'red'
  if (d >= 30 || r >= 5)  return 'yellow'
  return 'green'
}

function ThresholdHeatmap() {
  const [hov, setHov] = React.useState<[number, number] | null>(null)
  const sc: Record<BarometerState, string> = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' }
  const hovState = hov ? heatState(hov[0], hov[1]) : null
  const hovColor = hovState ? sc[hovState] : CYAN

  const triggers = (di: number, ri: number) => {
    const d = HEAT_DELAY_MAX[di], r = HEAT_DROPOUT_MAX[ri]
    const parts: string[] = []
    if (d >= 60) parts.push('Delay ≥ 60 min (Red trigger)')
    else if (d >= 30) parts.push('Delay ≥ 30 min (Yellow trigger)')
    if (r >= 10) parts.push('Dropout ≥ 10% (Red trigger)')
    else if (r >= 5) parts.push('Dropout ≥ 5% (Yellow trigger)')
    return parts.length ? parts.join(' + ') : 'No triggers active'
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Barometer state by delay × dropout: hover any cell</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '72px repeat(5, 1fr)', marginBottom: 4 }}>
            <div />
            {HEAT_DELAYS.map(d => (
              <div key={d} style={{ fontSize: '0.62rem', color: '#475569', textAlign: 'center', padding: '2px 0' }}>{d}</div>
            ))}
          </div>
          {/* Grid rows */}
          {HEAT_DROPOUTS.map((drop, ri) => (
            <div key={drop} style={{ display: 'grid', gridTemplateColumns: '72px repeat(5, 1fr)', marginBottom: 3 }}>
              <div style={{ fontSize: '0.62rem', color: '#475569', display: 'flex', alignItems: 'center', paddingRight: 8 }}>{drop}</div>
              {HEAT_DELAYS.map((_, di) => {
                const s = heatState(di, ri)
                const c = sc[s]
                const isHov = hov?.[0] === di && hov?.[1] === ri
                return (
                  <div key={di}
                    onMouseEnter={() => setHov([di, ri])}
                    onMouseLeave={() => setHov(null)}
                    style={{
                      height: 36, borderRadius: 5, cursor: 'default', transition: 'all 0.15s',
                      background: isHov ? `${c}35` : `${c}12`,
                      border: `1px solid ${isHov ? c : c + '30'}`,
                      boxShadow: isHov ? `0 0 12px ${c}40` : 'none',
                      margin: '0 2px',
                    }} />
                )
              })}
            </div>
          ))}
          {/* Row label */}
          <div style={{ fontSize: '0.6rem', color: '#334155', marginTop: 6, textAlign: 'center' }}>← Delay Time →</div>
        </div>
        {/* Hover detail */}
        <div style={{ width: 220, background: 'rgba(255,255,255,0.03)', border: `1px solid ${hovColor}25`, borderRadius: 12, padding: '16px', transition: 'all 0.2s', minHeight: 120 }}>
          {hov ? (
            <>
              <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Cell analysis</div>
              <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 5 }}>Delay: <strong>{HEAT_DELAYS[hov[0]]}</strong></div>
              <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 10 }}>Dropout: <strong>{HEAT_DROPOUTS[hov[1]]}</strong></div>
              <div style={{ fontSize: '0.75rem', color: hovColor, fontWeight: 700, marginBottom: 6 }}>
                {hovState === 'green' ? '🟢 Green' : hovState === 'yellow' ? '🟡 Yellow' : '🔴 Red'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.55 }}>{triggers(hov[0], hov[1])}</div>
            </>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.6 }}>
              Hover a cell to see which triggers are active and why the barometer lands where it does.
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
        {(['green', 'yellow', 'red'] as BarometerState[]).map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: sc[s], opacity: 0.7 }} />
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'capitalize' }}>{s}</span>
          </div>
        ))}
        <span style={{ fontSize: '0.7rem', color: '#334155', marginLeft: 8 }}>Either trigger alone can flip the state.</span>
      </div>
    </div>
  )
}

// ── ExpertFunnel ───────────────────────────────────────────────────────────────
const FUNNEL_DATA = {
  yellow: [
    { stage: 'Pinged',     n: 48, note: 'All offline + idle experts reached' },
    { stage: 'Delivered',  n: 44, note: 'Push notification received' },
    { stage: 'Opened',     n: 26, note: 'Opened the expert app' },
    { stage: 'Accepted',   n: 18, note: 'Agreed to come online' },
    { stage: 'Online',     n: 18, note: 'In expert pool within 6 min' },
  ],
  red: [
    { stage: 'Pinged',     n: 48, note: 'All channels: in-app, push, SMS' },
    { stage: 'Delivered',  n: 46, note: 'Multi-channel delivery confirmed' },
    { stage: 'Opened',     n: 36, note: 'Opened the app' },
    { stage: 'Accepted',   n: 26, note: 'Agreed to come online' },
    { stage: 'Online',     n: 26, note: 'In expert pool within 6 min' },
  ],
}

function ExpertFunnel() {
  const [tier, setTier] = React.useState<'yellow' | 'red'>('yellow')
  const data = FUNNEL_DATA[tier]
  const tierColor = tier === 'yellow' ? '#f59e0b' : '#ef4444'
  const max = data[0].n

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Expert response funnel: from push to online</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['yellow', 'red'] as const).map(t => (
          <button key={t} onClick={() => setTier(t)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            border: `2px solid ${tier === t ? (t === 'yellow' ? '#f59e0b' : '#ef4444') : 'rgba(255,255,255,0.08)'}`,
            background: tier === t ? `${t === 'yellow' ? '#f59e0b' : '#ef4444'}15` : 'rgba(255,255,255,0.02)',
            color: tier === t ? (t === 'yellow' ? '#f59e0b' : '#ef4444') : '#64748b',
            transition: 'all 0.15s',
          }}>
            {t === 'yellow' ? '🟡 Yellow state' : '🔴 Red state'}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((row, i) => {
          const pct = (row.n / max) * 100
          const prevPct = i > 0 ? (data[i - 1].n / max) * 100 : 100
          const dropoff = i > 0 ? data[i - 1].n - row.n : 0
          return (
            <div key={row.stage}>
              {i > 0 && dropoff > 0 && (
                <div style={{ fontSize: '0.65rem', color: '#334155', textAlign: 'right', marginBottom: 3, paddingRight: `${100 - prevPct}%` }}>
                  {dropoff} didn&apos;t continue
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 72, fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{row.stage}</div>
                <div style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: `${pct}%`, height: '100%', background: tierColor, opacity: 0.65, transition: 'width 0.4s, background 0.3s', borderRadius: 5 }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                    <span style={{ fontSize: '0.72rem', color: '#0a0a0f', fontWeight: 700 }}>{row.n} experts</span>
                  </div>
                  <div style={{ position: 'absolute', top: 0, right: 8, height: '100%', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{Math.round(pct)}%</span>
                  </div>
                </div>
                <div style={{ width: 170, fontSize: '0.68rem', color: '#475569', flexShrink: 0 }}>{row.note}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {[
          { label: 'Overall response rate', value: `${Math.round((data[4].n / max) * 100)}%`, color: tierColor },
          { label: 'Experts online added',  value: `+${data[4].n} experts`,                   color: '#22c55e' },
          { label: 'Supply-hours gained',   value: `+${(data[4].n * 1.5).toFixed(0)}/hr`,     color: CYAN     },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SessionDistribution ────────────────────────────────────────────────────────
const SESSION_BINS = [
  { range: '0.0-0.1', count: 5,  zone: 'ai'    },
  { range: '0.1-0.2', count: 12, zone: 'ai'    },
  { range: '0.2-0.3', count: 18, zone: 'ai'    },
  { range: '0.3-0.4', count: 24, zone: 'ai'    },
  { range: '0.4-0.5', count: 26, zone: 'mid'   },
  { range: '0.5-0.6', count: 22, zone: 'mid'   },
  { range: '0.6-0.7', count: 16, zone: 'mid'   },
  { range: '0.7-0.8', count: 12, zone: 'human' },
  { range: '0.8-0.9', count: 8,  zone: 'human' },
  { range: '0.9-1.0', count: 5,  zone: 'human' },
]
const ZONE_COLORS = { ai: CYAN, mid: '#f59e0b', human: '#8b5cf6' }
const ZONE_LABELS: Record<string, string> = {
  ai:    'AI Companion',
  mid:   'Context-dependent',
  human: 'Human Expert',
}

function SessionDistribution() {
  const [hovBar, setHovBar] = React.useState<number | null>(null)
  const maxCount = Math.max(...SESSION_BINS.map(b => b.count))
  const total = SESSION_BINS.reduce((a, b) => a + b.count, 0)
  const aiCount    = SESSION_BINS.filter(b => b.zone === 'ai').reduce((a, b) => a + b.count, 0)
  const midCount   = SESSION_BINS.filter(b => b.zone === 'mid').reduce((a, b) => a + b.count, 0)
  const humanCount = SESSION_BINS.filter(b => b.zone === 'human').reduce((a, b) => a + b.count, 0)

  const hb = hovBar !== null ? SESSION_BINS[hovBar] : null
  const hbColor = hb ? ZONE_COLORS[hb.zone as keyof typeof ZONE_COLORS] : CYAN

  const routingNote: Record<string, string> = {
    ai:    'Low complexity (< 0.4). The AI companion handles these instantly, freeing human experts for harder cases.',
    mid:   'Supply state decides. Green: AI handles. Yellow/Red: queued for human if complexity warrants it.',
    human: 'High complexity (≥ 0.7). Always routed to a human expert, regardless of supply state.',
  }

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Session complexity distribution: what the router sees</div>
      <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 20, maxWidth: 600 }}>
        Every incoming session is scored 0 to 1 by the NLP complexity model. The score determines where it routes: instant AI, human queue, or supply-state-dependent. Hover any bar to see its routing decision.
      </p>
      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, marginBottom: 6 }}>
        {SESSION_BINS.map((bin, i) => {
          const zc = ZONE_COLORS[bin.zone as keyof typeof ZONE_COLORS]
          const isHov = hovBar === i
          const h = (bin.count / maxCount) * 100
          return (
            <div key={bin.range} onMouseEnter={() => setHovBar(i)} onMouseLeave={() => setHovBar(null)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'default' }}>
              <div style={{ fontSize: '0.6rem', color: isHov ? zc : 'transparent', fontWeight: 700 }}>{bin.count}</div>
              <div style={{ width: '100%', height: `${h}%`, background: zc, opacity: isHov ? 0.9 : 0.45, borderRadius: '3px 3px 0 0', transition: 'all 0.15s', boxShadow: isHov ? `0 0 10px ${zc}60` : 'none' }} />
            </div>
          )
        })}
      </div>
      {/* X axis — complexity score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        {SESSION_BINS.map(bin => (
          <div key={bin.range} style={{ flex: 1, fontSize: '0.55rem', color: '#334155', textAlign: 'center' }}>
            {bin.range.split('-')[0]}
          </div>
        ))}
      </div>
      {/* Zone bands */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
        {(['ai', 'mid', 'human'] as const).map((zone, i) => {
          const spans = [4, 3, 3]
          const zc = ZONE_COLORS[zone]
          return (
            <div key={zone} style={{ flex: spans[i], background: `${zc}10`, border: `1px solid ${zc}25`, borderRadius: 6, padding: '5px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.64rem', color: zc, fontWeight: 700 }}>{ZONE_LABELS[zone]}</div>
              <div style={{ fontSize: '0.6rem', color: '#475569' }}>{zone === 'ai' ? '< 0.4' : zone === 'mid' ? '0.4 - 0.7' : '≥ 0.7'}</div>
            </div>
          )
        })}
      </div>
      {/* Hover detail or zone summary */}
      {hb ? (
        <div style={{ padding: '14px 16px', background: `${hbColor}08`, border: `1px solid ${hbColor}25`, borderRadius: 10, transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: hbColor }}>Score {hb.range}</span>
            <span style={{ fontSize: '0.8rem', color: hbColor }}>{hb.count} sessions ({Math.round((hb.count / total) * 100)}%)</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{routingNote[hb.zone]}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {[
            { zone: 'ai',    label: 'AI zone',    n: aiCount,    pct: Math.round((aiCount    / total) * 100) },
            { zone: 'mid',   label: 'Context zone', n: midCount,   pct: Math.round((midCount   / total) * 100) },
            { zone: 'human', label: 'Human zone', n: humanCount, pct: Math.round((humanCount / total) * 100) },
          ].map(s => (
            <div key={s.zone} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${ZONE_COLORS[s.zone as keyof typeof ZONE_COLORS]}20`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: ZONE_COLORS[s.zone as keyof typeof ZONE_COLORS] }}>{s.pct}%</div>
              <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>{s.n} of {total} sessions</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PipelineFlow ───────────────────────────────────────────────────────────────
const PIPELINE_NODES = [
  { id: 'signals',   label: 'Demand Signals',      sub: 'Input layer',          color: '#8b5cf6', icon: '📡',
    desc: 'Five live signals: unique visitors, active views, chat volume, chatbot sentiment score (-1 to +1), and queue depth per category. The sentiment score is the non-obvious one - it measures whether customers are willing to wait, not just whether they are waiting.' },
  { id: 'health',    label: 'Health Engine',         sub: 'Barometer core',       color: '#06b6d4', icon: '❤',
    desc: 'Evaluates signals against per-category thresholds. Triggers Green, Yellow, or Red on two independent metrics: Delay Time (minutes to expert assignment) and Dropout Rate. Either alone can flip the state.' },
  { id: 'surge',     label: 'Surge Calculator',      sub: 'Demand-side response', color: '#f59e0b', icon: '⚡',
    desc: 'Category × delay matrix fires the surge fee. Fees collected from customers fund the expert incentive pool. Self-financing at every scale - the platform never carries the cost of a supply response.' },
  { id: 'incentive', label: 'Incentive Engine',      sub: 'Supply-side response', color: '#22c55e', icon: '💸',
    desc: 'Push to active, scheduled, and offline experts simultaneously. Revenue share boost, rating multiplier, priority badge. Auto-stop fires the moment the barometer returns to Green.' },
  { id: 'router',    label: 'AI Router',             sub: 'Routing layer',        color: '#ec4899', icon: '🤖',
    desc: 'NLP classifies every queued session by complexity. Standard queries route to the AI companion, high-complexity to human queue by ERS score. Mental health: always human, no exceptions.' },
]

function PipelineFlow() {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const active = PIPELINE_NODES.find(n => n.id === activeNode)

  return (
    <div style={{ marginTop: 48, marginBottom: 48 }}>
      <div style={{ fontSize: '0.68rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>System architecture - click any module to expand</div>
      <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.6, marginBottom: 28, maxWidth: 620 }}>
        Five modules, one loop. Demand signals trigger the health engine, which fires the surge calculator and incentive engine simultaneously, while the AI router redirects load in real time.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
        {PIPELINE_NODES.map((node, i) => (
          <React.Fragment key={node.id}>
            <button onClick={() => setActiveNode(activeNode === node.id ? null : node.id)} style={{
              padding: '16px 18px', borderRadius: 12, cursor: 'pointer', textAlign: 'center', minWidth: 120,
              border: `2px solid ${activeNode === node.id ? node.color : `${node.color}30`}`,
              background: activeNode === node.id ? `${node.color}12` : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{node.icon}</div>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: activeNode === node.id ? node.color : '#e2e8f0', marginBottom: 3 }}>{node.label}</div>
              <div style={{ fontSize: '0.62rem', color: '#475569' }}>{node.sub}</div>
            </button>
            {i < PIPELINE_NODES.length - 1 && (
              <div style={{ width: 28, height: 2, background: `linear-gradient(90deg, ${node.color}60, ${PIPELINE_NODES[i+1].color}60)`, flexShrink: 0, margin: '0 2px' }} />
            )}
          </React.Fragment>
        ))}
      </div>
      {active && (
        <div style={{ marginTop: 16, padding: '16px 20px', background: `${active.color}08`, border: `1px solid ${active.color}25`, borderRadius: 12, maxWidth: 680, transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '1.1rem' }}>{active.icon}</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: active.color }}>{active.label}</span>
            <span style={{ fontSize: '0.7rem', color: '#475569', background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 8px' }}>{active.sub}</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{active.desc}</p>
        </div>
      )}
    </div>
  )
}

// ── P5ProjectBridge ────────────────────────────────────────────────────────────
const P5_BRIDGE_FLOWS = [
  {
    from: 'Barometer state',
    to: 'Expert prioritisation (Rank, Reward, Retain)',
    color: '#06b6d4',
    detail: 'When the barometer hits Red in a category, the incentive push goes to the highest-ERS experts first. The Rank, Reward, Retain TOPSIS ranking determines who gets the Yellow push, who gets Red, and who gets neither.',
  },
  {
    from: 'Surge collected',
    to: 'Revenue analytics (Rank, Reward, Retain)',
    color: '#f59e0b',
    detail: 'Surge fees collected during Red events are tracked in the Rank, Reward, Retain creator analytics dashboard as platform margin. The self-financing loop - surge funds bonuses - is visible in the revenue module.',
  },
  {
    from: 'Expert sessions',
    to: 'TOPSIS re-scoring (Rank, Reward, Retain)',
    color: '#8b5cf6',
    detail: 'Every session completed during a surge event updates the expert session count and CSAT inputs that feed the Rank, Reward, Retain TOPSIS engine. A Red event generates data that changes rankings for the next event.',
  },
  {
    from: 'AI escalation log',
    to: 'AI training gate (Rank, Reward, Retain)',
    color: '#22c55e',
    detail: 'Sessions that the AI router escalates to human experts - high-complexity or mental health - are flagged in the conversation log. Rank, Reward, Retain ERS and session health gates then determine which of those conversations enter the AI training dataset.',
  },
]

function P5ProjectBridge() {
  const [active, setActive] = useState<number | null>(null)
  const VIOLET = '#8b5cf6'

  return (
    <div style={{ marginTop: 48, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ fontSize: '0.68rem', color: CYAN, textTransform: 'uppercase', letterSpacing: '0.08em' }}>How this project feeds Rank, Reward, Retain</div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <a href="https://rank-reward-retain.vercel.app" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '0.72rem', color: VIOLET, textDecoration: 'none', fontWeight: 600 }}>
          View Rank, Reward, Retain →
        </a>
      </div>
      <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
        The demand system does not operate in isolation. Every event it detects feeds the supply intelligence layer in <a href="https://rank-reward-retain.vercel.app" style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: 600 }}>Rank, Reward, Retain</a>. Click a connection to see how.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {P5_BRIDGE_FLOWS.map((flow, i) => (
          <button key={flow.from} onClick={() => setActive(active === i ? null : i)} style={{
            padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
            border: `1px solid ${active === i ? flow.color + '50' : 'rgba(255,255,255,0.07)'}`,
            background: active === i ? `${flow.color}08` : 'rgba(255,255,255,0.02)',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: '0.72rem', color: flow.color, fontWeight: 700, marginBottom: 6 }}>
              {flow.from}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ flex: 1, height: 1, background: `${flow.color}40` }} />
              <span style={{ fontSize: '0.6rem', color: '#334155' }}>→</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{flow.to}</div>
          </button>
        ))}
      </div>
      {active !== null && (
        <div style={{ marginTop: 14, padding: '14px 18px', background: `${P5_BRIDGE_FLOWS[active].color}08`, border: `1px solid ${P5_BRIDGE_FLOWS[active].color}25`, borderRadius: 10 }}>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
            {P5_BRIDGE_FLOWS[active].detail}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Math helpers ───────────────────────────────────────────────────────────────
function MF({ n, d }: { n: React.ReactNode; d: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', verticalAlign: 'middle', margin: '0 3px', lineHeight: 1.25 }}>
      <span style={{ borderBottom: '1.5px solid #94a3b8', paddingBottom: 1, paddingLeft: 5, paddingRight: 5 }}>{n}</span>
      <span style={{ paddingTop: 2, paddingLeft: 5, paddingRight: 5 }}>{d}</span>
    </span>
  )
}
function SR({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 1 }}>
      <span style={{ fontSize: '1.25em', lineHeight: 1 }}>√</span>
      <span style={{ borderTop: '1.5px solid #94a3b8', paddingTop: 2, paddingLeft: 2, paddingRight: 2 }}>{children}</span>
    </span>
  )
}

// ── SurgeMath ──────────────────────────────────────────────────────────────────
function SurgeMath() {
  const [tab, setTab] = useState<"barometer" | "surge">("barometer")

  return (
    <div style={{ marginTop: 32, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 26px" }}>
      <div style={{ fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
        The math behind the decisions
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["barometer", "surge"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: "0.76rem", fontWeight: 600,
            border: `2px solid ${tab === t ? CYAN : "rgba(255,255,255,0.08)"}`,
            background: tab === t ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.02)",
            color: tab === t ? CYAN : "#64748b", transition: "all 0.15s",
          }}>
            {t === "barometer" ? "Barometer state" : "Surge pricing"}
          </button>
        ))}
      </div>

      {tab === "barometer" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <div style={{ padding: "16px 20px", background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 12 }}>
            <div style={{ fontSize: "0.6rem", color: CYAN, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Formula</div>
            <div style={{ fontSize: "1rem", color: "#e2e8f0", lineHeight: 2.2, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>delay</span>
                <span>=</span>
                <MF n="Q" d="A" />
                <span>×</span>
                <span>10</span>
                <span>×</span>
                <span>(1 + p)</span>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: 6 }}>
                Q = queue depth &nbsp;·&nbsp; A = active views
              </div>
              <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                p = patience factor = 1 − (sentiment + 1) / 4
              </div>
            </div>
            <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", fontFamily: "monospace", fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.8 }}>
              <div style={{ color: "#475569", marginBottom: 4 }}>{"// State logic (each metric independent)"}</div>
              <div>{"if delay >= d_red  → RED"}</div>
              <div>{"if delay >= d_yellow → YELLOW"}</div>
              <div>{"if dropout_rate >= threshold → same"}</div>
              <div style={{ color: CYAN, marginTop: 4 }}>worst state wins</div>
            </div>
          </div>
          <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
            <div style={{ fontSize: "0.6rem", color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Worked example: 11pm astrology spike</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.79rem", color: "#64748b", lineHeight: 1.9 }}>
              <div>Q = 14 sessions waiting</div>
              <div>A = 28 active views</div>
              <div>sentiment = -0.4 (customers frustrated)</div>
              <div style={{ color: "#94a3b8", marginTop: 4 }}>p = 1 - (-0.4 + 1) / 4 = 0.85</div>
              <div style={{ color: "#94a3b8" }}>delay = (14/28) x 10 x 1.85 = 9.25 min</div>
              <div style={{ marginTop: 8, color: "#ef4444", fontWeight: 700 }}>
                d_yellow=8m, d_red=15m → YELLOW state
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "surge" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <div style={{ padding: "16px 20px", background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 12 }}>
            <div style={{ fontSize: "0.6rem", color: CYAN, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Formula</div>
            <div style={{ fontSize: "0.95rem", color: "#e2e8f0", lineHeight: 2.4, marginBottom: 12 }}>
              <div>surge fee = base fee × multiplier</div>
              <div>expert bonus = surge fee × bonus rate</div>
              <div>platform margin = surge fee − bonus</div>
            </div>
            <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(6,182,212,0.06)", borderRadius: 8 }}>
              <div style={{ fontSize: "0.72rem", color: CYAN, marginBottom: 4 }}>Self-financing condition</div>
              <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>
                {"surge_fee - expert_bonus > 0 always"}
              </div>
              <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>
                platform absorbs zero cost of any Red event
              </div>
            </div>
          </div>
          <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
            <div style={{ fontSize: "0.6rem", color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Worked example: Red event, 20 sessions</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.79rem", color: "#64748b", lineHeight: 1.9 }}>
              <div>base_fee = $8/session</div>
              <div>Red multiplier = 2.0x</div>
              <div>bonus_rate = 0.90 (90% of surge to expert)</div>
              <div style={{ color: "#94a3b8", marginTop: 4 }}>surge_fee = $8 x 2.0 x 20 = $320</div>
              <div style={{ color: "#94a3b8" }}>expert_bonus = $320 x 0.90 = $288</div>
              <div style={{ marginTop: 8, color: "#22c55e", fontWeight: 700 }}>
                platform margin = $320 - $288 = $32 net gain
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── DemandTimelineChart ────────────────────────────────────────────────────────
const TIMELINE_FULL: [number, number, number, string, string][] = [
  [0,  22,  2,  'green',  'Platform idle. Healthy supply-demand ratio, no action needed.'],
  [5,  25,  3,  'green',  'Light evening traffic. Barometer reads green across all categories.'],
  [10, 28,  3,  'green',  'Steady climb. Queue depth nominal. No intervention required.'],
  [15, 30,  4,  'green',  'Traffic growing. Health engine monitoring, still within threshold.'],
  [20, 32,  4,  'green',  'Volume up 45% from baseline. Barometer still green, buffer intact.'],
  [25, 35,  5,  'green',  'First sustained uptick. Pre-surge monitoring window opens.'],
  [30, 38,  5,  'green',  'Continued growth. Health engine flags: "approaching yellow threshold."'],
  [35, 42,  7,  'green',  'Late green. Queue growing faster than visitors. Transition imminent.'],
  [38, 58, 12, 'yellow', 'Yellow threshold crossed. Soft incentive push sent to online experts.'],
  [40, 74, 16, 'yellow', 'Queue depth: 16. Second soft push. Acceptance rate tracking at 34%.'],
  [42, 95, 22,  'red',   'Red state triggered. Surge pricing active. Expert bonuses: +$4 per session.'],
  [44,112, 28,  'red',   'Peak: 112 concurrent visitors. Queue depth 28. Surge multiplier: 1.8×.'],
  [46,108, 25,  'red',   'Plateau. Surge is self-financing: added session revenue covers bonus cost.'],
  [48, 91, 18, 'yellow', 'Supply responding. Queue falling. Surge multiplier steps down to 1.4×.'],
  [50, 70, 11, 'yellow', 'Recovery underway. Incentive tier drops. Yellow push suspended.'],
  [52, 55,  6, 'green',  'Auto-stop fires. Surge halted. Queue cleared below threshold.'],
  [55, 44,  4, 'green',  'Normalising. Health engine returns green. No further action.'],
  [58, 36,  3, 'green',  'Late-evening decay. All experts available. Platform operating at rest.'],
  [60, 28,  2, 'green',  'End of spike window. Fully recovered. Zero manual intervention throughout.'],
]

const TIMELINE_ANNOTATIONS = [
  { minute: 38, label: 'Yellow threshold', color: '#f59e0b' },
  { minute: 42, label: 'Red, surge fires', color: '#ef4444' },
  { minute: 44, label: 'Peak demand', color: '#ef4444' },
  { minute: 52, label: 'Auto-stop', color: '#22c55e' },
]

function DemandTimelineChart() {
  const [activeIdx, setActiveIdx] = useState<number>(TIMELINE_FULL.length - 1)
  const [signal, setSignal] = useState<'visitors' | 'queue'>('visitors')
  const [visCount, setVisCount] = useState(TIMELINE_FULL.length)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    if (visCount >= TIMELINE_FULL.length) { setPlaying(false); return }
    const t = setTimeout(() => {
      setVisCount(c => c + 1)
      setActiveIdx(visCount)
    }, 160)
    return () => clearTimeout(t)
  }, [playing, visCount])

  const handlePlay = () => { setVisCount(1); setActiveIdx(0); setPlaying(true) }
  const handlePause = () => setPlaying(false)

  const data = TIMELINE_FULL.slice(0, visCount)
  const vals = data.map(d => signal === 'visitors' ? d[1] : d[2])
  const focused = TIMELINE_FULL[Math.min(activeIdx, data.length - 1)]

  const VB_W = 900, VB_H = 420
  const pad = { l: 58, r: 32, t: 52, b: 64 }
  const pW = VB_W - pad.l - pad.r
  const pH = VB_H - pad.t - pad.b
  const maxV = signal === 'visitors' ? 130 : 35
  const xS = (m: number) => (m / 60) * pW
  const yS = (v: number) => pH - Math.min(v / maxV, 1) * pH

  const stateColors: Record<string, string> = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' }
  const stateBg: Record<string, string> = {
    green: 'rgba(34,197,94,0.055)', yellow: 'rgba(245,158,11,0.10)', red: 'rgba(239,68,68,0.13)',
  }

  const regions = data.slice(0, -1).map((d, i) => ({
    x: xS(d[0]), w: xS(data[i + 1][0]) - xS(d[0]), state: d[3] as string,
  }))

  const ptStr = data.map((d, i) => `${pad.l + xS(d[0])},${pad.t + yS(vals[i])}`).join(' ')
  const areaPath = data.length > 1
    ? `M ${ptStr.replace(/ /g, ' L ')} L ${pad.l + xS(data[data.length - 1][0])},${pad.t + pH} L ${pad.l + xS(data[0][0])},${pad.t + pH} Z`
    : ''

  const cursorX = pad.l + xS(focused[0])
  const cursorY = pad.t + yS(signal === 'visitors' ? focused[1] : focused[2])
  const stateColor = stateColors[focused[3] as string]

  return (
    <div style={{ marginTop: 36, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 32px' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Demand timeline · simulated evening spike (21:00 – 22:00)
          </div>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
            Background bands show barometer state in real time. Hover any data point, or hit Replay to watch the spike unfold from scratch.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['visitors', 'queue'] as const).map(s => (
              <button key={s} onClick={() => setSignal(s)} style={{
                padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                border: `1.5px solid ${signal === s ? CYAN : 'rgba(255,255,255,0.1)'}`,
                background: signal === s ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.02)',
                color: signal === s ? CYAN : '#64748b', transition: 'all 0.15s',
              }}>
                {s === 'visitors' ? 'Unique visitors' : 'Queue depth'}
              </button>
            ))}
          </div>
          <button
            onClick={playing ? handlePause : handlePlay}
            style={{
              padding: '6px 16px', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
              border: `1.5px solid ${CYAN}`, background: 'rgba(6,182,212,0.1)', color: CYAN,
              transition: 'opacity 0.15s',
            }}>
            {playing ? '⏸ Pause' : '▶ Replay'}
          </button>
        </div>
      </div>

      {/* Main SVG chart */}
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" style={{ overflow: 'visible', display: 'block', cursor: 'crosshair', maxWidth: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="tlGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.22" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* State bands */}
        {regions.map((r, i) => (
          <rect key={i} x={pad.l + r.x} y={pad.t} width={r.w} height={pH} fill={stateBg[r.state]} />
        ))}

        {/* Grid lines */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
          <line key={t} x1={pad.l} y1={pad.t + t * pH} x2={pad.l + pW} y2={pad.t + t * pH}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* Axes */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + pH} stroke="#334155" strokeWidth="1.5" />
        <line x1={pad.l} y1={pad.t + pH} x2={pad.l + pW} y2={pad.t + pH} stroke="#334155" strokeWidth="1.5" />

        {/* Annotation markers */}
        {TIMELINE_ANNOTATIONS.map(a => {
          const ax = pad.l + xS(a.minute)
          const shown = data.some(d => d[0] >= a.minute)
          if (!shown) return null
          return (
            <g key={a.minute}>
              <line x1={ax} y1={pad.t} x2={ax} y2={pad.t + pH} stroke={a.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
              <text x={ax} y={pad.t - 8} textAnchor="middle" fill={a.color} fontSize="9.5" fontWeight="700" opacity="0.85">{a.label}</text>
            </g>
          )
        })}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#tlGrad2)" />}

        {/* Line */}
        {data.length > 1 && (
          <polyline points={ptStr} fill="none" stroke={CYAN} strokeWidth="3"
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Data points */}
        {data.map((d, i) => {
          const cx = pad.l + xS(d[0])
          const cy = pad.t + yS(signal === 'visitors' ? d[1] : d[2])
          const isActive = activeIdx === i
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={18} fill="transparent" style={{ cursor: 'pointer' }}
                onMouseEnter={() => setActiveIdx(i)} />
              <circle cx={cx} cy={cy} r={isActive ? 9 : 4.5}
                fill={stateColors[d[3] as string]} stroke="#0a0a0f" strokeWidth="2.5"
                filter={isActive ? 'url(#glow)' : undefined}
                style={{ transition: 'r 0.15s', pointerEvents: 'none' }} />
            </g>
          )
        })}

        {/* Active cursor line */}
        {data.length > 0 && (
          <line x1={cursorX} y1={pad.t} x2={cursorX} y2={pad.t + pH}
            stroke={stateColor} strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7"
            style={{ pointerEvents: 'none' }} />
        )}

        {/* State labels */}
        <text x={pad.l + xS(18)} y={pad.t + 20} textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="700" opacity="0.65">GREEN</text>
        <text x={pad.l + xS(39)} y={pad.t + 20} textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700" opacity="0.9">YELLOW</text>
        <text x={pad.l + xS(43)} y={pad.t + 36} textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="800">RED</text>
        <text x={pad.l + xS(56)} y={pad.t + 20} textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="700" opacity="0.65">GREEN</text>

        {/* X axis labels */}
        {[0, 10, 20, 30, 38, 42, 50, 60].map(m => (
          <text key={m} x={pad.l + xS(m)} y={pad.t + pH + 22} textAnchor="middle" fill="#475569" fontSize="10.5">
            {`21:${String(m).padStart(2, '0')}`}
          </text>
        ))}

        {/* Y axis labels */}
        {(signal === 'visitors' ? [0,25,50,75,100,125] : [0,10,20,30]).map(v => (
          <text key={v} x={pad.l - 10} y={pad.t + yS(v) + 4} textAnchor="end" fill="#475569" fontSize="10.5">{v}</text>
        ))}

        {/* Y axis title */}
        <text x={18} y={pad.t + pH / 2} textAnchor="middle" fill="#475569" fontSize="11"
          transform={`rotate(-90,18,${pad.t + pH / 2})`}>
          {signal === 'visitors' ? 'Unique visitors' : 'Queue depth'}
        </text>
      </svg>

      {/* Scrubber */}
      <div style={{ marginTop: 16, padding: '0 4px' }}>
        <input
          type="range" min={0} max={TIMELINE_FULL.length - 1} value={Math.min(activeIdx, data.length - 1)}
          onChange={e => {
            const i = Number(e.target.value)
            if (i < data.length) setActiveIdx(i)
          }}
          style={{ width: '100%', accentColor: CYAN, cursor: 'pointer', height: 4 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#475569', marginTop: 4 }}>
          <span>21:00</span><span>21:15</span><span>21:30</span><span>21:45</span><span>22:00</span>
        </div>
      </div>

      {/* Focused moment panel */}
      <div style={{
        marginTop: 20, padding: '18px 22px', borderRadius: 12,
        background: `${stateColor}0c`,
        border: `1px solid ${stateColor}30`,
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{
            padding: '3px 10px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 800,
            background: `${stateColor}20`, color: stateColor, letterSpacing: '0.06em',
          }}>
            {(focused[3] as string).toUpperCase()} STATE
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>
            21:{String(focused[0]).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 'auto' }}>
            {signal === 'visitors' ? `${focused[1]} concurrent visitors` : `${focused[2]} sessions queued`}
            {' · '}Queue depth: {focused[2]}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.83rem', color: '#94a3b8', lineHeight: 1.65 }}>
          {focused[4]}
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['green','#22c55e','Healthy, no action'],['yellow','#f59e0b','Yellow push sent'],['red','#ef4444','Surge active']].map(([s, color, label]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#64748b' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color as string }} />
            {label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#64748b' }}>
          <div style={{ width: 22, height: 2.5, background: CYAN, borderRadius: 1 }} />
          {signal === 'visitors' ? 'Unique visitors' : 'Queue depth'}
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <main style={{ fontFamily: 'var(--font-inter)', background: '#0a0a0f', minHeight: '100vh' }}>
      {/* companion project banner */}
      <div style={{ background: 'rgba(6,182,212,0.06)', borderBottom: '1px solid rgba(6,182,212,0.15)', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: '0.72rem', color: '#475569' }}>Part of a two-project system</span>
        <a href="https://rank-reward-retain.vercel.app" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '0.76rem', color: CYAN, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          Companion: Rank, Reward, Retain (supply intelligence) →
        </a>
      </div>
      <SectionNav />

      {/* ── Sticky nav ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', height: 60 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap' }}>Wahid Tawsif Ratul</span>
            <span className="hidden sm:inline" style={{ fontSize: '0.7rem', color: CYAN, whiteSpace: 'nowrap' }}>Data Scientist · Product Manager</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16, flexShrink: 0 }}>
            {[
              { label: 'Portfolio', href: 'https://wahid-ratul.vercel.app', path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
              { label: 'LinkedIn', href: 'https://linkedin.com/in/wahidratul112296', path: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.64h.05c.53-1 1.83-2.05 3.77-2.05C20.5 8.59 22 11 22 14.4V21h-4v-5.86c0-1.4-.03-3.2-1.95-3.2-1.95 0-2.25 1.52-2.25 3.1V21H9z' },
              { label: 'GitHub', href: 'https://github.com/ratul003', path: 'M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z' },
              { label: 'Medium', href: 'https://medium.com/@wahidtratul', path: 'M2.5 5.5l1.7 2v9.7l-2 2.3h5.4l-2-2.3V8.4l4.9 11.1h.1l4.3-10.5v8.2l-1.3 1.3v.2h6.4v-.2l-1.3-1.3V6.9l1.3-1.3v-.1h-4.5L13 13.9 9.3 5.5z' },
              { label: 'Email', href: 'mailto:wahidtratul@gmail.com', path: '' },
            ].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                style={{ color: '#64748b', display: 'inline-flex', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = CYAN)} onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
                {s.label === 'Email' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={s.path} /></svg>
                )}
              </a>
            ))}
          </div>
          <nav className="hidden md:flex" style={{ marginLeft: 'auto', gap: 28 }}>
            {[['Barometer', '#barometer'], ['Surge Pricing', '#surge'], ['AI Routing', '#routing'], ['Dashboard', '#dashboard'], ['Configuration', '#presets']].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: '0.82rem', color: '#64748b', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = CYAN)} onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>{l}</a>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', padding: '100px 32px 80px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, background: `radial-gradient(ellipse, ${CYAN}14 0%, transparent 68%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${CYAN}12`, border: `1px solid ${CYAN}30`, borderRadius: 20, padding: '6px 14px', marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ fontSize: '0.75rem', color: CYAN, letterSpacing: '0.05em' }}>Expert Marketplace · Live Operations</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.12, marginBottom: 28, letterSpacing: '-0.02em' }}>
            When Demand Exceeds Supply<br />
            <span style={{ color: CYAN }}>in an Online Marketplace</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.8, maxWidth: 700, marginBottom: 40 }}>
            I built the live operations framework for a two-sided expert marketplace from the ground up. When demand spikes and supply can&apos;t keep pace, customers queue, experts miss the signal, and the platform absorbs the cost in silence. I designed a system that detects the imbalance in real time, responds with tiered incentives that pay for themselves through surge pricing, and routes every session intelligently based on complexity and expert quality. Five modules. One automated loop. No engineering team when I started.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[['3M+', 'App downloads'], ['300+', 'Vetted experts · 30% acceptance'], ['5', 'Core modules'], ['Self-financing', 'Surge model'], ['4', 'Marketplace presets']].map(([v, l]) => (
              <div key={l} style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}28`, borderRadius: 8, padding: '8px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: CYAN, fontSize: '0.9rem' }}>{v}</span>
                <span style={{ color: '#475569', fontSize: '0.8rem' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Win Showcase ── */}
      <section style={{ padding: '0 32px 80px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          {WIN_METRICS.map((m, i) => (
            <div key={i} style={{ background: '#0a0a0f', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
              <AnimatedMetric raw={m.raw} label={m.label} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Story framing + Pipeline ── */}
      <section style={{ padding: '0 32px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid #06b6d4', borderRadius: '0 12px 12px 0', padding: '20px 24px', marginBottom: 40, maxWidth: 720 }}>
            <div style={{ fontSize: '0.7rem', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>What I was actually trying to solve</div>
            <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>
              The marketplace had no mechanism for what happens when 50 customers arrive at 11pm and 3 experts are available. The queue would grow, customers would leave, experts would never know demand was there, and the platform would absorb all the cost of that mismatch - in lost revenue, in dropout, in trust. I needed a system that detected the imbalance early, responded automatically, and paid for itself.
            </p>
          </div>
          <PipelineFlow />
        </div>
      </section>

      {/* ── Story Arc ── */}
      <section style={{ padding: '0 32px 80px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          {STORY_CHAPTERS.map((ch, i) => (
            <a key={ch.id} href={`#${ch.id}`} style={{ textDecoration: 'none', display: 'block', padding: '20px 22px', background: '#0a0a0f', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : undefined, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = `${CYAN}06`)} onMouseLeave={e => (e.currentTarget.style.background = '#0a0a0f')}>
              <div style={{ fontSize: '0.68rem', color: CYAN, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>Ch{ch.num}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2e8f0' }}>{ch.label}</div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Ch01: The Problem ── */}
      <section id="problem" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${CYAN}10`, border: `1px solid ${CYAN}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: CYAN, fontWeight: 700, letterSpacing: '0.1em' }}>CH01</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>THE PROBLEM</span>
          </div>

          {/* Narrative story block */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 36px', marginBottom: 40, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: `linear-gradient(${CYAN}, #8b5cf6)` }} />
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>11:08pm · Your platform · Any night</div>
            <p style={{ fontSize: '1.05rem', color: '#e2e8f0', lineHeight: 1.8, marginBottom: 16, fontStyle: 'italic' }}>
              You have 47 open session requests. You have 3 experts online, all in active calls. Queue depth: 44.
            </p>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.8, marginBottom: 16 }}>
              On the other side of the platform, 12 experts are offline. They don&apos;t know any of this is happening. No notification fired. No one pinged them. Your ops team won&apos;t see the dropout spike until tomorrow&apos;s report, by then, those 44 customers are gone.
            </p>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.8, margin: 0 }}>
              No alert. No automatic response. No surge to signal value. No incentive to pull supply back online. Just a quiet platform hemorrhaging demand while experts sleep, unaware.
            </p>
          </div>

          <QueuePressureSimulator />

          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, marginTop: 52, letterSpacing: '-0.01em' }}>This isn&apos;t a technology problem. It&apos;s a coordination problem.</h2>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.75, maxWidth: 720, marginBottom: 40 }}>
            Every two-sided marketplace hits this wall eventually. The gap between demand spiking and supply responding is where revenue disappears. The platforms that solved it, Uber, DoorDash, Instacart, spent years and tens of millions building proprietary systems to close it. Nobody open-sourced any of it.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { icon: '◎', color: '#ef4444', title: 'Flying blind', body: 'No real-time demand signal means ops teams discover shortfalls after they&apos;ve peaked. By the time anyone reacts, the dropout wave has crested and receded.' },
              { icon: '⟲', color: '#f59e0b', title: 'Manual at scale', body: 'Slack pings, spreadsheet checks, phone calls. Manual ops can&apos;t operate at the speed of a live platform. Every minute of lag costs sessions.' },
              { icon: '⬜', color: CYAN, title: 'No open-source tooling', body: 'Uber, DoorDash, and Instacart built this ops intelligence layer, deeply embedded, never extractable. No marketplace founder starting today has a reusable starting point.' },
            ].map(c => (
              <div key={c.title} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}20`, borderRadius: 14, padding: '22px' }}>
                <div style={{ fontSize: '1.5rem', color: c.color, marginBottom: 14 }}>{c.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 10 }}>{c.title}</h3>
                <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }} dangerouslySetInnerHTML={{ __html: c.body }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industry Context ── */}
      <section id="industry" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          {/* ── Part 1: Logistics giants ── */}
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>What the gig economy figured out first</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 720, marginBottom: 36 }}>
            Uber, DoorDash, Instacart, and Zocdoc each built sophisticated supply-demand intelligence systems, millions in engineering, years of iteration, fully proprietary. The mechanics are documented. The tooling is not yours. But the principles matter: treat pricing, incentives, and supply outreach as one joint optimisation, not three independent triggers.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 48 }}>
            {INDUSTRY_BENCHMARKS.map(b => (
              <div key={b.company} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: b.bg, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{b.company[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem' }}>{b.company}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{b.category}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>What they built</div>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.62 }}>{b.what}</p>
                </div>
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.68rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Why it&apos;s not yours</div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>{b.gap}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Part 2: The elasticity gap ── */}
          <div style={{ marginBottom: 56, padding: '28px 30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 36, borderRadius: 2, background: `linear-gradient(${CYAN}, #8b5cf6)`, flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9', margin: 0, marginBottom: 4 }}>But expert time doesn&apos;t surge like driver time</h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>The logistics playbook assumes elastic, interchangeable supply. Expert session marketplaces break every one of those assumptions.</p>
              </div>
            </div>
            {/* Comparison table */}
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.05)', fontWeight: 500, width: '22%' }}>Dimension</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.05)', fontWeight: 600, width: '39%' }}>Logistics gig (Uber / Instacart)</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', color: CYAN, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 600, width: '39%' }}>Expert sessions (Expert Marketplace / BetterHelp / Clarity)</th>
                  </tr>
                </thead>
                <tbody>
                  {ELASTICITY_ROWS.map((row, i) => (
                    <tr key={row.dimension} style={{ borderBottom: i < ELASTICITY_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', borderRight: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>{row.dimension}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.55, borderRight: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>{row.logistics}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.55, verticalAlign: 'top' }}>{row.expert}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.65, margin: '16px 0 0' }}>
              This is why you can&apos;t copy Uber&apos;s surge model for a wellness or coaching marketplace. The incentive tiers, the auto-stop, the category-specific thresholds, every design decision in Equilibrium exists because of these constraints.
            </p>
          </div>

          {/* ── Part 3: Closer analogs, what happened ── */}
          <h3 style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 10, letterSpacing: '-0.01em' }}>Platforms that look like this marketplace, and what happened to them</h3>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 720, marginBottom: 28 }}>
            BetterHelp, Chegg, and Clarity.fm are the real comparables: live expert sessions, pay-per-session or pay-per-minute, non-interchangeable supply. Each hit the same wall. Each responded differently.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 32 }}>
            {ANALOG_BENCHMARKS.map(b => (
              <div key={b.company} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: b.bg, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{b.company[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem' }}>{b.company}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{b.category}</div>
                    <div style={{ fontSize: '0.67rem', color: '#475569', marginTop: 2 }}>{b.scale}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>What happened</div>
                  <p style={{ fontSize: '0.79rem', color: '#94a3b8', lineHeight: 1.58 }}>{b.crisis}</p>
                </div>
                <div style={{ padding: '10px 14px', background: `${b.lessonColor}08`, border: `1px solid ${b.lessonColor}22`, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.68rem', color: b.lessonColor, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>The lesson</div>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>{b.lesson}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '22px 26px', background: `${CYAN}08`, border: `1px solid ${CYAN}22`, borderRadius: 14 }}>
            <div style={{ fontWeight: 600, color: CYAN, fontSize: '0.95rem', marginBottom: 8 }}>The pattern is consistent</div>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              Every expert session marketplace hits the same supply ceiling: you cannot surge-price your way to 2× therapists in 10 minutes. BetterHelp discovered this through an FTC complaint. Chegg discovered it through their P&L. Clarity.fm hasn&apos;t built around it yet. Equilibrium is the operational layer designed specifically for this constraint, not borrowed from logistics, but built for the session economy.
            </p>
          </div>
        </div>
      </section>

      {/* ── System Architecture ── */}
      <section id="architecture" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>Five modules. One system.</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 700, marginBottom: 36 }}>
            Each module can run standalone. Together, they form a closed loop: demand signals trigger health scoring, which fires surge pricing and expert incentives simultaneously, then pushes everything to the operator dashboard via WebSocket. Click any module to see what it ingests and outputs.
          </p>
          <PipelineArchitecture />
          {/* Data flow strip */}
          <div style={{ marginTop: 28, padding: '18px 22px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Event loop, end to end</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
              {[
                { label: 'Customer action', color: '#8b5cf6' }, { label: 'Signal ingested', color: '#8b5cf6' },
                { label: 'State recalculated', color: CYAN }, { label: 'Change detected?', color: CYAN },
                { label: 'Surge + incentive', color: '#f59e0b' }, { label: 'Dashboard push', color: '#22c55e' },
              ].map((node, i) => (
                <React.Fragment key={node.label}>
                  <div style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 8, background: `${node.color}10`, border: `1px solid ${node.color}25`, textAlign: 'center', minWidth: 110 }}>
                    <span style={{ fontSize: '0.72rem', color: node.color }}>{node.label}</span>
                  </div>
                  {i < 5 && <div style={{ color: '#1e293b', fontSize: '1rem', margin: '0 4px', flexShrink: 0 }}>→</div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Ch02: Barometer Engine ── */}
      <section id="barometer" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${CYAN}10`, border: `1px solid ${CYAN}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: CYAN, fontWeight: 700, letterSpacing: '0.1em' }}>CH02</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>THE INTELLIGENCE</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>The Barometer Engine</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 700, marginBottom: 40 }}>
            The central state machine. Monitors demand signals continuously, evaluates them against per-category thresholds, and outputs one of three states. Each state triggers a different set of actions on both sides of the platform, simultaneously, automatically, within seconds. Click each state to see exactly what fires.
          </p>
          <BarometerEngine />
          <ThresholdHeatmap />
          <SurgeMath />
          <DemandTimelineChart />
          <div style={{ marginTop: 28, padding: '18px 22px', background: `${CYAN}06`, border: `1px solid ${CYAN}18`, borderRadius: 12 }}>
            <div style={{ fontSize: '0.68rem', color: CYAN, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Why two trigger types</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
              Delay Time catches system-wide slowdowns. Dropout Rate catches category-specific pressure, a category can be underwater even when the platform overall looks healthy. I made both configurable per category because a 30-minute wait for astrology is tolerable; a 30-minute wait for mental health is a crisis.
            </p>
          </div>
        </div>
      </section>

      {/* ── Live Scenario Walkthrough ── */}
      <section style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>Watch it work: 11pm demand spike</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 700, marginBottom: 36 }}>
            Step through exactly what happens, timestamp by timestamp, from the moment demand outpaces supply to the moment the system recovers and shuts itself off.
          </p>
          <div style={{ background: 'rgba(6,182,212,0.04)', borderLeft: '3px solid #06b6d4', borderRadius: '0 10px 10px 0', padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: '0.68rem', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>How I verified the model worked</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              I built a replay simulator against a real platform evening log - 23:00 to 23:30 on a high-demand night. The barometer hit Red at minute 8, surge fired at minute 9, the first expert accepted at minute 11. Supply closed within 4 minutes of detection. That sequence became the acceptance test for the whole system.
            </p>
          </div>
          <LiveScenario />
        </div>
      </section>

      {/* ── Ch03: Surge Pricing ── */}
      <section id="surge" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${CYAN}10`, border: `1px solid ${CYAN}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: CYAN, fontWeight: 700, letterSpacing: '0.1em' }}>CH03</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>THE RESPONSE</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>Surge Pricing: the money that funds its own response</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 720, marginBottom: 36 }}>
            Surge fees collected from customers fund the expert bonuses on the supply side. The platform never carries the cost of a supply response. At any scale, any severity, the system pays for itself.
          </p>
          {/* Self-financing flow */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>How the money moves</div>
            <SelfFinancingFlow />
          </div>
          {/* Surge matrix */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Surge multiplier matrix, hover any cell</div>
            <SurgeMatrix />
          </div>
          {/* Surge impact, statistical visuals */}
          <SurgePricingImpact />
          <div style={{ padding: '18px 22px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>My design decision</div>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
              I designed this to be self-financing from day one, not as a constraint, but a survival condition. If it ever costs the platform money to run, operators will switch it off the moment they need it most. Funding the bonuses from the surge fees that caused them means the system is always affordable. Even during the worst spikes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Incentive Orchestration ── */}
      <section id="incentives" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>What lands on the expert&apos;s phone</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 700, marginBottom: 40 }}>
            The incentive engine fires within seconds of a state change. Two tiers, Yellow for early pressure, Red for critical shortfall. The copy is configurable, the channels are configurable, and the whole thing stops automatically when supply recovers. Select a state to preview the notification.
          </p>
          <NotificationMockup />
          <ExpertFunnel />
        </div>
      </section>

      {/* ── AI Escalation Router ── */}
      <section id="routing" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>AI or human? The routing decision</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 700, marginBottom: 40 }}>
            When supply is under pressure, you can&apos;t route every customer to a human expert, there aren&apos;t enough. The router decides which sessions go to the AI companion and which go to the expert queue, based on four signals: supply health, query complexity, customer tier, and category. One rule overrides all of them.
          </p>
          <div style={{ background: 'rgba(6,182,212,0.04)', borderLeft: '3px solid #06b6d4', borderRadius: '0 10px 10px 0', padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: '0.68rem', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>The rule I would not compromise on</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              Every routing decision in the system is probabilistic - NLP score, ERS rank, queue depth. Except one. Mental health sessions route to human experts, always, with no override. I documented this as a hard constraint, not a configuration option. The AI router cannot be configured to handle mental health regardless of load.
            </p>
          </div>
          <RoutingMatrix />
          <SessionDistribution />
          {/* AI companion connection */}
          <div style={{ marginTop: 24, padding: '20px 24px', background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.22)', borderRadius: 12 }}>
            <div style={{ fontWeight: 600, color: '#ec4899', fontSize: '0.9rem', marginBottom: 8 }}>This logic shaped how the AI routing layer was designed</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
              The platform&apos;s AI-powered agent, trained on 3 million minutes of real expert conversations, uses a version of this routing architecture to decide when it can handle a session and when it surfaces a human expert instead. The Expert Readiness Score (built in <a href="https://rank-reward-retain.vercel.app" style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: 600 }}>Rank, Reward, Retain</a>) feeds into the routing layer: top-scoring experts are reserved for the highest-urgency escalations, keeping AI-routed sessions from degrading CSAT.
            </p>
          </div>
        </div>
      </section>

      {/* ── Ch04: Operator Dashboard ── */}
      <section id="dashboard" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${CYAN}10`, border: `1px solid ${CYAN}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: CYAN, fontWeight: 700, letterSpacing: '0.1em' }}>CH04</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>THE PROOF</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>What your ops team sees at 11pm</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 700, marginBottom: 36 }}>
            The operator dashboard is pushed via WebSocket, no manual refresh, no lag. Three live panels (demand, matching, supply) plus five visualisations. Delivered first as a working Google Sheets dashboard (3 tabs), then as React components. The layout below shows the full panel structure.
          </p>
          <DashboardPreview />
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {[
              { label: 'Demand Panel', items: ['Unique visitors (live)', 'Active page views vs. repeat', 'Chat request count', 'Chatbot sentiment score (−1 to +1)', 'Regional + time-of-day split'], color: '#8b5cf6' },
              { label: 'Supply Panel', items: ['Expert utilization rate', 'Idle time', 'Actual vs planned hours', 'Expert assignee time', 'Fill rate'], color: '#22c55e' },
              { label: 'Matching Panel', items: ['Assigned / waiting / in session', 'Waiting cohorts: <30 / 30–60 / >60 min', 'Expert late rate', 'Fill rate', 'Per-category breakdown'], color: CYAN },
            ].map(panel => (
              <div key={panel.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px' }}>
                <div style={{ fontSize: '0.7rem', color: panel.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, fontWeight: 600 }}>{panel.label}</div>
                {panel.items.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: panel.color, flexShrink: 0, opacity: 0.5 }} />
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Configuration ── */}
      <section id="presets" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>One YAML file. Four starting points.</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 700, marginBottom: 36 }}>
            Every threshold, multiplier, incentive payload, routing rule, and notification template lives in a single YAML config. Four built-in presets cover the most common marketplace verticals. Select one to see how the config changes.
          </p>
          <ConfigPresets />
        </div>
      </section>

      {/* ── Outcomes ── */}
      <section id="outcomes" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12, letterSpacing: '-0.01em' }}>The platform: what happened after</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 720, marginBottom: 40 }}>
            I designed this system before the marketplace had the engineering team to build it. The barometer thresholds, the self-financing surge mechanic, the incentive notification copy, the AI escalation logic, all designed first, then built. Here&apos;s what the platform became.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { stat: '3M+', label: 'App downloads', desc: 'Astrology, mental health, reproductive health, financial coaching, relationship coaching, India, MENA, and global diaspora markets. The platform the ops layer was built to serve.', color: CYAN },
              { stat: '300+', label: 'Vetted experts · 30% acceptance rate', desc: 'Rigorous category-specific KYC and credential verification. Only 3 in 10 applicants accepted. The incentive system I designed had to work for a constrained, high-quality supply pool.', color: '#22c55e' },
              { stat: 'AI-powered agent', label: 'trained on 3M+ minutes of real expert conversations', desc: 'Belief-adaptive. Multilingual (Hindi, Punjabi, Gujarati, Tamil, Telugu). Handles the first layer of every session; escalates to human when complexity or sensitivity warrants it.', color: '#ec4899' },
              { stat: '$4-5/min', label: 'Pay-per-minute · Pay Only When Happy', desc: '"Pay Only When Happy" removes demand-side risk for new users. The surge and incentive model I designed had to work within a pricing structure where customers could walk away if dissatisfied.', color: '#f59e0b' },
            ].map(o => (
              <div key={o.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${o.color}20`, borderRadius: 14, padding: '22px' }}>
                <div style={{ fontSize: '1.7rem', fontWeight: 800, color: o.color, marginBottom: 6 }}>{o.stat}</div>
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem', marginBottom: 10 }}>{o.label}</div>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{o.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: '24px 28px', background: `${CYAN}06`, border: `1px solid ${CYAN}18`, borderRadius: 14 }}>
            <div style={{ fontSize: '0.68rem', color: CYAN, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Why open-source</div>
            <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.75, margin: 0 }}>
              The design work took months. Getting the threshold values right, calibrating the incentive ladder, figuring out the self-financing mechanic so it could never become a cost centre, none of that is obvious the first time. No marketplace founder building in telehealth, tutoring, or expert services today should have to re-derive all of it from first principles. Equilibrium is the foundation I wish had existed when I was building it for the platform.
            </p>
          </div>
          <P5ProjectBridge />
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section id="stack" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 36, letterSpacing: '-0.01em' }}>Tech Stack</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
            {STACK_TOOLS.map(tool => (
              <div key={tool.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${tool.color}40`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                <div style={{ width: 28, height: 28 }} dangerouslySetInnerHTML={{ __html: tool.svg }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>{tool.name}</div>
                  <div style={{ fontSize: '0.7rem', color: tool.color, marginTop: 2 }}>{tool.category}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {[
              { label: 'Segment-compatible ingestion', desc: 'Drop-in if the platform already uses Segment. No custom event collector required.' },
              { label: 'Webhook-native orchestration', desc: 'Incentive and surge events fire as webhooks, plug in any notification service you already run.' },
              { label: 'YAML-first configuration', desc: 'All thresholds, matrices, routing rules, and templates in one file. No code changes for new presets.' },
            ].map(p => (
              <div key={p.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '16px' }}>
                <div style={{ fontWeight: 600, color: CYAN, fontSize: '0.82rem', marginBottom: 6 }}>{p.label}</div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '40px 32px 56px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 5 }}>Wahid Tawsif Ratul</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>© 2026 · Data Scientist · Product Manager</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {[
              { label: 'Portfolio', href: 'https://wahid-ratul.vercel.app', path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
              { label: 'LinkedIn', href: 'https://linkedin.com/in/wahidratul112296', path: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.64h.05c.53-1 1.83-2.05 3.77-2.05C20.5 8.59 22 11 22 14.4V21h-4v-5.86c0-1.4-.03-3.2-1.95-3.2-1.95 0-2.25 1.52-2.25 3.1V21H9z' },
              { label: 'GitHub', href: 'https://github.com/ratul003', path: 'M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z' },
              { label: 'Medium', href: 'https://medium.com/@wahidtratul', path: 'M2.5 5.5l1.7 2v9.7l-2 2.3h5.4l-2-2.3V8.4l4.9 11.1h.1l4.3-10.5v8.2l-1.3 1.3v.2h6.4v-.2l-1.3-1.3V6.9l1.3-1.3v-.1h-4.5L13 13.9 9.3 5.5z' },
              { label: 'Email', href: 'mailto:wahidtratul@gmail.com', path: '' },
            ].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} style={{ color: '#64748b', display: 'inline-flex' }}>
                {s.label === 'Email' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={s.path} /></svg>
                )}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  )
}
