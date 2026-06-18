# Gridlock Intelligence — AI Parking & Congestion Platform
*A comprehensive, AI-driven traffic intelligence platform built for the Flipkart GRID Hackathon.*

---

## The Problem Statement: Poor Visibility on Parking-Induced Congestion

In rapidly expanding metropolitan areas like Bengaluru, traffic congestion is a paralyzing issue. While much attention is given to moving traffic, a significant and often overlooked contributor to this gridlock is stationary traffic—specifically, on-street illegal parking and spillover parking near commercial hubs, transit stations, and event venues. These illegally parked vehicles choke carriageways, create severe bottlenecks at intersections, and drastically reduce the overall throughput of the road network. 

The core of the problem lies in how this issue is currently managed. Today's traffic enforcement is entirely patrol-based and reactive. Traffic authorities operate with blind spots; they lack a real-time, city-wide heatmap of where parking violations are occurring at any given moment. More importantly, even when they know a violation exists, they have no mechanism to quantify the *impact* of that violation on the surrounding traffic flow. A car parked on a wide, empty road at midnight is treated the same as a heavy truck double-parked near a major intersection during the morning rush hour. Because authorities cannot measure the severity of the congestion caused by individual violations, it is nearly impossible for them to prioritize their enforcement zones, intelligently route their towing vans, or proactively deploy their limited resources to the areas that need them the most. 

The challenge we set out to solve is clear: **How can AI-driven parking intelligence detect illegal parking hotspots and quantify their real-time impact on traffic flow to enable targeted, proactive enforcement?**

---

## Our Proposed Solution: Gridlock Intelligence

To solve this challenge, we built **Gridlock Intelligence**, a smart-city platform designed to transform raw traffic camera logs into highly actionable, tactical intelligence. Our solution bridges the gap between simple violation detection and complex congestion management. 

At the heart of our solution is the realization that not all parking violations are created equal. Instead of simply alerting authorities that "a vehicle is parked illegally," we built a system that answers the critical question: "How much is this specific vehicle choking traffic right now?" To do this, we engineered a proprietary, deterministic mathematical model called the **PICS (Parking-Induced Congestion Score)**. By dynamically calculating this score for every single incoming violation, our platform instantly highlights the most critical threats to the city's traffic flow. 

We then took this real-time scoring engine and wrapped it in a highly performant, real-time data pipeline. Using Server-Sent Events (SSE), our platform streams violations as they happen directly into a "Command Center" dashboard. But we didn't stop at real-time monitoring; we integrated a Machine Learning forecasting engine (trained on historical dataset patterns) to predict where hotspots will form in the future, and a Resource Dispatch algorithm to automatically tell police exactly where to send their patrol vans to clear the most severe bottlenecks. Finally, we embedded a natural-language AI Copilot that allows dispatchers to ask questions and receive tactical advice based on the live map data. 

The result is a platform that shifts traffic enforcement from a reactive guessing game into a proactive, data-driven operation.

---

## The Core Differentiator: The PICS Engine

The **Parking-Induced Congestion Score (PICS)** is the engine that drives our entire platform. It is a custom scoring algorithm that evaluates the Flipkart GRID dataset fields and assigns a real-time congestion impact score on a scale of 0 to 10. The score is calculated using six heavily weighted factors, ensuring that the final number perfectly reflects the real-world disruption caused by the vehicle.

1.  **Duration Impact (0 - 1.0 points):** Derived directly from the dataset's `created_datetime` and `closed_datetime` fields, this factor calculates exactly how long the vehicle has been blocking the road. A violation lasting over three hours receives the maximum penalty, acknowledging the compounding nature of traffic jams, whereas a five-minute drop-off receives minimal penalty.
2.  **Violation Severity (0 - 1.5 points):** We map the dataset's `offence_code` (e.g., NP, DP, IB) to an intrinsic severity rating. A simple "No Parking" (NP) violation receives a base penalty, but "Intersection Blocking" (IB) or "Double Parking" (DP) receives maximum points because they immediately destroy lane throughput.
3.  **Vehicle Size Factor (0 - 1.5 points):** Utilizing the `vehicle_type` field, we penalize based on the physical footprint of the blockage. A parked "Two Wheeler" takes up very little space, but a parked "Bus" or "Lorry" blocks an entire lane and receives the maximum penalty.
4.  **Temporal Factor (0 - 2.0 points):** Traffic volume fluctuates wildly throughout the day. Using the timestamp of the violation, we apply multipliers based on the hour. A violation occurring during the 9:00 AM or 6:00 PM peak rush hours receives a massive 2.0-point penalty because the roads are already at absolute capacity, whereas a midnight violation is scored leniently.
5.  **Road Width Impact (0 - 2.0 points):** A vehicle parked on a massive 15-meter wide arterial road is an annoyance, but a vehicle parked on a narrow 4-meter residential or market road completely halts all traffic flow. We penalize narrower roads heavily.
6.  **Intersection Proximity (0 - 2.0 points):** Using spatial mapping to the dataset's `junction_name`, we calculate how close the vehicle is to a crossroad. A car parked 5 meters away from a major intersection creates a bottleneck that spills over into four different directions, earning the maximum penalty points.

By summing these six factors, the system generates the final PICS score. If a violation scores a 9.5, it is flagged as "Critical," and the platform immediately recommends it for priority towing.

---

## System Architecture

The Gridlock Intelligence platform is built on a decoupled, microservices-style architecture designed for high throughput and real-time responsiveness.

**The Backend Pipeline (FastAPI & Python):**
The backend serves as the brain of the operation. It features a custom **Violation Simulator** that ingests the raw Flipkart GRID dataset and replays it over a Server-Sent Events (SSE) stream, perfectly mimicking the live data feed of a smart-city camera network. As each violation passes through the pipeline, it hits the **PICS Engine** for real-time scoring. The backend also houses the **ML Engine**, an XGBoost regressor pipeline trained on the dataset's temporal and spatial features to forecast future hotspots, and a **Routing Algorithm** that dynamically calculates optimal deployment routes for patrol vans based on the live PICS scores.

**The Frontend Interface (Next.js & React):**
The client-facing application is built with Next.js and styled using a premium, dark-mode "cyber" aesthetic with Tailwind CSS and glassmorphism. It is designed to look and feel like a modern, high-tech police dispatch terminal. The frontend maintains an open SSE connection to the backend, ensuring that new violations, updated congestion indexes, and resolving incidents are rendered on the screen instantly without ever requiring a page refresh. It utilizes Recharts for deep analytics and Folium/Leaflet for interactive spatial mapping.

**The Gridlock AI Copilot (LLM Integration):**
To assist dispatchers, we integrated a local Large Language Model (Llama 3 via Ollama). The backend automatically feeds the LLM the current real-time data of the most severe hotspots in the city. When a dispatcher asks a natural language question (e.g., "Where are the biggest threats right now?"), the Copilot analyzes the live data and returns authoritative, tactical advice in under three sentences.

---

## Detailed Platform Overview: The Operational Flow

The platform is divided into four main screens, each serving a distinct operational role for the traffic police.

### 1. The Command Center (Tactical Overview)
This is the homepage of the platform, designed for precinct commanders to make high-level decisions. The top of the screen features a live-action ticker scrolling the most recent critical violations. Below it, KPI cards display the city's 24-hour total violations, the average PICS score, and the number of active critical zones. 

The centerpiece is the **Predictive ML Heatmap**. Commanders can input a future date and time range (e.g., "Tomorrow, Morning Rush"). The ML model queries historical dataset patterns and renders a heatmap predicting exactly where the worst congestion will form. Once the commander identifies the threat, they use the **Resource Dispatch Engine**—they input the number of available towing vans and click "Deploy Strategy." The system instantly calculates the optimal waypoints to clear the worst hotspots and generates a dispatch route. The AI Copilot panel sits on the right, ready to answer any tactical questions about the deployment.

### 2. The Live Feed (Real-Time Monitoring)
This is the "boots-on-the-ground" view for live dispatchers. It features a continuous, real-time stream of incoming violations. Thanks to our integration of the full Flipkart dataset schema, every violation card is rich with data. Dispatchers can see the exact vehicle type, the masked vehicle number (e.g., KA-01-**-**34) for privacy-compliant tracking, and the specific Police Station jurisdiction responsible for the area. The cards also show a visual icon indicating whether the violation was caught automatically by a smart camera (`device_id`) or manually reported by an officer (`created_by_id`). Most importantly, the live PICS score dictates the color and sorting of the feed, ensuring dispatchers always see the worst traffic blockers at the very top. From this screen, dispatchers can also click "Mark Resolved" when a van clears a vehicle, updating the city's stats instantly.

### 3. Analytics (Historical Intelligence)
The Analytics page provides deep-dive metrics powered entirely by the provided dataset. It features time-series area charts tracking violation volume and average PICS scores over 24-hour, 7-day, or 30-day periods. 

Crucially, it introduces several advanced intelligence panels:
*   **Resolution Time KPIs:** By analyzing `created_datetime` and `closed_datetime`, the platform displays the exact average and median minutes it takes the city to resolve traffic blockages.
*   **Repeat Offender Tracking:** The system aggregates data by `vehicle_number` to find habitual violators. It lists the worst repeat offenders, how many locations they've disrupted, and their average PICS impact—highly useful for targeted impounding.
*   **Police Station Performance:** It evaluates the efficiency of different jurisdictions, showing the total violations mapped to a specific police station, their resolution rate percentage, and their average response time.
*   **Peak Hours Heatmap:** A visual matrix that instantly highlights the darkest red squares, indicating the worst days and hours for illegal parking across the city.

### 4. Zone Intelligence (Spatial Drill-Down)
To make the massive amount of city data manageable, the platform divides Bengaluru into 12 distinct geographic zones (e.g., Koramangala, Whitefield, Electronic City). The Zone Intelligence page features a leaderboard ranking these zones by their composite **Congestion Index**—a complex formula combining violation volume, average PICS severity, critical incident count, and average resolution duration. 

Clicking on a specific zone opens a hyper-local detail panel. This panel filters out the rest of the city, showing a dispatcher the specific violation types plaguing that one neighborhood (e.g., "Is Koramangala suffering more from Double Parking or Bus Stop Blocking?") and provides a focused list of the active, unresolved threats physically located inside that zone's boundaries.

---

## Conclusion

Gridlock Intelligence is not just a dashboard for viewing data; it is an active, analytical engine designed to cure urban congestion. By utilizing the Flipkart GRID dataset to its absolute fullest potential—from tracking repeat offenders to measuring exact resolution times—and powering it all with the proprietary PICS scoring algorithm, we have built a platform that enables traffic police to stop reacting to traffic jams, and start preventing them.
