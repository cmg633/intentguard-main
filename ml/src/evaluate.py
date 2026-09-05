import json
import sys
import time
from pathlib import Path

import joblib
from sklearn.metrics import (accuracy_score, average_precision_score, confusion_matrix,
                             f1_score, precision_score, recall_score, roc_auc_score)

sys.path.insert(0, str(Path(__file__).parent))
from features import FEATURES
from train import dataset, split

ROOT = Path(__file__).resolve().parents[1]


def main():
    bundle = joblib.load(ROOT / "models" / "risk_model.joblib")
    rows = dataset()
    _, _, test_idx = split(rows)
    x = [[row[0][name] for name in FEATURES] for row in rows]
    y = [row[1] for row in rows]
    started = time.perf_counter()
    probabilities = bundle["model"].predict_proba([x[i] for i in test_idx])[:, 1]
    predictions = [int(probability >= bundle.get("classification_threshold", 0.5)) for probability in probabilities]
    latency_ms = (time.perf_counter() - started) * 1000 / len(test_idx)
    actual = [y[i] for i in test_idx]
    tn, fp, fn, tp = confusion_matrix(actual, predictions, labels=[0, 1]).ravel()
    report = {"model_version": bundle["version"], "dataset_version": "synthetic-trajectories-v1", "test_samples": len(test_idx), "precision": precision_score(actual, predictions, zero_division=0), "recall": recall_score(actual, predictions, zero_division=0), "f1": f1_score(actual, predictions, zero_division=0), "accuracy": accuracy_score(actual, predictions), "false_positive_rate": fp / (fp + tn) if fp + tn else None, "false_negative_rate": fn / (fn + tp) if fn + tp else None, "roc_auc": roc_auc_score(actual, probabilities) if len(set(actual)) > 1 else None, "pr_auc": average_precision_score(actual, probabilities) if len(set(actual)) > 1 else None, "inference_latency_ms": latency_ms, "confusion_matrix": {"true_negative": int(tn), "false_positive": int(fp), "false_negative": int(fn), "true_positive": int(tp)}}
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "evaluation.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
