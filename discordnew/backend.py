import pandas as pd
import numpy as np
import random
import json
from collections import defaultdict
from math import log2

def load_config(filename="config.json"):
    with open(filename, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg["criteria"], cfg["alternatives"]

criteria, alternatives = load_config()

judgements = {}

def load_judgements_from_disk(filename="judgements.json"):
    global judgements
    with open(filename, "r", encoding="utf-8") as f:
        judgements = json.load(f)
    return judgements

def save_judgements_to_disk(filename="judgements.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(judgements, f, indent=2)

def update_judgement(person, w, scores):
    judgements[person]["w"] = w
    for idx, a in enumerate(alternatives):
        judgements[person][a] = scores[idx]

# === 4) ABWEICHUNGS-SCORE BERECHNEN ===

def compute_deviation_scores(judgements, criteria, alternatives):
    persons = list(judgements.keys())
    num_persons = len(persons)
    num_criteria = len(criteria)

    # a) Durchschnittsgewicht pro Kriterium
    all_weight_vectors = [judgements[p]["w"] for p in persons]
    weights_by_crit = list(zip(*all_weight_vectors))
    avg_weights = [sum(vals) / len(vals) for vals in weights_by_crit]

    # b) Mittelwert der Bewertungen pro (Kriterium × Alternative)
    mu_scores = {c: {} for c in criteria}
    for ci, c in enumerate(criteria):
        for a in alternatives:
            vals = [judgements[p][a][ci] for p in persons]
            mu_scores[c][a] = sum(vals) / len(vals)

    # c) Für jede Person: Abweichungen aufsummieren
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

# === 5) UPDATE VON URTEILEN ===

def update_judgement(person, new_weights, new_scores_all):
    judgements[person]["w"] = new_weights
    for idx, a in enumerate(alternatives):
        judgements[person][a] = new_scores_all[idx]

# === 6) SAW-HILFSFUNKTIONEN ===

def saw_raw(matrix, weights):
    matrix = np.array(matrix, dtype=float)
    weights = np.array(weights, dtype=float)
    scores = matrix.dot(weights)
    ranking = fair_ranking(scores)
    return scores, ranking

def fair_ranking(scores):
    sorted_scores = sorted(set(scores), reverse=True)
    rank_map = {score: rank + 1 for rank, score in enumerate(sorted_scores)}
    return [rank_map[s] for s in scores]

def compute_entropy(probabilities):
    return -sum(p * log2(p) for p in probabilities if p > 0)

# === 7) RUN_SIMULATION: MONTE-CARLO-SAW mit allen print(...) Ausgaben ===

def run_simulation():
    persons = list(judgements.keys())
    num_criteria = len(criteria)
    num_alts = len(alternatives)

    print("=== START DER MONTE-CARLO-SIMULATION ===")
    print(f"Personen: {persons}")
    print(f"Kriterien ({num_criteria}): {criteria}")
    print(f"Alternativen ({num_alts}): {alternatives}\n")

    # ----- a) Aggregierte Urteile zusammenstellen -----
    agg_data = {}
    aggregated_values = []
    for c_index, c in enumerate(criteria):
        row = []
        for a in alternatives:
            values = [judgements[p][a][c_index] for p in persons]
            unique = sorted(set(values))
            aggregated_values.append(unique)
            for i in range(3):
                row.append(unique[i] if i < len(unique) else np.nan)
        agg_data[c] = row

    columns = [f"{a}_{i}" for a in alternatives for i in range(1, 4)]
    agg_judgement_df = pd.DataFrame.from_dict(agg_data, orient="index", columns=columns)

    print(">> Aggregiertes Urteil (agg_judgement_df):")
    print(agg_judgement_df)
    print("\nEinzelne Unique-Werte pro (Kriterium×Alternative) in aggregated_values:")
    for idx, vals in enumerate(aggregated_values):
        print(f" [{idx:2d}]: {vals}")
    print("\n")

    # ----- b) Aggregierte Präferenzen (Gewichte) -----
    group_weights = [judgements[p]["w"] for p in persons]
    criteria_weights = list(zip(*group_weights))
    aggregated_prefs = [sorted(set(w)) for w in criteria_weights]
    agg_preferences_df = pd.DataFrame(aggregated_prefs, index=criteria)

    print(">> Aggregierte Präferenzen (agg_preferences_df):")
    print(agg_preferences_df)
    print("\n")

    # ----- c) Container für Acceptability-Indices initialisieren -----
    final_binary_tables = {
        alt: pd.DataFrame(0, index=criteria, columns=columns)
        for alt in alternatives
    }
    weight_columns = [
        f"{crit}-{j}" if j > 0 else crit
        for i, crit in enumerate(criteria)
        for j in range(len(aggregated_prefs[i]))
    ]
    final_weight_use_df = pd.DataFrame(0, index=alternatives, columns=weight_columns)

    rank_counts = defaultdict(lambda: defaultdict(int))
    winner_counts = {alt: 0 for alt in alternatives}

    # Optionale Speicherung der ersten Zufallsziehung
    first_random_df = None
    first_random_weights_df = None
    first_saw_result_df = None
    first_rank_result_df = None

    # ----- d) Monte-Carlo-Schleife über 10.000 Läufe -----
    for run in range(10000):
        # 1) Zufallsbewertungen aus aggregated_values ziehen
        random_matrix = []
        used_values = []
        counter = 0
        for c_index in range(num_criteria):
            row = []
            row_used = []
            for a_index, a in enumerate(alternatives):
                val = random.choice(aggregated_values[counter])
                row.append(val)
                row_used.append(val)
                counter += 1
            random_matrix.append(row)
            used_values.append(row_used)

        random_df = pd.DataFrame(random_matrix, index=criteria, columns=alternatives)

        # 2) Zufallsgewichte aus aggregated_prefs ziehen
        random_weights = [random.choice(w) for w in aggregated_prefs]

        # 3) SAW: Score + Rang berechnen
        matrix_for_saw = random_df.T.values
        scores, ranks = saw_raw(matrix_for_saw, np.array(random_weights))

        # Beim ersten Lauf (run=0) Details ausgeben
        if run == 0:
            first_random_df = random_df.copy()
            first_random_weights_df = pd.DataFrame([random_weights], columns=criteria, index=["Erste Ziehung"])
            first_saw_result_df = pd.DataFrame({
                "Alternative": alternatives,
                "Score": scores,
                "Rang": ranks
            })
            unique_ranks = sorted(set(ranks))
            rank_columns = [f"Rang {r}" for r in unique_ranks]
            first_rank_result_df = pd.DataFrame(0, index=alternatives, columns=rank_columns)
            for alt_, r_ in zip(alternatives, ranks):
                first_rank_result_df.loc[alt_, f"Rang {r_}"] = 1

            print(">>> ERSTER RUN (run=0) <<<")
            print("Randomisierte Bewertungs-Matrix (random_df):")
            print(first_random_df)
            print("\nZufallsgewichte (erste Ziehung):")
            print(first_random_weights_df)
            print("\nSAW-Ergebnis (erste Scores & Ränge):")
            print(first_saw_result_df)
            print("\nBinäre Rang-Verteilung (erste Ziehung):")
            print(first_rank_result_df)
            print("\n-------------------------------------------------------\n")

        # 4) Akzeptabilitäts-Indizes aktualisieren
        winners = [alternatives[i] for i, rnk in enumerate(ranks) if rnk == 1]
        for winner in winners:
            winner_counts[winner] += 1
            table = final_binary_tables[winner]

            # a) Judgement Acceptability
            for c_index, c in enumerate(criteria):
                for a_index, a in enumerate(alternatives):
                    used_val = used_values[c_index][a_index]
                    values = [judgements[p][a][c_index] for p in persons]
                    unique = sorted(set(values))
                    for i, val in enumerate(unique[:3]):
                        col_name = f"{a}_{i+1}"
                        if val == used_val:
                            table.loc[c, col_name] += 1

            # b) Preference Acceptability (Gewichte)
            for i, crit in enumerate(criteria):
                selected_weight = random_weights[i]
                values = aggregated_prefs[i]
                for j, v in enumerate(values):
                    col_name = f"{crit}-{j}" if j > 0 else crit
                    if v == selected_weight:
                        final_weight_use_df.loc[winner, col_name] += 1

        # 5) Rangverteilung updaten
        for alt_, rnk in zip(alternatives, ranks):
            rank_counts[alt_][rnk] += 1

    # ----- e) Rang-Häufigkeit & Wahrscheinlichkeiten berechnen -----
    all_ranks = sorted({r for alt_ranks in rank_counts.values() for r in alt_ranks})
    rank_freq_df = pd.DataFrame(0, index=alternatives, columns=[f"Rang {r}" for r in all_ranks])
    for alt_ in alternatives:
        for r_ in all_ranks:
            rank_freq_df.loc[alt_, f"Rang {r_}"] = rank_counts[alt_][r_]
    rank_prob_df = rank_freq_df / 10000  # Normiert auf Wahrscheinlichkeiten

    print(">>> RANG-HÄUFIGKEITEN (rank_freq_df):")
    print(rank_freq_df)
    print("\n>>> RANG-WAHRSCHEINLICHKEITEN (rank_prob_df):")
    print(rank_prob_df)
    print("\n")

    # ----- f) Judgement-Entropie-Matrix berechnen -----
    entropy_matrix = pd.DataFrame(index=criteria, columns=columns)
    for c in criteria:
        for col in columns:
            freqs = [final_binary_tables[alt_].loc[c, col] for alt_ in alternatives]
            total = sum(freqs)
            if total > 0:
                probs = [f / total for f in freqs]
            else:
                probs = [0] * len(alternatives)
            entropy_matrix.loc[c, col] = compute_entropy(probs)

    print(">>> JUDGEMENT-ENTROPIE-MATRIX (entropy_matrix):")
    print(entropy_matrix)
    print("\n")

    # ----- g) Präferenz-Entropien berechnen -----
    pref_entropy = {}
    for col in final_weight_use_df.columns:
        freqs = final_weight_use_df[col].values
        total = sum(freqs)
        if total > 0:
            probs = [f / total for f in freqs]
        else:
            probs = [0] * len(freqs)
        pref_entropy[col] = compute_entropy(probs)
    preference_entropy_df = pd.DataFrame([pref_entropy], index=["Entropy"])

    print(">>> PRÄFERENZ-ENTROPIEN (preference_entropy_df):")
    print(preference_entropy_df)
    print("\n")

    # ----- h) Soft-Consensus-Prüfung -----
    hmax = np.log2(len(alternatives))
    h_cutoff = 0.5 * hmax
    h_curr_max = float(entropy_matrix.values.max())

    print(f"Maximale Entropie aktuell: {h_curr_max:.4f} (H_cutoff = {h_cutoff:.4f})")
    print("=== ENDE DER MONTE-CARLO-SIMULATION ===\n")

    if h_curr_max > h_cutoff:
        deviations = compute_deviation_scores(judgements, criteria, alternatives)
        sorted_devs = sorted(deviations.items(), key=lambda x: x[1], reverse=True)
        top_person, top_dev = sorted_devs[0]
        print(f"KEIN Konsens. Top-Deviator: {top_person} (Abweichung = {top_dev:.4f})\n")
        return {
            "consensus_reached": False,
            "top_person": top_person,
            "entropy": h_curr_max,
            "rank_prob": rank_prob_df
        }
    else:
        print("Konsens erreicht! Entropie ist niedrig genug.\n")
        return {
            "consensus_reached": True,
            "top_person": None,
            "entropy": h_curr_max,
            "rank_prob": rank_prob_df
        }
    
# das globale Dict für die Labels
labels = {}

def load_labels(filename="labels.json"):
    """
    Liest labels.json ein. Fehlt die Datei oder enthält sie kein valides JSON,
    dann wird labels einfach auf {} zurückgesetzt – ohne Rekursion!
    """
    global labels
    try:
        with open(filename, "r", encoding="utf-8") as f:
            labels = json.load(f)
    except FileNotFoundError:
        # Datei existiert nicht
        labels = {}
    except json.JSONDecodeError:
        # Datei ist leer oder ungültig
        labels = {}

# Direkt **einmal** beim Modul-Import aufrufen, aber ohne Rekursion:
load_labels()
       
# Direkt testen, falls du backend.py alleine ausführst:
if __name__ == "__main__":
    load_judgements_from_disk()
    result = run_simulation()
    print("Ergebnis von run_simulation():")
    print(result)