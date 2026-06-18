from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# ── Existing Models (preserved) ──

class PredictionRequest(BaseModel):
    target_date: str = Field(..., description="Date in YYYY-MM-DD format")
    time_range: str = Field(..., description="E.g., 'Morning Rush', 'Night', 'Midday', 'Afternoon Rush', 'Evening'")
    vehicle_filter: Optional[str] = Field(None, description="Optional vehicle type filter, e.g., 'CAR', 'LORRY', 'BUS'")

class HotspotResponse(BaseModel):
    junction_name: str
    latitude: float
    longitude: float
    impact_score: float
    status: str

class ResourceAllocationRequest(BaseModel):
    available_vans: int = Field(..., ge=1, description="Number of vans available for dispatch")
    hotspots_list: List[HotspotResponse] = Field(..., description="List of current hotspots to address")

class RouteNode(BaseModel):
    step: int
    junction_name: str
    latitude: float
    longitude: float

class AllocationResponse(BaseModel):
    van_id: int
    assigned_hotspot: str
    estimated_eta_mins: int
    route_nodes: List[RouteNode]

class ChatRequest(BaseModel):
    user_message: str

class ChatResponse(BaseModel):
    response: str


# ── New Models for Parking Intelligence Platform ──

class ViolationEvent(BaseModel):
    # Core Flipkart Schema Fields
    id: str
    latitude: float
    longitude: float
    location: str
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    description: Optional[str] = None
    violation_type: Optional[str] = None
    offence_code: Optional[str] = None
    created_datetime: str
    closed_datetime: Optional[str] = None
    modified_datetime: Optional[str] = None
    device_id: Optional[str] = None
    created_by_id: Optional[str] = None
    center_code: Optional[str] = None
    police_station: Optional[str] = None
    data_sent_to_scita: Optional[str] = None
    junction_name: Optional[str] = None
    action_taken_timestamp: Optional[str] = None
    data_sent_to_scita_timestamp: Optional[str] = None
    updated_vehicle_number: Optional[str] = None
    updated_vehicle_type: Optional[str] = None
    validation_status: Optional[str] = None
    validation_timestamp: Optional[str] = None

    # Platform Enriched Fields (for PICS & UI)
    violation_id: str
    timestamp: str
    location_name: str
    zone_id: Optional[str] = None
    zone_type: Optional[str] = None
    road_width_m: Optional[float] = None
    dist_to_intersection_m: Optional[float] = None
    violation_label: Optional[str] = None
    violation_severity_base: Optional[int] = None
    vehicle_size_factor: Optional[float] = None
    is_resolved: bool = False
    resolved_at: Optional[str] = None
    pics_score: Optional[float] = None
    severity: Optional[str] = None
    severity_color: Optional[str] = None


class ZoneOverview(BaseModel):
    zone_id: str
    zone_name: str
    zone_type: str
    description: str
    centroid_lat: float
    centroid_lng: float
    total_violations: int
    avg_pics: float
    max_pics: float
    critical_count: int
    severe_count: int
    congestion_index: float
    risk_level: str
    unresolved_count: int


class HourlyDataPoint(BaseModel):
    hour: int
    count: int


class ViolationTypeBreakdown(BaseModel):
    type: str
    count: int


class ZoneDetail(BaseModel):
    zone_id: str
    name: str
    type: str
    description: str
    centroid_lat: float
    centroid_lng: float
    avg_pics: float
    max_pics: float
    total_violations: int
    critical_count: int
    severe_count: int
    congestion_index: float
    risk_level: str
    violations: List[ViolationEvent]
    hourly_distribution: List[HourlyDataPoint]
    violation_breakdown: List[ViolationTypeBreakdown]


class TrendDataPoint(BaseModel):
    timestamp: str
    label: str
    violation_count: int
    avg_pics: float
    critical_count: int


class AnalyticsSummary(BaseModel):
    total_violations_24h: int
    avg_pics_24h: float
    active_critical_zones: int
    total_unresolved: int
    violations_per_hour: float
    top_zone_name: str
    top_zone_congestion: float
    pics_trend: str  # "up", "down", "stable"


class ViolationResolutionRequest(BaseModel):
    violation_id: str


class ViolationResolutionResponse(BaseModel):
    violation_id: str
    resolved: bool
    resolved_at: str
