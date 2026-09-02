import os
import sys
from pathlib import Path

# Ensure root directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from ml.train_all_real import metrics_report

if __name__ == "__main__":
    print("🚀 Executing production LogiLoad AI/ML Model Training Pipeline on Real Kaggle & Open Datasets...")
    import ml.train_all_real
