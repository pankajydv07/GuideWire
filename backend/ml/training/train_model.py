"""
Dev 2: LightGBM Model Training Script

TODO (Dev 2): Run after generate_synthetic_data.py
Run with: python -m ml.training.train_model
"""

import joblib
import json
import lightgbm as lgb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score


def train_model():
    # Load data
    df = pd.read_csv("ml/training/synthetic_data.csv")
    
    feature_names = [
        "zone_flood_risk", "zone_traffic_risk", "zone_store_risk",
        "day_of_week", "hour", "is_weekend", "is_monsoon",
        "rider_tenure_days", "rider_avg_earnings", "rider_order_consistency",
        "forecast_rainfall", "forecast_aqi",
    ]
    
    X = df[feature_names]
    y = df["disrupted"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train LightGBM
    model = lgb.LGBMClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        num_leaves=31,
        random_state=42,
        verbose=-1,
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    print("\n📊 Classification Report:")
    print(classification_report(y_test, y_pred))
    print(f"AUC-ROC: {roc_auc_score(y_test, y_proba):.4f}")
    
    # Save artifacts
    joblib.dump(model, "ml/model_artifacts/risk_model.pkl")
    with open("ml/model_artifacts/feature_names.json", "w") as f:
        json.dump(feature_names, f)
    
    print("\n✅ Model saved to ml/model_artifacts/risk_model.pkl")
    print("✅ Features saved to ml/model_artifacts/feature_names.json")


if __name__ == "__main__":
    train_model()
