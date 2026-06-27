# Standardised test case provided by the advisor (2026-05-04_Test-Data.xls).
#
# Three participants score five alternatives on three criteria. The figures are
# the advisor's reference judgement matrix mapped onto a readable office-location
# scenario. Some cells deliberately hold only two opinions (the third participant
# abstained) — the empirical opinion distribution is preserved exactly, so the
# Monte-Carlo entropy matches the advisor's reference (~2.29 of a max log2(5)).
#
# Per-participant importance weights are included too, capturing the disagreement
# on how important each criterion should be.

_PARTICIPANTS = ["Avery", "Blair", "Casey"]
_ALTERNATIVES = ["Berlin", "Lisbon", "Warsaw", "Dublin", "Vienna"]

# Per criterion -> alternative -> {participant: score}. Missing participants
# abstained on that cell (faithful to the advisor's 2-or-3 opinion cells).
_JUDGEMENTS = {
    "Cost-effectiveness": {
        "Berlin": {"Avery": 2, "Blair": 3},
        "Lisbon": {"Avery": 1, "Blair": 2, "Casey": 3},
        "Warsaw": {"Avery": 2, "Blair": 4},
        "Dublin": {"Avery": 1, "Blair": 4, "Casey": 5},
        "Vienna": {"Avery": 1, "Blair": 2, "Casey": 4},
    },
    "Talent availability": {
        "Berlin": {"Avery": 2, "Blair": 4},
        "Lisbon": {"Avery": 3, "Blair": 4},
        "Warsaw": {"Avery": 2, "Blair": 3, "Casey": 4},
        "Dublin": {"Avery": 1, "Blair": 2, "Casey": 3},
        "Vienna": {"Avery": 1, "Blair": 2, "Casey": 4},
    },
    "Infrastructure quality": {
        "Berlin": {"Avery": 1, "Blair": 4},
        "Lisbon": {"Avery": 2, "Blair": 3, "Casey": 4},
        "Warsaw": {"Avery": 2, "Blair": 3},
        "Dublin": {"Avery": 2, "Blair": 5},
        "Vienna": {"Avery": 1, "Blair": 3, "Casey": 5},
    },
}

# Per-participant importance weights (1-5) for each criterion.
_WEIGHTS = {
    "Avery": {"Cost-effectiveness": 2, "Talent availability": 2, "Infrastructure quality": 1},
    "Blair": {"Cost-effectiveness": 3, "Talent availability": 4, "Infrastructure quality": 3},
    "Casey": {"Cost-effectiveness": 4, "Talent availability": 5, "Infrastructure quality": 4},
}

_ratings = [
    {"participant": participant, "alternative": alternative, "criterion": criterion, "value": value}
    for criterion, per_alt in _JUDGEMENTS.items()
    for alternative, per_participant in per_alt.items()
    for participant, value in per_participant.items()
]

_weights = [
    {"participant": participant, "criterion": criterion, "value": value}
    for participant, per_crit in _WEIGHTS.items()
    for criterion, value in per_crit.items()
]

SAMPLE_SESSION = {
    "title": "Where should we open the new regional office?",
    "participants": _PARTICIPANTS,
    "alternatives": _ALTERNATIVES,
    # Suggested importance shown in the UI (derived from the average weights);
    # the per-participant weights below drive the actual analysis.
    "criteria": [
        {"name": "Cost-effectiveness", "weight": 32},
        {"name": "Talent availability", "weight": 39},
        {"name": "Infrastructure quality", "weight": 29},
    ],
    "ratings": _ratings,
    "weights": _weights,
}
