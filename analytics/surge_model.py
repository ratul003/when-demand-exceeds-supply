"""
surge_model.py

Surge pricing calculator for an on-demand expert marketplace.
Computes surge multipliers from category x delay matrix and models
the revenue split between platform margin and expert bonuses.

Usage:
    python analytics/surge_model.py
    python analytics/surge_model.py --category astrology --delay 12 --sessions 30
    python analytics/surge_model.py --matrix
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass


@dataclass
class SurgeConfig:
    category: str
    base_session_fee: float      # $ per session
    yellow_multiplier: float     # surge fee as multiple of base
    red_multiplier: float
    yellow_bonus_rate: float     # fraction of surge fee paid as expert bonus
    red_bonus_rate: float


SURGE_CONFIGS: dict[str, SurgeConfig] = {
    "astrology":          SurgeConfig("astrology",          8.0,  1.3, 1.8, 0.80, 0.90),
    "mental_health":      SurgeConfig("mental_health",      16.0, 1.2, 1.6, 0.85, 0.92),
    "relationship":       SurgeConfig("relationship",       10.0, 1.3, 1.9, 0.80, 0.90),
    "financial_coaching": SurgeConfig("financial_coaching", 14.0, 1.3, 1.7, 0.82, 0.91),
    "reproductive":       SurgeConfig("reproductive",       12.0, 1.2, 1.7, 0.83, 0.91),
}


@dataclass
class SurgeResult:
    category: str
    state: str               # "yellow" or "red"
    base_fee: float
    surge_fee: float
    expert_bonus: float
    platform_margin: float
    margin_rate: float


def compute_surge(category: str, state: str, sessions: int = 1) -> SurgeResult:
    cfg = SURGE_CONFIGS[category]
    multiplier = cfg.yellow_multiplier if state == "yellow" else cfg.red_multiplier
    bonus_rate = cfg.yellow_bonus_rate if state == "yellow" else cfg.red_bonus_rate

    surge_fee      = cfg.base_session_fee * multiplier * sessions
    expert_bonus   = surge_fee * bonus_rate
    platform_margin = surge_fee - expert_bonus

    return SurgeResult(
        category=category,
        state=state,
        base_fee=cfg.base_session_fee * sessions,
        surge_fee=round(surge_fee, 2),
        expert_bonus=round(expert_bonus, 2),
        platform_margin=round(platform_margin, 2),
        margin_rate=round(1 - bonus_rate, 3),
    )


def print_matrix() -> None:
    print("\nSurge Matrix -- platform margin per session at each tier\n")
    header = f"{'Category':<22} {'Base $':>7}  {'Yellow fee':>11}  {'Yellow margin':>14}  {'Red fee':>8}  {'Red margin':>11}"
    print(header)
    print("-" * len(header))
    for cat, cfg in SURGE_CONFIGS.items():
        y = compute_surge(cat, "yellow")
        r = compute_surge(cat, "red")
        print(f"{cat:<22} ${cfg.base_session_fee:>5.0f}  ${y.surge_fee:>9.2f}  ${y.platform_margin:>10.2f} ({y.margin_rate:.0%})  ${r.surge_fee:>6.2f}  ${r.platform_margin:>7.2f} ({r.margin_rate:.0%})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Surge Model")
    parser.add_argument("--category", choices=list(SURGE_CONFIGS), default="mental_health")
    parser.add_argument("--state",    choices=["yellow", "red"], default="red")
    parser.add_argument("--sessions", type=int, default=20)
    parser.add_argument("--matrix",   action="store_true")
    args = parser.parse_args()

    if args.matrix:
        print_matrix()
    else:
        r = compute_surge(args.category, args.state, args.sessions)
        print(f"\nSurge event: {r.category} | {r.state.upper()} tier | {args.sessions} sessions")
        print(f"  Base revenue:    ${r.base_fee:.2f}")
        print(f"  Surge collected: ${r.surge_fee:.2f}  ({SURGE_CONFIGS[args.category].yellow_multiplier if args.state == 'yellow' else SURGE_CONFIGS[args.category].red_multiplier:.1f}x)")
        print(f"  Expert bonuses:  ${r.expert_bonus:.2f}")
        print(f"  Platform margin: ${r.platform_margin:.2f}  ({r.margin_rate:.0%} of surge)")
        print(f"\nSelf-financing: surge collected minus bonuses = ${r.platform_margin:.2f} net gain")


if __name__ == "__main__":
    main()
