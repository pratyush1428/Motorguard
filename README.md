# MotorGuard
### IoT-Based Predictive Maintenance and Intelligent Fault Monitoring System for a DC Motor

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?style=flat&logo=react)](https://react.dev)
[![ESP32](https://img.shields.io/badge/Firmware-ESP32%20Arduino-E7352C?style=flat&logo=espressif)](https://www.espressif.com)
[![License](https://img.shields.io/badge/Architecture-3--Layer%20IoT-06b6d4?style=flat)]()

---

## 1. Project Overview

**MotorGuard** is an end-to-end, industrial-grade engineering prototype for condition monitoring, real-time anomaly detection, and predictive maintenance of a DC geared motor. The system features a complete hardware-to-cloud-to-web telemetry pipeline, integrating local embedded safety interlocks on the ESP32 microcontroller with a centralized FastAPI backend and a responsive, dark industrial web dashboard.

The system operates in two switchable modes:
1. **Hardware Mode (Real Data)**: Collects physical sensor readings from an ESP32 board equipped with an MPU6050 vibration sensor, DS18B20 temperature probe, and ACS712 20A current sensor over Wi-Fi.
2. **Simulation Mode (Demo Data)**: Generates continuous, realistic physical time-series with deterministic fault injection scenarios (Normal, High Vibration, Overheating, Overload, Combined Fault, and Critical Fault) for demonstrations and testing.

---

## 2. Three-Layer Architecture

The architecture enforces strict separation of concerns across three layers:

```
[ PHYSICAL HARDWARE ]
  2S Li-ion Battery (7.4V nominal) ──► Boost Converter (12V) ──► 1-Ch Relay (GPIO 23) ──► L298N Driver ──► 12V DC Geared Motor
  Sensors: GY-521 MPU6050 (I2C) | DS18B20 (OneWire) | ACS712 20A (ADC)
                         │
                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — ESP32 FIRMWARE                                               │
│ • Sensor acquisition & oversampled filtering                           │
│ • Autonomous local safety interlocks (Relay cutoff, LEDs, Buzzer)      │
│ • Preserved 0.96" SSD1306 OLED local display (Quick physical status)   │
│ • Wi-Fi client with non-blocking reconnect & HTTP telemetry POST       │
└────────────────────────────────────────────────────────────────────────┘
                         │ Wi-Fi (JSON Telemetry)
                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 2 — FASTAPI BACKEND                                              │
│ • Telemetry ingestion & physical range validation (HTTP 422 on corrupt)│
│ • SQLite persistence (WAL mode) for readings, health, faults, alerts   │
│ • Statistical analytics (Moving averages, rates of change, min/mean/max│
│ • Explainable Health Engine (0–100 score) & rule-based Fault Detector  │
│ • Native WebSocket (/ws) broadcasting to live dashboards               │
│ • Safety Relay commands, E-Stop latching & manual reset interlock      │
└────────────────────────────────────────────────────────────────────────┘
                         │ WebSocket / REST API
                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 3 — WEB MONITORING SOFTWARE                                      │
│ • Dashboard (Health score, temperature, current, vibration, risk level)│
│ • Live Monitoring (High-frequency charts with thresholds & derivatives)│
│ • Predictive Maintenance (Explainable "WHY" card & recommendations)    │
│ • Fault Detection & Interactive 6-Scenario Simulator                   │
│ • Maintenance Management (Inspection checklists & work order logging)  │
│ • Historical Archive with pagination, date filters, and CSV export     │
│ • Hardware BOM & Topology Spec                                         │
│ • Operational Settings & Threshold Calibration                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Power Architecture & Critical Electrical Truth

> **CRITICAL POWER SPECIFICATION**
> - The prototype is powered exclusively by a **2S Li-ion Battery Pack (2 × 3.7V 18650 cells in series)**.
> - **Nominal Voltage:** ~7.4V
> - **Fully Charged Voltage:** ~8.4V
> - The DC motor is rated 12V, but operates under 7.4V nominal in this prototype.
> - **NO LM2596** step-down converter is used.
> - **NO 12V AC/DC adapter** is assumed.
> - No additional voltage sensors are added; all software interfaces clearly specify: `"2S Li-ion Battery Pack — 7.4V nominal"`.

---

## 4. Hardware Bill of Materials (Exact Components)

1. ESP32 development board (DOIT ESP32 DEVKIT V1)
2. GY-521 MPU6050 vibration / acceleration sensor
3. DS18B20 waterproof temperature sensor probe
4. ACS712 20A current sensor module
5. 12V DC geared motor
6. L298N dual H-bridge motor driver
7. 1-channel 5V relay module (Safety interlock)
8. 0.96-inch SSD1306 I2C OLED display (0x3C)
9. 5V active buzzer
10. Red LED (Critical fault indicator)
11. Yellow LED (Warning / anomaly indicator)
12. Green LED (Normal operation indicator)
13. 220Ω current-limiting resistors (for LEDs)
14. 4.7kΩ pull-up resistor (for DS18B20 OneWire line)
15. 2 × 3.7V 18650 Li-ion rechargeable batteries
16. 2-cell 18650 battery holder
17. Solderless breadboard
18. Jumper wires (Male-to-Male, Male-to-Female)
19. Power wires (Heavy gauge for battery rail)
20. 2-pin screw terminal block

### ESP32 Pin Interconnection Table

| Component | Pin | ESP32 GPIO | Electrical Connection Notes |
| :--- | :--- | :--- | :--- |
| **0.96" SSD1306 OLED** | SDA / SCL | **GPIO 21 / 22** | Shared hardware I2C bus (Address `0x3C`) |
| **GY-521 MPU6050** | SDA / SCL | **GPIO 21 / 22** | Shared hardware I2C bus (Address `0x68`) |
| **DS18B20 Temp Probe** | DATA | **GPIO 4** | OneWire bus (Needs 4.7kΩ pull-up resistor to 3.3V) |
| **ACS712 20A Current** | VOUT | **GPIO 34** | ADC1_CH6 (Analog input). 5V module supply. |
| **1-Channel 5V Relay** | IN | **GPIO 23** | Active-LOW control. Interrupts battery (+) to L298N |
| **5V Active Buzzer** | (+) Signal | **GPIO 18** | High-level triggers audible pulsed alarm |
| **Red LED** | Anode (+) | **GPIO 25** | Critical fault (via 220Ω resistor) |
| **Yellow LED** | Anode (+) | **GPIO 26** | Warning / anomaly (via 220Ω resistor) |
| **Green LED** | Anode (+) | **GPIO 27** | Normal run (via 220Ω resistor) |
| **L298N Motor Driver** | IN1 / IN2 | **GPIO 16 / 17** | Direction logic |
| **L298N Motor Driver** | ENA | **GPIO 14** | Motor enable / PWM speed |

### ACS712 Signal Conditioning & ADC Safety
- The ACS712 module is powered from 5V. At 0 Amperes, its output voltage is $V_{CC} / 2 \approx 2.50\text{V}$.
- For the 20A version, sensitivity is **100 mV/A** ($0.100\text{V/A}$).
- Forward motor currents from 0A to 3A produce output voltages between 2.50V and 2.80V, safely within the ESP32 ADC safe range ($0 - 3.3\text{V}$ with `ADC_11db` attenuation).
- Firmware automatically performs a 64-sample baseline calibration during `setup()` to nullify zero-current thermal offset.

---

## 5. Critical OLED Rule: Local Status Display

The OLED is strictly a **quick local information readout** for personnel standing physically next to the motor. It is **never** used for complex web dashboards or charts:

```text
+------------------------------+
|        MOTOR STATUS          |
|------------------------------|
| Vibration : 0.42g            |
| Temp      : 36.5°C           |
| Current   : 0.85A            |
|------------------------------|
| STATUS: NORMAL               |
| ACTION: RUNNING              |
+------------------------------+
```

When a critical fault trips:
```text
+------------------------------+
|        MOTOR STATUS          |
|------------------------------|
| Vibration : HIGH (2.1g)      |
| Temp      : 68.2°C           |
| Current   : 3.20A            |
|------------------------------|
| STATUS: CRITICAL FAULT       |
| ACTION: MOTOR OFF            |
+------------------------------+
```

---

## 6. Project Directory Structure

```
MotorGuard/
│
├── esp32-firmware/            # Layer 1: Embedded C++ Firmware
│   ├── config/
│   │   └── config.h           # Pins, thresholds, Wi-Fi credentials
│   ├── include/
│   │   ├── display_oled.h     # Preserved SSD1306 quick local status display
│   │   ├── sensor_manager.h   # MPU6050, DS18B20, ACS712 sampling & calibration
│   │   ├── safety_controller.h# Local autonomous relay trip, buzzer & LEDs
│   │   └── network_client.h   # Non-blocking Wi-Fi client & JSON telemetry
│   ├── src/
│   │   └── main.cpp           # Main firmware control loop
│   ├── platformio.ini         # PlatformIO build configuration
│   └── README.md
│
├── backend/                   # Layer 2: FastAPI Analytics & Database
│   ├── app/
│   │   ├── analytics/
│   │   │   ├── fault_detector.py  # Rule-based electromechanical fault classifier
│   │   │   ├── health_engine.py   # Explainable 0-100 health & risk scoring
│   │   │   └── trend_analyzer.py  # Rolling stats & rates of change
│   │   ├── api/
│   │   │   └── endpoints.py       # REST API endpoints
│   │   ├── database/
│   │   │   ├── connection.py      # SQLite connection manager with WAL mode
│   │   │   └── schema.py          # Table definitions & migrations
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic data schemas & validators
│   │   ├── services/
│   │   │   ├── control_service.py # Relay control & Emergency Stop latch
│   │   │   ├── data_service.py    # Telemetry ingestion, queries & CSV export
│   │   │   ├── device_service.py  # Heartbeat & stale data tracking
│   │   │   ├── simulation_service.py # 6-scenario realistic time-series engine
│   │   │   └── websocket_manager.py  # Real-time WebSocket broadcasting
│   │   └── main.py            # FastAPI entrypoint, CORS, and WebSocket /ws
│   ├── tests/
│   │   └── test_api.py        # Automated test suite (6 passing test suites)
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── frontend/                  # Layer 3: React / Vite Web Application
│   ├── src/
│   │   ├── charts/
│   │   │   └── SensorChart.tsx       # Intelligent chart with moving averages & rates
│   │   ├── components/
│   │   │   ├── Card.tsx              # Dark industrial container
│   │   │   ├── Navbar.tsx            # Header with power spec & mode toggle
│   │   │   ├── Sidebar.tsx           # Nav links with sticky E-Stop & reset
│   │   │   └── StatusBadge.tsx       # Glowing industrial badges
│   │   ├── hooks/
│   │   │   └── useRealTimeTelemetry.ts # WebSocket hook with fallback polling
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # Overview, health score, KPIs, alerts
│   │   │   ├── LiveMonitoring.tsx    # Real-time charts with time filters
│   │   │   ├── PredictiveMaintenance.tsx # Trend derivatives & explainability
│   │   │   ├── FaultDetection.tsx    # Fault logs & simulation control panel
│   │   │   ├── Maintenance.tsx       # Inspection checklist & work orders
│   │   │   ├── HistoryPage.tsx       # Paginated archive & CSV download
│   │   │   ├── HardwareSpec.tsx      # BOM & interactive system architecture
│   │   │   └── SettingsPage.tsx      # Threshold calibration & mode config
│   │   ├── services/
│   │   │   └── api.ts                # REST API client
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript domain types
│   │   ├── App.tsx                   # Main router layout
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── README.md
│
└── README.md                  # Master documentation
```

---

## 7. How to Install and Run

### Step 1: Start the FastAPI Backend
```bash
# From the repository root
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation is live at: `http://localhost:8000/docs`
- Real-time WebSocket is live at: `ws://localhost:8000/ws`

### Step 2: Start the Web Application
```bash
# In a second terminal window
cd frontend
npm install
npm run dev
```
- Open your browser to: `http://localhost:5173`

### Step 3: Run Backend Tests
```bash
# In a terminal window from root
pytest backend/tests -v
```

---

## 8. Complete 10-Step Demonstration Flow

Demonstrate the full end-to-end functionality to evaluators:

| Step | Action | Expected System Behavior |
| :---: | :--- | :--- |
| **1** | Start Backend Server | SQLite schema initializes, WAL mode activates, simulation engine begins in NORMAL mode. |
| **2** | Start Frontend Client | Vite web app loads on `http://localhost:5173`. Real-time WebSocket connects immediately. |
| **3** | Inspect Dashboard | Shows `ESP32: CONNECTED`, `Motor: RUNNING`, `Relay: ACTIVE`, `Health: 100%`, `Temp: ~34°C`, `Current: ~0.85A`, `Vibration: ~0.28g`. Prominent banner confirms `2S Li-ion Battery Pack — 7.4V nominal`. |
| **4** | Open Live Monitoring | Displays 3 intelligent charts. Raw sensor traces update in real-time with cyan moving average lines, dashed warning/critical thresholds, and trend rates. |
| **5** | Activate Simulation: `HIGH VIBRATION` | Go to **Fault Detection** page and click `High Vibration`. Vibration ramps smoothly above 0.85g. Risk level changes to `HIGH`, Health drops to ~78%, and system generates actionable mechanical recommendation. |
| **6** | Activate Simulation: `OVERLOAD` | Current increases past 1.80A to ~2.35A. Warning alert generated: "Elevated motor current draw". Risk explainability notes: "Current draw exceeds warning threshold". |
| **7** | Activate Simulation: `CRITICAL FAULT` | Breaches critical current (3.2A) and vibration (1.85g). Auto relay safety trip triggers: Relay state trips to `INACTIVE`, Motor status changes to `FAULT`, and red Emergency Stop latch engages. |
| **8** | Verify Latch Interlock | Attempting to toggle Relay `ON` while latched is rejected by backend. Click **Reset Interlock** button to clear the safety latch and resume normal operation. |
| **9** | Open Predictive Maintenance | View explainable "WHY" diagnostic card, multi-sensor trend derivatives (+g/min, +°C/min, +A/min), and transparent maintenance urgency. |
| **10** | Open History Archive & Export | View historical query table with time filters and click **Download Full CSV** to verify telemetry export. |

---

## 9. Engineering Honesty & Predictive Modeling Notice

This system is built as a **Predictive Maintenance Engineering Prototype**. It employs:
- Rolling moving average trend smoothing
- First-order rate-of-change derivatives ($\Delta \text{value} / \Delta t \times 60$)
- Multi-parameter correlation & anomaly flagging
- Rule-based physical threshold bounds

The software **does not claim 100% guaranteed failure prediction or exact failure times**. The code is cleanly decoupled so that a trained machine learning model (e.g., Random Forest or LSTM) can be integrated as a drop-in replacement for `health_engine.py` in future iterations.
