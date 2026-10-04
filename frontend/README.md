# MotorGuard — Web Monitoring Software (Layer 3)

Professional industrial IoT web dashboard and predictive condition-monitoring interface for the MotorGuard DC Motor monitoring system.

## Technology Stack

- **React 18 / Vite**: High-performance single page application
- **TypeScript**: Full static type safety
- **Tailwind CSS**: Dark industrial theme with neon accents and high contrast
- **Recharts**: High-frequency interactive time-series charts with moving averages and dynamic thresholds
- **Lucide Icons**: Technical iconography

## Features & Pages

1. **Dashboard (`/`)**:
   - Immediate motor condition overview (RUNNING, WARNING, FAULT, OFF)
   - 0–100 Health Score gauge (Healthy, Warning, Critical)
   - Temperature, Current Draw, and Dynamic Vibration telemetry cards
   - Operational Risk Level with explainable "WHY" reasoning
   - Hardware connection heartbeats (ESP32, Safety Relay, Backend API, Database)
   - Stale data detection banner
   - Direct Emergency Stop and Interlock Reset controls

2. **Intelligent Live Monitoring (`/live`)**:
   - Multi-parameter time-series charts (Vibration, Temperature, Current)
   - Raw sensor trace + rolling moving average
   - Dynamic Warning and Critical threshold dashed reference lines
   - Real-time statistics: Min, Mean, Max, Trend direction, and Rate of Change (+X unit/min)
   - Time range filters: 1m, 5m, 30m, 1h, 6h, 24h, 7d

3. **Predictive Maintenance (`/predictive`)**:
   - Explainable health score and risk level
   - Rate-of-change derivatives matrix
   - Transparent "Why Did Risk Change?" diagnostic breakdown
   - Actionable maintenance recommendations (Coupling, Thermal Ventilation, Drive Circuit)
   - Maintenance urgency indicator (Routine, Scheduled, Immediate)

4. **Fault Detection & Simulation (`/faults`)**:
   - Interactive electromechanical fault simulator with 6 realistic scenarios:
     - `NORMAL`: Nominal natural baseline
     - `HIGH_VIBRATION`: Simulating loose mechanical mounting / unbalance
     - `OVERHEATING`: Simulating restricted convection
     - `OVERLOAD`: Simulating shaft friction / binding load
     - `COMBINED_FAULT`: Correlated multi-parameter degradation
     - `CRITICAL_FAULT`: Safety threshold violation triggering auto-relay cutoff
   - Historical fault events audit table

5. **Maintenance Management (`/maintenance`)**:
   - Inspection checklists for coupling, bearings, thermal dissipation, and electrical drive
   - Maintenance urgency and last/next service schedule
   - Work order logging modal

6. **Historical Archive & CSV Export (`/history`)**:
   - Query filters by time window and sensor focus
   - Aggregate statistics across recorded run-time
   - Paginated historical data table
   - Download CSV button

7. **Hardware Architecture (`/hardware`)**:
   - Interactive visual architecture diagram
   - Complete Bill of Materials (BOM)
   - Exact ESP32 pinout table
   - Power system explanation: **2S Li-ion Battery Pack (7.4V nominal)**

8. **Settings & Threshold Calibration (`/settings`)**:
   - Warning and critical threshold adjustments
   - Moving average window size
   - Auto relay shutdown toggle
   - Simulation mode vs Hardware mode switcher

---

## Running the Web Application

```bash
cd frontend
npm install
npm run dev
```

By default, the Vite development server starts on `http://localhost:5173`.
