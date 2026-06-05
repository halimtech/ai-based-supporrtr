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


def run_montecarlo_saw(
    judgements: dict,
    criteria: list[str],
    alternatives: list[str],
    iterations: int = 10000,
) -> dict:
    persons = list(judgements.keys())
    num_criteria = len(criteria)
    num_alts = len(alternatives)

    # a) Aggregated judgments
    aggregated_values: list[list[float]] = []
    for c_index, c in enumerate(criteria):
        for a in alternatives:
            values = [judgements[p][a][c_index] for p in persons]
            unique = sorted(set(values))
            aggregated_values.append(unique)

    columns = [f"{a}_{i}" for a in alternatives for i in range(1, 4)]

    # b) Aggregated preferences (weights)
    group_weights = [judgements[p]["w"] for p in persons]
    criteria_weights = list(zip(*group_weights))
    aggregated_prefs = [sorted(set(w)) for w in criteria_weights]

    # c) Containers for acceptability indices
    final_binary_tables = {alt: pd.DataFrame(0, index=criteria, columns=columns) for alt in alternatives}
    weight_columns = [
        f"{crit}-{j}" if j > 0 else crit
        for i, crit in enumerate(criteria)
        for j in range(len(aggregated_prefs[i]))
    ]
    final_weight_use_df = pd.DataFrame(0, index=alternatives, columns=weight_columns)
    rank_counts: dict[str, dict[int, int]] = defaultdict(lambda: defaultdict(int))
    winner_counts = {alt: 0 for alt in alternatives}

    # d) Monte Carlo loop
    for _ in range(iterations):
        random_matrix: list[list[float]] = []
        used_values: list[list[float]] = []
        counter = 0
        for c_index in range(num_criteria):
            row: list[float] = []
            row_used: list[float] = []
            for a in alternatives:
                val = random.choice(aggregated_values[counter])
                row.append(val)
                row_used.append(val)
                counter += 1
            random_matrix.append(row)
            used_values.append(row_used)

        random_df = pd.DataFrame(random_matrix, index=criteria, columns=alternatives)
        random_weights = [random.choice(w) for w in aggregated_prefs]
        matrix_for_saw = random_df.T.values
        scores, ranks = saw_raw(matrix_for_saw, random_weights)

        # Update acceptability indices
        winners = [alternatives[i] for i, rnk in enumerate(ranks) if rnk == 1]
        for winner in winners:
            winner_counts[winner] += 1
            table = final_binary_tables[winner]
            for c_index, c in enumerate(criteria):
                for a_index, a in enumerate(alternatives):
                    used_val = used_values[c_index][a_index]
                    values = [judgements[p][a][c_index] for p in persons]
                    unique = sorted(set(values))
                    for i, val in enumerate(unique[:3]):
                        col_name = f"{a}_{i+1}"
                        if val == used_val:
                            table.loc[c, col_name] += 1
            for i, crit in enumerate(criteria):
                selected_weight = random_weights[i]
                values = aggregated_prefs[i]
                for j, v in enumerate(values):
                    col_name = f"{crit}-{j}" if j > 0 else crit
                    if v == selected_weight:
                        final_weight_use_df.loc[winner, col_name] += 1

        # Update rank counts
        for alt_, rnk in zip(alternatives, ranks):
            rank_counts[alt_][rnk] += 1

    # e) Rank probabilities
    all_ranks = sorted({r for alt_ranks in rank_counts.values() for r in alt_ranks})
    rank_freq_df = pd.DataFrame(0, index=alternatives, columns=[f"Rang {r}" for r in all_ranks])
    for alt_ in alternatives:
        for r_ in all_ranks:
            rank_freq_df.loc[alt_, f"Rang {r_}"] = rank_counts[alt_][r_]
    rank_prob_df = rank_freq_df / iterations

    # f) Judgement entropy matrix
    entropy_matrix = pd.DataFrame(index=criteria, columns=columns)
    for c in criteria:
        for col in columns:
            freqs = [final_binary_tables[alt_].loc[c, col] for alt_ in alternatives]
            total = sum(freqs)
            if total > 0:
                probs = [f / total for f in freqs]
            else:
                probs = [0.0] * len(alternatives)
            entropy_matrix.loc[c, col] = compute_entropy(probs)

    # g) Preference entropies
    pref_entropy = {}
    for col in final_weight_use_df.columns:
        freqs = final_weight_use_df[col].values
        total = sum(freqs)
        if total > 0:
            probs = [f / total for f in freqs]
        else:
            probs = [0.0] * len(freqs)
        pref_entropy[col] = compute_entropy(probs)
    preference_entropy_df = pd.DataFrame([pref_entropy], index=["Entropy"])

    # h) Soft consensus check
    hmax = np.log2(len(alternatives))
    h_cutoff = 0.5 * hmax
    h_curr_max = float(entropy_matrix.values.max())

    if h_curr_max > h_cutoff:
        deviations = compute_deviation_scores(judgements, criteria, alternatives)
        sorted_devs = sorted(deviations.items(), key=lambda x: x[1], reverse=True)
        top_person, top_dev = sorted_devs[0]
        return {
            "consensus_reached": False,
            "top_person": top_person,
            "entropy": h_curr_max,
            "rank_prob": rank_prob_df,
            "winner_counts": winner_counts,
        }
    else:
        return {
            "consensus_reached": True,
            "top_person": None,
            "entropy": h_curr_max,
            "rank_prob": rank_prob_df,
            "winner_counts": winner_counts,
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
    judgements: dict = {}
    for p in participants:
        if weights_list:
            w = []
            for c in criteria:
                wv = next(
                    (float(x["value"]) for x in weights_list if str(x["participant"]) == p and str(x["criterion"]) == str(c["name"])),
                    float(c.get("weight", 5)),
                )
                w.append(wv)
        else:
            w = [float(c.get("weight", 5)) for c in criteria]
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

    # Winner probabilities = P(Rang 1)
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
            "acceptabilityNormalized": 0.0,
            "byParticipant": by_participant,
        })

    total_acceptability = sum(float(r["acceptabilityRaw"]) for r in results)
    for r in results:
        r["acceptabilityNormalized"] = (
            round(float(r["acceptabilityRaw"]) / total_acceptability, 3)
            if total_acceptability > 0
            else 0.0
        )

    results.sort(key=lambda item: (-float(item["acceptabilityNormalized"]), float(item["disagreement"])))
    top_choice = results[0] if results else None

    # Insights
    insights: list[str] = []
    if top_choice:
        insights.append(
            f"{top_choice['alternative']} hat aktuell die beste Balance aus Qualität und Zustimmung."
        )
        insights.append(f"Der Gruppenscore liegt bei {top_choice['avgScore']:.2f}.")
        insights.append(f"Die Spannweite in der Gruppe beträgt {top_choice['disagreement']:.2f}.")
        if len(results) > 1:
            runner_up = results[1]
            gap = round(
                float(top_choice["acceptabilityNormalized"])
                - float(runner_up["acceptabilityNormalized"]),
                3,
            )
            insights.append(
                f"Der Vorsprung vor {runner_up['alternative']} beträgt {gap} Acceptability-Punkte."
            )
        win_prob = winner_probabilities.get(str(top_choice["alternative"]), 0.0)
        insights.append(
            f"In der Monte-Carlo-Simulation gewinnt {top_choice['alternative']} in {round(win_prob * 100, 1)}% der Durchläufe."
        )

    # Consensus steps
    consensus_steps: list[str] = []
    if discord_result["consensus_reached"]:
        consensus_steps.append("Konsens erreicht! Die Entropie ist niedrig genug.")
        consensus_steps.append(f"Maximale Entropie: {discord_result['entropy']:.4f}.")
    else:
        top_person = discord_result["top_person"]
        consensus_steps.append(f"Kein Konsens erreicht. Größte Abweichung: {top_person}.")
        consensus_steps.append(
            f"Maximale Entropie: {discord_result['entropy']:.4f} (Cutoff: {0.5 * math.log2(len(normalized_alternatives)):.4f})."
        )
        consensus_steps.append("Diskutiert eure Bewertungen und passt sie an, um den Konsens zu verbessern.")
        consensus_steps.append("Benutzt den Chat, um die unterschiedlichen Meinungen zu klären.")

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
        "entropy": discord_result["entropy"],
    }
