import os
import joblib
import tempfile
import shutil
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request, Query, UploadFile, File
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from datetime import datetime, timedelta
import json
import folium
from folium.plugins import HeatMap

# Local modules
from schemas import (
    PredictionRequest, HotspotResponse,
    ResourceAllocationRequest, AllocationResponse,
    ChatRequest, ChatResponse,
    ZoneOverview, ZoneDetail, AnalyticsSummary, TrendDataPoint,
    ViolationEvent, ViolationResolutionRequest, ViolationResolutionResponse,
)
from ml_engine import generate_dummy_model, get_hotspots, MODEL_PATH
from mlops import train_and_swap_pipeline
from routing import allocate_resources
from copilot import generate_chat_response
from violation_simulator import (
    generate_single_violation,
    generate_historical_violations,
    violation_sse_generator,
)
from pics_engine import enrich_violation_with_pics, enrich_violations_batch
from zone_engine import get_zone_overviews, get_zone_detail, get_all_zones

app = FastAPI(
    title="Gridlock Intelligence Backend",
    description="AI-Driven Parking Intelligence & Congestion Impact Platform",
    version="2.0.0",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-Memory Data Store (for prototype — would be DB in production) ──
# We pre-generate historical violations on startup for analytics
VIOLATION_STORE: list = []
RESOLVED_IDS: set = set()


# ── Startup ──
@app.on_event("startup")
async def startup_event():
    global VIOLATION_STORE
    print("Initializing Gridlock Intelligence v2.0...")

    # Initialize retraining status
    app.state.TRAINING_STATUS = {
        "status": "idle",
        "error": None
    }

    # Load ML pipeline
    if os.path.exists(MODEL_PATH):
        try:
            print(f"Loading existing ML Pipeline from {MODEL_PATH}...")
            app.state.ACTIVE_PIPELINE = joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"Error loading {MODEL_PATH}: {e}")
            app.state.ACTIVE_PIPELINE = generate_dummy_model()
    else:
        app.state.ACTIVE_PIPELINE = generate_dummy_model()

    # Generate 24h of historical violations for analytics
    print("Generating historical violation data (24h)...")
    raw_violations = generate_historical_violations(hours_back=24, avg_per_hour=14)
    VIOLATION_STORE = enrich_violations_batch(raw_violations)
    print(f"Generated {len(VIOLATION_STORE)} historical violations.")

    print("Gridlock Intelligence v2.0 ready.")


# ═══════════════════════════════════════════════════════════════
#  EXISTING ENDPOINTS (preserved)
# ═══════════════════════════════════════════════════════════════

# 1. ML Inference Engine (Hotspots)
@app.get("/api/hotspots", response_model=list[HotspotResponse])
async def api_get_hotspots(
    target_date: str = Query(..., description="Date in YYYY-MM-DD format"),
    time_range: str = Query(..., description="E.g., 'Morning Rush', 'Night', 'Midday'"),
    vehicle_filter: str = Query(None, description="Optional vehicle type filter"),
):
    try:
        if not hasattr(app.state, "ACTIVE_PIPELINE"):
            raise HTTPException(status_code=500, detail="ML Pipeline is not initialized.")

        request_obj = PredictionRequest(
            target_date=target_date,
            time_range=time_range,
            vehicle_filter=vehicle_filter,
        )
        pipeline = app.state.ACTIVE_PIPELINE
        hotspots = get_hotspots(request_obj, pipeline)
        return hotspots
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 2. Interactive Heatmap (HTML)
@app.get("/api/heatmap", response_class=HTMLResponse)
async def api_get_heatmap(
    target_date: str = Query(..., description="Date in YYYY-MM-DD format"),
    time_range: str = Query(..., description="E.g., 'Morning Rush', 'Night', 'Midday'"),
    vehicle_filter: str = Query(None, description="Optional vehicle type filter"),
):
    try:
        if not hasattr(app.state, "ACTIVE_PIPELINE"):
            raise HTTPException(status_code=500, detail="ML Pipeline is not initialized.")

        request_obj = PredictionRequest(
            target_date=target_date,
            time_range=time_range,
            vehicle_filter=vehicle_filter,
        )
        pipeline = app.state.ACTIVE_PIPELINE
        hotspots = get_hotspots(request_obj, pipeline)

        m = folium.Map(location=[12.9716, 77.5946], zoom_start=12, tiles="CartoDB dark_matter")

        heat_data = [[h["latitude"], h["longitude"], h["impact_score"]] for h in hotspots]

        HeatMap(
            heat_data,
            radius=20,
            blur=15,
            max_zoom=13,
            gradient={0.2: "blue", 0.4: "lime", 0.6: "yellow", 0.8: "orange", 1.0: "red"},
        ).add_to(m)

        for h in hotspots:
            if h["status"] == "Severe":
                folium.CircleMarker(
                    location=[h["latitude"], h["longitude"]],
                    radius=8,
                    color="red",
                    fill=True,
                    fill_opacity=0.7,
                    popup=f"<b>{h['junction_name']}</b><br>Score: {h['impact_score']}/10",
                ).add_to(m)

        html_content = m.get_root().render()
        html_content = html_content.replace(
            "</head>",
            "<style>html, body {width: 100%; height: 100%; margin: 0; padding: 0; background: #121212;}</style></head>",
        )
        return HTMLResponse(content=html_content)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 3. MLOps Hot-Swap
@app.get("/api/model-status")
async def api_model_status():
    try:
        if not hasattr(app.state, "ACTIVE_PIPELINE"):
            return {
                "status": "inactive",
                "detail": "ML Pipeline is not initialized.",
                "training_status": getattr(app.state, "TRAINING_STATUS", {"status": "idle"})
            }
        
        pipeline = app.state.ACTIVE_PIPELINE
        
        # Detect model step
        model_type = "Unknown"
        if hasattr(pipeline, "steps"):
            for step_name, step_obj in pipeline.steps:
                if step_name in ["model", "classifier", "regressor"]:
                    model_type = step_obj.__class__.__name__
                    break
        
        file_mod_time = "Unknown"
        file_size = "Unknown"
        if os.path.exists(MODEL_PATH):
            stat = os.stat(MODEL_PATH)
            file_mod_time = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            file_size = f"{stat.st_size / 1024:.1f} KB"
            
        return {
            "status": "active",
            "model_type": model_type,
            "last_updated": file_mod_time,
            "file_size": file_size,
            "filepath": MODEL_PATH,
            "features": ["hour", "day_of_week", "is_weekend", "vehicle_type"],
            "target": "target_impact",
            "training_status": getattr(app.state, "TRAINING_STATUS", {"status": "idle"})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload-training-data")
async def api_upload_training_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    try:
        temp_csv = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
        with open(temp_csv.name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        background_tasks.add_task(train_and_swap_pipeline, app, temp_csv.name)
        return {
            "message": f"Training started in background with file {file.filename}. "
            "The ACTIVE_PIPELINE will hot-swap upon completion."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 4. Resource Allocation & Routing
@app.post("/api/allocate-resources", response_model=list[AllocationResponse])
async def api_allocate_resources(request: ResourceAllocationRequest):
    try:
        assignments = allocate_resources(request)
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 5. Copilot Chat
@app.post("/api/copilot/chat", response_model=ChatResponse)
async def api_copilot_chat(request: ChatRequest):
    try:
        dummy_request = PredictionRequest(
            target_date=datetime.now().strftime("%Y-%m-%d"),
            time_range="Morning Rush",
        )
        if not hasattr(app.state, "ACTIVE_PIPELINE"):
            raise HTTPException(status_code=500, detail="ML Pipeline is not initialized.")

        pipeline = app.state.ACTIVE_PIPELINE
        top_hotspots = get_hotspots(dummy_request, pipeline)

        response_text = await generate_chat_response(request.user_message, top_hotspots)
        return ChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
#  NEW ENDPOINTS — Parking Intelligence Platform
# ═══════════════════════════════════════════════════════════════

# 6. Live Violation SSE Stream
@app.get("/api/violations/live")
async def api_violations_live():
    """Server-Sent Events stream of real-time parking violations."""
    async def event_generator():
        async for event in violation_sse_generator():
            # Parse, enrich with PICS, re-serialize
            try:
                raw = json.loads(event.replace("data: ", "").strip())
                enriched = enrich_violation_with_pics(raw)
                yield {"data": json.dumps(enriched)}
            except Exception:
                yield {"data": event.replace("data: ", "").strip()}

    return EventSourceResponse(event_generator())


# 7. Recent Violations (paginated)
@app.get("/api/violations/recent")
async def api_recent_violations(
    limit: int = Query(50, ge=1, le=200),
    zone_id: str = Query(None),
    severity: str = Query(None),
):
    """Get recent violations, optionally filtered by zone or severity."""
    violations = list(VIOLATION_STORE)

    if zone_id:
        violations = [v for v in violations if v.get("zone_id") == zone_id]
    if severity:
        violations = [v for v in violations if v.get("severity", "").lower() == severity.lower()]

    # Most recent first
    violations.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return violations[:limit]


# 8. Resolve a Violation
@app.post("/api/violations/resolve")
async def api_resolve_violation(request: ViolationResolutionRequest):
    """Mark a violation as resolved."""
    global VIOLATION_STORE
    now = datetime.now().isoformat()

    for v in VIOLATION_STORE:
        if v.get("violation_id") == request.violation_id:
            v["is_resolved"] = True
            v["resolved_at"] = now
            RESOLVED_IDS.add(request.violation_id)
            return ViolationResolutionResponse(
                violation_id=request.violation_id,
                resolved=True,
                resolved_at=now,
            )

    raise HTTPException(status_code=404, detail=f"Violation {request.violation_id} not found.")


# 9. Zone Overviews
@app.get("/api/zones", response_model=list[ZoneOverview])
async def api_get_zones():
    """Get all zones with aggregated violation stats and PICS scores."""
    overviews = get_zone_overviews(VIOLATION_STORE)
    return overviews


# 10. Zone Detail
@app.get("/api/zones/{zone_id}")
async def api_get_zone_detail(zone_id: str):
    """Get detailed information for a specific zone."""
    detail = get_zone_detail(zone_id, VIOLATION_STORE)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found.")
    return detail


# 11. Analytics Summary (KPI Cards)
@app.get("/api/analytics/summary", response_model=AnalyticsSummary)
async def api_analytics_summary():
    """Get high-level KPI summary for dashboard cards."""
    now = datetime.now()
    cutoff_24h = (now - timedelta(hours=24)).isoformat()

    recent = [v for v in VIOLATION_STORE if v.get("timestamp", "") >= cutoff_24h]

    total = len(recent)
    scores = [v.get("pics_score", 0) for v in recent]
    avg_pics = round(sum(scores) / max(len(scores), 1), 2)
    unresolved = sum(1 for v in recent if not v.get("is_resolved", False))

    # Zone summaries for critical count
    zone_overviews = get_zone_overviews(recent)
    critical_zones = sum(1 for z in zone_overviews if z["risk_level"] in ("Critical", "High"))

    top_zone = zone_overviews[0] if zone_overviews else None
    top_zone_name = top_zone["zone_name"] if top_zone else "N/A"
    top_zone_congestion = top_zone["congestion_index"] if top_zone else 0.0

    # Determine PICS trend (compare first half vs second half of 24h)
    cutoff_12h = (now - timedelta(hours=12)).isoformat()
    first_half = [v for v in recent if v.get("timestamp", "") < cutoff_12h]
    second_half = [v for v in recent if v.get("timestamp", "") >= cutoff_12h]

    first_avg = sum(v.get("pics_score", 0) for v in first_half) / max(len(first_half), 1)
    second_avg = sum(v.get("pics_score", 0) for v in second_half) / max(len(second_half), 1)

    if second_avg > first_avg * 1.1:
        pics_trend = "up"
    elif second_avg < first_avg * 0.9:
        pics_trend = "down"
    else:
        pics_trend = "stable"

    hours_spanned = max(1, 24)
    violations_per_hour = round(total / hours_spanned, 1)

    return AnalyticsSummary(
        total_violations_24h=total,
        avg_pics_24h=avg_pics,
        active_critical_zones=critical_zones,
        total_unresolved=unresolved,
        violations_per_hour=violations_per_hour,
        top_zone_name=top_zone_name,
        top_zone_congestion=top_zone_congestion,
        pics_trend=pics_trend,
    )


# 12. Analytics Trends
@app.get("/api/analytics/trends")
async def api_analytics_trends(
    period: str = Query("24h", description="'24h', '7d', or '30d'"),
):
    """Get time-series trend data for charts."""
    now = datetime.now()

    if period == "7d":
        hours_back = 168
        bucket_hours = 6  # 6-hour buckets
    elif period == "30d":
        hours_back = 720
        bucket_hours = 24  # daily buckets
    else:
        hours_back = 24
        bucket_hours = 1  # hourly buckets

    cutoff = (now - timedelta(hours=hours_back)).isoformat()
    relevant = [v for v in VIOLATION_STORE if v.get("timestamp", "") >= cutoff]

    # Build time buckets
    buckets = []
    for i in range(0, hours_back, bucket_hours):
        bucket_start = now - timedelta(hours=hours_back - i)
        bucket_end = bucket_start + timedelta(hours=bucket_hours)

        bucket_violations = [
            v for v in relevant
            if bucket_start.isoformat() <= v.get("timestamp", "") < bucket_end.isoformat()
        ]

        scores = [v.get("pics_score", 0) for v in bucket_violations]
        avg_score = round(sum(scores) / max(len(scores), 1), 2)
        critical = sum(1 for v in bucket_violations if v.get("severity") in ("Critical", "Severe"))

        if period == "24h":
            label = bucket_start.strftime("%I %p")
        elif period == "7d":
            label = bucket_start.strftime("%a %I%p")
        else:
            label = bucket_start.strftime("%b %d")

        buckets.append({
            "timestamp": bucket_start.isoformat(),
            "label": label,
            "violation_count": len(bucket_violations),
            "avg_pics": avg_score,
            "critical_count": critical,
        })

    # Violation type distribution
    type_counts = {}
    for v in relevant:
        vt = v.get("violation_label", "Unknown")
        type_counts[vt] = type_counts.get(vt, 0) + 1
    type_distribution = [{"type": t, "count": c} for t, c in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)]

    # Vehicle type distribution
    vehicle_counts = {}
    for v in relevant:
        veh = v.get("vehicle_type", "Unknown")
        vehicle_counts[veh] = vehicle_counts.get(veh, 0) + 1
    vehicle_distribution = [{"type": t, "count": c} for t, c in sorted(vehicle_counts.items(), key=lambda x: x[1], reverse=True)]

    # Peak hours (for heatmap grid)
    peak_grid = {}
    for v in relevant:
        try:
            ts = datetime.fromisoformat(v.get("timestamp", ""))
            day = ts.strftime("%a")
            hour = ts.hour
            key = f"{day}-{hour}"
            peak_grid[key] = peak_grid.get(key, 0) + 1
        except (ValueError, TypeError):
            pass

    peak_hours = [{"day": k.split("-")[0], "hour": int(k.split("-")[1]), "count": c} for k, c in peak_grid.items()]

    return {
        "period": period,
        "trend_data": buckets,
        "type_distribution": type_distribution,
        "vehicle_distribution": vehicle_distribution,
        "peak_hours": peak_hours,
        "total_violations": len(relevant),
        # ── v2.0: Resolution Time Analytics ──
        "resolution_stats": _compute_resolution_stats(relevant),
        # ── v2.0: Repeat Offender Intelligence ──
        "repeat_offenders": _compute_repeat_offenders(relevant),
        # ── v2.0: Detection Source Breakdown ──
        "detection_sources": _compute_detection_sources(relevant),
        # ── v2.0: Police Station Performance ──
        "station_performance": _compute_station_performance(relevant),
    }

# ═══════════════════════════════════════════════════════════════
#  v2.0 — Analytics Helper Functions
# ═══════════════════════════════════════════════════════════════

def _parse_dt(dt_str):
    """Safely parse a datetime string."""
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(str(dt_str))
    except (ValueError, TypeError):
        try:
            return datetime.strptime(str(dt_str), "%Y-%m-%d %H:%M:%S")
        except (ValueError, TypeError):
            return None


def _compute_resolution_stats(violations: list) -> dict:
    """Compute resolution time statistics from created_datetime and closed_datetime."""
    durations = []
    for v in violations:
        created = _parse_dt(v.get("created_datetime"))
        closed = _parse_dt(v.get("closed_datetime"))
        if created and closed:
            dur_mins = (closed - created).total_seconds() / 60.0
            if dur_mins > 0:
                durations.append(dur_mins)

    if not durations:
        return {"avg_resolution_mins": 0, "median_resolution_mins": 0, "min_mins": 0, "max_mins": 0, "resolved_count": 0, "unresolved_count": sum(1 for v in violations if not v.get("is_resolved"))}

    durations.sort()
    median = durations[len(durations) // 2]

    return {
        "avg_resolution_mins": round(sum(durations) / len(durations), 1),
        "median_resolution_mins": round(median, 1),
        "min_mins": round(min(durations), 1),
        "max_mins": round(max(durations), 1),
        "resolved_count": len(durations),
        "unresolved_count": sum(1 for v in violations if not v.get("is_resolved")),
    }


def _compute_repeat_offenders(violations: list) -> list:
    """Find vehicles with multiple violations."""
    vehicle_counts: dict = {}
    for v in violations:
        vn = v.get("vehicle_number")
        if vn:
            if vn not in vehicle_counts:
                vehicle_counts[vn] = {"vehicle_number": vn, "count": 0, "total_pics": 0, "vehicle_type": v.get("vehicle_type", "Unknown"), "locations": set()}
            vehicle_counts[vn]["count"] += 1
            vehicle_counts[vn]["total_pics"] += v.get("pics_score", 0)
            vehicle_counts[vn]["locations"].add(v.get("location_name", ""))

    # Filter to repeat offenders (2+ violations)
    repeats = [
        {
            "vehicle_number": data["vehicle_number"],
            "masked_number": data["vehicle_number"][:7] + "**-**" + data["vehicle_number"][-2:] if len(data["vehicle_number"]) > 9 else data["vehicle_number"],
            "count": data["count"],
            "avg_pics": round(data["total_pics"] / data["count"], 1),
            "vehicle_type": data["vehicle_type"],
            "location_count": len(data["locations"]),
        }
        for data in vehicle_counts.values()
        if data["count"] >= 2
    ]

    return sorted(repeats, key=lambda x: x["count"], reverse=True)[:10]


def _compute_detection_sources(violations: list) -> dict:
    """Breakdown of camera vs manual detections."""
    camera_count = sum(1 for v in violations if v.get("device_id"))
    manual_count = sum(1 for v in violations if v.get("created_by_id") and not v.get("device_id"))
    unknown_count = len(violations) - camera_count - manual_count

    return {
        "camera": camera_count,
        "manual": manual_count,
        "unknown": unknown_count,
        "camera_pct": round(camera_count / max(len(violations), 1) * 100, 1),
        "manual_pct": round(manual_count / max(len(violations), 1) * 100, 1),
    }


def _compute_station_performance(violations: list) -> list:
    """Per-police-station response time and violation count."""
    stations: dict = {}
    for v in violations:
        ps = v.get("police_station")
        if not ps:
            continue
        if ps not in stations:
            stations[ps] = {"station": ps, "total": 0, "resolved": 0, "durations": []}
        stations[ps]["total"] += 1

        created = _parse_dt(v.get("created_datetime"))
        closed = _parse_dt(v.get("closed_datetime"))
        if created and closed:
            dur = (closed - created).total_seconds() / 60.0
            if dur > 0:
                stations[ps]["resolved"] += 1
                stations[ps]["durations"].append(dur)

    result = []
    for data in stations.values():
        avg_response = round(sum(data["durations"]) / max(len(data["durations"]), 1), 1)
        result.append({
            "station": data["station"],
            "total_violations": data["total"],
            "resolved_count": data["resolved"],
            "avg_response_mins": avg_response,
            "resolution_rate": round(data["resolved"] / max(data["total"], 1) * 100, 1),
        })

    return sorted(result, key=lambda x: x["total_violations"], reverse=True)


# ── Health Check ──
@app.get("/")
async def root():
    return {
        "status": "Gridlock Intelligence v2.0 running",
        "violations_in_store": len(VIOLATION_STORE),
        "zones": len(get_all_zones()),
    }