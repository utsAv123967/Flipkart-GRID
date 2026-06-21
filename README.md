<p align="center">
  <img src="https://img.shields.io/badge/Flipkart%20GRID%206.0-Hackathon-0891b2?style=for-the-badge&logo=flipkart&logoColor=white" alt="Flipkart GRID 6.0" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-2.0-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/XGBoost-ML-FF6600?style=for-the-badge&logo=xgboost&logoColor=white" alt="XGBoost" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🚦 Gridlock Intelligence</h1>
<h3 align="center">AI-Driven Parking Intelligence & Congestion Impact Platform</h3>
<p align="center"><i>Built for the Flipkart GRID 6.0 Hackathon — Software Engineering Track</i></p>

---

## 📋 Table of Contents

1.  [Problem Statement](#-problem-statement)
2.  [Our Solution](#-our-solution--gridlock-intelligence)
3.  [Key Differentiator — The PICS Score](#-key-differentiator--the-pics-engine)
4.  [System Architecture](#-system-architecture)
5.  [Tech Stack](#-tech-stack)
6.  [Getting Started — Installation & Setup](#-getting-started--installation--setup)
7.  [Platform Deep Dive — Page-by-Page Walkthrough](#-platform-deep-dive--page-by-page-walkthrough)
8.  [ML & AI — Algorithms, Features & Pipeline](#-ml--ai--algorithms-features--pipeline)
9.  [Unique Innovations](#-unique-innovations)
10. [API Reference](#-api-reference)
11. [Project Structure](#-project-structure)

---

## 🎯 Problem Statement

> **Operational Challenge:** On-street illegal parking and spillover parking near commercial areas, metro stations, and events choke carriageways and intersections.

### Why It's Hard Today

| Challenge | Description |
|---|---|
| **Reactive Enforcement** | Traffic enforcement is entirely patrol-based — officers drive around *hoping* to find violators rather than being deployed to confirmed hotspots. |
| **No Impact Quantification** | Even when a violation is found, authorities have zero visibility into *how much congestion* that specific vehicle is causing. A scooter on a wide road is treated the same as a bus at a major junction. |
| **No Congestion Heatmaps** | No city-wide real-time heatmap exists that correlates parking violations with their downstream congestion impact. |
| **Impossible Prioritization** | Without severity data, it is impossible to rank which violations need immediate towing vs. which can wait — leading to inefficient use of limited patrol vans. |

### The Core Question We Solve

> **How can AI-driven parking intelligence detect illegal parking hotspots and quantify their real-time impact on traffic flow to enable targeted, proactive enforcement?**

---

## 💡 Our Solution — Gridlock Intelligence

**Gridlock Intelligence** is a full-stack, smart-city command platform that transforms raw traffic camera logs into **highly actionable, tactical intelligence**. It bridges the gap between simple violation detection and complex congestion management.

### What Makes Us Different

Most solutions simply *detect* a parking violation and alert someone. We go **three critical steps further**:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────────┐     ┌──────────────────────┐
│  1. DETECT           │ ──▶ │  2. QUANTIFY IMPACT   │ ──▶ │  3. PREDICT FUTURE      │ ──▶ │  4. AUTO-DISPATCH     │
│  Ingest violation    │     │  PICS Score = 8.7/10  │     │  ML forecasts hotspots  │     │  Optimal tow routes   │
│  from camera/officer │     │  "Critical" severity  │     │  for tomorrow 9 AM      │     │  for 5 available vans  │
└─────────────────────┘     └──────────────────────┘     └─────────────────────────┘     └──────────────────────┘
```

1.  **Detect** — Ingest every violation event from the Flipkart GRID dataset (camera or officer-reported).
2.  **Quantify** — Our proprietary **PICS Score** instantly calculates a 0–10 congestion impact rating.
3.  **Predict** — An XGBoost ML model forecasts *where* hotspots will form in the future.
4.  **Dispatch** — A greedy routing algorithm computes the optimal patrol routes to clear the worst bottlenecks.

The platform streams all of this **in real-time** via Server-Sent Events (SSE) into a premium dark-mode dashboard, and includes an **AI Copilot** (LLM-powered) for natural language tactical advice.

---

## ⭐ Key Differentiator — The PICS Engine

### What is PICS?

**PICS** stands for **Parking-Induced Congestion Score** — a proprietary, deterministic mathematical model that is the heart of our entire platform. While most systems answer *"Is there a violation?"*, PICS answers the far more critical question:

> **"How much is THIS specific vehicle choking traffic RIGHT NOW?"**

### The Formula — 6 Weighted Factors (0–10 Scale)

Every single violation that enters the system is scored by summing **six independent, weighted factors**. The maximum possible score is **10.0** (catastrophic congestion impact).

```
PICS = Road Width Impact + Intersection Proximity + Temporal Factor
     + Vehicle Size Factor + Violation Severity + Duration Impact
```

| # | Factor | Max Points | Dataset Field(s) Used | How It Works |
|---|---|---|---|---|
| **1** | **Road Width Impact** | **2.0** | `road_width_m` (enriched) | Narrower roads are penalized heavily. A vehicle on a 4m road scores **2.0** (road is completely blocked). On a 15m+ arterial, it scores only **0.3**. |
| **2** | **Intersection Proximity** | **2.0** | `junction_name`, `dist_to_intersection_m` | A vehicle parked 5m from an intersection creates bottlenecks spilling in **4 directions** → scores **2.0**. At 50m+ away, the impact dissipates → **0.6**. |
| **3** | **Temporal Factor** | **2.0** | `created_datetime` (hour extraction) | Peak hours (8–10 AM, 5–7 PM) when roads are at capacity score **2.0**. Midnight violations score only **0.4** because road utilization is minimal. |
| **4** | **Vehicle Size Factor** | **1.5** | `vehicle_type`, `updated_vehicle_type` | A parked **Bus** (size factor 2.2) blocks an entire lane → **1.5 pts**. A **Two-Wheeler** (size factor 0.3) barely obstructs → **0.22 pts**. |
| **5** | **Violation Severity** | **1.5** | `offence_code` (NP, DP, IB, BS, etc.) | **Intersection Blocking (IB)** and **Fire Hydrant (FH)** = severity 9 → **1.5 pts**. Simple **No Parking (NP)** = severity 6 → **1.0 pts**. |
| **6** | **Duration Impact** | **1.0** | `created_datetime`, `closed_datetime` | Calculated from the difference between when a violation was created and when it was closed. A violation lasting **3+ hours** scores **1.0** (compounding congestion). Under 10 minutes scores **0.1**. Unresolved violations use `datetime.now()` for live duration. |

### Severity Classification

| PICS Range | Label | Color | Action |
|---|---|---|---|
| **8.5 – 10.0** | 🔴 **Critical** | `#ef4444` | **Immediate dispatch required** — Priority towing |
| **7.0 – 8.4** | 🟠 **Severe** | `#f97316` | **Enforcement recommended** — Urgent attention |
| **5.0 – 6.9** | 🟡 **High** | `#eab308` | **Needs monitoring** — Schedule patrol |
| **3.0 – 4.9** | 🟢 **Moderate** | `#22c55e` | **Low concern** — Log and monitor |
| **0.0 – 2.9** | 🔵 **Low** | `#06b6d4` | **Minimal impact** — Informational only |

### Example Calculation

> **Scenario:** A **Lorry** is double-parked on a **6-meter wide** road, **8 meters** from a major junction, at **5:30 PM** (evening rush), and has been there for **2.5 hours**.

| Factor | Value | Score |
|---|---|---|
| Road Width (6m) | Narrow → | **1.8** |
| Intersection Proximity (8m) | Very close → | **1.8** |
| Temporal Factor (5:30 PM peak) | Rush hour → | **1.8** |
| Vehicle Size (Lorry, factor 2.0) | Large → | **1.5** |
| Violation Severity (DP = 8) | Double Parking → | **1.33** |
| Duration Impact (2.5 hours) | Long → | **0.8** |
| | **Total PICS** | **9.03 — CRITICAL** 🔴 |

This violation would immediately appear at the top of every dispatcher's screen with a red "CRITICAL" badge and would be the #1 priority for the next available tow van.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16 + React 19)                │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Command      │  │ Live Feed    │  │ Analytics    │  │ Zone Intel  │ │
│  │ Center       │  │ (SSE Stream) │  │ Dashboard    │  │ (Spatial)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                 │                 │         │
│         └────────────┬────┴────────┬────────┴────────┬────────┘         │
│                      │  REST API   │   SSE Stream    │                  │
└──────────────────────┼─────────────┼─────────────────┼──────────────────┘
                       │             │                 │
                       ▼             ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI + Python)                         │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ PICS Engine  │  │ ML Engine    │  │ Zone Engine  │  │ Routing     │ │
│  │ (v2.0)       │  │ (XGBoost)    │  │ (12 Zones)   │  │ Algorithm   │ │
│  │ 6-Factor     │  │ Hotspot      │  │ Geo-Spatial  │  │ Greedy      │ │
│  │ Scoring      │  │ Forecasting  │  │ Aggregation  │  │ Dispatch    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐   │
│  │ Violation    │  │ MLOps        │  │ AI Copilot                   │   │
│  │ Simulator    │  │ Hot-Swap     │  │ (Llama 3 via Ollama)         │   │
│  │ (50+ locs)   │  │ Pipeline     │  │ Natural Language Dispatch    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **Python 3.10+** | Core language |
| **FastAPI** | High-performance async REST API framework |
| **Uvicorn** | ASGI server |
| **Pydantic v2** | Request/response validation & serialization |
| **XGBoost** | ML regression model for hotspot prediction |
| **scikit-learn** | ML pipeline (preprocessing, imputation, scaling) |
| **Pandas / NumPy** | Data manipulation & numerical operations |
| **Folium** | Interactive heatmap generation (Leaflet.js wrapper) |
| **SSE-Starlette** | Server-Sent Events for real-time streaming |
| **HTTPX** | Async HTTP client for LLM calls |
| **Joblib** | Model serialization & hot-swap |
| **Ollama (Llama 3)** | Local LLM for AI Copilot |

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js 16** | React meta-framework with app router |
| **React 19** | UI library |
| **TypeScript** | Type-safe development |
| **Tailwind CSS v4** | Utility-first styling + dark mode |
| **Recharts** | Data visualization (area charts, bar charts, pie charts, heatmaps) |
| **Lucide React** | Premium icon system |
| **shadcn/ui** | Accessible UI primitives |

---

## 🚀 Getting Started — Installation & Setup

### Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Download |
|---|---|---|
| **Python** | 3.10 or higher | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18.x or higher | [nodejs.org](https://nodejs.org/) |
| **npm** | Comes with Node.js | Bundled with Node.js |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |
| **Ollama** *(optional — for AI Copilot)* | Latest | [ollama.com](https://ollama.com/) |

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/gridlock-intelligence.git
cd gridlock-intelligence
```

---

### Step 2: Set Up the Backend

```bash
# Navigate to the backend directory
cd gridlock-backend

# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install all Python dependencies
pip install -r requirements.txt
```

#### Backend Dependencies (`requirements.txt`)
```
fastapi>=0.100.0
uvicorn>=0.23.0
pydantic>=2.0.0
pandas>=2.0.0
numpy>=1.24.0
scikit-learn>=1.3.0
xgboost>=2.0.0
networkx>=3.0
scipy>=1.10.0
httpx>=0.24.0
python-multipart
folium>=0.14.0
sse-starlette>=1.6.0
joblib>=1.3.0
```

---

### Step 3: Start the Backend Server

```bash
# Still inside the gridlock-backend directory with venv activated
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see output like:
```
Initializing Gridlock Intelligence v2.0...
Loading existing ML Pipeline from gridlock_pipeline_v_new.pkl...
Generating historical violation data (24h)...
Generated 185 historical violations.
Gridlock Intelligence v2.0 ready.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

> **✅ Backend Health Check:** Open `http://localhost:8000` in your browser. You should see:
> ```json
> { "status": "Gridlock Intelligence v2.0 running", "violations_in_store": 185, "zones": 12 }
> ```

---

### Step 4: Set Up the Frontend

```bash
# Open a NEW terminal window
cd Frontend

# Install Node.js dependencies
npm install
```

---

### Step 5: Start the Frontend Dev Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 16.2.6
- Local:   http://localhost:3000
```

> **✅ Open `http://localhost:3000`** in your browser. The Gridlock Intelligence dashboard should load.

---

### Step 6: *(Optional)* Enable the AI Copilot

The AI Copilot requires **Ollama** running locally with the **Llama 3** model:

```bash
# Install and start Ollama (download from https://ollama.com)
ollama pull llama3
ollama run llama3
```

This makes the Copilot accessible at `http://localhost:11434`. The backend auto-connects to it.

---

### Quick Start Summary

| Terminal | Command | Port |
|---|---|---|
| **Terminal 1** | `cd gridlock-backend && uvicorn main:app --reload --port 8000` | `localhost:8000` |
| **Terminal 2** | `cd Frontend && npm run dev` | `localhost:3000` |
| **Terminal 3** *(optional)* | `ollama serve` | `localhost:11434` |

---

## 📱 Platform Deep Dive — Page-by-Page Walkthrough

The platform is organized into **4 main operational screens**, each accessed via the sidebar navigation. Every page is designed with a premium **dark-mode "cyber" aesthetic** featuring glassmorphism, smooth gradients, and micro-animations — designed to look and feel like a high-tech police dispatch terminal.

---

### 🏠 Page 1: Command Center (`/`)

**Role:** Precinct commanders making high-level strategic decisions.

This is the **homepage** and tactical headquarters of the entire platform.

#### Top Section — Live KPI Cards

Four animated KPI cards provide an instant snapshot of the city's parking situation:

| Card | Data Source | What It Shows |
|---|---|---|
| **Violations (24h)** | `/api/analytics/summary` | Total violations detected in the last 24 hours, with trend arrow (↑/↓). |
| **Avg PICS Score** | `/api/analytics/summary` | The mean PICS score across all violations — indicates overall city congestion. |
| **Critical Zones** | `/api/analytics/summary` | Number of zones currently in "Critical" or "High" risk level. Shows the top zone name. |
| **Unresolved** | `/api/analytics/summary` | Number of active, unresolved violations still blocking roads. Shows the per-hour rate. |

#### Center Section — Congestion Intelligence Radar

An **interactive Folium heatmap** rendered in an iframe that overlays a dark `CartoDB dark_matter` tile layer. The heatmap uses a color gradient from **blue (low) → lime → yellow → orange → red (high)** to visualize predicted congestion intensity. Severe hotspots are marked with pulsing red `CircleMarker` annotations showing the junction name and impact score.

#### Left Panel — Tactical Parameters

Commanders configure four parameters and click **"Deploy Strategy"**:

- **Target Date** — Pick any future date (e.g., tomorrow)
- **Time Period** — Select "Morning Rush", "Midday", "Afternoon Rush", "Evening", or "Night"
- **Vehicle Focus** — Filter predictions by vehicle type (Car, SUV, Lorry, Bus, Auto, Two-Wheeler)
- **Available Patrol Units** — Enter how many towing vans are available (e.g., 5)

Clicking **"Deploy Strategy"** triggers two API calls in sequence:
1.  `GET /api/hotspots` — ML model predicts the worst 10 junctions
2.  `POST /api/allocate-resources` — Routing algorithm assigns vans to hotspots

#### Left Panel — Active Patrol Routes

After deployment, animated cards appear showing each van's assignment:
- **Unit #1** → Silk Board Junction, **ETA: 12m**
- Route path: `Central Dispatch → Richmond Circle → Silk Board Junction`

#### Bottom — Live Ticker

A horizontally scrolling ticker strip showing the most recent critical violations as they stream in via SSE, complete with PICS score badges.

---

### 📡 Page 2: Live Violation Feed (`/live`)

**Role:** Real-time dispatchers monitoring and resolving incidents as they happen.

#### Live SSE Connection

The page opens a persistent **Server-Sent Events (SSE)** connection to `GET /api/violations/live`. New violations appear at the top of the feed every 2–5 seconds without any page refresh.

#### Header Controls

- **LIVE/OFFLINE indicator** — Green pulsing dot when SSE is connected, gray when disconnected
- **Per-minute rate counter** — Shows how many violations are arriving per minute
- **Pause/Play toggle** — Dispatchers can pause the stream without disconnecting

#### Stats Bar

Real-time counters showing **Total**, **Critical**, **Severe**, and **High** violation counts. Plus filter buttons: `All`, `Critical`, `Unresolved`.

#### Violation Cards

Each violation renders as a rich data card containing:

| Field | Dataset Column | Display |
|---|---|---|
| **Location** | `location` | Full location name (e.g., "Forum Mall Entrance") |
| **Zone** | `zone_id` | Zone badge (e.g., "Z01 – Koramangala") |
| **Violation Type** | `violation_type`, `offence_code` | Type label with offense code (e.g., "Double Parking · DP") |
| **Vehicle** | `vehicle_type`, `vehicle_number` | Type + masked plate (e.g., "Car · KA-01-\*\*-\*\*34") |
| **Detection Source** | `device_id`, `created_by_id` | Camera icon (📷 `CAM-0042`) or Officer icon (👤 `OFC-247`) |
| **Police Station** | `police_station` | Jurisdiction (e.g., "Koramangala PS") |
| **PICS Score** | Computed by PICS Engine | Large colored badge (e.g., 🔴 **8.7**) |
| **Severity** | Derived from PICS | Text label (e.g., "CRITICAL") |
| **Road Context** | `road_width_m`, `dist_to_intersection_m` | "6m road · 12m to junction" |
| **Timestamp** | `created_datetime` | Human-readable relative time |

Each card has a **"Mark Resolved"** button. Clicking it sends `POST /api/violations/resolve` and updates the card in-place with a green "✓ Resolved" badge.

---

### 📊 Page 3: Analytics Dashboard (`/analytics`)

**Role:** Analysts and precinct leadership studying historical patterns and performance.

#### Period Selector

Toggle between **24 Hours**, **7 Days**, and **30 Days** at the top. All charts and metrics update dynamically.

#### Row 1 — Time-Series Charts

| Chart | Type | Data |
|---|---|---|
| **Violations Over Time** | Area chart (gradient fill) | Hourly/6-hourly/daily violation counts |
| **Average PICS Score** | Bar chart | Mean PICS per time bucket — instantly shows when congestion is worst |

#### Row 2 — Distribution Charts

| Chart | Type | Data |
|---|---|---|
| **Violation Types** | Donut/Pie chart | Breakdown by offense type (No-Parking, Double Parking, Bus Stop Blocking, etc.) |
| **Vehicle Types** | Horizontal bar chart | Distribution of violating vehicle types |

#### Row 3 — Advanced Intelligence Panels

| Panel | Dataset Fields Used | What It Shows |
|---|---|---|
| **🕐 Resolution Time Analysis** | `created_datetime`, `closed_datetime` | **Average resolution time** (minutes), **Median**, **Min/Max range**, **Resolved vs Unresolved counts**. Answers: "How fast does the city clear violations?" |
| **📷 Detection Source Breakdown** | `device_id`, `created_by_id` | Percentage of violations caught by **smart cameras** vs. **manually by officers**. Shows progress bars with exact counts. |
| **🚨 Repeat Offender Tracking** | `vehicle_number` | Aggregates by masked vehicle number. Lists top 10 habitual offenders with: **violation count**, **unique locations**, **average PICS impact**, and **vehicle type**. |

#### Row 4 — Police Station Performance

| Dataset Fields | Metrics Per Station |
|---|---|
| `police_station`, `created_datetime`, `closed_datetime` | **Total violations** in jurisdiction, **Resolved count**, **Resolution rate %** (with progress bar), **Average response time** (minutes) |

This panel directly enables performance benchmarking between jurisdictions (e.g., "Koramangala PS resolves 62% of violations in 45 min avg, while Whitefield PS only resolves 38%").

#### Row 5 — Peak Hours Heatmap

A **7 × 24 grid** (days of week × hours of day) where each cell is color-coded by violation density:
- **Dark red** = Highest violation concentration
- **Orange/Yellow** = Moderate
- **Cyan/transparent** = Low/none

Hovering any cell shows the exact count (e.g., "Wed 9:00 — 14 violations").

---

### 🗺 Page 4: Zone Intelligence (`/zones`)

**Role:** Commanders drilling down into specific geographic areas for hyper-local intelligence.

#### Zone Grid

The city of Bengaluru is divided into **12 named geographic zones**:

| Zone ID | Zone Name | Type | Key Characteristics |
|---|---|---|---|
| Z01 | Koramangala | Commercial | Startup hub, malls, dense street parking |
| Z02 | Indiranagar | Commercial | Nightlife district, metro station |
| Z03 | MG Road / CBD | Commercial | Central Business District, Brigade Road |
| Z04 | Silk Board / BTM | Transit | India's busiest intersection |
| Z05 | Whitefield / ITPL | Commercial | IT corridor, tech parks |
| Z06 | Jayanagar | Residential | Market streets, shopping complexes |
| Z07 | Malleshwaram | Commercial | Traditional market, narrow streets |
| Z08 | Hebbal / Yelahanka | Transit | Major interchange, tech park spillover |
| Z09 | Electronic City | Commercial | IT hub (Infosys, Wipro), tollway congestion |
| Z10 | Majestic / KR Market | Transit | Old city, extremely narrow roads, bus terminus |
| Z11 | HSR Layout | Residential | Growing commercial pockets |
| Z12 | Bannerghatta Road | Residential | Arterial road, malls, metro, dense residential |

Each zone is rendered as a **ZoneCard** showing:
- **Congestion Index** (0–100) — color-coded progress ring
- **Risk Level** badge (Critical / High / Moderate / Low)
- **Total violations**, **Avg PICS**, **Critical/Severe count**, **Unresolved count**

#### Controls

- **Search bar** — Type to filter zones by name
- **Type filter** — Filter by Commercial / Transit / Residential
- **Sort by** — Congestion Index, Violation Count, or Average PICS

#### Zone Detail Panel

Clicking any zone card opens a **slide-in detail panel** on the right half of the screen:

1.  **Header** — Zone name, description, close button
2.  **Stats Grid** — Total violations, Avg PICS, Congestion Index
3.  **Hourly Distribution Chart** — Bar chart showing which hours have the most violations in this zone
4.  **Violation Type Breakdown** — Horizontal progress bars showing which violation types plague this specific zone
5.  **Recent Violations List** — The most severe violations physically located inside this zone, sorted by PICS score

---

## 🤖 ML & AI — Algorithms, Features & Pipeline

### 1. Hotspot Prediction Model (XGBoost Regressor)

#### Objective
Predict the **congestion impact score** for each major junction given temporal and contextual inputs, enabling commanders to see *where* the worst hotspots will form in the future.

#### Algorithm: XGBoost Regressor

We chose **XGBoost** (eXtreme Gradient Boosting) for its:
- **High accuracy** on tabular/structured data
- **Native handling** of missing values
- **Feature importance** output for explainability
- **Speed** — predictions in milliseconds

#### Feature Engineering

| Feature | Type | Derivation |
|---|---|---|
| `hour` | Numeric (0–23) | Extracted from the target prediction time |
| `day_of_week` | Numeric (0–6) | Monday=0, Sunday=6 |
| `is_weekend` | Binary (0/1) | 1 if Saturday/Sunday |
| `vehicle_type` | Categorical | One-hot encoded (CAR, LORRY, BUS, SCOOTER) |

#### Preprocessing Pipeline (scikit-learn)

```python
# Numeric features → Impute (median) → StandardScaler
numeric_transformer = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

# Categorical features → Impute (constant) → OneHotEncoder
categorical_transformer = Pipeline([
    ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
    ('onehot', OneHotEncoder(handle_unknown='ignore'))
])

# Combined preprocessor
preprocessor = ColumnTransformer([
    ('num', numeric_transformer, ['hour', 'day_of_week', 'is_weekend']),
    ('cat', categorical_transformer, ['vehicle_type'])
])

# Full pipeline
pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', XGBRegressor(random_state=42))
])
```

#### Inference Flow

1.  Commander selects date, time period, and vehicle filter
2.  Backend constructs a DataFrame with one row per junction (10 junctions)
3.  Pipeline predicts an impact score for each junction
4.  Scores are normalized to 0–10 and classified into severity tiers
5.  Results are sorted by score and rendered on the heatmap

#### Prediction Targets — 10 Monitored Junctions

| Junction | Coordinates |
|---|---|
| Sagar Theatre Junction | 12.9777, 77.5805 |
| Madiwala Market | 12.9225, 77.6174 |
| Silk Board Junction | 12.9176, 77.6235 |
| Sony World Signal | 12.9354, 77.6244 |
| Dairy Circle | 12.9360, 77.6015 |
| Domlur Bridge | 12.9569, 77.6387 |
| Tin Factory | 13.0019, 77.6622 |
| KR Puram Railway Station | 13.0006, 77.6746 |
| Hebbal Flyover | 13.0382, 77.5919 |
| Mekhri Circle | 13.0116, 77.5802 |

---

### 2. MLOps — Hot-Swap Pipeline

The platform includes a **production-grade MLOps pipeline** that allows new training data to be uploaded without downtime:

```
Upload CSV → Background Training → Model Race → Validation Gate → Hot-Swap
```

#### Model Race

When new data is uploaded, **two models are trained simultaneously**:
- **XGBoost Regressor**
- **Random Forest Regressor**

Both are evaluated on a held-out 20% test set using **RMSE (Root Mean Squared Error)**. The champion model (lower RMSE) wins and is hot-swapped into production:

```python
champion = xgb_pipeline if xgb_rmse <= rf_rmse else rf_pipeline
app.state.ACTIVE_PIPELINE = champion  # Thread-safe hot-swap
joblib.dump(champion, MODEL_PATH)     # Persist to disk
```

**Zero-downtime deployment** — the `ACTIVE_PIPELINE` is swapped atomically in memory.

---

### 3. AI Copilot (LLM Integration)

The **Gridlock AI Copilot** integrates a local Large Language Model to assist dispatchers with natural language queries.

| Aspect | Detail |
|---|---|
| **Model** | Llama 3 (Meta) |
| **Hosting** | Local via Ollama (`localhost:11434`) |
| **Context** | Auto-fed with top 3 real-time severe hotspots |
| **Response Style** | Under 3 sentences, highly analytical and authoritative |
| **Example Query** | *"Where are the biggest threats right now?"* |
| **Example Response** | *"Silk Board Junction has the highest congestion impact at 8.9/10 due to a lorry double-parked 5m from the intersection during evening rush. Deploy Unit #1 immediately. Secondary threat at Madiwala Market (7.6/10)."* |

---

### 4. Resource Dispatch Algorithm

The routing engine uses a **greedy priority assignment** strategy:

```
1. Sort all hotspots by impact_score (descending)
2. For each available van (1 to N):
   a. Assign to the next-highest-scoring hotspot
   b. Calculate Euclidean distance from Central Dispatch (12.9716, 77.5946)
   c. Convert to km (1° ≈ 111 km)
   d. Calculate ETA at 20 km/h average Bengaluru speed (3 min/km)
   e. Find the best intermediate waypoint for a realistic route
3. Return route: Central Dispatch → Waypoint → Target Junction
```

**8 intermediate waypoints** are defined (Residency Road, Richmond Circle, Hudson Circle, Lalbagh West Gate, etc.) to create realistic multi-hop routes.

---

### 5. Violation Simulator — Realistic Data Generation

Since a live camera feed is not available for the hackathon, we built a **hyper-realistic violation event simulator** that generates data matching the exact Flipkart GRID dataset schema.

#### Realism Features

| Feature | Implementation |
|---|---|
| **50+ real Bengaluru locations** | Mapped with actual GPS coordinates, road widths, intersection distances, and police station jurisdictions |
| **Temporal patterns** | Violation frequency follows realistic hourly weights (peak at 8–9 AM and 5–6 PM, minimal at 2–4 AM) |
| **Zone-type bias** | Commercial areas peak midday, transit zones peak during rush hours, residential zones peak evenings |
| **Vehicle plate generation** | Karnataka-format plates: `KA-01-AB-1234` from 10 real KA prefix codes |
| **Privacy masking** | Plates auto-masked for display: `KA-01-**-**34` |
| **Detection source simulation** | 70% camera-detected (`CAM-XXXX`), 30% officer-reported (`OFC-XXX`) |
| **Repeat offenders** | 8 vehicle numbers are recycled with 15% probability for realistic habitual violator data |
| **Resolution simulation** | 40% of historical violations are randomly resolved with realistic delay (5–180 minutes) |
| **Center codes** | Police stations mapped to center codes (e.g., `Koramangala PS` → `BTP-KR`) |

#### SSE Stream

The `violation_sse_generator()` produces a continuous stream of new violations every 2–5 seconds, mimicking a live camera network.

---

## 🌟 Unique Innovations

### 1. **PICS Score — The Core Innovation**
No existing system quantifies the *congestion impact* of individual parking violations. Our 6-factor deterministic model is the first to convert a parking violation into an actionable severity number.

### 2. **Congestion Index — Zone-Level Composite Score**
Each zone receives a **Congestion Index (0–100)** computed as:

```
Congestion Index = (Density Factor × 30) + (Severity Factor × 25) +
                   (Critical Factor × 20) + (Duration Factor × 25)
```

| Sub-Factor | Weight | How Calculated |
|---|---|---|
| **Density Factor** | 30% | `min(1.0, violations / 20)` — normalized violation count |
| **Severity Factor** | 25% | `avg_pics / 10.0` — average PICS of zone's violations |
| **Critical Factor** | 20% | Ratio of Critical+Severe violations to total |
| **Duration Factor** | 25% | `min(1.0, avg_duration / 120 min)` — average resolution time |

### 3. **Real-Time SSE Streaming**
Unlike polling-based dashboards, our platform maintains a **persistent SSE connection**. New violations appear on screen within milliseconds of generation — no page refresh, no polling delay.

### 4. **MLOps Hot-Swap & Model Retraining Dashboard**

Our platform features a **dedicated Model Retraining page** (`/mlops`) that allows operators and data scientists to upload new training data, trigger a background retraining pipeline, and hot-swap the active ML model — all **without any server downtime or manual restarts**.

#### 🔄 How the Retraining Pipeline Works

```
┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Upload CSV   │ ──▶ │  Background Task  │ ──▶ │  Model Race     │ ──▶ │  RMSE Validation │ ──▶ │  Hot-Swap       │
│  via UI/API   │     │  train_and_swap   │     │  XGB vs RF      │     │  20% test split  │     │  Zero downtime  │
└───────────────┘     └──────────────────┘     └─────────────────┘     └──────────────────┘     └────────────────┘
```

1. **Upload** — Drag & drop a `.csv` file on the `/mlops` page (or `POST /api/upload-training-data`)
2. **Background Training** — The server kicks off `train_and_swap_pipeline()` as a FastAPI BackgroundTask
3. **Model Race** — Both **XGBoost** and **Random Forest** are trained on the same data
4. **RMSE Validation Gate** — Each model is evaluated on a 20% held-out test split; the lower-RMSE model becomes the **champion**
5. **Hot-Swap** — The champion pipeline replaces `app.state.ACTIVE_PIPELINE` in memory and is serialized to `gridlock_pipeline_v_new.pkl`

#### 📋 Required CSV Format

| Column | Type | Required | Description |
|---|---|---|---|
| `hour` | Integer (0–23) | ✅ | Hour of the observation |
| `day_of_week` | Integer (0–6) | ✅ | Monday=0, Sunday=6 |
| `is_weekend` | Binary (0/1) | ✅ | 1 if Saturday or Sunday |
| `vehicle_type` | String | ✅ | One of: CAR, SUV, LORRY, BUS, AUTO, TWO_WHEELER |
| `target_impact` | Float (0–10) | ⚠️ Optional | Congestion impact score; auto-generated if missing |

> **💡 Tip:** The `/mlops` page includes a **"Download Sample CSV"** button that generates a valid 200-row mock CSV for quick testing.

#### 🖥️ Using the Retraining Dashboard

The `/mlops` page provides:
- **Model Status Cards** — Active model type, last updated timestamp, file size, and training status (idle/training/success/failed)
- **Drag & Drop Upload Zone** — Client-side CSV validation before upload
- **Live Training Progress** — Auto-polls backend every 3 seconds during training, showing the model race status
- **Training Results Panel** — After completion, displays champion model, XGBoost RMSE, Random Forest RMSE, and completion timestamp

#### 🔧 Using the API Directly

```bash
# Upload training data via curl
curl -X POST -F "file=@your_training_data.csv" http://localhost:8000/api/upload-training-data

# Check current model status
curl http://localhost:8000/api/model-status
```

### 5. **Full Flipkart Dataset Schema Compliance**
Our violation events contain **all 24 fields** from the Flipkart GRID dataset schema:

```
id, latitude, longitude, location, vehicle_number, vehicle_type, description,
violation_type, offence_code, created_datetime, closed_datetime, modified_datetime,
device_id, created_by_id, center_code, police_station, data_sent_to_scita,
junction_name, action_taken_timestamp, data_sent_to_scita_timestamp,
updated_vehicle_number, updated_vehicle_type, validation_status, validation_timestamp
```

### 6. **Police Station Performance Benchmarking**
The first platform to evaluate traffic police **jurisdictional efficiency** by computing per-station resolution rates and response times from the dataset.

### 7. **Repeat Offender Intelligence**
Aggregates violations by masked vehicle number to identify habitual offenders — enabling targeted impounding strategies.

---

## 📡 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check — returns system status |
| `GET` | `/api/hotspots` | ML model prediction for congestion hotspots |
| `GET` | `/api/heatmap` | Interactive Folium heatmap (HTML response) |
| `POST` | `/api/allocate-resources` | Compute optimal patrol van dispatch routes |
| `POST` | `/api/copilot/chat` | Send natural language query to AI Copilot |
| `POST` | `/api/upload-training-data` | Upload CSV to retrain & hot-swap ML model |
| `GET` | `/api/model-status` | Active model info, file size, training status |

### Parking Intelligence Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/violations/live` | **SSE Stream** — real-time violation events |
| `GET` | `/api/violations/recent` | Paginated recent violations (filterable) |
| `POST` | `/api/violations/resolve` | Mark a violation as resolved |
| `GET` | `/api/zones` | All 12 zones with aggregated stats |
| `GET` | `/api/zones/{zone_id}` | Detailed zone intel with violations |
| `GET` | `/api/analytics/summary` | KPI summary (24h stats) |
| `GET` | `/api/analytics/trends` | Time-series data, distributions, peak hours |

---

## 📁 Project Structure

```
Flipkart/
├── 📄 README.md                          # This file
├── 📓 gridlock.ipynb                     # Jupyter notebook (EDA & model training)
│
├── 🐍 gridlock-backend/                  # FastAPI Backend
│   ├── main.py                           # Application entry point, all API routes
│   ├── pics_engine.py                    # ⭐ PICS Score v2.0 — 6-factor scoring algorithm
│   ├── ml_engine.py                      # XGBoost prediction engine + junction data
│   ├── mlops.py                          # MLOps hot-swap pipeline (XGB vs RF race)
│   ├── zone_engine.py                    # 12-zone spatial system + aggregation
│   ├── violation_simulator.py            # Realistic violation generator (50+ locations)
│   ├── routing.py                        # Greedy dispatch routing algorithm
│   ├── copilot.py                        # AI Copilot (Llama 3 via Ollama)
│   ├── schemas.py                        # Pydantic v2 models (request/response)
│   ├── requirements.txt                  # Python dependencies
│   └── gridlock_pipeline_v_new.pkl       # Serialized ML pipeline
│
├── ⚛️  Frontend/                          # Next.js 16 Frontend
│   ├── app/
│   │   ├── page.tsx                      # 🏠 Command Center (homepage)
│   │   ├── live/page.tsx                 # 📡 Live Violation Feed (SSE)
│   │   ├── mlops/page.tsx                # 🧠 Model Retraining (MLOps Dashboard)
│   │   ├── analytics/page.tsx            # 📊 Analytics Dashboard
│   │   ├── zones/page.tsx                # 🗺 Zone Intelligence
│   │   ├── layout.tsx                    # Root layout + sidebar
│   │   ├── client-layout.tsx             # Client-side layout wrapper
│   │   └── globals.css                   # Global styles + glassmorphism
│   ├── components/
│   │   ├── Sidebar.tsx                   # Navigation sidebar
│   │   ├── KpiCard.tsx                   # Animated KPI metric cards
│   │   ├── LiveTicker.tsx                # Horizontal scrolling alert ticker
│   │   ├── ViolationCard.tsx             # Rich violation display card
│   │   ├── ZoneCard.tsx                  # Zone overview card with progress ring
│   │   ├── CopilotPanel.tsx              # AI Copilot chat interface
│   │   └── ui/                           # shadcn/ui primitives
│   ├── lib/                              # Utility functions
│   ├── package.json                      # Node.js dependencies
│   ├── tsconfig.json                     # TypeScript config
│   ├── next.config.mjs                   # Next.js configuration
│   └── postcss.config.mjs               # PostCSS + Tailwind config
```

---

<p align="center">
  <b>Built with ❤️ for the Flipkart GRID 6.0 Hackathon</b><br/>
  <i>Gridlock Intelligence — Transforming reactive enforcement into proactive, data-driven operations.</i>
</p>
