"""
Zone Engine — Grid-based spatial zone system for Bengaluru.
Divides the city into named zones and provides aggregation logic.
"""

from typing import List, Dict, Optional
from datetime import datetime
from pics_engine import enrich_violations_batch, calculate_zone_pics_summary, get_severity_label


# ─────────────────────────────────────────────────────────────
# Zone Definitions — 12 zones covering major Bengaluru areas
# ─────────────────────────────────────────────────────────────

ZONES = [
    {
        "zone_id": "Z01",
        "name": "Koramangala",
        "type": "commercial",
        "centroid_lat": 12.9346,
        "centroid_lng": 77.6170,
        "bounds": {"min_lat": 12.9280, "max_lat": 12.9400, "min_lng": 77.6080, "max_lng": 77.6280},
        "description": "Major commercial and startup hub with malls, restaurants, and dense street parking",
    },
    {
        "zone_id": "Z02",
        "name": "Indiranagar",
        "type": "commercial",
        "centroid_lat": 12.9784,
        "centroid_lng": 77.6408,
        "bounds": {"min_lat": 12.9700, "max_lat": 12.9850, "min_lng": 77.6350, "max_lng": 77.6480},
        "description": "Nightlife district with bars, restaurants, and metro station. Peak violations after 6 PM",
    },
    {
        "zone_id": "Z03",
        "name": "MG Road / CBD",
        "type": "commercial",
        "centroid_lat": 12.9740,
        "centroid_lng": 77.6070,
        "bounds": {"min_lat": 12.9690, "max_lat": 12.9780, "min_lng": 77.6020, "max_lng": 77.6120},
        "description": "Central Business District with Brigade Road, Church Street, and major metro station",
    },
    {
        "zone_id": "Z04",
        "name": "Silk Board / BTM",
        "type": "transit",
        "centroid_lat": 12.9230,
        "centroid_lng": 77.6130,
        "bounds": {"min_lat": 12.9140, "max_lat": 12.9380, "min_lng": 77.5980, "max_lng": 77.6280},
        "description": "Chronic congestion zone with Silk Board junction — India's busiest intersection",
    },
    {
        "zone_id": "Z05",
        "name": "Whitefield / ITPL",
        "type": "commercial",
        "centroid_lat": 12.9770,
        "centroid_lng": 77.7280,
        "bounds": {"min_lat": 12.9530, "max_lat": 12.9950, "min_lng": 77.7100, "max_lng": 77.7600},
        "description": "IT corridor with major tech parks. Peak parking issues during office hours",
    },
    {
        "zone_id": "Z06",
        "name": "Jayanagar",
        "type": "residential",
        "centroid_lat": 12.9280,
        "centroid_lng": 77.5840,
        "bounds": {"min_lat": 12.9150, "max_lat": 12.9430, "min_lng": 77.5750, "max_lng": 77.5920},
        "description": "Planned residential area with busy commercial complexes and market streets",
    },
    {
        "zone_id": "Z07",
        "name": "Malleshwaram",
        "type": "commercial",
        "centroid_lat": 12.9960,
        "centroid_lng": 77.5650,
        "bounds": {"min_lat": 12.9860, "max_lat": 13.0130, "min_lng": 77.5520, "max_lng": 77.5740},
        "description": "Traditional market area with narrow streets and heritage shopping zone",
    },
    {
        "zone_id": "Z08",
        "name": "Hebbal / Yelahanka",
        "type": "transit",
        "centroid_lat": 13.0450,
        "centroid_lng": 77.6000,
        "bounds": {"min_lat": 13.0300, "max_lat": 13.1050, "min_lng": 77.5900, "max_lng": 77.6250},
        "description": "Major traffic interchange and flyover. Tech park spillover parking issues",
    },
    {
        "zone_id": "Z09",
        "name": "Electronic City",
        "type": "commercial",
        "centroid_lat": 12.8470,
        "centroid_lng": 77.6600,
        "bounds": {"min_lat": 12.8380, "max_lat": 12.8580, "min_lng": 77.6500, "max_lng": 77.6730},
        "description": "IT hub with Infosys, Wipro campuses. Tollway congestion zone",
    },
    {
        "zone_id": "Z10",
        "name": "Majestic / KR Market",
        "type": "transit",
        "centroid_lat": 12.9650,
        "centroid_lng": 77.5760,
        "bounds": {"min_lat": 12.9580, "max_lat": 12.9790, "min_lng": 77.5700, "max_lng": 77.5810},
        "description": "Old city commercial hub — extremely narrow roads, high vehicle density, bus terminus",
    },
    {
        "zone_id": "Z11",
        "name": "HSR Layout",
        "type": "residential",
        "centroid_lat": 12.9150,
        "centroid_lng": 77.6370,
        "bounds": {"min_lat": 12.9080, "max_lat": 12.9270, "min_lng": 77.6320, "max_lng": 77.6420},
        "description": "Planned residential with growing commercial pockets and startup hubs",
    },
    {
        "zone_id": "Z12",
        "name": "Bannerghatta Road",
        "type": "residential",
        "centroid_lat": 12.8900,
        "centroid_lng": 77.5960,
        "bounds": {"min_lat": 12.8650, "max_lat": 12.9020, "min_lng": 77.5820, "max_lng": 77.6060},
        "description": "Arterial road with malls, metro, and dense residential. Heavy spillover parking",
    },
]

ZONES_MAP = {z["zone_id"]: z for z in ZONES}


def get_all_zones() -> List[Dict]:
    """Return all zone definitions."""
    return ZONES


def get_zone_by_id(zone_id: str) -> Optional[Dict]:
    """Return a single zone by ID."""
    return ZONES_MAP.get(zone_id)


def assign_violation_to_zone(violation: Dict) -> str:
    """Assign a violation to a zone based on lat/lng. Falls back to nearest centroid."""
    lat = violation.get("latitude", 0)
    lng = violation.get("longitude", 0)

    # First try exact bounds match
    for zone in ZONES:
        b = zone["bounds"]
        if b["min_lat"] <= lat <= b["max_lat"] and b["min_lng"] <= lng <= b["max_lng"]:
            return zone["zone_id"]

    # Fallback: nearest centroid
    best_zone = "Z01"
    best_dist = float("inf")
    for zone in ZONES:
        dist = (lat - zone["centroid_lat"]) ** 2 + (lng - zone["centroid_lng"]) ** 2
        if dist < best_dist:
            best_dist = dist
            best_zone = zone["zone_id"]

    return best_zone


def get_zone_overviews(violations: List[Dict]) -> List[Dict]:
    """
    Compute zone-level overview from a list of violations.
    Returns a list of zone summaries with violation stats and PICS metrics.
    """
    # Ensure all violations have PICS scores
    enriched = enrich_violations_batch(violations)

    # Group by zone
    zone_violations: Dict[str, List[Dict]] = {z["zone_id"]: [] for z in ZONES}
    for v in enriched:
        zid = v.get("zone_id", assign_violation_to_zone(v))
        if zid in zone_violations:
            zone_violations[zid].append(v)

    overviews = []
    for zone in ZONES:
        zid = zone["zone_id"]
        zone_v = zone_violations.get(zid, [])
        pics_summary = calculate_zone_pics_summary(zone_v)

        # Determine risk level
        ci = pics_summary["congestion_index"]
        if ci >= 70:
            risk_level = "Critical"
        elif ci >= 50:
            risk_level = "High"
        elif ci >= 30:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        overviews.append({
            "zone_id": zid,
            "zone_name": zone["name"],
            "zone_type": zone["type"],
            "description": zone["description"],
            "centroid_lat": zone["centroid_lat"],
            "centroid_lng": zone["centroid_lng"],
            "total_violations": pics_summary["total_violations"],
            "avg_pics": pics_summary["avg_pics"],
            "max_pics": pics_summary["max_pics"],
            "critical_count": pics_summary["critical_count"],
            "severe_count": pics_summary["severe_count"],
            "congestion_index": pics_summary["congestion_index"],
            "risk_level": risk_level,
            "unresolved_count": sum(1 for v in zone_v if not v.get("is_resolved", False)),
        })

    # Sort by congestion index descending
    overviews.sort(key=lambda x: x["congestion_index"], reverse=True)
    return overviews


def get_zone_detail(zone_id: str, violations: List[Dict]) -> Optional[Dict]:
    """
    Get detailed info for a single zone including its violations.
    """
    zone = get_zone_by_id(zone_id)
    if not zone:
        return None

    enriched = enrich_violations_batch(violations)
    zone_v = [v for v in enriched if v.get("zone_id") == zone_id]
    zone_v.sort(key=lambda x: x.get("pics_score", 0), reverse=True)

    pics_summary = calculate_zone_pics_summary(zone_v)

    # Hourly distribution for mini chart
    hourly_counts = {h: 0 for h in range(24)}
    for v in zone_v:
        try:
            ts = datetime.fromisoformat(v.get("timestamp", ""))
            hourly_counts[ts.hour] += 1
        except (ValueError, TypeError):
            pass

    hourly_distribution = [{"hour": h, "count": c} for h, c in hourly_counts.items()]

    # Violation type breakdown
    type_counts: Dict[str, int] = {}
    for v in zone_v:
        vt = v.get("violation_label", "Unknown")
        type_counts[vt] = type_counts.get(vt, 0) + 1
    violation_breakdown = [{"type": t, "count": c} for t, c in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)]

    return {
        **zone,
        **pics_summary,
        "risk_level": get_severity_label(pics_summary["avg_pics"]) if pics_summary["avg_pics"] > 0 else "Low",
        "violations": zone_v[:50],  # Cap at 50 for response size
        "hourly_distribution": hourly_distribution,
        "violation_breakdown": violation_breakdown,
    }
