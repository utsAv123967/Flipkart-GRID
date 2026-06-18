import pandas as pd
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
import os

from ml_engine import MODEL_PATH

def train_and_swap_pipeline(app, file_path: str):
    """Background task to train and hot-swap the model."""
    print(f"Starting MLOps pipeline on {file_path}")
    try:
        # 1. Load data
        df = pd.read_csv(file_path)
        
        # We need a target column. If not present, we simulate one.
        if "target_impact" not in df.columns:
            print("Simulating 'target_impact' column for training...")
            np.random.seed(42)
            df["target_impact"] = np.random.uniform(0, 10, len(df))
            
        # Extract features (assume columns: hour, day_of_week, is_weekend, vehicle_type)
        required_cols = ["hour", "day_of_week", "is_weekend", "vehicle_type"]
        for col in required_cols:
            if col not in df.columns:
                if col in ["hour", "day_of_week", "is_weekend"]:
                    df[col] = np.random.randint(0, 5, len(df))
                else:
                    df[col] = np.random.choice(["CAR", "LORRY", "BUS"], len(df))

        X = df[required_cols]
        y = df["target_impact"]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # 2. Preprocessing
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

        # 3. Model Race
        print("Training XGBoost...")
        xgb_pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', xgb.XGBRegressor(random_state=42))
        ])
        xgb_pipeline.fit(X_train, y_train)
        
        print("Training Random Forest...")
        rf_pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', RandomForestRegressor(random_state=42))
        ])
        rf_pipeline.fit(X_train, y_train)

        # 4. Validation Gate (RMSE)
        xgb_preds = xgb_pipeline.predict(X_test)
        rf_preds = rf_pipeline.predict(X_test)
        
        # scikit-learn mean_squared_error with squared=False gives RMSE
        xgb_rmse = mean_squared_error(y_test, xgb_preds, squared=False)
        rf_rmse = mean_squared_error(y_test, rf_preds, squared=False)
        
        print(f"Validation RMSE - XGBoost: {xgb_rmse:.4f}, Random Forest: {rf_rmse:.4f}")
        
        champion_pipeline = xgb_pipeline if xgb_rmse <= rf_rmse else rf_pipeline
        champion_name = "XGBoost" if xgb_rmse <= rf_rmse else "Random Forest"
        print(f"Champion Model selected: {champion_name}")

        # 5. Save Model
        joblib.dump(champion_pipeline, MODEL_PATH)
        print(f"Model saved to {MODEL_PATH}")

        # 6. Thread-safe Hot Swap
        app.state.ACTIVE_PIPELINE = champion_pipeline
        print("Hot Swap Complete: ACTIVE_PIPELINE updated in memory.")
        
    except Exception as e:
        print(f"MLOps Pipeline Failed: {str(e)}")
    finally:
        # Cleanup uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)
