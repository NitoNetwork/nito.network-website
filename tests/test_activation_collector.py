import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location("collector", Path(__file__).parents[1] / "scripts/collect-activation.py")
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)
NOW = 1_800_000_000
TARGET = 1_165_432


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.tip = {"height": 1_100_000, "timestamp": NOW - 10, "id": "a" * 64}
        self.past = {"height": self.tip["height"] - 1440, "timestamp": self.tip["timestamp"] - 90_720, "id": "b" * 64}
        self.calls = []

    def get(self, path):
        self.calls.append(path)
        if path == "/api/v1/blocks":
            return [self.tip]
        return [self.past]

    def test_fixed_collection_cost_and_observed_rate(self):
        result = collector.collect(TARGET, NOW, self.get)
        self.assertEqual(result["remaining"], 65432)
        self.assertEqual(result["secondsPerBlock"], 63)
        self.assertFalse(result["confirmed"])
        self.assertEqual(len(self.calls), 2)

    def test_corrupt_data_rejected(self):
        for field, value in [("height", True), ("id", "oops"), ("timestamp", NOW + 7201)]:
            with self.subTest(field=field):
                original = self.tip[field]
                self.tip[field] = value
                with self.assertRaises(ValueError):
                    collector.collect(TARGET, NOW, self.get)
                self.tip[field] = original
        self.past["height"] -= 1
        with self.assertRaises(ValueError):
            collector.collect(TARGET, NOW, self.get)

    def test_confirmation_must_match_tip_network_and_activation(self):
        self.tip["height"] = TARGET
        self.past["height"] = TARGET - 1440
        confirmed = {"chain": "main", "status": "confirmed", "source": "core", "privateTxActivationHeight": TARGET, "activated": True, "blocks": TARGET, "bestblockhash": "a" * 64}
        def get(path):
            return confirmed if path.endswith("/pools") else self.get(path)
        self.assertTrue(collector.collect(TARGET, NOW, get)["confirmed"])
        for key, bad in [("chain", "test"), ("blocks", TARGET - 1), ("privateTxActivationHeight", TARGET - 1), ("activated", False), ("bestblockhash", "c" * 64)]:
            old = confirmed[key]
            confirmed[key] = bad
            self.assertFalse(collector.collect(TARGET, NOW, get)["confirmed"])
            confirmed[key] = old

    def test_v3_missing_confirmation_is_not_activation(self):
        self.tip["height"] = TARGET
        self.past["height"] = TARGET - 1440
        def get(path):
            if path.endswith("/pools"):
                raise HTTPError(path, 404, "Not found", {}, None)
            return self.get(path)
        self.assertFalse(collector.collect(TARGET, NOW, get)["confirmed"])

    def test_atomic_publication_and_failure_retains_previous(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "activation.json"
            data = collector.collect(TARGET, NOW, self.get)
            collector.publish(data, target)
            before = target.read_bytes()
            self.tip["id"] = "invalid"
            with self.assertRaises(ValueError):
                collector.publish(collector.collect(TARGET, NOW, self.get), target)
            self.assertEqual(target.read_bytes(), before)
            self.assertEqual(json.loads(before), data)
            self.assertEqual(len(list(Path(directory).iterdir())), 1)


if __name__ == "__main__":
    unittest.main()
