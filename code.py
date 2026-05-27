import math
import random
from pprint import pprint

# =========================================================
# INPUT DATA - EDIT THIS SECTION MANUALLY
# =========================================================

participants = ["Anna", "Max", "Lina"]

alternatives = ["Barcelona", "Rom", "Athen"]

criteria = [
    {"name": "Preis", "weight": 30},
    {"name": "Wetter", "weight": 25},
    {"name": "Aktivitäten", "weight": 25},
    {"name": "Reiseaufwand", "weight": 20},
]

# Format:
# "Participant__Alternative__Criterion": value
# value should usually be between 1 and 5

ratings = {
    # Anna
    "Anna__Barcelona__Preis": 4,
    "Anna__Barcelona__Wetter": 5,
    "Anna__Barcelona__Aktivitäten": 5,
    "Anna__Barcelona__Reiseaufwand": 3,

    "Anna__Rom__Preis": 3,
    "Anna__Rom__Wetter": 4,
    "Anna__Rom__Aktivitäten": 4,
    "Anna__Rom__Reiseaufwand": 4,

    "Anna__Athen__Preis": 5,
    "Anna__Athen__Wetter": 3,
    "Anna__Athen__Aktivitäten": 3,
    "Anna__Athen__Reiseaufwand": 3,

    # Max
    "Max__Barcelona__Preis": 5,
    "Max__Barcelona__Wetter": 4,
    "Max__Barcelona__Aktivitäten": 5,
    "Max__Barcelona__Reiseaufwand": 4,

    "Max__Rom__Preis": 4,
    "Max__Rom__Wetter": 4,
    "Max__Rom__Aktivitäten": 3,
    "Max__Rom__Reiseaufwand": 3,

    "Max__Athen__Preis": 3,
    "Max__Athen__Wetter": 5,
    "Max__Athen__Aktivitäten": 4,
    "Max__Athen__Reiseaufwand": 4,

    # Lina
    "Lina__Barcelona__Preis": 3,
    "Lina__Barcelona__Wetter": 5,
    "Lina__Barcelona__Aktivitäten": 4,
    "Lina__Barcelona__Reiseaufwand": 3,

    "Lina__Rom__Preis": 4,
    "Lina__Rom__Wetter": 3,
    "Lina__Rom__Aktivitäten": 5,
    "Lina__Rom__Reiseaufwand": 4,

    "Lina__Athen__Preis": 4,
    "Lina__Athen__Wetter": 4,
    "Lina__Athen__Aktivitäten": 4,
    "Lina__Athen__Reiseaufwand": 5,
}

MONTE_CARLO_ITERATIONS = 5000
MONTE_CARLO_RANDOM_SEED = 42

# =========================================================
# HELPERS
# =========================================================

def clamp(num, min_value, max_value):
    return max(min_value, min(max_value, num))


def normalize_weights(criteria_list):
    total = sum(float(c.get("weight", 0) or 0) for c in criteria_list)

    if total == 0:
        return [
            {
                "name": c["name"],
                "weight": c["weight"],
                "normalizedWeight": 0.0,
            }
            for c in criteria_list
        ]

    normalized = []
    for c in criteria_list:
        normalized.append({
            "name": c["name"],
            "weight": c["weight"],
            "normalizedWeight": (float(c.get("weight", 0) or 0) / total) * 100
        })
    return normalized


def calculate_entropy(values):
    if not values:
        return 0.0

    total = sum(values)
    if total <= 0:
        return 0.0

    entropy = 0.0
    for v in values:
        p = v / total
        if p > 0:
            entropy -= p * math.log(p)

    return round(entropy, 3)


def validate_input(participants, alternatives, criteria, ratings):
    errors = []

    if not participants:
        errors.append("participants list is empty")

    if not alternatives:
        errors.append("alternatives list is empty")

    if not criteria:
        errors.append("criteria list is empty")

    for c in criteria:
        if "name" not in c or "weight" not in c:
            errors.append(f"criterion is invalid: {c}")

    for participant in participants:
        for alternative in alternatives:
            for criterion in criteria:
                key = f"{participant}__{alternative}__{criterion['name']}"
                if key not in ratings:
                    errors.append(f"missing rating for key: {key}")

    if errors:
        raise ValueError("Input validation failed:\n- " + "\n- ".join(errors))


# =========================================================
# MAIN CALCULATION
# =========================================================

def calculate_results(participants, alternatives, criteria, ratings):
    criteria_with_weights = normalize_weights(criteria)
    raw_results = []

    for alternative in alternatives:
        total_score = 0.0
        by_participant = []

        for participant in participants:
            participant_score = 0.0

            for criterion in criteria_with_weights:
                key = f"{participant}__{alternative}__{criterion['name']}"
                value = float(ratings.get(key, 0))
                participant_score += value * (criterion["normalizedWeight"] / 100)

            participant_score = round(participant_score, 2)
            total_score += participant_score

            by_participant.append({
                "participant": participant,
                "score": participant_score
            })

        avg_score = round(total_score / len(participants), 2) if participants else 0.0

        score_values = [x["score"] for x in by_participant]
        min_score = min(score_values) if score_values else 0.0
        max_score = max(score_values) if score_values else 0.0

        disagreement = round(max_score - min_score, 2)
        entropy = calculate_entropy(score_values)
        acceptability_raw = round(avg_score * (1 / (1 + disagreement + entropy)), 3)

        raw_results.append({
            "alternative": alternative,
            "avgScore": avg_score,
            "disagreement": disagreement,
            "entropy": entropy,
            "acceptabilityRaw": acceptability_raw,
            "acceptabilityNormalized": 0.0,
            "byParticipant": by_participant,
        })

    total_acceptability = sum(r["acceptabilityRaw"] for r in raw_results)

    normalized_results = []
    for r in raw_results:
        item = dict(r)
        item["acceptabilityNormalized"] = (
            round(r["acceptabilityRaw"] / total_acceptability, 3)
            if total_acceptability > 0 else 0.0
        )
        normalized_results.append(item)

    normalized_results.sort(
        key=lambda x: (-x["acceptabilityNormalized"], x["disagreement"])
    )

    return normalized_results, criteria_with_weights


# =========================================================
# CONSENSUS STEPS
# =========================================================

def calculate_consensus_steps(participants, criteria, alternatives, ratings, top_choice):
    if not participants or not criteria or not alternatives or not top_choice:
        return []

    current_entropy = top_choice["entropy"]
    steps = []

    for criterion in criteria:
        participant_averages = []

        for participant in participants:
            values = []
            for alternative in alternatives:
                key = f"{participant}__{alternative}__{criterion['name']}"
                values.append(float(ratings.get(key, 0)))

            average = sum(values) / len(values) if values else 0.0
            participant_averages.append({
                "participant": participant,
                "value": average
            })

        participant_averages.sort(key=lambda x: x["value"])

        spread = (
            participant_averages[-1]["value"] - participant_averages[0]["value"]
            if len(participant_averages) > 1 else 0.0
        )

        if spread >= 0.5 and len(steps) < 3:
            low = participant_averages[0]
            high = participant_averages[-1]
            new_entropy = max(0, round(current_entropy - spread * 0.08, 3))

            steps.append(
                f'Schritt {len(steps) + 1}: Höchster Konflikt beim Kriterium "{criterion["name"]}". '
                f'{high["participant"]} und {low["participant"]} sollten ihre Einschätzungen gemeinsam besprechen. '
                f'Konfliktspanne = {spread:.2f}, potenzielle Entropie = {new_entropy}.'
            )

            current_entropy = new_entropy

    if not steps:
        steps.append(
            "Die Gruppe zeigt bereits eine relativ hohe Übereinstimmung. "
            "Es sind aktuell keine zusätzlichen Konsensschritte notwendig."
        )
    else:
        steps.append(
            f"Geschätzte finale Entropie nach den vorgeschlagenen Schritten: {current_entropy}."
        )

    return steps


# =========================================================
# MONTE CARLO SIMULATION
# =========================================================

def monte_carlo_simulation(participants, alternatives, criteria, ratings, iterations=5000, seed=42):
    random.seed(seed)
    criteria_with_weights = normalize_weights(criteria)
    wins = {a: 0 for a in alternatives}

    for _ in range(iterations):
        scores = {}

        for alternative in alternatives:
            total_score = 0.0

            for participant in participants:
                participant_score = 0.0

                for criterion in criteria_with_weights:
                    key = f"{participant}__{alternative}__{criterion['name']}"
                    base_value = float(ratings.get(key, 3))

                    noise = (random.random() - 0.5) * 0.4
                    simulated_value = clamp(base_value + noise, 1, 5)

                    participant_score += simulated_value * (criterion["normalizedWeight"] / 100)

                total_score += participant_score

            scores[alternative] = total_score / len(participants) if participants else 0.0

        winner = sorted(scores.items(), key=lambda x: x[1], reverse=True)[0][0]
        wins[winner] += 1

    probabilities = {
        a: round(wins[a] / iterations, 4) if iterations > 0 else 0.0
        for a in alternatives
    }

    return probabilities


# =========================================================
# PRETTY OUTPUT
# =========================================================

def print_results_table(results):
    print("\n=== RESULTS TABLE ===")
    header = (
        f"{'Alternative':<12} | {'AvgScore':<8} | {'Disagree':<9} | "
        f"{'Entropy':<7} | {'AccRaw':<7} | {'AccNorm':<7}"
    )
    print(header)
    print("-" * len(header))

    for r in results:
        print(
            f"{r['alternative']:<12} | "
            f"{r['avgScore']:<8.2f} | "
            f"{r['disagreement']:<9.2f} | "
            f"{r['entropy']:<7.3f} | "
            f"{r['acceptabilityRaw']:<7.3f} | "
            f"{r['acceptabilityNormalized']:<7.3f}"
        )


def print_participant_scores(results):
    print("\n=== PARTICIPANT SCORES ===")
    for r in results:
        print(f"\n{r['alternative']}:")
        for p in r["byParticipant"]:
            print(f"  - {p['participant']}: {p['score']:.2f}")


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":
    validate_input(participants, alternatives, criteria, ratings)

    results, criteria_with_weights = calculate_results(
        participants, alternatives, criteria, ratings
    )

    top_choice = results[0] if results else None

    consensus_steps = calculate_consensus_steps(
        participants, criteria, alternatives, ratings, top_choice
    )

    monte_carlo_results = monte_carlo_simulation(
        participants,
        alternatives,
        criteria,
        ratings,
        iterations=MONTE_CARLO_ITERATIONS,
        seed=MONTE_CARLO_RANDOM_SEED,
    )

    print("\n=== NORMALIZED CRITERIA ===")
    pprint(criteria_with_weights)

    print_results_table(results)
    print_participant_scores(results)

    print("\n=== TOP CHOICE ===")
    pprint(top_choice)

    print("\n=== CONSENSUS STEPS ===")
    for step in consensus_steps:
        print("-", step)

    print("\n=== MONTE CARLO PROBABILITIES ===")
    for alt, prob in monte_carlo_results.items():
        print(f"{alt}: {prob * 100:.2f}%")