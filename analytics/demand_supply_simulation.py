"""
demand_supply_simulation.py

Full end-to-end platform simulation for Equilibrium.
Simulates a realistic demand spike event — demand rise, barometer state transitions,
surge pricing activation, incentive response, supply recovery, and auto-stop.

Models the complete 6-step sequence from the portfolio page live scenario:
  23:00 — Demand spike begins
  23:08 — Barometer turns Yellow
  23:08 +2s — Surge pricing activates
  23:08 +5s — Incentive engine fires
  23:09 — AI router adjusts
  23:14 — Supply recovers, auto-stop

Usage:
    python analytics/demand_supply_simulation.py
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ── Enums ─────────────────────────────────────────────────────────────────────

class BarometerState(Enum):
    GREEN  = "green"
    YELLOW = "yellow"
    RED    = "red"

STATE_ICONS = {BarometerState.GREEN: "🟢", BarometerState.YELLOW: "🟡", BarometerState.RED: "🔴"}


# ── Platform config ───────────────────────────────────────────────────────────

@dataclass
class PlatformConfig:
    name: str = "coto_wellness"
    delay_yellow_min: float = 30.0
    delay_red_min: float    = 60.0
    dropout_yellow_pct: float = 5.0
    dropout_red_pct: float    = 10.0
    surge_yellow_pct: float   = 0.10   # surge fee as fraction of base fee
    surge_red_pct: float      = 0.20
    bonus_yellow: float       = 80.0   # INR per session (expert incentive)
    bonus_red: float          = 160.0
    base_session_fee: float   = 500.0  # INR per session
    expert_response_rate_yellow: float = 0.38
    expert_response_rate_red: float    = 0.55
    expert_lag_min: float     = 6.0    # minutes from push to online


@dataclass
class PlatformState:
    t_min: float
    demand_rate: float          # sessions arriving per hour
    supply_rate: float          # sessions experts can handle per hour
    queue_depth: int
    delay_time_min: float
    dropout_rate_pct: float
    barometer: BarometerState
    surge_active: bool
    incentive_fired: bool
    experts_online: int
    surge_collected: float = 0.0
    bonuses_paid: float    = 0.0
    ai_sessions: int       = 0
    human_sessions: int    = 0


# ── Simulation ────────────────────────────────────────────────────────────────

class PlatformSimulator:
    """
    Discrete-time simulation of a two-sided marketplace demand spike.
    dt = 1 minute. All rates expressed per hour.
    """

    def __init__(self, config: PlatformConfig, rng: Optional[np.random.Generator] = None):
        self.cfg = config
        self.rng = rng or np.random.default_rng(42)

    def run(
        self,
        demand_profile: list[tuple[float, float]],  # (t_min, demand_rate_per_hour)
        initial_supply: float,
        n_experts_available: int,
        n_experts_offline: int,
        base_dropout_rate: float = 2.0,
        ai_complexity_threshold: float = 0.5,
        sim_duration_min: int = 30,
    ) -> pd.DataFrame:
        """
        Simulate platform response to a demand spike.

        demand_profile: piecewise constant demand rate — list of (t_start, rate) breakpoints
        initial_supply: sessions/hour from experts online at t=0
        n_experts_available: offline experts who could come online
        n_experts_offline: total offline pool (superset of available)
        """
        cfg = self.cfg
        dt = 1.0  # minute

        # State initialisation
        queue: float = 0.0
        supply = initial_supply
        experts_online = int(initial_supply / 1.5)  # rough: 1.5 sessions/hr per expert
        barometer = BarometerState.GREEN
        surge_active = False
        incentive_fired = False
        surge_pool = 0.0
        bonuses_paid = 0.0
        incentive_fired_at: Optional[float] = None
        responders_online_at: Optional[float] = None

        records: list[PlatformState] = []

        def get_demand(t: float) -> float:
            rate = demand_profile[0][1]
            for t_start, r in demand_profile:
                if t >= t_start:
                    rate = r
            return rate

        def score_barometer(delay: float, dropout: float) -> BarometerState:
            if delay >= cfg.delay_red_min or dropout >= cfg.dropout_red_pct:
                return BarometerState.RED
            if delay >= cfg.delay_yellow_min or dropout >= cfg.dropout_yellow_pct:
                return BarometerState.YELLOW
            return BarometerState.GREEN

        for tick in range(int(sim_duration_min / dt)):
            t = tick * dt
            demand = get_demand(t)

            # Compute derived signals
            delay_min = (queue / max(supply, 0.01)) * 60  # minutes to clear queue
            # Dropout rises with delay relative to tolerance
            dropout_pct = min(
                base_dropout_rate + max(0, delay_min - 15) * 0.4,
                30.0,
            )

            # Barometer evaluation
            new_state = score_barometer(delay_min, dropout_pct)

            # State transition actions (fire once per transition)
            if new_state != barometer:
                if new_state == BarometerState.YELLOW and not incentive_fired:
                    surge_active = True
                    incentive_fired = True
                    incentive_fired_at = t
                    # Responders come online after lag
                    responders_online_at = t + cfg.expert_lag_min
                elif new_state == BarometerState.RED and incentive_fired:
                    pass  # already fired, escalate bonus in real system

            barometer = new_state

            # Responders online after lag
            if responders_online_at is not None and t >= responders_online_at:
                n_respond = int(n_experts_available * cfg.expert_response_rate_yellow)
                extra_supply = n_respond * 1.5  # sessions/hr per responder
                if extra_supply > 0 and supply < initial_supply + extra_supply:
                    supply = initial_supply + extra_supply
                    experts_online += n_respond
                    responders_online_at = None  # fire once

            # Surge P&L
            surge_rate = cfg.surge_yellow_pct if barometer == BarometerState.YELLOW else (
                cfg.surge_red_pct if barometer == BarometerState.RED else 0.0
            )
            sessions_this_tick = min(supply, demand) * (dt / 60)
            surge_this_tick  = sessions_this_tick * cfg.base_session_fee * surge_rate if surge_active else 0
            bonus_this_tick  = sessions_this_tick * (cfg.bonus_yellow if barometer == BarometerState.YELLOW else cfg.bonus_red) if incentive_fired else 0
            surge_pool  += surge_this_tick
            bonuses_paid += bonus_this_tick

            # AI routing: fraction of queued sessions routed to AI
            # (low-complexity sessions → AI; high-complexity → human queue)
            ai_fraction = 0.4 if barometer == BarometerState.YELLOW else 0.6 if barometer == BarometerState.RED else 0.1
            ai_sessions  = int(sessions_this_tick * ai_fraction)
            human_sessions = max(0, int(sessions_this_tick) - ai_sessions)

            # Queue dynamics
            sessions_cleared = min(supply, demand) * (dt / 60)
            queue_change = (demand - supply) * (dt / 60)
            queue = max(0.0, queue + queue_change)

            # Auto-stop: if barometer returns to Green, stop incentives
            if barometer == BarometerState.GREEN and incentive_fired and queue < 2:
                surge_active = False
                incentive_fired = False

            records.append(PlatformState(
                t_min=t,
                demand_rate=round(demand, 1),
                supply_rate=round(supply, 1),
                queue_depth=int(queue),
                delay_time_min=round(delay_min, 1),
                dropout_rate_pct=round(dropout_pct, 1),
                barometer=barometer,
                surge_active=surge_active,
                incentive_fired=incentive_fired,
                experts_online=experts_online,
                surge_collected=round(surge_pool, 1),
                bonuses_paid=round(bonuses_paid, 1),
                ai_sessions=ai_sessions,
                human_sessions=human_sessions,
            ))

        return pd.DataFrame([vars(r) for r in records]).assign(
            barometer=lambda df: df["barometer"].apply(lambda s: s.value)
        )


# ── Scenario: 11pm demand spike ───────────────────────────────────────────────

def run_11pm_scenario() -> pd.DataFrame:
    cfg = PlatformConfig()
    sim = PlatformSimulator(cfg)

    demand_profile = [
        (0,  24.0),   # t=0:  normal evening traffic
        (8,  72.0),   # t=8:  spike — 3× demand surge
        (20, 36.0),   # t=20: organic demand cools slightly post-surge
        (25, 24.0),   # t=25: returns to baseline
    ]

    return sim.run(
        demand_profile=demand_profile,
        initial_supply=18.0,         # 18 sessions/hr from 3 active experts at 6/hr each
        n_experts_available=48,
        n_experts_offline=48,
        base_dropout_rate=2.0,
        ai_complexity_threshold=0.5,
        sim_duration_min=30,
    )


# ── Comparison: with vs without Equilibrium ───────────────────────────────────

def run_without_equilibrium() -> pd.DataFrame:
    """
    Baseline: no barometer, no surge, no incentive.
    Demand spikes, supply stays flat, queue grows unchecked.
    """
    cfg = PlatformConfig()
    sim = PlatformSimulator(cfg)

    demand_profile = [(0, 24.0), (8, 72.0), (20, 36.0), (25, 24.0)]

    # Hack: set response rates to 0 so no experts respond
    cfg.expert_response_rate_yellow = 0.0
    cfg.expert_response_rate_red = 0.0

    return sim.run(
        demand_profile=demand_profile,
        initial_supply=18.0,
        n_experts_available=0,
        n_experts_offline=48,
        base_dropout_rate=2.0,
        sim_duration_min=30,
    )


# ── Demo ─────────────────────────────────────────────────────────────────────

def main() -> None:
    print("Equilibrium — Full Platform Simulation: 11pm Demand Spike\n")
    print("Scenario: Demand triples at t=8min. 3 experts in active calls. 48 experts offline.")
    print("System: Yellow fires at t=8, surge activates, incentive push, responders online ~t=14\n")

    with_eq  = run_11pm_scenario()
    without_eq = run_without_equilibrium()

    key_times = [0, 5, 8, 9, 10, 14, 18, 22, 26, 29]
    display_cols = ["t_min", "demand_rate", "supply_rate", "queue_depth",
                    "delay_time_min", "barometer", "surge_active", "experts_online",
                    "surge_collected", "bonuses_paid"]

    print("WITH Equilibrium:")
    print(with_eq[with_eq["t_min"].isin(key_times)][display_cols].to_string(index=False))

    print("\nWITHOUT Equilibrium (no barometer, no incentives):")
    print(without_eq[without_eq["t_min"].isin(key_times)][display_cols].to_string(index=False))

    # Summary
    max_q_with    = with_eq["queue_depth"].max()
    max_q_without = without_eq["queue_depth"].max()
    final_surge   = with_eq["surge_collected"].iloc[-1]
    final_bonuses = with_eq["bonuses_paid"].iloc[-1]

    print(f"\n{'─'*52}")
    print(f"Peak queue WITH Equilibrium    : {max_q_with} sessions")
    print(f"Peak queue WITHOUT Equilibrium : {max_q_without} sessions")
    print(f"Surge collected (total)        : {final_surge:.0f}")
    print(f"Bonuses paid    (total)        : {final_bonuses:.0f}")
    print(f"Net platform cost              : {final_surge - final_bonuses:.0f}  (surplus = self-financed)")

    recovery = with_eq[with_eq["barometer"] == "green"]
    if not recovery.empty:
        first_recovery = recovery[recovery["t_min"] >= 8]["t_min"].min()
        print(f"Time to Green recovery         : t={first_recovery} min (from spike at t=8)")


if __name__ == "__main__":
    main()
