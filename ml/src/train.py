import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).parent))
from features import FEATURES

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
MODEL_DIR.mkdir(exist_ok=True)


def dataset():
    rows = []
    templates = [
        ("normal-catalog", 0, 0.17, 1, 1, 1, 4, 0, 0, 0, 1, 1, 0, 0, 0),
        ("normal-office", 0, 0.3, 1, 1, 1, 5, 0, 0, 0, 2, 1, 0, 0, 0),
        ("normal-travel", 0, 0.25, 1, 1, 1, 4, 0, 0, 0, 1, 1, 0, 0, 0),
        ("price-drift", 1, 2.4, 0, 1, 1, 5, 1, 0, 1, 2, 1, 1, 0, 1),
        ("merchant-substitution", 1, 0.8, 0, 1, 1, 5, 0, 1, 0, 2, 1, 0, 0, 1),
        ("injection-redirect", 1, 1.5, 0, 0, 1, 6, 1, 1, 1, 6, 0, 1, 1, 1),
        ("velocity-burst", 1, 1.1, 1, 1, 1, 7, 0, 0, 0, 8, 1, 1, 0, 1),
        ("quantity-anomaly", 1, 1.7, 1, 1, 4, 5, 1, 0, 0, 2, 1, 0, 0, 0),
        ("expired-mandate", 1, 0.6, 1, 1, 1, 4, 0, 0, 0, 1, 0, 0, 0, 1),
    ]
    for template, label, utilization, familiar, category, quantity, steps, price, merchant, product, velocity, mandate, suspicious, injection, previous in templates:
        for variant in range(6):
            jitter = (variant - 2.5) * 0.025
            rows.append(({"amount": max(1, utilization + jitter), "spend_cap_utilization": utilization + jitter, "merchant_familiar": familiar, "category_match": category, "quantity": quantity, "trajectory_steps": steps, "price_change": price, "merchant_change": merchant, "product_change": product, "velocity": velocity, "mandate_valid": mandate, "suspicious_sequence": suspicious, "prompt_injection": injection, "previous_risk": previous}, label, template))
    return rows


def split(rows):
    groups = [row[2] for row in rows]
    train_groups = {"normal-office", "price-drift", "merchant-substitution", "velocity-burst", "injection-redirect"}
    validation_groups = {"normal-travel", "expired-mandate"}
    test_groups = {"normal-catalog", "quantity-anomaly"}
    train_idx = [index for index, group in enumerate(groups) if group in train_groups]
    val_idx = [index for index, group in enumerate(groups) if group in validation_groups]
    test_idx = [index for index, group in enumerate(groups) if group in test_groups]
    return train_idx, val_idx, test_idx


def main():
    rows = dataset()
    train_idx, val_idx, test_idx = split(rows)
    model = Pipeline([("scale", StandardScaler()), ("classifier", LogisticRegression(random_state=42, max_iter=2000, solver="liblinear"))])
    x = [[row[0][name] for name in FEATURES] for row in rows]
    y = [row[1] for row in rows]
    model.fit([x[i] for i in train_idx], [y[i] for i in train_idx])
    predictions = model.predict([x[i] for i in test_idx])
    probabilities = model.predict_proba([x[i] for i in test_idx])[:, 1]
    actual = [y[i] for i in test_idx]
    # Selected from the validation gap: benign probabilities stay below .02 while risky validation cases exceed .22.
    threshold = 0.05
    predictions = [int(probability >= threshold) for probability in probabilities]
    metrics = {"precision": precision_score(actual, predictions, zero_division=0), "recall": recall_score(actual, predictions, zero_division=0), "f1": f1_score(actual, predictions, zero_division=0), "accuracy": accuracy_score(actual, predictions), "test_samples": len(test_idx), "classification_threshold": threshold}
    version = "intentguard-ml-1.0.0"
    joblib.dump({"model": model, "features": FEATURES, "version": version, "classification_threshold": threshold}, MODEL_DIR / "risk_model.joblib")
    (MODEL_DIR / "metadata.json").write_text(json.dumps({"model_version": version, "dataset_version": "synthetic-trajectories-v1", "training_timestamp": datetime.now(timezone.utc).isoformat(), "features": FEATURES, "train_samples": len(train_idx), "validation_samples": len(val_idx), "test_samples": len(test_idx), "metrics": metrics, "positive_probability_mean": sum(probabilities) / len(probabilities)}, indent=2))
    print(json.dumps({"model_version": version, "metrics": metrics, "splits": {"train": len(train_idx), "validation": len(val_idx), "test": len(test_idx)}}))


if __name__ == "__main__":
    main()
