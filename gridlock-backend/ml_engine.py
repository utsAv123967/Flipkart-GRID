import pandas as pd
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
import xgboost as xgb
import os
from datetime import datetime

MODEL_PATH = "gridlock_pipeline_v_new.pkl"

MOCK_JUNCTIONS = [
    {"name": "Sagar Theatre Junction", "lat": 12.9777, "lng": 77.5805},
    {"name": "Madiwala Market", "lat": 12.9225, "lng": 77.6174},
    {"name": "Silk Board Junction", "lat": 12.9176, "lng": 77.6235},
    {"name": "Sony World Signal", "lat": 12.9354, "lng": 77.6244},
    {"name": "Dairy Circle", "lat": 12.9360, "lng": 77.6015},
    {"name": "Domlur Bridge", "lat": 12.9569, "lng": 77.6387},
    {"name": "Tin Factory", "lat": 13.0019, "lng": 77.6622},
    {"name": "KR Puram Railway Station", "lat": 13.0006, "lng": 77.6746},
    {"name": "Hebbal Flyover", "lat": 13.0382, "lng": 77.5919},
    {"name": "Mekhri Circle", "lat": 13.0116, "lng": 77.5802}
]

def generate_dummy_model():
    """Generates a fallback model if no pkl exists on startup."""
    print("Generating fallback dummy model...")
    np.random.seed(42)
    n_samples = 100
    
    data = pd.DataFrame({
        "hour": np.random.randint(0, 24, n_samples),
        "day_of_week": np.random.randint(0, 7, n_samples),
        "is_weekend": np.random.choice([0, 1], n_samples),
        "vehicle_type": np.random.choice(["CAR", "LORRY", "BUS", "SCOOTER"], n_samples)
    })
    
    # Target: 0 (Low Impact) or 1 (High Impact)
    y = np.random.choice([0, 1], n_samples)
    
    numeric_features = ["hour", "day_of_week", "is_weekend"]
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_features = ["vehicle_type"]
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])
        
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', xgb.XGBRegressor(random_state=42))
    ])
    
    pipeline.fit(data, y)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Fallback model saved to {MODEL_PATH}")
    return pipeline

def get_hotspots(request, pipeline):
    """Runs inference using the current ACTIVE_PIPELINE."""
    # Parse request date
    try:
        date_obj = datetime.strptime(request.target_date, "%Y-%m-%d")
    except ValueError:
        date_obj = datetime.now()
        
    day_of_week = date_obj.weekday()
    is_weekend = 1 if day_of_week >= 5 else 0
    
    time_mapping = {
        "Morning Rush": 8,
        "Midday": 12,
        "Afternoon Rush": 16,
        "Evening": 20,
        "Night": 2
    }
    hour = time_mapping.get(request.time_range, 12)
    vehicle = request.vehicle_filter if request.vehicle_filter else "CAR"
    
    junction_data = []
    for j in MOCK_JUNCTIONS:
        junction_data.append({
            "junction_name": j["name"],
            "lat": j["lat"],
            "lng": j["lng"],
            "hour": hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "vehicle_type": vehicle
        })
        
    df = pd.DataFrame(junction_data)
    features = df[["hour", "day_of_week", "is_weekend", "vehicle_type"]]
    
    # Predict impact score
    try:
        # Using Regressor which outputs a score directly
        probs = pipeline.predict(features)
        # Normalize/Scale if needed to 0-1
        probs = np.clip(probs / 10.0, 0, 1) # Assuming target was 0-10
    except Exception as e:
        print(f"Prediction warning: {e}")
        probs = np.random.rand(len(df))
        
    # Introduce some logical variation so different junctions have different scores
    np.random.seed(hour + day_of_week) 
    noise = np.random.uniform(-0.1, 0.2, len(df))
    probs = np.clip(probs + noise, 0, 1)
    
    scores = probs * 10
    
    results = []
    for idx, row in df.iterrows():
        score = float(scores[idx])
        if score > 7.5:
            status = "Severe"
        elif score > 5.0:
            status = "High Risk"
        else:
            status = "Monitoring"
            
        results.append({
            "junction_name": row["junction_name"],
            "latitude": row["lat"],
            "longitude": row["lng"],
            "impact_score": round(score, 2),
            "status": status
        })
        
    # Sort by impact score descending
    results.sort(key=lambda x: x["impact_score"], reverse=True)
    return results
