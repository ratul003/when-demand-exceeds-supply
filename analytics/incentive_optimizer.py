"""
incentive_optimizer.py

Expert incentive optimizer for an on-demand expert marketplace.
Models acceptance rate curves for each incentive tier and computes
the optimal tier needed to close a supply gap at minimum cost.

Usage:
    python analytics/incentive_optimizer.py
    python analytics/incentive_optimizer.py --gap 15 --category astrology
    python analytics/incentive_optimizer.py --simulate-evening
"""
from __future__ import annotations

import argparse
import math
from dataclasses import dataclass


@dataclass
class IncentiveTier:
    name: str
    bonus_per_session: float      # $ per accepted session
    rating_multiplier: float      # e.g. 1.5x or 2.0x
    rev_share_boost: float        # e.g. 0.10 = +10%
    reach: str                    # who receives the push


@dataclass
class AcceptanceModel:
    category: str
    base_rate: float           # organic acceptance (no incentive)
    yellow_rate: float         # acceptance under Yellow incentive
    red_rate: float            # acceptance under Red incentive


TIERS = {
    "none":   IncentiveTier("No incentive",  0.0,  1.0, 0.00, "Organic — experts checking app"),
    "yellow": IncentiveTier("Yellow push",   8.0,  1.5, 0.10, "Active + scheduled experts"),
    "red":    IncentiveTier("Red push",      16.0, 2.0, 0.20, "Active + scheduled + offline experts"),
}

ACCEPTANCE_MODELS: dict[str, AcceptanceModel] = {
    "astrology":          AcceptanceModel("astrology",          0.08, 0.38, 0.55),
    "mental_health":      AcceptanceModel("mental_health",      0.06, 0.32, 0.50),
    "relationship":       AcceptanceModel("relationship",       0.09, 0.40, 0.58),
    "financial_coaching": AcceptanceModel("financial_coaching", 0.07, 0.35, 0.52),
    "reproductive":       AcceptanceModel("reproductive",       0.07, 0.34, 0.51),
}


def sessions_needed_to_close_gap(gap: int, acceptance_rate: float, expert_pool: int = 120) -> int:
    expected_responses = math.floor(expert_pool * acceptance_rate)
    return max(0, gap - expected_responses)


def optimal_tier(category: str, supply_gap: int, expert_pool: int = 120) -> dict:
    model = ACCEPTANCE_MODELS[category]

    for tier_name, rate in [("none", model.base_rate), ("yellow", model.yellow_rate), ("red", model.red_rate)]:
        expected = math.floor(expert_pool * rate)
        if expected >= supply_gap:
            tier = TIERS[tier_name]
            total_bonus = tier.bonus_per_session * supply_gap
            return {
                "tier": tier_name,
                "expected_accepts": expected,
                "gap_closed": True,
                "bonus_cost": total_bonus,
                "tier_detail": tier,
            }

    # Red tier insufficient -- return best effort
    tier = TIERS["red"]
    return {
        "tier": "red",
        "expected_accepts": math.floor(expert_pool * model.red_rate),
        "gap_closed": False,
        "bonus_cost": tier.bonus_per_session * supply_gap,
        "tier_detail": tier,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Incentive Optimizer")
    parser.add_argument("--category", choices=list(ACCEPTANCE_MODELS), default="astrology")
    parser.add_argument("--gap",      type=int, default=20, help="Number of expert sessions needed")
    parser.add_argument("--pool",     type=int, default=120, help="Active expert pool size")
    parser.add_argument("--simulate-evening", action="store_true")
    args = parser.parse_args()

    if args.simulate_evening:
        print("\nEvening Spike Simulation -- 21:00 to 23:30 (5-min intervals)\n")
        print(f"{'Time':>6}  {'Gap':>5}  {'Optimal Tier':<14}  {'Cost':>8}  {'Closes?'}")
        print("-" * 52)
        import random
        rng = random.Random(42)
        for i in range(30):
            hour_min = f"21:{i*5:02d}" if i < 12 else f"22:{(i-12)*5:02d}" if i < 24 else f"23:{(i-24)*5:02d}"
            gap = rng.randint(2, 8)
            if 15 <= i <= 22:
                gap = rng.randint(18, 35)
            result = optimal_tier(args.category, gap, args.pool)
            print(f"{hour_min:>6}  {gap:>5}  {result['tier']:<14}  ${result['bonus_cost']:>6.0f}  {'yes' if result['gap_closed'] else 'NO'}")
        return

    result = optimal_tier(args.category, args.gap, args.pool)
    print(f"\nIncentive recommendation: {args.category} | gap = {args.gap} sessions")
    print(f"  Optimal tier:     {result['tier'].upper()}")
    print(f"  Expected accepts: {result['expected_accepts']}")
    print(f"  Gap closed:       {'yes' if result['gap_closed'] else 'no -- need larger pool'}")
    print(f"  Bonus cost:       ${result['bonus_cost']:.2f}")
    tier = result['tier_detail']
    print(f"\nTier detail: {tier.name}")
    print(f"  Bonus/session: ${tier.bonus_per_session:.0f}  |  Rating: {tier.rating_multiplier}x  |  Rev share boost: +{tier.rev_share_boost:.0%}")
    print(f"  Reach: {tier.reach}")


if __name__ == "__main__":
    main()
