import unittest

from app.algorithm import (
    analyze_decision,
    calculate_consensus_steps,
    calculate_results,
    coerce_ratings_lookup,
    normalize_criteria,
    normalize_weights,
    validate_input,
)
from app.sample_data import SAMPLE_SESSION


class DecisionAlgorithmTests(unittest.TestCase):
    def setUp(self) -> None:
        self.participants = list(SAMPLE_SESSION["participants"])
        self.alternatives = list(SAMPLE_SESSION["alternatives"])
        self.criteria = normalize_criteria(SAMPLE_SESSION["criteria"])
        self.ratings_lookup = coerce_ratings_lookup(SAMPLE_SESSION["ratings"])
        self.weights = SAMPLE_SESSION["weights"]

    def test_normalize_weights_preserves_100_percent_total(self) -> None:
        normalized = normalize_weights(self.criteria)
        total = sum(item["normalizedWeight"] for item in normalized)
        self.assertAlmostEqual(total, 100.0, places=2)

    def test_calculate_results_returns_all_alternatives_ranked(self) -> None:
        results, _ = calculate_results(
            self.participants,
            self.alternatives,
            self.criteria,
            self.ratings_lookup,
        )
        self.assertEqual(len(results), len(self.alternatives))
        self.assertIn(results[0]["alternative"], self.alternatives)
        self.assertGreaterEqual(
            results[0]["acceptabilityNormalized"],
            results[1]["acceptabilityNormalized"],
        )

    def test_validate_input_allows_sparse_grid(self) -> None:
        # Faithful to the advisor data, some cells hold only two opinions; a
        # missing rating must NOT raise (a full grid is no longer required).
        try:
            validate_input(
                self.participants,
                self.alternatives,
                self.criteria,
                self.ratings_lookup,
            )
        except ValueError as error:  # pragma: no cover - failure path
            self.fail(f"sparse grid should be accepted, got: {error}")

    def test_validate_input_rejects_unknown_participant(self) -> None:
        broken_lookup = dict(self.ratings_lookup)
        broken_lookup["Nobody__Berlin__Cost-effectiveness"] = 3

        with self.assertRaises(ValueError) as context:
            validate_input(
                self.participants,
                self.alternatives,
                self.criteria,
                broken_lookup,
            )

        self.assertIn("unknown participant", str(context.exception))

    def test_consensus_steps_mention_agreement_strength(self) -> None:
        steps = calculate_consensus_steps(
            self.participants,
            self.criteria,
            self.alternatives,
            self.ratings_lookup,
            None,
        )
        self.assertTrue(steps)
        self.assertTrue(
            any("agreement strength" in step.lower() for step in steps),
            f"expected an agreement strength mention in consensus steps, got: {steps}",
        )

    def test_analyze_decision_returns_complete_payload(self) -> None:
        analysis = analyze_decision(
            title=SAMPLE_SESSION["title"],
            participants=self.participants,
            alternatives=self.alternatives,
            criteria=self.criteria,
            ratings=SAMPLE_SESSION["ratings"],
            weights=self.weights,
        )

        self.assertEqual(len(analysis["results"]), len(self.alternatives))
        self.assertIn(analysis["topChoice"]["alternative"], self.alternatives)
        self.assertEqual(set(analysis["winnerProbabilities"]), set(self.alternatives))
        self.assertTrue(analysis["insights"])
        self.assertLessEqual(analysis["completion"], 100)
        self.assertGreater(analysis["completion"], 0)

    def test_consensus_threshold_is_70_percent(self) -> None:
        analysis = analyze_decision(
            title=SAMPLE_SESSION["title"],
            participants=self.participants,
            alternatives=self.alternatives,
            criteria=self.criteria,
            ratings=SAMPLE_SESSION["ratings"],
            weights=self.weights,
        )
        self.assertEqual(analysis["agreementThreshold"], 70)

    def test_critical_conflict_is_an_item_never_a_person(self) -> None:
        analysis = analyze_decision(
            title=SAMPLE_SESSION["title"],
            participants=self.participants,
            alternatives=self.alternatives,
            criteria=self.criteria,
            ratings=SAMPLE_SESSION["ratings"],
            weights=self.weights,
        )
        # The advisor data is highly divergent, so consensus is not reached and a
        # single most-critical conflict is surfaced.
        self.assertFalse(analysis["consensusReached"])
        self.assertIsNone(analysis["topDeviator"])
        conflict = analysis["criticalConflict"]
        self.assertIsNotNone(conflict)
        self.assertIn(conflict["kind"], {"rating", "weight"})
        self.assertIn(conflict["criterion"], [c["name"] for c in self.criteria])
        # It must point at an item (criterion / alternative), never a participant.
        self.assertNotIn("participant", conflict)
        for person in self.participants:
            self.assertNotIn(person, str(conflict.get("alternative")))


if __name__ == "__main__":
    unittest.main()
