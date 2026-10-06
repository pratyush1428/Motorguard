# 📘 MotorGuard — Complete Project Guide & Code Walkthrough

> **Purpose of this document:**  
> This file is your single-source reference to understand **everything** about MotorGuard.  
> Whenever you need to study, explain to evaluators/professors, or check how a piece of code works, open this file!

---

## 📌 Table of Contents
1. [What MotorGuard Does (In Simple Words)](#1-what-motorguard-does-in-simple-words)
2. [Exact Hardware Pin Diagram & Wiring Table](#2-exact-hardware-pin-diagram--wiring-table)
3. [Step-by-Step Process Flow (How Data Moves)](#3-step-by-step-process-flow-how-data-moves)
4. [Firmware Code Walkthrough (ESP32)](#4-firmware-code-walkthrough-esp32)
5. [Backend Code Walkthrough (FastAPI & Analytics)](#5-backend-code-walkthrough-fastapi--analytics)
6. [Frontend Code Walkthrough (React & Vite)](#6-frontend-code-walkthrough-react--vite)
7. [Important Project Q&A (For Viva / Evaluation)](#7-important-project-qa-for-viva--evaluation)

---

## 1. What MotorGuard Does (In Simple Words)

MotorGuard is a **smart health monitor for a DC geared motor**.  
Just like a smartwatch tracks your heart rate and temperature, MotorGuard constantly tracks 3 vital signs of the motor:
1. **Vibration ($g$)** — Detects loose bearings, misalignment, or gear damage.
2. **Temperature ($^\circ\text{C}$)** — Detects overheating and excessive friction.
3. **Current Draw ($\text{A}$)** — Detects mechanical overload or stalled motor.

If any reading crosses dangerous limits, the **ESP32 immediately trips a 5V relay to cut power to the motor**—protecting it from burning out—while streaming live charts to your web dashboard!

---

## 2. Exact Hardware Pin Diagram & Wiring Table

### 🗺️ Visual ESP32 Pin Connection Diagram

```text
                  +-------------------+
                  |   ESP32 DEVKIT    |
                  |                   |
  3.3V Power ---->| 3V3           VIN |<---- 5V (USB or External 5V)
  Ground -------->| GND           GND |<---- Common Ground Rail
                  |                   |
  DS18B20 Temp -->| GPIO 4    GPIO 21 |---> OLED & MPU6050 (SDA)
  (4.7kΩ pullup)  |                   |
                  |           GPIO 22 |---> OLED & MPU6050 (SCL)
  L298N ENA ----->| GPIO 14           |
  L298N IN1 ----->| GPIO 16   GPIO 23 |---> 1-Channel Safety Relay (IN)
  L298N IN2 ----->| GPIO 17           |
  Buzzer (+) ---->| GPIO 18   GPIO 25 |---> RED LED (Critical Fault)
                  |           GPIO 26 |---> YELLOW LED (Warning)
  ACS712 (VOUT) ->| GPIO 34   GPIO 27 |---> GREEN LED (Normal Run)
  (Analog ADC1)   +-------------------+
```

### 📋 Complete Wiring Connection Table

| Component | Component Pin | ESP32 Pin | Wire / Resistor Details | Why This Pin? |
| :--- | :--- | :--- | :--- | :--- |
| **1.3" / 0.96" OLED (0x3C)** | SDA | **GPIO 21** | Direct jumper | Default hardware $I^2C$ Data (SH1106 / SSD1306) |
| **1.3" / 0.96" OLED (0x3C)** | SCL | **GPIO 22** | Direct jumper | Default hardware $I^2C$ Clock |
| **GY-521 MPU6050** | SDA | **GPIO 21** | Shared $I^2C$ Data wire | Shares same $I^2C$ bus at address `0x68` |
| **GY-521 MPU6050** | SCL | **GPIO 22** | Shared $I^2C$ Clock wire | Shares same $I^2C$ bus at address `0x68` |
| **DS18B20 Temp Probe**| DATA (Yellow) | **GPIO 4** | **Requires 4.7kΩ pull-up** to 3.3V | OneWire digital protocol needs pull-up |
| **ACS712 20A Current**| VOUT | **GPIO 34** | Direct jumper | `ADC1_CH6` (Input-only safe analog pin) |
| **1-Channel 5V Relay**| IN | **GPIO 23** | Direct jumper | Active-LOW: isolates battery (+) to motor |
| **5V Active Buzzer** | (+) Anode | **GPIO 18** | Direct jumper | Driven HIGH during critical fault alarm |
| **Red LED** | (+) Long leg | **GPIO 25** | **220Ω resistor** in series | Lights up when motor is in FAULT |
| **Yellow LED** | (+) Long leg | **GPIO 26** | **220Ω resistor** in series | Lights up when in WARNING |
| **Green LED** | (+) Long leg | **GPIO 27** | **220Ω resistor** in series | Lights up when motor is RUNNING OK |
| **L298N Driver IN1** | IN1 | **GPIO 16** | Direction pin 1 | Sets motor forward rotation |
| **L298N Driver IN2** | IN2 | **GPIO 17** | Direction pin 2 | Sets motor forward rotation |
| **L298N Driver ENA** | ENA | **GPIO 14** | PWM / Speed Enable | Pulled LOW on trip to stop motor driver |

---

## 3. Step-by-Step Process Flow (How Data Moves)

```text
[ Physical DC Motor ]
         │
         ▼ (Vibration, Heat, Amperage)
[ Sensors: MPU6050, DS18B20, ACS712 ]
         │
         ▼ (Readings sampled every 100ms)
[ LAYER 1: ESP32 Microcontroller ]
   ├── Evaluates safety: Is Temp >= 65°C OR Current >= 2.8A OR Vib >= 1.6g?
   │     ├── YES ──► Trips Relay (GPIO 23 HIGH), turns RED LED ON, sounds buzzer!
   │     └── NO  ──► Green LED stays ON, Relay stays ACTIVE.
   ├── Updates local 0.96" OLED screen (every 250ms).
   └── Packs readings into JSON & sends via Wi-Fi HTTP POST (every 1 second).
         │
         ▼ (Wi-Fi JSON Telemetry over Port 8000)
[ LAYER 2: FastAPI Backend Engine ]
   ├── Validates physical bounds (rejects corrupted data >500°C).
   ├── Saves into SQLite Database (WAL mode).
   ├── Calculates Moving Averages & Rates of Change (+°C/min, +A/min, +g/min).
   ├── Health Engine computes 0-100 Health Score & Risk Level.
   └── Broadcasts packet via WebSocket (/ws) to connected clients.
         │
         ▼ (Real-time WebSocket Push)
[ LAYER 3: React Web Dashboard ]
   ├── Updates Health Index (e.g. 98/100, Est. RUL: 1,450 hrs).
   ├── Plots live waveform points on Recharts.
   ├── Displays plain-English diagnosis & maintenance recommendation.
   └── Gives user manual E-Stop, Reset, and Theme (Dark/Light) controls.
```

---

## 4. Firmware Code Walkthrough (ESP32)

All firmware files live in `esp32-firmware/`:

### A. [`config/config.h`](file:///d:/MotorGuard/esp32-firmware/config/config.h)
* **What it does:** The single place where all Wi-Fi settings, pins, and safety thresholds are defined.
* **Key lines:**
  * Lines 10–14: Wi-Fi SSID, Password, and your computer's IP (`BACKEND_BASE_URL`).
  * Lines 21–42: GPIO pin assignments for all sensors and LEDs.
  * Lines 69–76: Safety trip thresholds:
    * `TEMP_WARN = 50.0°C`, `TEMP_CRIT = 65.0°C`
    * `CURR_WARN = 1.80A`, `CURR_CRIT = 2.80A`
    * `VIB_WARN = 0.85g`, `VIB_CRIT = 1.60g`

### B. [`include/sensor_manager.h`](file:///d:/MotorGuard/esp32-firmware/include/sensor_manager.h)
* **What it does:** Reads the 3 physical sensors.
* **How ACS712 current is calculated:**
  * ACS712 20A outputs ~2.50V at 0 Amperes, with sensitivity of $100\text{ mV/A}$.
  * The code averages 30 ADC samples to remove electrical noise.
  * Formula: $\text{Current (A)} = \frac{|V_{out} - V_{zero}|}{0.100\text{ V/A}}$.
* **How MPU6050 vibration is calculated:**
  * Reads $X, Y, Z$ raw accelerations via $I^2C$ register `0x3B`.
  * Computes dynamic magnitude: $g = \sqrt{a_x^2 + a_y^2 + a_z^2} - 1.0g\text{ (gravity subtracted)}$.

### C. [`include/safety_controller.h`](file:///d:/MotorGuard/esp32-firmware/include/safety_controller.h)
* **What it does:** The autonomous safety brain. It runs **locally on the ESP32**, meaning **even if Wi-Fi dies**, the motor is 100% protected!
* **Key function:** `evaluateLocalSafety(temp, curr, vib)`
  * If critical threshold is breached:
    1. Sets `relay_active = false` $\to$ cuts Relay power immediately.
    2. Cuts `PIN_MOTOR_ENA` to disable the L298N driver.
    3. Turns Red LED ON and activates intermittent buzzer alarm.
    4. Latches the system in `STATE_CRITICAL_FAULT` until an explicit reset command is issued.

### D. [`include/display_oled.h`](file:///d:/MotorGuard/esp32-firmware/include/display_oled.h) & [`motorguard_complete_sketch.ino`](file:///d:/MotorGuard/esp32-firmware/motorguard_complete_sketch.ino)
* **What it does:** Industrial 128×64 OLED display controller (compatible with both 0.96" SSD1306 and 1.3" SH1106 displays).
* **Key Features & Animations:**
  1. **Boot Splash & Smooth Progress Bar:** Animated filling progress bar (`0% → 100%`) with double-border enclosure.
  2. **Pre-Flight Hardware Diagnostics:** Sequential 200ms verification checklist of all 4 sensors/relay before arming the motor.
  3. **Live Dashboard:** Header with Health Score (`H:98%`), segmented mini health gauge `[====]`, telemetry packet transmission pulse dot `[WF*]`, and animated spinning rotor `[|] [/] [-] [\]`.
  4. **Warning Badges:** Dynamic `[!]` indicator directly next to elevated sensor parameters.
  5. **Hazard Cutoff Alert:** Alternating inverted strobe warning box and root-cause threshold trip breakdown.
  6. **Safety Recovery:** Confirms safety latch clearing and relay re-arming on manual/remote reset.

---

## 5. Backend Code Walkthrough (FastAPI & Analytics)

All backend files live in `backend/app/`:

### A. [`main.py`](file:///d:/MotorGuard/backend/app/main.py)
* **What it does:** Entry point for FastAPI, sets up CORS headers, and hosts the WebSocket endpoint (`/ws`).
* When the dashboard loads, it opens a persistent WebSocket connection to receive live sensor updates without polling.

### B. [`analytics/health_engine.py`](file:///d:/MotorGuard/backend/app/analytics/health_engine.py)
* **What it does:** Calculates the **0–100 Health Score** and risk classification:
  * Health Score $\ge 90$: **HEALTHY (Low Risk)** — Green.
  * Health Score $70 - 89$: **WARNING (Moderate Risk)** — Amber.
  * Health Score $< 70$: **CRITICAL (High Risk)** — Red.
* Generates plain-English explanation notes (e.g., *"Elevated temperature trend detected (+2.3°C/min)"*).

### C. [`services/simulation_service.py`](file:///d:/MotorGuard/backend/app/services/simulation_service.py)
* **What it does:** Generates realistic data when running in **Simulation Mode**, allowing you to test 6 fault scenarios (*High Vibration, Overheating, Overload, Critical Fault*) without harming your physical motor.

---

## 6. Frontend Code Walkthrough (React & Vite)

All frontend files live in `frontend/src/`:

### A. [`pages/Dashboard.tsx`](file:///d:/MotorGuard/frontend/src/pages/Dashboard.tsx)
* **What it does:** The main landing screen.
* **Key Components:**
  * **4 Vital Cards:** Health Index with Estimated RUL counter, Temperature, Current Draw, and Vibration.
  * **Live Waveform Chart:** Recharts Line chart showing real-time multi-sensor values.
  * **Condition Diagnosis:** Plain-English root cause analysis and prescriptive action.
  * **Recent Events Log:** Recent alerts and threshold crossings.
  * **Alarm Audio Beep:** Uses the Web Audio API to play an audible warning tone if a critical fault trips.

### B. [`components/Navbar.tsx`](file:///d:/MotorGuard/frontend/src/components/Navbar.tsx)
* Displays your custom blue shield & motor logo.
* Allows toggling between **Simulation Mode** and **Hardware Mode**.
* Houses the **Dark / Light Mode** switch and the **Fullscreen Kiosk Mode** button.

### C. [`context/ThemeContext.tsx`](file:///d:/MotorGuard/frontend/src/context/ThemeContext.tsx)
* Manages the Dark and Light mode state, saving your preference in browser `localStorage`.

---

## 7. Important Project Q&A (For Viva / Evaluation)

**Q1: Why are you using a 7.4V battery pack instead of a 12V adapter?**
> **Answer:** The prototype is powered by a portable 2S Li-ion battery pack ($2 \times 3.7\text{V} = 7.4\text{V}$ nominal, $8.4\text{V}$ fully charged). This avoids mains power cords and tests motor behavior under realistic battery operation. All software current and load thresholds are specifically calibrated for 7.4V operation.

**Q2: What happens if Wi-Fi disconnects? Does the motor burn?**
> **Answer:** No! Safety is completely decentralized. The ESP32 evaluates safety locally inside `safety_controller.h`. Even if Wi-Fi drops, the ESP32 autonomously trips the relay and shuts down the motor in under 50 milliseconds.

**Q3: Why do we have both Hardware Mode and Simulation Mode?**
> **Answer:** Hardware Mode reads live physical sensors. Simulation Mode is an engineering test bench that lets us safely demonstrate extreme conditions (like 3.2A motor overload or 70°C heat) to examiners without burning real motor coils or blowing driver ICs.

**Q4: How does the current sensor (ACS712) connect safely to the 3.3V ESP32 ADC?**
> **Answer:** The ACS712 outputs 2.50V at 0A. Under normal motor operation (0A to 2.5A), the output voltage ranges from 2.50V to 2.75V, which is safely inside the ESP32 ADC safe range ($0 - 3.3\text{V}$ with `ADC_11db` attenuation).

**Q5: How can you demonstrate emergency safety cutoff during viva without burning or stalling the motor?**
> **Answer:** You can open the Arduino Serial Monitor at 115200 baud and type `STOP` (or use the E-Stop button on the web dashboard). The ESP32 instantly de-energizes the safety relay (GPIO 23), cuts driver power, latches the Red LED, and sounds the buzzer alarm. Typing `RESET` restores the motor.

**Q6: What do the indicators on the 0.96" OLED display mean?**
> **Answer:** 
> - **Top Row:** Real-time Motor Health (`MOTOR HEALTH: 98%`) with clean, centered text.
> - **Middle Rows:** Physical readings from the 3 sensors: Vibration ($g$), Temperature ($^\circ\text{C}$), and Current ($\text{A}$).
> - **Bottom Rows:** Machine Status (`NORMAL` / `WARNING` / `CRITICAL FAULT`) and Action (`RUNNING` / `MOTOR OFF`).

