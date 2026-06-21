"""
incentive_simulation.py

Expert response simulation for the Equilibrium incentive orchestration engine.
Models the probability that an expert comes online in response to a Yellow or Red
state push notification, and simulates supply recovery timelines.

Usage:
    python analytics/incentive_simulation.py
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass
from enum import Enum
from typing import Optional


# ── Types ──────────────────────────────────────────────────────────────────────

class BarometerState(Enum):
    GREEN  = "green"
    YELLOW = "yellow"
    RED    = "red"

class ExpertStatus(Enum):
    ACTIVE    = "active"    # online, in a session
    SCHEDULED = "scheduled" # online, between sessions
    IDLE      = "idle"      # logged in, not working
    OFFLINE   = "offline"   # app closed


@dataclass
class Expert:
    id: str
    status: ExpertStatus
    response_rate_yellow: float  # historical acceptance rate for Yellow pushes (0–1)
    response_rate_red: float     # historical acceptance rate for Red pushes (0–1)
    response_lag_min: float      # minutes from push to going online
    sessions_per_hour: float     # throughput capacity once online
    category: str


@dataclass
class IncentiveTier:
    state: BarometerState
    channels: list[str]
    bonus_per_session: float
    rating_multiplier: float
    revenue_share_boost_pct: float
    auto_stop_on_recovery: bool = True


@dataclass
class IncentiveResponse:
    state: BarometerState
    experts_pinged: int
    experts_responded: int
    sessions_added_per_hour: float
    expected_recovery_min: float
    incentive_cost: float


# ── Default incentive tiers (wellness) ────────────────────────────────────────

YELLOW_TIER = IncentiveTier(
    state=BarometerState.YELLOW,
    channels=["in_app", "push"],
    bonus_per_session=80.0,
    rating_multiplier=1.5,
    revenue_share_boost_pct=10.0,
    auto_stop_on_recovery=True,
)

RED_TIER = IncentiveTier(
    state=BarometerState.RED,
    channels=["in_app", "push", "sms"],
    bonus_per_session=160.0,
    rating_multiplier=2.0,
    revenue_share_boost_pct=20.0,
    auto_stop_on_recovery=True,
)


# ── Incentive simulation engine ────────────────────────────────────────────────

class IncentiveSimulator:

    def __init__(self, experts: list[Expert], rng: Optional[np.random.Generator] = None):
        self.experts = experts
        self.rng = rng or np.random.default_rng(seed=42)

    def simulate_response(
        self,
        state: BarometerState,
        tier: IncentiveTier,
        demand_sessions_waiting: int,
    ) -> IncentiveResponse:
        """
        Simulate expert response to an incentive push.
        Returns response rate, supply added, recovery estimate, and incentive cost.
        """
        if state == BarometerState.GREEN:
            return IncentiveResponse(state, 0, 0, 0, 0, 0)

        pingable = [e for e in self.experts if e.status != ExpertStatus.ACTIVE]
        responded = []

        for expert in pingable:
            rate = (expert.response_rate_yellow if state == BarometerState.YELLOW
                    else expert.response_rate_red)
            if self.rng.random() < rate:
                responded.append(expert)

        sessions_per_hour = sum(e.sessions_per_hour for e in responded)
        avg_lag = np.mean([e.response_lag_min for e in responded]) if responded else 0

        # Sessions waiting ÷ supply rate = recovery time (rough)
        recovery_min = (demand_sessions_waiting / sessions_per_hour * 60) + avg_lag if sessions_per_hour > 0 else float("inf")

        incentive_cost = len(responded) * tier.bonus_per_session * min(1.0, sessions_per_hour)

        return IncentiveResponse(
            state=state,
            experts_pinged=len(pingable),
            experts_responded=len(responded),
            sessions_added_per_hour=round(sessions_per_hour, 2),
            expected_recovery_min=round(recovery_min, 1),
            incentive_cost=round(incentive_cost, 2),
        )

    def run_recovery_timeline(
        self,
        state: BarometerState,
        tier: IncentiveTier,
        initial_queue: int,
        demand_rate_per_hour: float,
        existing_supply_per_hour: float,
        sim_duration_min: int = 60,
        dt_min: float = 1.0,
    ) -> pd.DataFrame:
        """
        Simulate queue depth over time after the incentive fires.
        Models demand arriving and supply (existing + responders) clearing sessions.
        """
        response = self.simulate_response(state, tier, initial_queue)
        total_supply = existing_supply_per_hour + response.sessions_added_per_hour
        avg_lag = np.mean([e.response_lag_min for e in self.experts
                           if e.status != ExpertStatus.ACTIVE]) if response.experts_responded else 0

        rows = []
        queue = float(initial_queue)

        for t in np.arange(0, sim_duration_min, dt_min):
            # Responders come online after their lag
            supply = existing_supply_per_hour if t < avg_lag else total_supply
            net_change = (demand_rate_per_hour - supply) * (dt_min / 60)
            queue = max(0, queue + net_change)

            rows.append({
                "t_min": round(t, 1),
                "queue_depth": round(queue, 1),
                "supply_online": round(supply, 2),
                "state": BarometerState.GREEN.value if queue == 0 else state.value,
            })

        return pd.DataFrame(rows)


# ── Synthetic expert pool ─────────────────────────────────────────────────────

def build_expert_pool(n: int = 60, rng: Optional[np.random.Generator] = None) -> list[Expert]:
    rng = rng or np.random.default_rng(seed=7)
    categories = ["astrology", "mental_health", "relationship", "financial_coaching", "reproductive"]
    statuses = [ExpertStatus.ACTIVE, ExpertStatus.SCHEDULED, ExpertStatus.IDLE, ExpertStatus.OFFLINE]
    status_weights = [0.15, 0.20, 0.25, 0.40]  # most are offline at 11pm

    experts = []
    for i in range(n):
        cat = rng.choice(categories)
        status = rng.choice(statuses, p=status_weights)
        experts.append(Expert(
            id=f"expert_{i:03d}",
            status=status,
            response_rate_yellow=rng.beta(3, 5),     # mean ~0.38
            response_rate_red=rng.beta(5, 4),         # mean ~0.55 — higher stakes, better response
            response_lag_min=rng.gamma(3, 2),         # mean ~6 min
            sessions_per_hour=rng.uniform(1.0, 2.5),
            category=cat,
        ))
    return experts


# ── Demo ─────────────────────────────────────────────────────────────────────

def main() -> None:
    rng = np.random.default_rng(42)
    experts = build_expert_pool(60, rng)
    sim = IncentiveSimulator(experts, rng)

    print("Incentive Simulation — Wellness, 11pm Demand Spike\n")
    print(f"Expert pool: {len(experts)} total")

    status_counts = {}
    for e in experts:
        status_counts[e.status.value] = status_counts.get(e.status.value, 0) + 1
    for s, n in sorted(status_counts.items()):
        print(f"  {s:<12} {n}")

    print()

    # Yellow state response
    yellow_response = sim.simulate_response(BarometerState.YELLOW, YELLOW_TIER, demand_sessions_waiting=31)
    print("Yellow State Push:")
    print(f"  Experts pinged       : {yellow_response.experts_pinged}")
    print(f"  Experts responded    : {yellow_response.experts_responded}")
    print(f"  Sessions/hour added  : {yellow_response.sessions_added_per_hour}")
    print(f"  Expected recovery    : {yellow_response.expected_recovery_min} min")
    print(f"  Incentive cost       : {yellow_response.incentive_cost:.0f}")

    print()

    # Red state response
    red_response = sim.simulate_response(BarometerState.RED, RED_TIER, demand_sessions_waiting=44)
    print("Red State Push:")
    print(f"  Experts pinged       : {red_response.experts_pinged}")
    print(f"  Experts responded    : {red_response.experts_responded}")
    print(f"  Sessions/hour added  : {red_response.sessions_added_per_hour}")
    print(f"  Expected recovery    : {red_response.expected_recovery_min} min")
    print(f"  Incentive cost       : {red_response.incentive_cost:.0f}")

    print()

    # Recovery timeline
    print("Recovery Timeline (Yellow, 31 sessions waiting, demand=40/hr, existing supply=12/hr)\n")
    timeline = sim.run_recovery_timeline(
        state=BarometerState.YELLOW,
        tier=YELLOW_TIER,
        initial_queue=31,
        demand_rate_per_hour=40,
        existing_supply_per_hour=12,
        sim_duration_min=30,
    )
    print(timeline[timeline["t_min"].isin([0, 5, 8, 10, 15, 20, 25, 30])].to_string(index=False))

    # Check auto-stop condition
    recovered = timeline[timeline["queue_depth"] == 0]
    if not recovered.empty:
        print(f"\n✓ Queue cleared at t={recovered['t_min'].iloc[0]} min — incentive auto-stop triggers")
    else:
        print("\n⚠ Queue not fully cleared in 30 min window — consider Red state escalation")


if __name__ == "__main__":
    main()
