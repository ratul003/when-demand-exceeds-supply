"""
surge_pricing_calculator.py

Surge pricing model for the Equilibrium demand-supply intelligence engine.
Maps category × delay time to a surge multiplier and simulates the
self-financing mechanic — surge fees collected from customers fund
expert incentive payouts on the supply side.

Usage:
    python analytics/surge_pricing_calculator.py
"""

from __future__ import annotations

from dataclasses import dataclass, field
import numpy as np
import pandas as pd
from typing import Optional


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class SurgeMatrix:
    """
    Per-category surge multiplier lookup.
    delay_bands: list of (max_delay_min, multiplier_pct) tuples, ascending.
    """
    category: str
    delay_bands: list[tuple[float, float]]  # (upper_bound_min, surge_pct)
    base_session_fee: float                  # currency units (e.g. INR per minute × avg session)

    def get_multiplier(self, delay_min: float) -> float:
        for upper_bound, multiplier in self.delay_bands:
            if delay_min <= upper_bound:
                return multiplier
        return self.delay_bands[-1][1]  # max band

    def get_surge_fee(self, delay_min: float) -> float:
        return self.base_session_fee * self.get_multiplier(delay_min)


# ── Wellness default matrices ─────────────────────────────────────────────────

WELLNESS_SURGE_MATRICES: list[SurgeMatrix] = [
    SurgeMatrix("astrology",          [(30, 0.00), (45, 0.05), (60, 0.10), (999, 0.15)], base_session_fee=400),
    SurgeMatrix("relationship",       [(30, 0.00), (45, 0.08), (60, 0.12), (999, 0.20)], base_session_fee=500),
    SurgeMatrix("mental_health",      [(20, 0.00), (35, 0.10), (45, 0.18), (999, 0.25)], base_session_fee=600),
    SurgeMatrix("financial_coaching", [(30, 0.00), (50, 0.08), (65, 0.15), (999, 0.22)], base_session_fee=550),
    SurgeMatrix("reproductive",       [(25, 0.00), (40, 0.10), (55, 0.18), (999, 0.25)], base_session_fee=580),
]


# ── Self-financing simulator ───────────────────────────────────────────────────

@dataclass
class SurgeEvent:
    category: str
    delay_min: float
    session_count: int           # bookings during surge window
    expert_bonus_per_session: float  # incentive paid to expert per completed session

@dataclass
class FinancingResult:
    surge_collected: float
    bonuses_paid: float
    net_platform_cost: float     # negative = surplus, positive = deficit
    is_self_financing: bool


def simulate_self_financing(
    matrix: SurgeMatrix,
    event: SurgeEvent,
    expert_acceptance_rate: float = 0.6,  # % of pinged experts who respond
) -> FinancingResult:
    """
    Validates the self-financing principle: surge fees collected ≥ bonuses paid.

    Surge collected: session_count × surge_fee (paid by customers who book during surge)
    Bonuses paid: session_count × acceptance_rate × expert_bonus_per_session
    """
    surge_fee     = matrix.get_surge_fee(event.delay_min)
    surge_total   = event.session_count * surge_fee
    bonuses_total = event.session_count * expert_acceptance_rate * event.expert_bonus_per_session
    net           = bonuses_total - surge_total  # positive = platform carries cost

    return FinancingResult(
        surge_collected=surge_total,
        bonuses_paid=bonuses_total,
        net_platform_cost=net,
        is_self_financing=(net <= 0),
    )


def self_financing_sensitivity(
    matrix: SurgeMatrix,
    delay_min: float,
    bonus_range: np.ndarray,
    session_count: int = 20,
    acceptance_rate: float = 0.6,
) -> pd.DataFrame:
    """
    Sweep expert bonus amounts to find the break-even threshold
    above which the platform starts carrying a cost.
    """
    surge_fee = matrix.get_surge_fee(delay_min)
    rows = []
    for bonus in bonus_range:
        result = simulate_self_financing(
            matrix,
            SurgeEvent(matrix.category, delay_min, session_count, bonus),
            acceptance_rate,
        )
        rows.append({
            "bonus_per_session": bonus,
            "surge_collected": result.surge_collected,
            "bonuses_paid": result.bonuses_paid,
            "net_platform_cost": result.net_platform_cost,
            "self_financing": result.is_self_financing,
        })
    return pd.DataFrame(rows)


# ── Multi-category surge scenario ────────────────────────────────────────────

def simulate_demand_spike(
    matrices: list[SurgeMatrix],
    delay_by_category: dict[str, float],
    session_demand: dict[str, int],
    expert_bonus: float = 80.0,  # fixed bonus per session for simplicity
    acceptance_rate: float = 0.60,
) -> pd.DataFrame:
    """
    Simulate a platform-wide demand spike across all categories.
    Returns per-category P&L of the surge response.
    """
    lookup = {m.category: m for m in matrices}
    rows = []
    for cat, delay in delay_by_category.items():
        m = lookup.get(cat)
        if m is None:
            continue
        sessions = session_demand.get(cat, 0)
        result = simulate_self_financing(
            m,
            SurgeEvent(cat, delay, sessions, expert_bonus),
            acceptance_rate,
        )
        rows.append({
            "category": cat,
            "delay_min": delay,
            "surge_multiplier_pct": m.get_multiplier(delay) * 100,
            "sessions_in_window": sessions,
            "surge_collected": round(result.surge_collected, 2),
            "bonuses_paid": round(result.bonuses_paid, 2),
            "net_cost": round(result.net_platform_cost, 2),
            "self_financing": result.is_self_financing,
        })
    return pd.DataFrame(rows)


# ── Demo ─────────────────────────────────────────────────────────────────────

def main() -> None:
    print("Surge Pricing Calculator — Wellness Preset\n")

    # 1. Surge matrix lookup
    mental = next(m for m in WELLNESS_SURGE_MATRICES if m.category == "mental_health")
    print("Mental Health — surge multiplier by delay time:")
    print(f"{'Delay':>8}  {'Multiplier':>12}  {'Surge fee (base 600)':>22}")
    print("-" * 48)
    for delay in [10, 22, 37, 48, 70]:
        mult = mental.get_multiplier(delay)
        fee  = mental.get_surge_fee(delay)
        print(f"{delay:>7}m  {mult*100:>11.0f}%  {fee:>21.0f}")

    print()

    # 2. Self-financing check: 11pm spike
    print("11pm Spike — platform-wide surge P&L\n")
    scenario_delays = {
        "astrology":          67.0,
        "mental_health":      43.0,
        "relationship":       55.0,
        "financial_coaching": 38.0,
        "reproductive":       41.0,
    }
    scenario_demand = {
        "astrology":          14,
        "mental_health":      18,
        "relationship":       9,
        "financial_coaching": 5,
        "reproductive":       7,
    }
    df = simulate_demand_spike(
        WELLNESS_SURGE_MATRICES, scenario_delays, scenario_demand,
        expert_bonus=80.0, acceptance_rate=0.60,
    )
    print(df.to_string(index=False))

    totals = df[["surge_collected", "bonuses_paid", "net_cost"]].sum()
    print(f"\nTotal surge collected : {totals['surge_collected']:,.0f}")
    print(f"Total bonuses paid    : {totals['bonuses_paid']:,.0f}")
    print(f"Net platform cost     : {totals['net_cost']:,.0f}  ({'SURPLUS' if totals['net_cost'] <= 0 else 'DEFICIT'})")

    print()

    # 3. Sensitivity — at what bonus does mental health break the self-financing rule?
    print("Mental Health — break-even sensitivity (delay=43min, 18 sessions, 60% acceptance)")
    bonus_range = np.arange(50, 300, 25)
    sensitivity = self_financing_sensitivity(mental, delay_min=43, bonus_range=bonus_range, session_count=18)
    print(sensitivity[["bonus_per_session", "surge_collected", "bonuses_paid", "net_platform_cost", "self_financing"]].to_string(index=False))


if __name__ == "__main__":
    main()
