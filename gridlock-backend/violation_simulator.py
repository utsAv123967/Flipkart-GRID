"""
Violation Simulator v2.0 — Generates realistic parking violation events
matching the Flipkart GRID dataset schema.

Real Schema Fields:
  id, latitude, longitude, location, vehicle_number, vehicle_type, description,
  violation_type, offence_code, created_datetime, closed_datetime, modified_datetime,
  device_id, created_by_id, center_code, police_station, data_sent_to_scita,
  junction_name, action_taken_timestamp, data_sent_to_scita_timestamp,
  updated_vehicle_number, updated_vehicle_type, validation_status, validation_timestamp

Additionally generates platform-enriched fields for PICS & UI.
"""

import random
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict


# ─────────────────────────────────────────────────────────────
# 50+ Bengaluru violation-prone locations
# Each has: name, lat, lng, zone_id, type, road_width_m, dist_to_intersection_m, junction_name, police_station
# ─────────────────────────────────────────────────────────────

VIOLATION_LOCATIONS = [
    # ── Zone 1: Koramangala (Commercial Hub) ──
    {"name": "Forum Mall Entrance", "lat": 12.9346, "lng": 77.6117, "zone_id": "Z01", "type": "commercial", "road_width_m": 8, "dist_to_intersection_m": 25, "junction": "Forum Value Mall Junction", "ps": "Koramangala PS"},
    {"name": "Sony World Signal", "lat": 12.9354, "lng": 77.6244, "zone_id": "Z01", "type": "commercial", "road_width_m": 12, "dist_to_intersection_m": 10, "junction": "Sony World Junction", "ps": "Koramangala PS"},
    {"name": "Koramangala 5th Block", "lat": 12.9340, "lng": 77.6165, "zone_id": "Z01", "type": "commercial", "road_width_m": 6, "dist_to_intersection_m": 50, "junction": "5th Block Main Road", "ps": "Koramangala PS"},
    {"name": "Koramangala 80ft Road", "lat": 12.9375, "lng": 77.6238, "zone_id": "Z01", "type": "commercial", "road_width_m": 14, "dist_to_intersection_m": 80, "junction": "80 Feet Road Junction", "ps": "Koramangala PS"},
    {"name": "ST Bed Layout", "lat": 12.9310, "lng": 77.6180, "zone_id": "Z01", "type": "residential", "road_width_m": 7, "dist_to_intersection_m": 40, "junction": "ST Bed Layout Circle", "ps": "Koramangala PS"},

    # ── Zone 2: Indiranagar ──
    {"name": "100ft Road Indiranagar", "lat": 12.9784, "lng": 77.6408, "zone_id": "Z02", "type": "commercial", "road_width_m": 15, "dist_to_intersection_m": 30, "junction": "100 Feet Road Junction", "ps": "Indiranagar PS"},
    {"name": "12th Main Indiranagar", "lat": 12.9789, "lng": 77.6390, "zone_id": "Z02", "type": "commercial", "road_width_m": 8, "dist_to_intersection_m": 15, "junction": "12th Main Junction", "ps": "Indiranagar PS"},
    {"name": "CMH Road", "lat": 12.9810, "lng": 77.6450, "zone_id": "Z02", "type": "commercial", "road_width_m": 10, "dist_to_intersection_m": 20, "junction": "CMH Road Junction", "ps": "Indiranagar PS"},
    {"name": "Indiranagar Metro Station", "lat": 12.9783, "lng": 77.6409, "zone_id": "Z02", "type": "transit", "road_width_m": 12, "dist_to_intersection_m": 15, "junction": "Indiranagar Metro Junction", "ps": "Indiranagar PS"},
    {"name": "Defence Colony Indiranagar", "lat": 12.9720, "lng": 77.6380, "zone_id": "Z02", "type": "residential", "road_width_m": 6, "dist_to_intersection_m": 60, "junction": "Defence Colony Road", "ps": "Indiranagar PS"},

    # ── Zone 3: MG Road / CBD ──
    {"name": "MG Road Metro Exit", "lat": 12.9756, "lng": 77.6065, "zone_id": "Z03", "type": "transit", "road_width_m": 14, "dist_to_intersection_m": 10, "junction": "MG Road Metro Junction", "ps": "Cubbon Park PS"},
    {"name": "Brigade Road", "lat": 12.9728, "lng": 77.6077, "zone_id": "Z03", "type": "commercial", "road_width_m": 8, "dist_to_intersection_m": 20, "junction": "Brigade Road Junction", "ps": "Cubbon Park PS"},
    {"name": "Church Street", "lat": 12.9748, "lng": 77.6050, "zone_id": "Z03", "type": "commercial", "road_width_m": 6, "dist_to_intersection_m": 35, "junction": "Church Street Junction", "ps": "Cubbon Park PS"},
    {"name": "Garuda Mall", "lat": 12.9705, "lng": 77.6098, "zone_id": "Z03", "type": "commercial", "road_width_m": 10, "dist_to_intersection_m": 15, "junction": "Garuda Mall Junction", "ps": "Cubbon Park PS"},

    # ── Zone 4: Silk Board / BTM ──
    {"name": "Silk Board Junction", "lat": 12.9176, "lng": 77.6235, "zone_id": "Z04", "type": "transit", "road_width_m": 16, "dist_to_intersection_m": 5, "junction": "Silk Board Junction", "ps": "HSR Layout PS"},
    {"name": "BTM 2nd Stage", "lat": 12.9165, "lng": 77.6101, "zone_id": "Z04", "type": "residential", "road_width_m": 7, "dist_to_intersection_m": 45, "junction": "BTM 2nd Stage Main Road", "ps": "HSR Layout PS"},
    {"name": "Madiwala Market", "lat": 12.9225, "lng": 77.6174, "zone_id": "Z04", "type": "commercial", "road_width_m": 6, "dist_to_intersection_m": 12, "junction": "Madiwala Market Junction", "ps": "Madiwala PS"},
    {"name": "Dairy Circle", "lat": 12.9360, "lng": 77.6015, "zone_id": "Z04", "type": "transit", "road_width_m": 14, "dist_to_intersection_m": 8, "junction": "Dairy Circle Junction", "ps": "Madiwala PS"},

    # ── Zone 5: Whitefield / ITPL ──
    {"name": "ITPL Main Road", "lat": 12.9858, "lng": 77.7279, "zone_id": "Z05", "type": "commercial", "road_width_m": 16, "dist_to_intersection_m": 50, "junction": "ITPL Main Road Junction", "ps": "Whitefield PS"},
    {"name": "Forum Shantiniketan", "lat": 12.9567, "lng": 77.7144, "zone_id": "Z05", "type": "commercial", "road_width_m": 10, "dist_to_intersection_m": 20, "junction": "Shantiniketan Junction", "ps": "Whitefield PS"},
    {"name": "Whitefield Metro Station", "lat": 12.9770, "lng": 77.7250, "zone_id": "Z05", "type": "transit", "road_width_m": 12, "dist_to_intersection_m": 15, "junction": "Whitefield Metro Junction", "ps": "Whitefield PS"},
    {"name": "Kadugodi Signal", "lat": 12.9920, "lng": 77.7580, "zone_id": "Z05", "type": "transit", "road_width_m": 10, "dist_to_intersection_m": 10, "junction": "Kadugodi Signal Junction", "ps": "Whitefield PS"},

    # ── Zone 6: Jayanagar ──
    {"name": "Jayanagar 4th Block Complex", "lat": 12.9253, "lng": 77.5832, "zone_id": "Z06", "type": "commercial", "road_width_m": 8, "dist_to_intersection_m": 20, "junction": "4th Block Shopping Complex", "ps": "Jayanagar PS"},
    {"name": "Jayanagar 9th Block", "lat": 12.9190, "lng": 77.5780, "zone_id": "Z06", "type": "residential", "road_width_m": 7, "dist_to_intersection_m": 55, "junction": "9th Block Main Road", "ps": "Jayanagar PS"},
    {"name": "South End Circle", "lat": 12.9380, "lng": 77.5850, "zone_id": "Z06", "type": "transit", "road_width_m": 14, "dist_to_intersection_m": 5, "junction": "South End Circle", "ps": "Jayanagar PS"},
    {"name": "Ashoka Pillar", "lat": 12.9410, "lng": 77.5890, "zone_id": "Z06", "type": "transit", "road_width_m": 12, "dist_to_intersection_m": 10, "junction": "Ashoka Pillar Junction", "ps": "Jayanagar PS"},

    # ── Zone 7: Malleshwaram ──
    {"name": "Mantri Mall", "lat": 12.9916, "lng": 77.5704, "zone_id": "Z07", "type": "commercial", "road_width_m": 10, "dist_to_intersection_m": 15, "junction": "Mantri Mall Junction", "ps": "Malleshwaram PS"},
    {"name": "Malleshwaram 8th Cross", "lat": 12.9965, "lng": 77.5712, "zone_id": "Z07", "type": "commercial", "road_width_m": 6, "dist_to_intersection_m": 30, "junction": "8th Cross Road", "ps": "Malleshwaram PS"},
    {"name": "Rajajinagar Metro", "lat": 12.9886, "lng": 77.5569, "zone_id": "Z07", "type": "transit", "road_width_m": 12, "dist_to_intersection_m": 12, "junction": "Rajajinagar Metro Junction", "ps": "Rajajinagar PS"},
    {"name": "Orion Mall", "lat": 13.0107, "lng": 77.5548, "zone_id": "Z07", "type": "commercial", "road_width_m": 14, "dist_to_intersection_m": 25, "junction": "Orion Mall Junction", "ps": "Rajajinagar PS"},

    # ── Zone 8: Hebbal / Yelahanka ──
    {"name": "Hebbal Flyover", "lat": 13.0382, "lng": 77.5919, "zone_id": "Z08", "type": "transit", "road_width_m": 18, "dist_to_intersection_m": 10, "junction": "Hebbal Flyover Junction", "ps": "Hebbal PS"},
    {"name": "Manyata Tech Park Gate", "lat": 13.0467, "lng": 77.6210, "zone_id": "Z08", "type": "commercial", "road_width_m": 10, "dist_to_intersection_m": 20, "junction": "Manyata Tech Park Gate", "ps": "Hebbal PS"},
    {"name": "Esteem Mall Hebbal", "lat": 13.0350, "lng": 77.5940, "zone_id": "Z08", "type": "commercial", "road_width_m": 8, "dist_to_intersection_m": 35, "junction": "Esteem Mall Junction", "ps": "Hebbal PS"},
    {"name": "Yelahanka New Town", "lat": 13.1007, "lng": 77.5963, "zone_id": "Z08", "type": "residential", "road_width_m": 7, "dist_to_intersection_m": 50, "junction": "Yelahanka New Town Junction", "ps": "Yelahanka PS"},

    # ── Zone 9: Electronic City ──
    {"name": "Electronic City Phase 1 Gate", "lat": 12.8456, "lng": 77.6603, "zone_id": "Z09", "type": "commercial", "road_width_m": 14, "dist_to_intersection_m": 30, "junction": "E-City Phase 1 Gate", "ps": "Electronic City PS"},
    {"name": "Infosys Main Gate", "lat": 12.8419, "lng": 77.6539, "zone_id": "Z09", "type": "commercial", "road_width_m": 12, "dist_to_intersection_m": 40, "junction": "Infosys Gate Junction", "ps": "Electronic City PS"},
    {"name": "Neeladri Road", "lat": 12.8500, "lng": 77.6620, "zone_id": "Z09", "type": "residential", "road_width_m": 8, "dist_to_intersection_m": 60, "junction": "Neeladri Road Junction", "ps": "Electronic City PS"},
    {"name": "E-City Toll Gate", "lat": 12.8550, "lng": 77.6700, "zone_id": "Z09", "type": "transit", "road_width_m": 16, "dist_to_intersection_m": 8, "junction": "E-City Toll Gate", "ps": "Electronic City PS"},

    # ── Zone 10: Majestic / KR Market ──
    {"name": "KR Market Main Gate", "lat": 12.9626, "lng": 77.5773, "zone_id": "Z10", "type": "commercial", "road_width_m": 5, "dist_to_intersection_m": 10, "junction": "KR Market Gate", "ps": "Chickpet PS"},
    {"name": "Majestic Bus Stand", "lat": 12.9770, "lng": 77.5725, "zone_id": "Z10", "type": "transit", "road_width_m": 12, "dist_to_intersection_m": 8, "junction": "Majestic Bus Stand Junction", "ps": "Upparpet PS"},
    {"name": "Chickpet Metro", "lat": 12.9600, "lng": 77.5780, "zone_id": "Z10", "type": "transit", "road_width_m": 8, "dist_to_intersection_m": 12, "junction": "Chickpet Metro Junction", "ps": "Chickpet PS"},
    {"name": "Avenue Road", "lat": 12.9660, "lng": 77.5740, "zone_id": "Z10", "type": "commercial", "road_width_m": 4, "dist_to_intersection_m": 15, "junction": "Avenue Road Junction", "ps": "Chickpet PS"},

    # ── Zone 11: HSR Layout ──
    {"name": "HSR BDA Complex", "lat": 12.9116, "lng": 77.6389, "zone_id": "Z11", "type": "commercial", "road_width_m": 8, "dist_to_intersection_m": 25, "junction": "HSR BDA Complex Junction", "ps": "HSR Layout PS"},
    {"name": "HSR 27th Main", "lat": 12.9140, "lng": 77.6350, "zone_id": "Z11", "type": "commercial", "road_width_m": 10, "dist_to_intersection_m": 40, "junction": "27th Main Road", "ps": "HSR Layout PS"},
    {"name": "Agara Lake Road", "lat": 12.9250, "lng": 77.6380, "zone_id": "Z11", "type": "residential", "road_width_m": 7, "dist_to_intersection_m": 70, "junction": "Agara Lake Road", "ps": "HSR Layout PS"},

    # ── Zone 12: Bannerghatta Road ──
    {"name": "Meenakshi Mall", "lat": 12.8988, "lng": 77.6004, "zone_id": "Z12", "type": "commercial", "road_width_m": 10, "dist_to_intersection_m": 15, "junction": "Meenakshi Mall Junction", "ps": "JP Nagar PS"},
    {"name": "Gottigere Metro", "lat": 12.8680, "lng": 77.5967, "zone_id": "Z12", "type": "transit", "road_width_m": 12, "dist_to_intersection_m": 10, "junction": "Gottigere Metro Junction", "ps": "JP Nagar PS"},
    {"name": "Arekere Gate", "lat": 12.8900, "lng": 77.6030, "zone_id": "Z12", "type": "residential", "road_width_m": 6, "dist_to_intersection_m": 30, "junction": "Arekere Gate Junction", "ps": "JP Nagar PS"},
    {"name": "JP Nagar 6th Phase", "lat": 12.8990, "lng": 77.5850, "zone_id": "Z12", "type": "residential", "road_width_m": 7, "dist_to_intersection_m": 45, "junction": "JP Nagar 6th Phase Junction", "ps": "JP Nagar PS"},
]

# ── Violation types mapped to Flipkart schema offense codes ──
VIOLATION_TYPES = [
    {"type": "No Parking Zone", "label": "No-Parking Zone", "severity_base": 6, "offence_code": "NP"},
    {"type": "Double Parking", "label": "Double Parking", "severity_base": 8, "offence_code": "DP"},
    {"type": "Sidewalk Parking", "label": "Sidewalk Parking", "severity_base": 7, "offence_code": "SW"},
    {"type": "Near Fire Hydrant", "label": "Near Fire Hydrant", "severity_base": 9, "offence_code": "FH"},
    {"type": "Bus Stop Blocking", "label": "Bus Stop Blocking", "severity_base": 8, "offence_code": "BS"},
    {"type": "Intersection Blocking", "label": "Intersection Blocking", "severity_base": 9, "offence_code": "IB"},
    {"type": "Crosswalk Blocking", "label": "Crosswalk Blocking", "severity_base": 7, "offence_code": "CB"},
    {"type": "Loading Zone Violation", "label": "Loading Zone Violation", "severity_base": 5, "offence_code": "LZ"},
]

VEHICLE_TYPES = [
    {"type": "Car", "size_factor": 1.0, "weight": 40},
    {"type": "SUV", "size_factor": 1.3, "weight": 15},
    {"type": "Lorry", "size_factor": 2.0, "weight": 10},
    {"type": "Bus", "size_factor": 2.2, "weight": 5},
    {"type": "Auto Rickshaw", "size_factor": 0.6, "weight": 15},
    {"type": "Two Wheeler", "size_factor": 0.3, "weight": 15},
]

# ── Karnataka vehicle number prefixes ──
KA_PREFIXES = ["KA-01", "KA-02", "KA-03", "KA-04", "KA-05", "KA-09", "KA-41", "KA-50", "KA-51", "KA-53"]

# ── Police Station → Center Code mapping ──
CENTER_CODES = {
    "Koramangala PS": "BTP-KR",
    "Indiranagar PS": "BTP-IN",
    "Cubbon Park PS": "BTP-CP",
    "HSR Layout PS": "BTP-HS",
    "Madiwala PS": "BTP-MW",
    "Whitefield PS": "BTP-WF",
    "Jayanagar PS": "BTP-JN",
    "Malleshwaram PS": "BTP-ML",
    "Rajajinagar PS": "BTP-RJ",
    "Hebbal PS": "BTP-HB",
    "Yelahanka PS": "BTP-YL",
    "Electronic City PS": "BTP-EC",
    "Chickpet PS": "BTP-CK",
    "Upparpet PS": "BTP-UP",
    "JP Nagar PS": "BTP-JP",
}

# ── Device IDs (simulating smart cameras) ──
DEVICE_IDS = [f"CAM-{i:04d}" for i in range(1, 51)]

# ── Temporal patterns ──
HOURLY_WEIGHTS = {
    0: 0.1, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.1, 5: 0.2,
    6: 0.4, 7: 0.7, 8: 1.0, 9: 1.0, 10: 0.8, 11: 0.7,
    12: 0.6, 13: 0.7, 14: 0.7, 15: 0.8, 16: 0.9, 17: 1.0,
    18: 1.0, 19: 0.9, 20: 0.7, 21: 0.5, 22: 0.3, 23: 0.2,
}

ZONE_TYPE_HOUR_BIAS = {
    "commercial": {8: 1.2, 9: 1.3, 10: 1.5, 11: 1.5, 12: 1.4, 13: 1.5, 14: 1.3, 15: 1.2, 16: 1.1, 17: 1.3, 18: 1.4, 19: 1.5, 20: 1.3},
    "transit": {7: 1.5, 8: 1.8, 9: 1.5, 17: 1.5, 18: 1.8, 19: 1.5},
    "residential": {7: 1.2, 8: 1.1, 18: 1.1, 19: 1.2, 20: 1.3, 21: 1.3, 22: 1.2},
}

_violation_counter = 0


def _generate_vehicle_number() -> str:
    """Generate a realistic Karnataka vehicle registration number."""
    prefix = random.choice(KA_PREFIXES)
    letter = random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
    number = random.randint(1000, 9999)
    return f"{prefix}-{letter}{letter}-{number}"


def _mask_vehicle_number(vn: str) -> str:
    """Mask a vehicle number for display: KA-01-AB-1234 → KA-01-**-**34"""
    parts = vn.split("-")
    if len(parts) >= 4:
        return f"{parts[0]}-{parts[1]}-**-**{parts[3][-2:]}"
    return vn[:4] + "****" + vn[-2:]


def _pick_weighted(items, weight_key="weight"):
    """Pick a random item from a list using weight_key as probability weight."""
    weights = [item.get(weight_key, 1) for item in items]
    return random.choices(items, weights=weights, k=1)[0]


def generate_single_violation(timestamp: datetime = None) -> Dict:
    """
    Generate one realistic parking violation event
    following the Flipkart GRID dataset schema.
    """
    global _violation_counter
    _violation_counter += 1

    if timestamp is None:
        timestamp = datetime.now()

    current_hour = timestamp.hour
    hour_weight = HOURLY_WEIGHTS.get(current_hour, 0.5)

    # Pick location with temporal bias
    location_weights = []
    for loc in VIOLATION_LOCATIONS:
        base_weight = 1.0
        zone_type = loc["type"]
        type_bias = ZONE_TYPE_HOUR_BIAS.get(zone_type, {})
        bias = type_bias.get(current_hour, 1.0)
        road_factor = max(0.5, (15 - loc["road_width_m"]) / 10)
        location_weights.append(base_weight * bias * road_factor * hour_weight)

    location = random.choices(VIOLATION_LOCATIONS, weights=location_weights, k=1)[0]

    # GPS jitter
    lat_jitter = random.uniform(-0.0004, 0.0004)
    lng_jitter = random.uniform(-0.0004, 0.0004)

    # Pick violation type
    violation_weights = []
    for vt in VIOLATION_TYPES:
        w = 1.0
        if vt["type"] == "Intersection Blocking" and location["dist_to_intersection_m"] < 20:
            w = 3.0
        elif vt["type"] == "Bus Stop Blocking" and location["type"] == "transit":
            w = 2.5
        elif vt["type"] == "Double Parking" and location["road_width_m"] < 10:
            w = 2.0
        violation_weights.append(w)
    violation_type = random.choices(VIOLATION_TYPES, weights=violation_weights, k=1)[0]

    # Pick vehicle
    vehicle = _pick_weighted(VEHICLE_TYPES)
    vehicle_number = _generate_vehicle_number()

    # Generate resolve time for historical data
    is_resolved = False
    closed_dt = None
    modified_dt = None
    action_taken_ts = None
    validation_status = None
    validation_ts = None

    # Device: 70% camera-detected, 30% manual
    is_camera = random.random() < 0.7
    device_id = random.choice(DEVICE_IDS) if is_camera else None
    created_by_id = None if is_camera else f"OFC-{random.randint(100, 999)}"

    # Unique violation ID matching Flipkart format
    vid = f"VIO-{_violation_counter:06d}"

    created_dt_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")

    return {
        # ── Core Flipkart Schema Fields ──
        "id": vid,
        "latitude": round(location["lat"] + lat_jitter, 6),
        "longitude": round(location["lng"] + lng_jitter, 6),
        "location": location["name"],
        "vehicle_number": vehicle_number,
        "vehicle_type": vehicle["type"],
        "description": f"{violation_type['label']} by {vehicle['type']} at {location['name']}",
        "violation_type": violation_type["type"],
        "offence_code": violation_type["offence_code"],
        "created_datetime": created_dt_str,
        "closed_datetime": closed_dt,
        "modified_datetime": modified_dt,
        "device_id": device_id,
        "created_by_id": created_by_id,
        "center_code": CENTER_CODES.get(location["ps"], "BTP-XX"),
        "police_station": location["ps"],
        "data_sent_to_scita": "No",
        "junction_name": location["junction"],
        "action_taken_timestamp": action_taken_ts,
        "data_sent_to_scita_timestamp": None,
        "updated_vehicle_number": None,
        "updated_vehicle_type": None,
        "validation_status": validation_status,
        "validation_timestamp": validation_ts,

        # ── Platform Enriched Fields (for PICS & UI) ──
        "violation_id": vid,
        "timestamp": timestamp.isoformat(),
        "location_name": location["name"],
        "zone_id": location["zone_id"],
        "zone_type": location["type"],
        "road_width_m": location["road_width_m"],
        "dist_to_intersection_m": location["dist_to_intersection_m"],
        "violation_label": violation_type["label"],
        "violation_severity_base": violation_type["severity_base"],
        "vehicle_size_factor": vehicle["size_factor"],
        "is_resolved": False,
        "resolved_at": None,
    }


def generate_historical_violations(hours_back: int = 24, avg_per_hour: int = 12) -> List[Dict]:
    """Generate a batch of historical violations for analytics."""
    violations = []
    now = datetime.now()

    # Track vehicle numbers for repeat offenders
    repeat_offenders = [_generate_vehicle_number() for _ in range(8)]

    for h in range(hours_back, 0, -1):
        ts = now - timedelta(hours=h)
        current_hour = ts.hour
        hourly_rate = int(avg_per_hour * HOURLY_WEIGHTS.get(current_hour, 0.5))
        hourly_rate = max(2, hourly_rate + random.randint(-3, 3))

        for _ in range(hourly_rate):
            minute_offset = random.randint(0, 59)
            violation_ts = ts.replace(minute=minute_offset, second=random.randint(0, 59))
            v = generate_single_violation(violation_ts)

            # 15% chance of being a repeat offender
            if random.random() < 0.15:
                v["vehicle_number"] = random.choice(repeat_offenders)

            # Randomly resolve some (40%)
            if random.random() < 0.4:
                resolve_delay_mins = random.randint(5, 180)
                closed_dt = violation_ts + timedelta(minutes=resolve_delay_mins)
                action_dt = violation_ts + timedelta(minutes=random.randint(2, resolve_delay_mins))

                v["is_resolved"] = True
                v["closed_datetime"] = closed_dt.strftime("%Y-%m-%d %H:%M:%S")
                v["resolved_at"] = closed_dt.isoformat()
                v["modified_datetime"] = closed_dt.strftime("%Y-%m-%d %H:%M:%S")
                v["action_taken_timestamp"] = action_dt.strftime("%Y-%m-%d %H:%M:%S")
                v["validation_status"] = random.choice(["Valid", "Valid", "Valid", "Invalid"])
                v["validation_timestamp"] = closed_dt.strftime("%Y-%m-%d %H:%M:%S")
                v["data_sent_to_scita"] = "Yes"
                v["data_sent_to_scita_timestamp"] = (closed_dt + timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S")

            violations.append(v)

    violations.sort(key=lambda x: x["timestamp"])
    return violations


async def violation_sse_generator():
    """Async generator for Server-Sent Events — yields violation events."""
    while True:
        violation = generate_single_violation()
        yield f"data: {json.dumps(violation)}\n\n"
        await asyncio.sleep(random.uniform(2.0, 5.0))
