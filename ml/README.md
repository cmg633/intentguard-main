# IntentGuard ML

This is a reproducible trajectory-risk classifier, separate from the deterministic policy gate. It uses scikit-learn logistic regression over grouped synthetic trajectory templates.

```bash
python3 -m pip install -r ml/requirements.txt
python3 ml/src/train.py
python3 ml/src/evaluate.py
printf '%s\n' '{"amount":0.17,"spend_cap_utilization":0.17,"merchant_familiar":1,"category_match":1,"quantity":1,"trajectory_steps":4,"price_change":0,"merchant_change":0,"product_change":0,"velocity":1,"mandate_valid":1,"suspicious_sequence":0,"prompt_injection":0,"previous_risk":0}' | python3 ml/src/predict.py
```

The train/validation/test split is by trajectory template, not row. The model artifact is `ml/models/risk_model.joblib`, metadata is `ml/models/metadata.json`, and measured evaluation is written to `ml/reports/evaluation.json`. The model is advisory: deterministic policy violations still control the final decision.
