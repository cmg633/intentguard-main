import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import joblib

sys.path.insert(0, str(Path(__file__).parent))
from features import vectorize

ROOT = Path(__file__).resolve().parents[1]


def predict_risk(features):
    bundle = joblib.load(ROOT / "models" / "risk_model.joblib")
    values = [vectorize(features)]
    probability = float(bundle["model"].predict_proba(values)[0][1])
    return {"model_version": bundle["version"], "risk_probability": probability, "threshold": bundle.get("classification_threshold", 0.5), "risk_prediction": int(probability >= bundle.get("classification_threshold", 0.5))}


if __name__ == "__main__":
    payload = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    print(json.dumps(predict_risk(json.loads(payload))))
