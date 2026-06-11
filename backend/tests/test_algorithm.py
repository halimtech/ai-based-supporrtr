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

    def test_normalize_weights_preserves_100_percent_total(self) -> None:
        normalized = normalize_weights(self.criteria)
        total = sum(item["normalizedWeight"] for item in normalized)
        self.assertAlmostEqual(total, 100.0, places=2)

    def test_calculate_results_ranks_lissabon_first(self) -> None:
        results, _ = calculate_results(
            self.participants,
            self.alternatives,
            self.criteria,
            self.ratings_lookup,
        )
        self.assertEqual(results[0]["alternative"], "Lissabon")
        self.assertGreater(
            results[0]["acceptabilityNormalized"],
            results[1]["acceptabilityNormalized"],
        )

    def test_validate_input_rejects_missing_rating(self) -> None:
        broken_lookup = dict(self.ratings_lookup)
        broken_lookup.pop("Mia__Lissabon__Budget")

        with self.assertRaises(ValueError) as context:
            validate_input(
                self.participants,
                self.alternatives,
                self.criteria,
                broken_lookup,
            )

        self.assertIn("missing rating", str(context.exception))

    def test_consensus_steps_end_with_entropy_estimate(self) -> None:
        results, _ = calculate_results(
            self.participants,
            self.alternatives,
            self.criteria,
            self.ratings_lookup,
        )
        steps = calculate_consensus_steps(
            self.participants,
            self.criteria,
            self.alternatives,
            self.ratings_lookup,
            results[0],
        )
        self.assertTrue(steps)
        self.assertTrue(
            any("entropy" in step.lower() for step in steps),
            f"expected an entropy mention in consensus steps, got: {steps}",
        )

    def test_analyze_decision_returns_complete_payload(self) -> None:
        analysis = analyze_decision(
            title=SAMPLE_SESSION["title"],
            participants=self.participants,
            alternatives=self.alternatives,
            criteria=self.criteria,
            ratings=SAMPLE_SESSION["ratings"],
        )

        self.assertEqual(analysis["completion"], 100)
        self.assertEqual(analysis["topChoice"]["alternative"], "Lissabon")
        self.assertEqual(len(analysis["results"]), 3)
        self.assertTrue(analysis["insights"])
        self.assertIn("Lissabon", analysis["winnerProbabilities"])


if __name__ == "__main__":
    unittest.main()
