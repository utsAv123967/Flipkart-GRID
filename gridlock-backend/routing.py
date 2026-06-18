import numpy as np
from schemas import ResourceAllocationRequest, AllocationResponse, RouteNode
from typing import List

CENTRAL_DISPATCH = {"lat": 12.9716, "lng": 77.5946}  # Central Bengaluru

# Intermediate waypoints for more realistic routes
WAYPOINTS = [
    {"name": "Residency Road", "lat": 12.9710, "lng": 77.6010},
    {"name": "Richmond Circle", "lat": 12.9680, "lng": 77.5990},
    {"name": "Hudson Circle", "lat": 12.9740, "lng": 77.5880},
    {"name": "Lalbagh West Gate", "lat": 12.9510, "lng": 77.5850},
    {"name": "Minerva Circle", "lat": 12.9590, "lng": 77.5730},
    {"name": "JC Road Junction", "lat": 12.9600, "lng": 77.5810},
    {"name": "Town Hall", "lat": 12.9650, "lng": 77.5770},
    {"name": "Shivajinagar Bus Stand", "lat": 12.9850, "lng": 77.6050},
]


def euclidean_distance(lat1, lng1, lat2, lng2):
    return np.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2)


def find_best_waypoint(start_lat, start_lng, end_lat, end_lng):
    """Find a waypoint roughly between start and end for a more realistic route."""
    mid_lat = (start_lat + end_lat) / 2
    mid_lng = (start_lng + end_lng) / 2

    best_wp = None
    best_dist = float("inf")
    for wp in WAYPOINTS:
        dist = euclidean_distance(mid_lat, mid_lng, wp["lat"], wp["lng"])
        if dist < best_dist:
            best_dist = dist
            best_wp = wp
    return best_wp


def allocate_resources(request: ResourceAllocationRequest) -> List[AllocationResponse]:
    n_vans = request.available_vans
    hotspots = request.hotspots_list

    # Sort hotspots by impact_score descending (PICS-aligned prioritization)
    hotspots_sorted = sorted(hotspots, key=lambda x: x.impact_score, reverse=True)

    assignments = []

    for i in range(min(n_vans, len(hotspots_sorted))):
        target = hotspots_sorted[i]

        # Calculate distance from central dispatch
        dist_degrees = euclidean_distance(
            CENTRAL_DISPATCH["lat"],
            CENTRAL_DISPATCH["lng"],
            target.latitude,
            target.longitude,
        )

        # Approximate distance in km (1 degree ≈ 111 km)
        dist_km = dist_degrees * 111

        # Average speed 20 km/h in Bengaluru traffic → 3 mins per km
        eta_mins = int(dist_km * 3)
        if eta_mins < 5:
            eta_mins = 5  # Minimum 5 mins

        # Build route with intermediate waypoint
        waypoint = find_best_waypoint(
            CENTRAL_DISPATCH["lat"],
            CENTRAL_DISPATCH["lng"],
            target.latitude,
            target.longitude,
        )

        nodes = [
            RouteNode(
                step=1,
                junction_name="Central Dispatch",
                latitude=CENTRAL_DISPATCH["lat"],
                longitude=CENTRAL_DISPATCH["lng"],
            ),
        ]

        if waypoint:
            nodes.append(
                RouteNode(
                    step=2,
                    junction_name=waypoint["name"],
                    latitude=waypoint["lat"],
                    longitude=waypoint["lng"],
                )
            )

        nodes.append(
            RouteNode(
                step=len(nodes) + 1,
                junction_name=target.junction_name,
                latitude=target.latitude,
                longitude=target.longitude,
            )
        )

        assignments.append(
            AllocationResponse(
                van_id=i + 1,
                assigned_hotspot=target.junction_name,
                estimated_eta_mins=eta_mins,
                route_nodes=nodes,
            )
        )

    return assignments
