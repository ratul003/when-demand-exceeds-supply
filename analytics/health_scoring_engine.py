"""
health_scoring_engine.py

Barometer state machine for the Equilibrium demand-supply intelligence engine.
Evaluates per-category demand signals against configurable thresholds and
outputs Green / Yellow / Red platform health state.

Usage:
    python analytics/health_scoring_engine.py
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import numpy as np


# ── Types ──────────────────────────────────────────────────────────────────────

class BarometerState(Enum):
    GREEN  = "green"
    YELLOW = "yellow"
    RED    = "red"


@dataclass
class CategoryThresholds:
    name: str
    delay_yellow: float = 30.0   # minutes
    delay_red: float    = 60.0
    dropout_yellow: float = 5.0  # percent
    dropout_red: float    = 10.0


@dataclass
class DemandSignal:
    category: str
    delay_time_min: float        # current median delay to expert assignment
    dropout_rate_pct: float      # % of visitors leaving due to unavailability
    queue_depth: int             # open session requests with no assigned expert
    sentiment_score: float       # chatbot willingness-to-wait (-1 to +1)
    timestamp_min: float = 0.0   # minutes from simulation start


@dataclass
class HealthScore:
    state: BarometerState
    active_trigger: str          # "delay_time" | "dropout_rate" | "none"
    delay_time_min: float
    dropout_rate_pct: float
    category: str
    timestamp_min: float = 0.0


# ── Default category configs (wellness preset) ────────────────────────────────

WELLNESS_CATEGORIES: list[CategoryThresholds] = [
    CategoryThresholds("astrology",          delay_yellow=30, delay_red=60, dropout_yellow=5,  dropout_red=10),
    CategoryThresholds("mental_health",      delay_yellow=20, delay_red=40, dropout_yellow=3,  dropout_red=7),
    CategoryThresholds("relationship",       delay_yellow=30, delay_red=60, dropout_yellow=5,  dropout_red=10),
    CategoryThresholds("financial_coaching", delay_yellow=35, delay_red=70, dropout_yellow=6,  dropout_red=12),
    CategoryThresholds("reproductive",       delay_yellow=25, delay_red=50, dropout_yellow=4,  dropout_red=8),
]

TELEHEALTH_CATEGORIES: list[CategoryThresholds] = [
    CategoryThresholds("primary_care",   delay_yellow=15, delay_red=30, dropout_yellow=3, dropout_red=7),
    CategoryThresholds("urgent_care",    delay_yellow=10, delay_red=20, dropout_yellow=2, dropout_red=5),
    CategoryThresholds("mental_health",  delay_yellow=20, delay_red=35, dropout_yellow=3, dropout_red=6),
    CategoryThresholds("specialist",     delay_yellow=20, delay_red=40, dropout_yellow=4, dropout_red=8),
]

TUTORING_CATEGORIES: list[CategoryThresholds] = [
    CategoryThresholds("mathematics",  delay_yellow=45, delay_red=90, dropout_yellow=8,  dropout_red=15),
    CategoryThresholds("sciences",     delay_yellow=45, delay_red=90, dropout_yellow=8,  dropout_red=15),
    CategoryThresholds("languages",    delay_yellow=50, delay_red=100, dropout_yellow=9, dropout_red=18),
    CategoryThresholds("test_prep",    delay_yellow=40, delay_red=80, dropout_yellow=7,  dropout_red=14),
]


# ── Health Scoring Engine ─────────────────────────────────────────────────────

class HealthScoringEngine:
    """
    Evaluates demand signals against per-category thresholds and returns
    barometer state. Either trigger (delay_time OR dropout_rate) alone
    can flip the state — whichever is more severe wins.
    """

    def __init__(self, categories: list[CategoryThresholds]):
        self.thresholds = {c.name: c for c in categories}

    def score(self, signal: DemandSignal) -> HealthScore:
        cfg = self.thresholds.get(signal.category)
        if cfg is None:
            raise ValueError(f"Unknown category: {signal.category}")

        delay_state  = self._evaluate_delay(signal.delay_time_min, cfg)
        dropout_state = self._evaluate_dropout(signal.dropout_rate_pct, cfg)

        # Most severe state wins
        severity = {BarometerState.GREEN: 0, BarometerState.YELLOW: 1, BarometerState.RED: 2}
        if severity[delay_state] >= severity[dropout_state]:
            final_state  = delay_state
            active_trigger = "delay_time" if delay_state != BarometerState.GREEN else "none"
        else:
            final_state  = dropout_state
            active_trigger = "dropout_rate"

        return HealthScore(
            state=final_state,
            active_trigger=active_trigger,
            delay_time_min=signal.delay_time_min,
            dropout_rate_pct=signal.dropout_rate_pct,
            category=signal.category,
            timestamp_min=signal.timestamp_min,
        )

    def _evaluate_delay(self, delay: float, cfg: CategoryThresholds) -> BarometerState:
        if delay >= cfg.delay_red:
            return BarometerState.RED
        if delay >= cfg.delay_yellow:
            return BarometerState.YELLOW
        return BarometerState.GREEN

    def _evaluate_dropout(self, dropout: float, cfg: CategoryThresholds) -> BarometerState:
        if dropout >= cfg.dropout_red:
            return BarometerState.RED
        if dropout >= cfg.dropout_yellow:
            return BarometerState.YELLOW
        return BarometerState.GREEN


# ── Sentiment-calibrated threshold adjustment ─────────────────────────────────

def adjust_thresholds_by_sentiment(
    base: CategoryThresholds,
    sentiment_history: list[float],
    tightening_factor: float = 0.85,
) -> CategoryThresholds:
    """
    Categories where customers tolerate shorter waits (lower sentiment at
    equivalent delays) get tighter thresholds over time.

    sentiment_history: list of sentiment scores (-1 to +1) observed at the
    delay_yellow threshold. If mean sentiment < 0.1, thresholds tighten.
    """
    if not sentiment_history:
        return base

    mean_sentiment = np.mean(sentiment_history)

    if mean_sentiment < 0.1:
        return CategoryThresholds(
            name=base.name,
            delay_yellow=base.delay_yellow * tightening_factor,
            delay_red=base.delay_red * tightening_factor,
            dropout_yellow=base.dropout_yellow * tightening_factor,
            dropout_red=base.dropout_red * tightening_factor,
        )
    return base


# ── Demo ─────────────────────────────────────────────────────────────────────

def main() -> None:
    engine = HealthScoringEngine(WELLNESS_CATEGORIES)

    test_signals = [
        DemandSignal("astrology",          delay_time_min=18,  dropout_rate_pct=3.2,  queue_depth=4,  sentiment_score=0.4,  timestamp_min=0),
        DemandSignal("astrology",          delay_time_min=34,  dropout_rate_pct=6.1,  queue_depth=12, sentiment_score=0.1,  timestamp_min=8),
        DemandSignal("astrology",          delay_time_min=67,  dropout_rate_pct=11.4, queue_depth=31, sentiment_score=-0.3, timestamp_min=14),
        DemandSignal("mental_health",      delay_time_min=22,  dropout_rate_pct=4.0,  queue_depth=6,  sentiment_score=0.2,  timestamp_min=8),
        DemandSignal("mental_health",      delay_time_min=42,  dropout_rate_pct=8.1,  queue_depth=18, sentiment_score=-0.4, timestamp_min=14),
        DemandSignal("financial_coaching", delay_time_min=28,  dropout_rate_pct=4.5,  queue_depth=3,  sentiment_score=0.5,  timestamp_min=8),
    ]

    state_icons = {BarometerState.GREEN: "🟢", BarometerState.YELLOW: "🟡", BarometerState.RED: "🔴"}

    print("Health Scoring Engine — Wellness Preset\n")
    print(f"{'Category':<22} {'T+min':>5}  {'Delay':>6}  {'Dropout':>7}  {'State':<8}  Trigger")
    print("-" * 72)

    for sig in test_signals:
        result = engine.score(sig)
        icon = state_icons[result.state]
        print(
            f"{sig.category:<22} {sig.timestamp_min:>5.0f}  "
            f"{sig.delay_time_min:>5.0f}m  {sig.dropout_rate_pct:>6.1f}%  "
            f"{icon} {result.state.value:<6}  {result.active_trigger}"
        )

    print("\n— Sentiment calibration example —")
    base = WELLNESS_CATEGORIES[0]  # astrology
    history_negative = [-0.3, -0.2, -0.1, 0.0, -0.4]
    adjusted = adjust_thresholds_by_sentiment(base, history_negative)
    print(f"Astrology base thresholds:     Yellow={base.delay_yellow}m / Red={base.delay_red}m")
    print(f"After negative sentiment:      Yellow={adjusted.delay_yellow:.1f}m / Red={adjusted.delay_red:.1f}m")
    print(f"Effect: thresholds tightened by {(1 - 0.85)*100:.0f}% — engine fires sooner")


if __name__ == "__main__":
    main()
