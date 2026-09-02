# LOGILOAD INDIA — PHASE 0 REALITY GAP REPORT
**Repository Audit & Technical Upgrade Blueprint**
*Date: September 2026 | Platform: LogiLoad 3D & AI Logistics Platform*

---

## 1. EXECUTIVE SUMMARY & AUDIT SCOPE

This forensic audit evaluates the entire LogiLoad India software repository across its frontend, FastAPI backend, SQLite database, ML training/inference pipelines, routing engines, 3D bin packing systems, computer vision services, and telemetry streams.

The objective of Phase 0 is to establish a strict, zero-assumption baseline of **what is genuinely real, what is synthetic, what is heuristic, and what is simulated**, and define the exact engineering path to make every component **real, measurable, and scientifically defensible**.

---

## 2. MASTER REALITY GAP AUDIT TABLE

| Feature | Current Implementation | Current Data Source | Current Classification | Code Evidence | What Is Required to Make It Genuinely Real | Difficulty | Dependencies | Implementation Risk |
|---|---|---|---|---|---|---|---|---|
| **Delay Prediction** | `HistGradientBoostingRegressor` + Classifier in `ml/models/delay_model.py` | `ml/data/synthetic_delays.csv` (2,500 synthetic rows) | **SYNTHETIC ML** | `ml/data/synthetic_generator.py:L26-72` | Ingest real open transport logs (e.g., US DOT Freight/TLC/Indian logistics open data), real weather history (Open-Meteo archive), real traffic indices; train reproducible scikit-learn pipeline with test split & MAE/R² reporting. | Medium | Public logistics datasets, Open-Meteo Historical API | Low |
| **Cost Regressor** | `HistGradientBoostingRegressor` in `ml/models/cost_model.py` | `ml/data/synthetic_costs.csv` (2,500 synthetic rows) | **SYNTHETIC ML** | `ml/data/synthetic_generator.py:L74-118` | Calibrate against published Indian freight rate benchmark datasets (National Highways toll rates, diesel price series, ton-km freight indices); train with train/val/test splits & MAPE metrics. | Medium | Ministry of Road Transport freight index / Open freight benchmarks | Low |
| **Demand Forecasting** | 2-Layer PyTorch LSTM in `ml/models/demand_lstm.py` | `ml/data/synthetic_demand.csv` (2,160 synthetic daily series) | **SYNTHETIC ML** | `ml/data/synthetic_generator.py:L120-170` | Ingest real open retail/aftermarket demand time-series (e.g., M5 forecasting / Kaggle supply chain demand benchmarks); establish rolling train/val splits with sMAPE & baseline comparison (ARIMA/Prophet). | Medium | Public supply chain demand datasets, PyTorch | Low |
| **Anomaly Detection** | Scikit-Learn `IsolationForest` in `ml/models/anomaly_detector.py` | Inferred from synthetic normal distribution bounds | **SYNTHETIC ML** | `ml/models/anomaly_detector.py:L28-60` | Ingest real multi-variate shipment exception / delay / cold-chain breach logs; benchmark precision, recall, and false-positive rate against ground truth anomaly tags. | Medium | Labeled anomaly benchmark dataset, Scikit-Learn | Low |
| **Transportation GNN** | PyTorch GraphSAGE in `ml/models/transport_gnn.py` | 10 static Indian city nodes + 12 highway corridor edges | **HYBRID GNN** | `ml/models/transport_gnn.py:L18-65` | Expand graph to real OpenStreetMap / Indian National Highway GIS network with real distance/capacity features; train edge weight prediction on multi-hub traffic flows. | High | NetworkX, PyTorch Geometric, OpenStreetMap data | Medium |
| **RL Route Optimizer** | Neural Actor-Critic scoring + OSRM distance in `ml/models/rl_routing.py` | Haversine coordinates + OSRM distance matrix | **HYBRID POLICY** | `ml/models/rl_routing.py:L95-155` | Build a standard Gymnasium environment with state vector, action space, multi-objective reward (distance, time, penalty); train PPO agent and benchmark against OR-Tools TSP/VRP baseline. | High | Gymnasium, Stable-Baselines3 / PyTorch PPO, OR-Tools | Medium |
| **DRL 3D Packing** | Neural Actor-Critic coordinate scoring in `ml/models/drl_packing.py` | Candidate box dimensions + truck envelope | **HYBRID DRL** | `ml/models/drl_packing.py:L115-175` | Implement a discrete 3D bin packing Gym environment with full state representation, action space (box orientation & placement), sequential reward, and benchmark against maximal cuboid heuristic. | High | Gymnasium, PyTorch DRL, 3D collision physics | High |
| **Cargo Computer Vision** | OpenCV Canny Edge + Contours + Reference Card in `ml/models/cargo_vision.py` | Video frame Base64 stream from web camera | **OPENCV GEOMETRY (NO DEEP LEARNING)** | `ml/models/cargo_vision.py:L35-85` | Integrate a real deep learning object detector/segmentation model (YOLOv8-seg / ONNX runtime) for box boundary identification + classical perspective homography for metric calibration. | High | Ultralytics / ONNX Runtime, OpenCV, Labeled Box Dataset | Medium |
| **GPS Vehicle Telemetry** | Frontend software coordinate interpolation in `DriverDashboard.tsx` | Client-side JavaScript step timer | **SIMULATED** | `pages/DriverDashboard.tsx` | Build a real MQTT / HTTPS telemetry ingestion REST endpoint (`/api/v1/telemetry/gps`), persist packets to SQLite time-series table with validation, and stream live coordinates to dashboard via WebSocket/SSE. | Medium | FastAPI WebSocket/SSE, Pydantic telemetry schema, SQLite table | Low |
| **Cold-Chain Temperature** | Frontend mock state updater in `DriverDashboard.tsx` | Client-side JavaScript interval | **SIMULATED** | `pages/DriverDashboard.tsx` | Build an authenticated sensor ingestion API (`/api/v1/telemetry/sensors`), store sensor ID, battery, temperature, humidity in SQLite, and trigger live Isolation Forest breach alerts. | Medium | SQLite sensor schema, FastAPI endpoint | Low |
| **Grounded LLM Assistant** | SQL Tool Calling + OpenRouter API in `ai_chat_router.py` | Live SQLite tables (`shipments`, `vehicles`, `anomalies`) | **VERIFIED REAL** | `backend/routers/ai_chat_router.py:L17-85` | Fully grounded in real database records; upgrade with direct query execution on the newly created telemetry and sensor tables. | Low | OpenRouter API Key / SQLite | Low |
| **Road Routing (OSRM)** | OSRM REST Routing Service in `services/routing.ts` | Real OpenStreetMap road geometry | **REAL EXTERNAL API** | `services/routing.ts` | Production-ready real API. | Low | OSRM Public / Self-hosted instance | Low |
| **Maritime Sea Routing** | Dijkstra shortest path on oceanic graph in `SeaRoutePlanner.tsx` | Real GeoJSON ocean shipping lanes (`searoute-ts`) | **REAL ALGORITHM** | `pages/SeaRoutePlanner.tsx` | Production-ready real graph algorithm. | Low | `searoute-ts` GeoJSON dataset | Low |
| **Air Flight Routing** | Geodesic Great-Circle + Open-Meteo wind in `AirRoutePlanner.tsx` | Real IATA coordinates + Open-Meteo Wind API | **REAL ALGORITHM & API** | `pages/AirRoutePlanner.tsx` | Production-ready real mathematical algorithm. | Low | Open-Meteo Live API | Low |
| **Deterministic 3D Packing**| Maximal Cuboid Space Decomposition in `services/packer.ts` | 3D box dimensions & truck payload constraints | **REAL ALGORITHM** | `services/packer.ts` | Production-ready deterministic heuristic baseline. | Low | Three.js / TypeScript geometric math | Low |
| **Center of Gravity (CoG)**| Static Moment Balancing in `components/CoGIndicator.tsx` | Physical cargo placement vectors $\sum (w \times d) / W$ | **REAL MECHANICS** | `components/CoGIndicator.tsx` | Production-ready real physics mechanics. | Low | Three.js / React | Low |

---

## 3. DETAILED COMPONENT-BY-COMPONENT AUDIT

### 3.1 Machine Learning Models & Datasets
- **Current State**:
  - `ml/data/synthetic_generator.py` generates artificial records using mathematical formulas (`distance_km * 0.08 + traffic_level * 25`).
  - While the HistGradientBoosting and LSTM architectures are real and load properly, their training weights reflect synthetic statistical curves rather than actual transport logs.
- **Target Architecture**:
  - Implement a structured `ml/` hierarchy: `data/`, `preprocessing/`, `training/`, `evaluation/`, `models/`, `inference/`, and `experiments/`.
  - Ingest public logistics datasets (e.g., Open Freight, DOT Logistics, Open-Meteo historical records, M5 forecasting).
  - Include deterministic train/validation/test splits, saved preprocessing scalers, and metric evaluation (MAE, RMSE, R², sMAPE, F1).

### 3.2 Telemetry & IoT Architecture (GPS & Cold-Chain)
- **Current State**:
  - The driver and admin dashboards currently generate moving truck pins and fluctuating temperature values using client-side JavaScript intervals.
- **Target Architecture**:
  - Create database schemas: `vehicle_telemetry` and `sensor_telemetry` in SQLite.
  - Implement authenticated HTTPS/MQTT ingestion endpoints: `POST /api/v1/telemetry/gps` and `POST /api/v1/telemetry/sensor`.
  - Provide a dedicated **"REPLAY / SIMULATION"** toggle switch in the UI so that operators can clearly distinguish between live incoming hardware packets and simulated testing streams.

### 3.3 Computer Vision & Dimension Estimation
- **Current State**:
  - `ml/models/cargo_vision.py` runs Canny edge detection and bounding box contours with reference marker scaling. No deep learning model weights exist.
- **Target Architecture**:
  - Introduce an ONNX/YOLO-based deep learning detector to segment cargo boxes against complex backgrounds.
  - Pair deep learning masks with perspective homography and camera focal calibration for metric estimation.

### 3.4 Reinforcement Learning (Route & 3D Packing)
- **Current State**:
  - RL routing and DRL packing use PyTorch Actor-Critic forward passes to score heuristic candidate points, falling back to deterministic algorithms when needed.
- **Target Architecture**:
  - Build standard Gymnasium environments for multi-stop routing and 3D container packing.
  - Train policies with structured rewards (distance/utilization maximization, stability penalties) and benchmark against OR-Tools and Maximal Cuboid baselines.

---

## 4. NEXT STEPS & IMPLEMENTATION ROADMAP (PHASES 1–11)

Following review of this Phase 0 report:
1. **Phase 1**: Ingest real/public open datasets with documented schemas and provenance.
2. **Phase 2**: Build reproducible ML training pipelines (`data/`, `preprocessing/`, `training/`, `evaluation/`).
3. **Phase 3 & 4**: Implement backend IoT telemetry tables & ingestion endpoints for GPS and BLE sensors with a clear Live vs Replay UI mode.
4. **Phase 5**: Upgrade Computer Vision to a deep-learning segmentation pipeline.
5. **Phase 6 & 7**: Implement Gymnasium RL environments and train benchmarked policies for routing and packing.
6. **Phase 8 & 9**: Eliminate misleading mock tags across the frontend and enforce data source transparency.
7. **Phase 10 & 11**: Execute the comprehensive test suite and produce `FINAL_REALITY_AUDIT.md`.

---

**Phase 0 Repository Audit Complete. Awaiting User Approval to Proceed to Phase 1.**
