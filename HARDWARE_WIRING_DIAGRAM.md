# 🔌 MotorGuard — Master Hardware Wiring & Pinout Guide

This document is your definitive, 100% verified wiring reference for building and testing the complete MotorGuard breadboard prototype.

---

## ⚡ 1. Power Architecture & Dual Converter Setup

You are using a **2S Li-ion Battery (7.4V nominal)** with two converters:
1. **Boost Converter (e.g. MT3608 / XL6009):** Steps 7.4V **UP to 12.0V** for the motor and L298N driver.
2. **Buck Converter (e.g. LM2596 / MP1584):** Steps 7.4V **DOWN to 5.0V** for ESP32 VIN, Relay, Buzzer, and ACS712.

```
                   ┌───────────────────────────────────────────────┐
                   │    2S Li-ion Battery Pack (7.4V Nominal)      │
                   └──────┬─────────────────────────────────┬──────┘
                          │ (+) Red                         │ (-) Black
         ┌────────────────┴──────────────┐         ┌────────┴────────────────────┐
         │                               │         │                             │
         ▼ IN(+)                         ▼ IN(+)   ▼ IN(-)                       ▼ IN(-)
┌─────────────────────────┐   ┌─────────────────────────┐                 ┌─────────────┐
│     BOOST CONVERTER     │   │     BUCK CONVERTER      │                 │             │
│ (Trimpot tuned to 12.0V)│   │ (Trimpot tuned to 5.0V) │                 │             │
└────────────┬────────────┘   └────────────┬────────────┘                 │   COMMON    │
             │ OUT(+)                      │ OUT(+)                       │ GROUND RAIL │
             ▼                             ▼                              │    (GND)    │
       +12V Motor Rail                +5V Logic Rail                      │             │
             │                             │                              │             │
      Relay COM Pin               ESP32 VIN Pin / Relay VCC               │             │
                                  ACS712 VCC / Buzzer VCC                 │             │
                                                                          │             │
         OUT(-) ──────────────────────────────────────────────────────────►             │
                                  OUT(-) ─────────────────────────────────►             │
```

> [!IMPORTANT]
> **COMMON GROUND RULE:**  
> The Battery (-), Boost Converter OUT(-), Buck Converter OUT(-), ESP32 GND, L298N GND, Relay GND, and all Sensor GNDs **MUST be connected together** on the same breadboard blue Ground rail!

---

## 📋 2. Complete Pin-to-Pin Connection Master Table

| Subsystem | Component | Component Pin | Connects To | Notes & Resistor Specs |
| :--- | :--- | :--- | :--- | :--- |
| **Power** | Buck Converter OUT(+) | +5V Output | **ESP32 `VIN`** | Powers ESP32 5V onboard regulator |
| | Buck Converter OUT(-) | GND Output | **Breadboard Blue GND Rail** | Master Ground reference |
| **Power** | ESP32 | `3V3` Pin | **Breadboard Red 3.3V Rail** | Powers OLED, MPU6050, DS18B20 |
| | ESP32 | `GND` Pin | **Breadboard Blue GND Rail** | Common Ground |
| | | | | |
| **Display** | 1.3" / 0.96" OLED | `VCC` | **ESP32 3.3V** (or 5V) | Power |
| | 1.3" / 0.96" OLED | `GND` | **Common GND** | Ground |
| | 1.3" / 0.96" OLED | `SDA` | **ESP32 GPIO 21** | Shared I2C Data bus (0x3C) |
| | 1.3" / 0.96" OLED | `SCL` | **ESP32 GPIO 22** | Shared I2C Clock bus (0x3C) |
| | | | | |
| **Vibration** | GY-521 MPU6050 | `VCC` | **ESP32 3.3V** | Power (do not connect 5V to VCC on 3.3V bus) |
| | GY-521 MPU6050 | `GND` | **Common GND** | Ground |
| | GY-521 MPU6050 | `SDA` | **ESP32 GPIO 21** | Shared with OLED SDA |
| | GY-521 MPU6050 | `SCL` | **ESP32 GPIO 22** | Shared with OLED SCL |
| | | | | |
| **Temperature**| DS18B20 Probe | `VDD / Red` | **ESP32 3.3V** | Sensor Power |
| | DS18B20 Probe | `GND / Black` | **Common GND** | Sensor Ground |
| | DS18B20 Probe | `DATA / Yellow`| **ESP32 GPIO 4** | **Requires 4.7kΩ pull-up to 3.3V** |
| | | | | |
| **Current** | ACS712 20A Sensor | `VCC` | **Buck Converter +5V** | ACS712 requires true 5V for accuracy |
| | ACS712 20A Sensor | `GND` | **Common GND** | Sensor Ground |
| | ACS712 20A Sensor | `OUT` | **ESP32 GPIO 34** | `ADC1_CH6` input-only analog pin |
| | | | | |
| **Safety Relay**| 1-Channel 5V Relay| `VCC` | **Buck Converter +5V** | Coil supply |
| | 1-Channel 5V Relay| `GND` | **Common GND** | Ground |
| | 1-Channel 5V Relay| `IN` | **ESP32 GPIO 23** | Active-LOW control signal |
| | | | | |
| **DC Motor** | DC Geared Motor | `(+) Wire (Red)` | **ACS712 IP- Terminal** | Powered directly through Relay & ACS712 |
| | DC Geared Motor | `(-) Wire (Black)`| **Common GND Rail** | Ground return path |
| | | | | *(No motor driver needed — Relay switches motor directly)* |
| | | | | |
| **Indicators** | Green LED | (+) Long Leg | **ESP32 GPIO 27** | Normal run (via 220Ω resistor to GND) |
| | Yellow LED | (+) Long Leg | **ESP32 GPIO 26** | Warning alert (via 220Ω resistor to GND)|
| | Red LED | (+) Long Leg | **ESP32 GPIO 25** | Emergency fault (via 220Ω resistor to GND)|
| | 5V Active Buzzer | (+) Anode | **ESP32 GPIO 18** | Buzzer positive pin |
| | 5V Active Buzzer | (-) Cathode | **Common GND** | Buzzer ground |

---

## 🔒 3. Direct Safety Relay Motor Isolation Loop

Without the L298N driver, the Relay directly switches motor power ON and OFF while the ACS712 monitors live current:

```
[ Boost Converter OUT+ (+12V) / Battery (+) ]
              │
              ▼
    Relay Terminal: COM (Common)
              │
              ├── [ RELAY CONTACT (Open on Trip / Closed on Normal) ]
              │
              ▼
    Relay Terminal: NO (Normally Open)
              │
              ▼
    ACS712 Terminal: IP+ (Terminal 1)
              │
              ▼
    ACS712 Terminal: IP- (Terminal 2)
              │
              ▼
    [ DC Motor (+) Red Wire ]

    [ DC Motor (-) Black Wire ] ────────► [ Common GND Rail ]
```

* **When Normal (Relay Energized, GPIO 23 LOW):** `COM` connects to `NO` $\rightarrow$ Power flows through ACS712 directly into Motor $\rightarrow$ Motor spins.
* **When Emergency (Relay De-energized, GPIO 23 HIGH):** Contact opens $\rightarrow$ Power to the motor is cut off immediately in $<8\text{ ms}$.

---

## 🔍 4. Crucial Wiring Checks & Resistor Details

### A. DS18B20 Pull-Up Resistor (Between GPIO 4 and 3.3V)
```
          ESP32 3.3V ───────┬─────────────────── DS18B20 Red Wire (VCC)
                            │
                        [ 4.7kΩ ]  <-- (Yellow-Violet-Red bands)
                            │
          ESP32 GPIO 4 ─────┴─────────────────── DS18B20 Yellow Wire (DATA)

          ESP32 GND ──────────────────────────── DS18B20 Black Wire (GND)
```
> [!WARNING]
> Do NOT connect the 4.7kΩ resistor in series! It must bridge across 3.3V and GPIO 4.

### B. Status LEDs (Red, Yellow, Green)
Every LED needs a **220Ω current-limiting resistor** (Red-Red-Brown bands):
```
   ESP32 GPIO Pin (27/26/25) ─────[+] Long Leg (Anode)
                                      LED
   Common GND               ───[220Ω]──[-] Short Leg (Cathode)
```

### C. Breadboard Split Rail Warning
On full-size (830 point) breadboards, the long side rails have a break in the middle:
* Place a small jumper wire linking the top blue rail to the bottom blue rail.
* Place a small jumper wire linking the top red rail to the bottom red rail.
This guarantees that all sensors and ESP32 share the exact same Ground.
