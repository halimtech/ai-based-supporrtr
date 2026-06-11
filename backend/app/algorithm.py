from __future__ import annotations

import math
import random
from collections import defaultdict
from typing import Iterable, Mapping

import numpy as np
import pandas as pd


# =========================================================
# HELPERS (kept from old algorithm for interface compat)
# =========================================================


def _clean_label(value: object, label: str) -> str:
    cleaned = str(value or "").strip()
    if not cleaned:
        raise ValueError(f"{label} must not be empty")
    return cleaned


def normalize_named_list(values: Iterable[object], label: str) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = _clean_label(value, label)
        if cleaned in seen:
            raise ValueError(f"duplicate {label}: {cleaned}")
        seen.add(cleaned)
        normalized.append(cleaned)
    if not normalized:
        raise ValueError(f"{label} list must not be empty")
    return normalized


def normalize_criteria(criteria: Iterable[Mapping[str, object]]) -> list[dict[str, float | str]]:
    normalized: list[dict[str, float | str]] = []
    seen: set[str] = set()
    for item in criteria:
        name = _clean_label(item.get("name", ""), "criterion name")
        if name in seen:
            raise ValueError(f"duplicate criterion name: {name}")
        weight = float(item.get("weight", 0) or 0)
        if weight < 0:
            raise ValueError(f"criterion weight must be non-negative: {name}")
        seen.add(name)
        normalized.append({"name": name, "weight": weight})
    if not normalized:
        raise ValueError("criteria list must not be empty")
    return normalized


def normalize_weights(criteria: list[dict[str, float | str]]) -> list[dict[str, float | str]]:
    total_weight = sum(float(c["weight"]) for c in criteria)
    if total_weight == 0:
        return [{**c, "normalizedWeight": 0.0} for c in criteria]
    return [
        {
            **c,
            "normalizedWeight": round((float(c["weight"]) / total_weight) * 100, 3),
        }
        for c in criteria
    ]


def coerce_ratings_lookup(
    ratings: Iterable[Mapping[str, object]] | Mapping[str, object],
) -> dict[str, float]:
    if isinstance(ratings, Mapping):
        lookup: dict[str, float] = {}
        for key, value in ratings.items():
            numeric_value = float(value)
            if numeric_value < 1 or numeric_value > 5:
                raise ValueError(f"rating value must stay between 1 and 5: {key}")
            lookup[str(key)] = numeric_value
        return lookup

    lookup = {}
    for rating in ratings:
        participant = _clean_label(rating.get("participant", ""), "participant")
        alternative = _clean_label(rating.get("alternative", ""), "alternative")
        criterion = _clean_label(rating.get("criterion", ""), "criterion")
        value = float(rating.get("value", 0))
        if value < 1 or value > 5:
            raise ValueError(
                f"rating value must stay between 1 and 5: {participant} / {alternative} / {criterion}"
            )
        key = f"{participant}__{alternative}__{criterion}"
        if key in lookup:
            raise ValueError(f"duplicate rating: {key}")
        lookup[key] = value
    return lookup


def validate_input(
    participants: list[str],
    alternatives: list[str],
    criteria: list[dict[str, float | str]],
    ratings_lookup: Mapping[str, float],
) -> None:
    participant_names = set(participants)
    alternative_names = set(alternatives)
    criterion_names = {str(c["name"]) for c in criteria}
    errors: list[str] = []
    for key in ratings_lookup:
        parts = key.split("__")
        if len(parts) != 3:
            errors.append(f"invalid rating key format: {key}")
            continue
        p, a, c = parts
        if p not in participant_names:
            errors.append(f"unknown participant in rating: {p}")
        if a not in alternative_names:
            errors.append(f"unknown alternative in rating: {a}")
        if c not in criterion_names:
            errors.append(f"unknown criterion in rating: {c}")
    for p in participants:
        for a in alternatives:
            for c in criteria:
                key = f"{p}__{a}__{c['name']}"
                if key not in ratings_lookup:
                    errors.append(f"missing rating for {p} / {a} / {c['name']}")
    if errors:
        preview = "\n- ".join(errors[:12])
        more = "" if len(errors) <= 12 else f"\n- ... and {len(errors) - 12} more"
        raise ValueError(f"Input validation failed:\n- {preview}{more}")


# =========================================================
# DISCORDNEW MONTE-CARLO SAW ALGORITHM
# =========================================================


def compute_deviation_scores(judgements: dict, criteria: list[str], alternatives: list[str]) -> dict[str, float]:
    persons = list(judgements.keys())
    num_criteria = len(criteria)
    all_weight_vectors = [judgements[p]["w"] for p in persons]
    weights_by_crit = list(zip(*all_weight_vectors))
    avg_weights = [sum(vals) / len(vals) for vals in weights_by_crit]
    mu_scores = {c: {} for c in criteria}
    for ci, c in enumerate(criteria):
        for a in alternatives:
            vals = [judgements[p][a][ci] for p in persons]
            mu_scores[c][a] = sum(vals) / len(vals)
    deviations = {}
    for p in persons:
        wP = judgements[p]["w"]
        dev_w = sum(abs(wP[i] - avg_weights[i]) for i in range(num_criteria))
        dev_s = 0.0
        for ci, c in enumerate(criteria):
            for a in alternatives:
                s_pa = judgements[p][a][ci]
                mu = mu_scores[c][a]
                dev_s += abs(s_pa - mu)
        deviations[p] = dev_w + dev_s
    return deviations


def saw_raw(matrix: list[list[float]], weights: list[float]) -> tuple[np.ndarray, list[int]]:
    mat = np.array(matrix, dtype=float)
    w = np.array(weights, dtype=float)
    scores = mat.dot(w)
    ranking = fair_ranking(scores)
    return scores, ranking


def fair_ranking(scores: np.ndarray) -> list[int]:
    sorted_scores = sorted(set(scores), reverse=True)
    rank_map = {score: rank + 1 for rank, score in enumerate(sorted_scores)}
    return [rank_map[s] for s in scores]


def compute_entropy(probabilities: list[float]) -> float:
    return -sum(p * math.log2(p) for p in probabilities if p > 0)


def _frequency_distribution(values: list[float]) -> tuple[list[float], list[int]]:
    """Return (unique_values, counts) preserving the empirical frequency."""
    counts: dict[float, int] = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    items = sorted(counts.items())
    return [v for v, _ in items], [c for _, c in items]


def run_montecarlo_saw(
    judgements: dict,
    criteria: list[str],
    alternatives: list[str],
    iterations: int = 10000,
) -> dict:
    """SMAA-2 style Monte Carlo over the empirical opinion distribution.

    Each iteration samples one rating per (criterion, alternative) cell and one
    weight per criterion, *frequency-weighted* across participants — so the
    majority opinion has proportionally more influence than a single outlier.
    Acceptability and consensus are then computed from rank-1 frequencies.
    """
    persons = list(judgements.keys())
    num_criteria = len(criteria)
    num_alts = len(alternatives)

    # Empirical distributions per cell (criterion, alternative) and per weight.
    rating_dist: dict[tuple[int, str], tuple[list[float], list[int]]] = {}
    for c_index in range(num_criteria):
        for a in alternatives:
            values = [judgements[p][a][c_index] for p in persons]
            rating_dist[(c_index, a)] = _frequency_distribution(values)

    weight_dist: list[tuple[list[float], list[int]]] = []
    for c_index in range(num_criteria):
        ws = [judgements[p]["w"][c_index] for p in persons]
        weight_dist.append(_frequency_distribution(ws))

    rank_counts: dict[str, dict[int, float]] = {alt: defaultdict(float) for alt in alternatives}
    winner_acceptability: dict[str, float] = dict.fromkeys(alternatives, 0.0)

    for _ in range(iterations):
        # Sample ratings: criteria × alternatives matrix
        sampled_matrix: list[list[float]] = []
        for c_index in range(num_criteria):
            row: list[float] = []
            for a in alternatives:
                vals, counts = rating_dist[(c_index, a)]
                row.append(random.choices(vals, weights=counts, k=1)[0])
            sampled_matrix.append(row)

        sampled_weights: list[float] = []
        for c_index in range(num_criteria):
            vals, counts = weight_dist[c_index]
            sampled_weights.append(random.choices(vals, weights=counts, k=1)[0])

        # Degenerate case: all weights are 0 → every alternative ties.
        if sum(sampled_weights) == 0:
            share = 1.0 / num_alts
            for a in alternatives:
                winner_acceptability[a] += share
                rank_counts[a][1] += share
            continue

        matrix_for_saw = [
            [sampled_matrix[c_index][a_index] for c_index in range(num_criteria)]
            for a_index in range(num_alts)
        ]
        _, ranks = saw_raw(matrix_for_saw, sampled_weights)

        # Distribute rank credit fractionally among ties so that probabilities
        # at every rank form a proper distribution (each row of rank_prob sums
        # to 1 over alternatives at a given rank, and per-alt distributions
        # over ranks also sum to 1).
        rank_groups: dict[int, list[str]] = defaultdict(list)
        for a_index, rnk in enumerate(ranks):
            rank_groups[rnk].append(alternatives[a_index])
        for rnk, group in rank_groups.items():
            share = 1.0 / len(group)
            for alt_ in group:
                rank_counts[alt_][rnk] += share
                if rnk == 1:
                    winner_acceptability[alt_] += share

    # Rank acceptability matrix (each row sums to 1 over ranks)
    all_ranks = sorted({r for alt_ranks in rank_counts.values() for r in alt_ranks})
    rank_freq_df = pd.DataFrame(0.0, index=alternatives, columns=[f"Rang {r}" for r in all_ranks])
    for alt_ in alternatives:
        for r_ in all_ranks:
            rank_freq_df.loc[alt_, f"Rang {r_}"] = rank_counts[alt_][r_]
    rank_prob_df = rank_freq_df / iterations

    # Consensus measure: entropy of the rank-1 acceptability distribution.
    # 0 → one alternative wins every iteration (full consensus).
    # log2(num_alts) → winners are spread equally (no consensus).
    rank1_probs = [winner_acceptability[a] / iterations for a in alternatives]
    consensus_entropy = compute_entropy(rank1_probs)

    h_cutoff = 0.5 * math.log2(num_alts) if num_alts > 1 else 0.0
    consensus_reached = consensus_entropy <= h_cutoff

    # Always identify the most outlying participant — useful both for
    # discussion prompts and for borderline-consensus warnings.
    deviations = compute_deviation_scores(judgements, criteria, alternatives)
    sorted_devs = sorted(deviations.items(), key=lambda x: x[1], reverse=True)
    top_person = sorted_devs[0][0] if sorted_devs and sorted_devs[0][1] > 0 else None

    return {
        "consensus_reached": consensus_reached,
        "top_person": None if consensus_reached else top_person,
        "top_deviator_always": top_person,
        "entropy": consensus_entropy,
        "entropy_cutoff": h_cutoff,
        "rank_prob": rank_prob_df,
        "winner_counts": dict(winner_acceptability),
    }


# =========================================================
# ADAPTER: convert incoming data to judgements
# =========================================================


def _build_judgements(
    participants: list[str],
    alternatives: list[str],
    criteria: list[dict[str, float | str]],
    ratings_lookup: Mapping[str, float],
    weights_list: list[dict[str, object]] | None = None,
) -> dict:
    # Pre-compute a per-criterion fallback weight for participants who have not
    # submitted their own importance scores.  We prefer (in order):
    #   1. Average of weights that WERE submitted for that criterion
    #   2. The criterion's own stored weight (if > 0, i.e. explicitly set)
    #   3. 1.0 – equal-weight fallback (avoids injecting 0 into aggregated_prefs
    #      which would make every SAW score 0 and all alternatives tie, falsely
    #      inflating entropy and preventing consensus from ever being reached)
    crit_fallback: dict[str, float] = {}
    for c in criteria:
        cname = str(c["name"])
        if weights_list:
            submitted = [float(x["value"]) for x in weights_list if str(x["criterion"]) == cname]
            if submitted:
                crit_fallback[cname] = sum(submitted) / len(submitted)
                continue
        raw = float(c.get("weight", 0) or 0)
        crit_fallback[cname] = raw if raw > 0 else 1.0

    judgements: dict = {}
    for p in participants:
        if weights_list:
            w = []
            for c in criteria:
                cname = str(c["name"])
                wv = next(
                    (float(x["value"]) for x in weights_list if str(x["participant"]) == p and str(x["criterion"]) == cname),
                    crit_fallback[cname],
                )
                w.append(wv)
        else:
            w = [crit_fallback[str(c["name"])] for c in criteria]
        judgements[p] = {"w": w}
        for a in alternatives:
            scores = []
            for c in criteria:
                key = f"{p}__{a}__{c['name']}"
                scores.append(float(ratings_lookup.get(key, 5)))
            judgements[p][a] = scores
    return judgements


def _calculate_completion(
    participants: list[str],
    alternatives: list[str],
    criteria: list[dict[str, float | str]],
    ratings_lookup: Mapping[str, float],
) -> int:
    expected = len(participants) * len(alternatives) * len(criteria)
    if expected == 0:
        return 0
    filled = 0
    for p in participants:
        for a in alternatives:
            for c in criteria:
                key = f"{p}__{a}__{c['name']}"
                if key in ratings_lookup:
                    filled += 1
    return round((filled / expected) * 100)


# =========================================================
# BACKWARD-COMPATIBLE WRAPPERS (used by tests)
# =========================================================


def calculate_results(
    participants: list[str],
    alternatives: list[str],
    criteria: list[dict[str, float | str]],
    ratings_lookup: Mapping[str, float],
) -> tuple[list[dict[str, object]], list[dict[str, float | str]]]:
    analysis = analyze_decision(
        title="Test",
        participants=participants,
        alternatives=alternatives,
        criteria=criteria,
        ratings=ratings_lookup,
    )
    return analysis["results"], analysis["criteria"]


def calculate_consensus_steps(
    participants: list[str],
    criteria: list[dict[str, float | str]],
    alternatives: list[str],
    ratings_lookup: Mapping[str, float],
    top_choice: Mapping[str, object] | None,
) -> list[str]:
    analysis = analyze_decision(
        title="Test",
        participants=participants,
        alternatives=alternatives,
        criteria=criteria,
        ratings=ratings_lookup,
    )
    return analysis["consensusSteps"]


# =========================================================
# MAIN ENTRY POINT
# =========================================================


def analyze_decision(
    title: str,
    participants: Iterable[object],
    alternatives: Iterable[object],
    criteria: Iterable[Mapping[str, object]],
    ratings: Iterable[Mapping[str, object]] | Mapping[str, object],
    weights: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    normalized_participants = normalize_named_list(participants, "participant")
    normalized_alternatives = normalize_named_list(alternatives, "alternative")
    normalized_criteria = normalize_criteria(criteria)
    ratings_lookup = coerce_ratings_lookup(ratings)

    validate_input(
        normalized_participants,
        normalized_alternatives,
        normalized_criteria,
        ratings_lookup,
    )

    # Build judgements and run Monte Carlo SAW
    judgements = _build_judgements(
        normalized_participants,
        normalized_alternatives,
        normalized_criteria,
        ratings_lookup,
        weights,
    )
    criteria_names = [str(c["name"]) for c in normalized_criteria]
    discord_result = run_montecarlo_saw(
        judgements,
        criteria_names,
        normalized_alternatives,
        iterations=10000,
    )

    rank_prob_df = discord_result["rank_prob"]

    # Winner probabilities = P(rank 1) — already a proper distribution because
    # ties are now split fractionally inside the Monte Carlo loop.
    winner_probabilities: dict[str, float] = {}
    for alt in normalized_alternatives:
        col = "Rang 1"
        if col in rank_prob_df.columns:
            winner_probabilities[alt] = round(float(rank_prob_df.loc[alt, col]), 4)
        else:
            winner_probabilities[alt] = 0.0

    # Build deterministic display results using average weights + average ratings
    results: list[dict[str, object]] = []
    for alt in normalized_alternatives:
        by_participant: list[dict[str, object]] = []
        total_score = 0.0
        for p in normalized_participants:
            p_score = 0.0
            total_w = sum(judgements[p]["w"])
            for ci, c in enumerate(normalized_criteria):
                key = f"{p}__{alt}__{c['name']}"
                val = float(ratings_lookup.get(key, 5))
                w = judgements[p]["w"][ci]
                if total_w > 0:
                    p_score += val * (w / total_w)
                else:
                    p_score += val * (1.0 / len(normalized_criteria))
            p_score = round(p_score, 2)
            total_score += p_score
            by_participant.append({"participant": p, "score": p_score})
        avg_score = round(total_score / len(normalized_participants), 2) if normalized_participants else 0.0
        participant_scores = [float(x["score"]) for x in by_participant]
        min_score = min(participant_scores) if participant_scores else 0.0
        max_score = max(participant_scores) if participant_scores else 0.0
        disagreement = round(max_score - min_score, 2)
        win_prob = winner_probabilities.get(alt, 0.0)
        results.append({
            "alternative": alt,
            "avgScore": avg_score,
            "disagreement": disagreement,
            "entropy": 0.0,
            "acceptabilityRaw": win_prob,
            "acceptabilityNormalized": round(win_prob, 3),
            "byParticipant": by_participant,
        })

    results.sort(key=lambda item: (-float(item["acceptabilityNormalized"]), float(item["disagreement"])))
    top_choice = results[0] if results else None

    # Insights (English to match the UI)
    insights: list[str] = []
    if top_choice:
        insights.append(
            f"{top_choice['alternative']} currently offers the best balance of quality and group support."
        )
        insights.append(f"Group score: {top_choice['avgScore']:.2f} out of 5.")
        if float(top_choice["disagreement"]) > 0:
            insights.append(
                f"Spread between participants: {top_choice['disagreement']:.2f} points."
            )
        else:
            insights.append("All participants give this option the same weighted score.")
        if len(results) > 1:
            runner_up = results[1]
            gap = round(
                float(top_choice["acceptabilityNormalized"])
                - float(runner_up["acceptabilityNormalized"]),
                3,
            )
            if gap > 0:
                insights.append(
                    f"Lead over {runner_up['alternative']}: {gap} acceptability points."
                )
            else:
                insights.append(
                    f"Tied with {runner_up['alternative']} on acceptability — discussion may break the tie."
                )
        win_prob = winner_probabilities.get(str(top_choice["alternative"]), 0.0)
        insights.append(
            f"In the Monte Carlo simulation, {top_choice['alternative']} wins {round(win_prob * 100, 1)}% of the runs."
        )

    # Consensus steps (English)
    cutoff = float(discord_result.get("entropy_cutoff", 0.5 * math.log2(len(normalized_alternatives)) if len(normalized_alternatives) > 1 else 0.0))
    entropy_value = float(discord_result["entropy"])
    consensus_steps: list[str] = []
    if discord_result["consensus_reached"]:
        consensus_steps.append("Consensus reached — the group agrees on the leading option.")
        consensus_steps.append(
            f"Rank-1 entropy: {entropy_value:.4f} (cutoff: {cutoff:.4f})."
        )
        deviator = discord_result.get("top_deviator_always")
        if deviator and entropy_value > 0:
            consensus_steps.append(
                f"{deviator} differs the most from the group average — worth a quick check-in if you want full alignment."
            )
    else:
        top_person = discord_result["top_person"]
        if top_person:
            consensus_steps.append(
                f"No consensus yet. Largest deviation from the group: {top_person}."
            )
        else:
            consensus_steps.append("No consensus yet — opinions are spread across alternatives.")
        consensus_steps.append(
            f"Rank-1 entropy: {entropy_value:.4f} (cutoff: {cutoff:.4f})."
        )
        consensus_steps.append("Discuss the differences openly and adjust ratings to align the group.")
        consensus_steps.append("Use the chat to surface the underlying disagreement.")

    return {
        "title": _clean_label(title or "Gemeinsame Entscheidung", "title"),
        "participants": normalized_participants,
        "alternatives": normalized_alternatives,
        "criteria": normalize_weights(normalized_criteria),
        "completion": _calculate_completion(
            normalized_participants,
            normalized_alternatives,
            normalized_criteria,
            ratings_lookup,
        ),
        "results": results,
        "topChoice": top_choice,
        "winnerProbabilities": winner_probabilities,
        "insights": insights,
        "consensusSteps": consensus_steps,
        "consensusReached": discord_result["consensus_reached"],
        "topDeviator": discord_result["top_person"],
        "entropy": entropy_value,
        "entropyCutoff": cutoff,
    }
