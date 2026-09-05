FEATURES = [
    "amount", "spend_cap_utilization", "merchant_familiar", "category_match",
    "quantity", "trajectory_steps", "price_change", "merchant_change",
    "product_change", "velocity", "mandate_valid", "suspicious_sequence",
    "prompt_injection", "previous_risk",
]


def vectorize(example):
    missing = [name for name in FEATURES if name not in example]
    if missing:
        raise ValueError(f"Missing features: {', '.join(missing)}")
    values = [float(example[name]) for name in FEATURES]
    if any(value != value for value in values):
        raise ValueError("Features must be finite numbers")
    return values
