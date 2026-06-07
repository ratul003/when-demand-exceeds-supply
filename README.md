# When Demand Exceeds Supply in an Online Marketplace

**Equilibrium** — an open-source real-time demand-supply intelligence engine for two-sided marketplaces.

Built from first principles for [Coto](https://coto.world) (Singapore, 2024) — a live expert marketplace across wellness, mental health, astrology, financial coaching, and relationship coaching. Coto went on to complete 3M+ consultations and ship Joy, an AI companion trained on real expert conversations. This is the operational intelligence layer that made that scale manageable, open-sourced so any marketplace operator can start from where I left off.

**Live:** [when-demand-exceeds-supply.vercel.app](https://when-demand-exceeds-supply.vercel.app)  
**Portfolio:** [Wahid Tawsif Ratul](https://github.com/ratul003)

---

## The Problem

Every two-sided marketplace eventually hits real-time supply shortfalls during demand spikes. At 11pm, 47 open session requests, 3 experts in active calls, 12 offline and unaware. No alert fires. No surge signals value. No incentive pulls supply back online. Ops discovers the dropout wave tomorrow morning.

Uber, DoorDash, and Instacart each built sophisticated solutions to this problem — millions in engineering, fully proprietary. No marketplace founder starting today has a reusable starting point. Equilibrium is that starting point.

---

## Five Modules

### 1. Health Scoring Engine
Configurable Green / Yellow / Red barometer. Monitors two independent trigger types:

- **Delay Time** — minutes from session request to expert assignment (thresholds: 30 / 60 min)
- **Dropout Rate** — % of active visitors leaving due to unavailability (thresholds: 5% / 10%)

Per-category thresholds: a 30-minute wait for astrology is tolerable; 30 minutes for mental health is a crisis.

### 2. Surge Pricing Calculator
Category × delay time → surge multiplier matrix. Key design principle: **self-financing**. Surge fees collected from customers are ring-fenced to fund the expert bonuses on the supply side. The platform never carries the cost of a supply response at any scale.

### 3. Incentive Orchestration Engine
Fires tiered notification payloads on state change:
- **Yellow**: push to active, scheduled, and offline experts — earnings framing, 1.5× rating multiplier, revenue share boost
- **Red**: in-app + push + SMS simultaneously — highest earnings tier, priority badge
- **Auto-stop**: pauses automatically when supply recovers. No manual intervention.

### 4. AI Escalation Router
Rules-based routing for every incoming session — AI companion or human expert. Four signals: supply health, NLP complexity (0–1), customer tier, category. Hard override rules for sensitive categories (mental health crisis: always human, no exceptions). Informed by Coto's Joy → Expert escalation architecture.

### 5. Operator Dashboard
WebSocket-pushed live panels: demand (unique visitors, chat requests, sentiment score), supply (utilisation, idle time, fill rate), matching (assigned / waiting / in session, cohort breakdown). Five visualisations: category demand heatmap, delay barometer, hourly D&S trend, sentiment chart, supply availability calendar.

---

## Architecture

```
[ Demand Signal Layer ]
  ↓ Unique visitors · active page views · chat requests · chatbot sentiment · queue depth
[ Health Scoring Engine ]  ←  configurable thresholds per category
  ↓ Barometer state: Green / Yellow / Red
[ Action Orchestration Layer ]
  ├── Supply side: Incentive Orchestration Engine → push notifications to experts
  ├── Demand side: Surge Pricing Calculator → adjusted fee shown to customer
  └── Routing: AI Escalation Router → AI companion vs. human expert
[ Operator Dashboard ]
  ↓ Heatmap · delay barometer · hourly trend · sentiment chart · availability calendar
```

**Event loop:** Customer action → signal ingested → state recalculated → if change: surge + incentive fires → dashboard pushed via WebSocket.

---

## Configuration

Everything lives in one YAML file:

```yaml
equilibrium:
  preset: coto_wellness  # or telehealth, tutoring, freelance, custom

  categories:
    - name: astrology
      delay_thresholds: { yellow: 30, red: 60 }
      dropout_thresholds: { yellow: 5, red: 10 }
      surge_matrix:
        - { delay_range: [0, 30],   multiplier: 0.05 }
        - { delay_range: [30, 45],  multiplier: 0.10 }
        - { delay_range: [45, 999], multiplier: 0.15 }

  incentive_tiers:
    yellow:
      channels: [in_app, push]
      template: "{{ waiting_count }} customers waiting. Complete {{ session_target }} sessions to earn {{ incentive_summary }}."
    red:
      channels: [in_app, push, sms]
      template: "High demand alert. {{ incentive_summary_lucrative }}"

  ai_escalation:
    enabled: true
    always_human_categories: [mental_health_crisis]
    complexity_threshold: 0.7

  webhooks:
    incentive_trigger: https://your-service/webhooks/incentive
    surge_update: https://your-service/webhooks/surge
```

### Built-in presets

| Preset | Vertical | Key difference |
|---|---|---|
| `coto_wellness` | Expert wellness (origin) | Sentiment-calibrated · mental health always human |
| `telehealth` | Healthcare | Stricter thresholds (15/30 min) · credential-weighted |
| `tutoring` | EdTech | Looser thresholds (45/90 min) · subject-specific incentives |
| `freelance` | Professional services | Response-time-weighted · no always-human categories |

---

## Analytics

The `analytics/` directory contains Python implementations of all four core models:

| Script | What it models |
|---|---|
| `health_scoring_engine.py` | Barometer state machine — delay time and dropout rate triggers, per-category thresholds |
| `surge_pricing_calculator.py` | Surge multiplier matrix, self-financing mechanics, platform cost simulation |
| `incentive_simulation.py` | Expert response modelling — notification → acceptance probability → supply recovery |
| `demand_supply_simulation.py` | Full platform simulation — demand spike, system response, recovery timeline |

Run any script directly:

```bash
pip install numpy pandas scipy
python analytics/demand_supply_simulation.py
```

---

## Tech Stack

- **Python** — Core engine logic (health scoring, surge calculator, incentive orchestration)
- **FastAPI** — API layer
- **React + TypeScript** — Operator dashboard
- **PostgreSQL** — State store
- **Redis** — Real-time cache
- **WebSockets** — Live dashboard push
- **Segment-compatible** — Drop-in event ingestion

---

## Related

**Project 6 — Rank, Reward, Retain:** The Expert Readiness Score (ERS) built for Coto feeds directly into Equilibrium's routing layer. Top-ERS experts are reserved for highest-urgency escalations. [→ github.com/ratul003/rank-reward-retain](https://github.com/ratul003/rank-reward-retain)

---

## Portfolio

- [Product Intelligence Platform](https://product-intelligence-platform.vercel.app) — warehouse-native analytics, Segment instrumentation, OA migration
- [Data Engineering Foundation](https://data-engineering-foundation.vercel.app) — Snowflake 3-layer architecture, dbt transformation suite
- [The Experiment Playbook](https://experimentation-science.vercel.app) — statistical framework, MVT interaction effects, causal inference
- [Systems Architecture](https://systems-architecture.vercel.app) — ADR: Mixpanel → OA migration, cloud migration evaluation

---

Written case study — all system design, thresholds, incentive logic, and architecture described from first-hand freelance work at Coto (Singapore, 2024). No internal proprietary data reproduced. Methodology and design are original and publishable.
