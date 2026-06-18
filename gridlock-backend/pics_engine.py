"""
PICS Engine v2.0 — Parking-Induced Congestion Score
Upgraded to work with the real Flipkart GRID dataset schema.

Our unique differentiator: quantifies how much each parking violation
impacts traffic flow, not just that it exists.

Score: 0-10 scale
  0-3: Low impact (wide road, off-peak, minor violation)
  4-6: Moderate impact (needs monitoring)
  7-8: High impact (enforcement recommended)
  9-10: Critical impact (immediate dispatch required)

Factors (v2.0 — now includes Duration Impact):
  1. Road Width Impact (0-2.0): Narrower roads = higher impact
  2. Intersection Proximity (0-2.0): Closer to intersection = higher impact
  3. Temporal Factor (0-2.0): Peak hours = higher impact
  4. Vehicle Size (0-1.5): Larger vehicles = more road blocked
  5. Violation Severity (0-1.5): Double-parking, blocking > simple no-parking
  6. Duration Impact (0-1.0): Longer violations = more cumulative congestion
"""

from typing import List, Dict, Optional
from datetime import datetime
import random


# ── Offense code to severity mapping (from real dataset patterns) ──
OFFENSE_SEVERITY_MAP = {
    "NP": 6,       # No Parking
    "DP": 8,       # Double Parking
    "SW": 7,       # Sidewalk Parking
    "BS": 8,       # Bus Stop Blocking
    "IB": 9,       # Intersection Blocking
    "CB": 7,       # Crosswalk Blocking
    "LZ": 5,       # Loading Zone Violation
    "FH": 9,       # Near Fire Hydrant
}

# ── Vehicle type to size factor mapping ──
VEHICLE_SIZE_MAP = {
    "CAR": 1.0,
    "Car": 1.0,
    "SUV": 1.3,
    "Suv": 1.3,
    "LORRY": 2.0,
    "Lorry": 2.0,
    "Truck": 2.0,
    "TRUCK": 2.0,
    "BUS": 2.2,
    "Bus": 2.2,
    "AUTO": 0.6,
    "Auto": 0.6,
    "Auto Rickshaw": 0.6,
    "TWO_WHEELER": 0.3,
    "Two Wheeler": 0.3,
    "Bike": 0.3,
    "BIKE": 0.3,
    "Motorcycle": 0.3,
    "Scooter": 0.3,
    "LCV": 1.5,
    "HCV": 2.0,
    "Tempo": 1.5,
}


def _parse_datetime_safe(dt_str: Optional[str]) -> Optional[datetime]:
    """Safely parse a datetime string, returning None on failure."""
    if not dt_str or dt_str == "" or dt_str == "None":
        return None
    try:
        return datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        try:
            # Try common formats from the dataset
            for fmt in ["%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S", "%Y-%m-%dT%H:%M:%S"]:
                try:
                    return datetime.strptime(str(dt_str), fmt)
                except ValueError:
                    continue
        except Exception:
            pass
    return None


def _get_vehicle_size_factor(vehicle_type: Optional[str]) -> float:
    """Get size factor for a vehicle type, with fuzzy matching."""
    if not vehicle_type:
        return 1.0
    # Direct match
    if vehicle_type in VEHICLE_SIZE_MAP:
        return VEHICLE_SIZE_MAP[vehicle_type]
    # Case-insensitive match
    for key, val in VEHICLE_SIZE_MAP.items():
        if key.lower() == vehicle_type.lower():
            return val
    return 1.0


def _get_violation_severity(violation: Dict) -> int:
    """Get violation severity from offence_code or violation_type."""
    # Try offence_code first (real dataset)
    offence_code = violation.get("offence_code", "")
    if offence_code and offence_code in OFFENSE_SEVERITY_MAP:
        return OFFENSE_SEVERITY_MAP[offence_code]

    # Try violation_type string matching
    vtype = str(violation.get("violation_type", "") or "").lower()
    if "double" in vtype:
        return 8
    elif "intersection" in vtype or "junction" in vtype:
        return 9
    elif "bus" in vtype or "stop" in vtype:
        return 8
    elif "sidewalk" in vtype or "footpath" in vtype:
        return 7
    elif "crosswalk" in vtype or "zebra" in vtype:
        return 7
    elif "fire" in vtype or "hydrant" in vtype:
        return 9
    elif "loading" in vtype:
        return 5
    elif "no" in vtype and "park" in vtype:
        return 6

    # Fallback to violation_severity_base if present (from simulator)
    return violation.get("violation_severity_base", 5)


def calculate_pics_score(violation: Dict) -> float:
    """
    Calculate Parking-Induced Congestion Score for a single violation.

    Works with both the real Flipkart dataset schema AND the simulator schema.

    Factors (v2.0):
    1. Road Width Impact (0-2.0): Narrower roads = higher impact
    2. Intersection Proximity (0-2.0): Closer to intersection = higher impact
    3. Temporal Factor (0-2.0): Peak hours = higher impact
    4. Vehicle Size (0-1.5): Larger vehicles = more road blocked
    5. Violation Severity (0-1.5): Double-parking, blocking > simple no-parking
    6. Duration Impact (0-1.0): Longer unresolved = more cumulative congestion
    """

    # ── Factor 1: Road Width Impact (0 - 2.0) ──
    road_width = violation.get("road_width_m", 10)
    if road_width is None:
        road_width = 10  # Default for real dataset (no road_width field)
    if road_width <= 4:
        road_score = 2.0
    elif road_width <= 6:
        road_score = 1.8
    elif road_width <= 8:
        road_score = 1.5
    elif road_width <= 10:
        road_score = 1.1
    elif road_width <= 14:
        road_score = 0.7
    else:
        road_score = 0.3

    # ── Factor 2: Intersection Proximity (0 - 2.0) ──
    dist = violation.get("dist_to_intersection_m", 30)
    if dist is None:
        dist = 30
    if dist <= 5:
        intersection_score = 2.0
    elif dist <= 10:
        intersection_score = 1.8
    elif dist <= 20:
        intersection_score = 1.4
    elif dist <= 35:
        intersection_score = 1.0
    elif dist <= 50:
        intersection_score = 0.6
    else:
        intersection_score = 0.2

    # ── Factor 3: Temporal Factor (0 - 2.0) ──
    # Try created_datetime first (real dataset), then timestamp (simulator)
    ts_str = violation.get("created_datetime") or violation.get("timestamp", "")
    ts = _parse_datetime_safe(ts_str)
    hour = ts.hour if ts else datetime.now().hour

    peak_hours = {7: 1.4, 8: 1.8, 9: 2.0, 10: 1.5, 16: 1.4, 17: 1.8, 18: 2.0, 19: 1.6}
    moderate_hours = {6: 1.0, 11: 1.1, 12: 1.0, 13: 1.0, 14: 1.1, 15: 1.2, 20: 1.0, 21: 0.8}
    temporal_score = peak_hours.get(hour, moderate_hours.get(hour, 0.4))

    # ── Factor 4: Vehicle Size (0 - 1.5) ──
    # Try vehicle_size_factor first (simulator), then derive from vehicle_type
    size_factor = violation.get("vehicle_size_factor")
    if size_factor is None:
        vtype = violation.get("vehicle_type") or violation.get("updated_vehicle_type", "")
        size_factor = _get_vehicle_size_factor(vtype)
    vehicle_score = min(1.5, size_factor * 0.75)

    # ── Factor 5: Violation Severity (0 - 1.5) ──
    severity_base = _get_violation_severity(violation)
    violation_score = min(1.5, severity_base / 6.0)

    # ── Factor 6: Duration Impact (0 - 1.0) — NEW in v2.0 ──
    duration_score = 0.0
    created = _parse_datetime_safe(violation.get("created_datetime"))
    closed = _parse_datetime_safe(violation.get("closed_datetime"))

    if created and closed:
        duration_mins = (closed - created).total_seconds() / 60.0
        if duration_mins > 180:     # > 3 hours
            duration_score = 1.0
        elif duration_mins > 120:   # > 2 hours
            duration_score = 0.8
        elif duration_mins > 60:    # > 1 hour
            duration_score = 0.6
        elif duration_mins > 30:    # > 30 mins
            duration_score = 0.4
        elif duration_mins > 10:    # > 10 mins
            duration_score = 0.2
        else:
            duration_score = 0.1
    elif created and not closed:
        # Still unresolved — calculate duration from now
        duration_mins = (datetime.now() - created).total_seconds() / 60.0
        if duration_mins > 180:
            duration_score = 1.0
        elif duration_mins > 120:
            duration_score = 0.8
        elif duration_mins > 60:
            duration_score = 0.6
        elif duration_mins > 30:
            duration_score = 0.4
        else:
            duration_score = 0.2

    # ── Final Score ──
    raw_score = road_score + intersection_score + temporal_score + vehicle_score + violation_score + duration_score
    # Normalize to 0-10 scale (max possible raw = 2.0+2.0+2.0+1.5+1.5+1.0 = 10.0)
    pics = min(10.0, max(0.0, raw_score))

    return round(pics, 2)


def get_severity_label(pics: float) -> str:
    """Convert PICS score to human-readable severity."""
    if pics >= 8.5:
        return "Critical"
    elif pics >= 7.0:
        return "Severe"
    elif pics >= 5.0:
        return "High"
    elif pics >= 3.0:
        return "Moderate"
    else:
        return "Low"


def get_severity_color(pics: float) -> str:
    """Get hex color for severity visualization."""
    if pics >= 8.5:
        return "#ef4444"  # red-500
    elif pics >= 7.0:
        return "#f97316"  # orange-500
    elif pics >= 5.0:
        return "#eab308"  # yellow-500
    elif pics >= 3.0:
        return "#22c55e"  # green-500
    else:
        return "#06b6d4"  # cyan-500


def enrich_violation_with_pics(violation: Dict) -> Dict:
    """Add PICS score and severity to a violation dict."""
    pics = calculate_pics_score(violation)
    violation["pics_score"] = pics
    violation["severity"] = get_severity_label(pics)
    violation["severity_color"] = get_severity_color(pics)
    return violation


def enrich_violations_batch(violations: List[Dict]) -> List[Dict]:
    """Enrich a batch of violations with PICS scores."""
    return [enrich_violation_with_pics(v) for v in violations]


def calculate_zone_pics_summary(violations: List[Dict]) -> Dict:
    """
    Calculate aggregate PICS metrics for a set of violations (typically within a zone).

    Returns:
        {
            "avg_pics": float,
            "max_pics": float,
            "total_violations": int,
            "critical_count": int,
            "severe_count": int,
            "congestion_index": float  (0-100 composite score)
        }
    """
    if not violations:
        return {
            "avg_pics": 0.0,
            "max_pics": 0.0,
            "total_violations": 0,
            "critical_count": 0,
            "severe_count": 0,
            "congestion_index": 0.0,
        }

    scores = [v.get("pics_score", calculate_pics_score(v)) for v in violations]
    severities = [get_severity_label(s) for s in scores]

    avg_pics = sum(scores) / len(scores)
    max_pics = max(scores)
    critical_count = severities.count("Critical")
    severe_count = severities.count("Severe")

    # Congestion Index: composite of density, severity, and peak-hour concentration
    density_factor = min(1.0, len(violations) / 20)  # normalize to ~20 violations
    severity_factor = avg_pics / 10.0
    critical_factor = min(1.0, (critical_count + severe_count) / max(len(violations), 1))

    # v2.0: Add average duration factor to congestion index
    durations = []
    for v in violations:
        created = _parse_datetime_safe(v.get("created_datetime"))
        closed = _parse_datetime_safe(v.get("closed_datetime"))
        if created and closed:
            dur_mins = (closed - created).total_seconds() / 60.0
            durations.append(dur_mins)
        elif created:
            dur_mins = (datetime.now() - created).total_seconds() / 60.0
            durations.append(dur_mins)

    avg_duration_mins = sum(durations) / max(len(durations), 1) if durations else 30
    duration_factor = min(1.0, avg_duration_mins / 120.0)  # normalize to 2 hours

    congestion_index = round(
        density_factor * 30 + severity_factor * 25 + critical_factor * 20 + duration_factor * 25,
        1
    )

    return {
        "avg_pics": round(avg_pics, 2),
        "max_pics": round(max_pics, 2),
        "total_violations": len(violations),
        "critical_count": critical_count,
        "severe_count": severe_count,
        "congestion_index": min(100.0, congestion_index),
    }
