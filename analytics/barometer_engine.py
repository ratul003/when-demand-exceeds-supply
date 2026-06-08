"""
barometer_engine.py

Real-time demand-supply health engine for Coto marketplace.
Models the Green/Yellow/Red barometer: five demand signals evaluated
against per-category thresholds determine the supply-side response tier.

Usage:
    python analytics/barometer_engine.py
    python analytics/barometer_engine.py --category mental_health --simulate
    python analytics/barometer_engine.py --simulate --duration 60 --category astrology
"""
from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass
from enum import Enum


class BarometerState(Enum):
    GREEN  = "green"
    YELLOW = "yellow"
    RED    = "red"


@dataclass
class DemandSignals:
    unique_visitors: int
    active_views: int
    chat_volume: int
    sentiment_score: float   # -1.0 frustrated to +1.0 willing to wait
    queue_depth: int


@dataclass
class CategoryThresholds:
    category: str
    delay_yellow: float
    delay_red: float
    dropout_yellow: float
    dropout_red: float


CATEGORY_THRESHOLDS: dict[str, CategoryThresholds] = {
    "astrology":          CategoryThresholds("astrology",          8.0,  15.0, 0.12, 0.25),
    "mental_health":      CategoryThresholds("mental_health",      5.0,  10.0, 0.08, 0.18),
    "relationship":       CategoryThresholds("relationship",       10.0, 18.0, 0.15, 0.30),
    "financial_coaching": CategoryThresholds("financial_coaching", 7.0,  12.0, 0.10, 0.22),
    "reproductive":       CategoryThresholds("reproductive",       6.0,  11.0, 0.09, 0.20),
}


@dataclass
class BarometerReading:
    state: BarometerState
    delay_minutes: float
    dropout_rate: float
    trigger: str
    signals: DemandSignals


class HealthEngine:
    def __init__(self, category: str):
        if category not in CATEGORY_THRESHOLDS:
            raise ValueError(f"Unknown category '{category}'. Choose from {list(CATEGORY_THRESHOLDS)}")
        self.thresholds = CATEGORY_THRESHOLDS[category]

    def evaluate(self, signals: DemandSignals) -> BarometerReading:
        patience_factor = 1.0 - (max(-1.0, min(1.0, signals.sentiment_score)) + 1.0) / 4.0
        delay = (signals.queue_depth / max(1, signals.active_views)) * 10 * (1 + patience_factor)

        dropout_rate = (
            max(0.0, 1 - signals.chat_volume / signals.active_views)
            if signals.active_views > 0 else 0.0
        )

        t = self.thresholds
        s_map = {BarometerState.GREEN: 0, BarometerState.YELLOW: 1, BarometerState.RED: 2}

        delay_state   = BarometerState.RED if delay >= t.delay_red else (BarometerState.YELLOW if delay >= t.delay_yellow else BarometerState.GREEN)
        dropout_state = BarometerState.RED if dropout_rate >= t.dropout_red else (BarometerState.YELLOW if dropout_rate >= t.dropout_yellow else BarometerState.GREEN)

        if s_map[delay_state] >= s_map[dropout_state]:
            final_state, trigger = delay_state, "delay_time"
        else:
            final_state, trigger = dropout_state, "dropout_rate"

        return BarometerReading(
            state=final_state,
            delay_minutes=round(delay, 2),
            dropout_rate=round(dropout_rate, 3),
            trigger=trigger,
            signals=signals,
        )


def simulate_timeline(category: str, duration: int = 60, seed: int = 42) -> list[tuple[int, BarometerReading]]:
    rng = random.Random(seed)
    engine = HealthEngine(category)
    timeline = []
    for minute in range(duration):
        base_visitors = rng.randint(20, 40)
        base_queue    = rng.randint(2, 6)
        if 38 <= minute <= 48:
            spike = math.sin((minute - 38) / 10 * math.pi)
            base_visitors = int(base_visitors * (1 + 2.5 * spike))
            base_queue    = int(base_queue    * (1 + 3.0 * spike))
        signals = DemandSignals(
            unique_visitors=base_visitors,
            active_views=int(base_visitors * rng.uniform(0.6, 0.9)),
            chat_volume=int(base_visitors * rng.uniform(0.3, 0.7)),
            sentiment_score=rng.uniform(-0.6, 0.8) if minute < 38 or minute > 48 else rng.uniform(-0.8, 0.1),
            queue_depth=base_queue,
        )
        timeline.append((minute, engine.evaluate(signals)))
    return timeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Coto Barometer Health Engine")
    parser.add_argument("--category", choices=list(CATEGORY_THRESHOLDS), default="mental_health")
    parser.add_argument("--simulate", action="store_true")
    parser.add_argument("--duration", type=int, default=60)
    args = parser.parse_args()

    if args.simulate:
        print(f"\nBarometer Timeline -- {args.category} ({args.duration} min)\n")
        print(f"{'Min':>4}  {'State':<8}  {'Delay':>8}  {'Dropout':>9}  Trigger")
        print("-" * 52)
        prev_state = None
        counts: dict[str, int] = {}
        for minute, r in simulate_timeline(args.category, args.duration):
            counts[r.state.value] = counts.get(r.state.value, 0) + 1
            if r.state != prev_state:
                icon = {"green": "G", "yellow": "Y", "red": "R"}[r.state.value]
                print(f"{minute:>4}  [{icon}] {r.state.value:<6}  {r.delay_minutes:>7.1f}m  {r.dropout_rate:>8.1%}  {r.trigger}")
            prev_state = r.state
        print(f"\nDistribution: {', '.join(f'{k}={v}/{args.duration}' for k, v in counts.items())}")
    else:
        t = CATEGORY_THRESHOLDS[args.category]
        print(f"\nThresholds for {args.category}:")
        print(f"  Delay    Yellow={t.delay_yellow}m   Red={t.delay_red}m")
        print(f"  Dropout  Yellow={t.dropout_yellow:.0%}  Red={t.dropout_red:.0%}")


if __name__ == "__main__":
    main()
