# MotorGuard — ESP32 Firmware

Layer 1 firmware for the MotorGuard predictive maintenance and motor condition monitoring system.

## Hardware Specifications & Power System

> **CRITICAL POWER ARCHITECTURE NOTE**
> This prototype is powered exclusively by a **2S Li-ion Battery Pack (2 × 3.7V 18650 cells in series)**:
> - **Nominal Voltage:** ~7.4V
> - **Fully Charged Voltage:** ~8.4V
> - **Motor:** 12V DC Geared Motor running safely on 7.4V nominal.
> - **NO LM2596 step-down converter** is used.
> - **NO 12V AC adapter** is assumed.

---

## Hardware Pinout Reference

| Component | Pin / Signal | ESP32 GPIO | Description / Notes |
| :--- | :--- | :--- | :--- |
| **0.96" SSD1306 OLED** | SDA | **GPIO 21** | I2C Data (0x3C address) |
| | SCL | **GPIO 22** | I2C Clock |
| | VCC / GND | 3.3V / GND | Power supply from ESP32 rail |
| **GY-521 MPU6050** | SDA | **GPIO 21** | Shared I2C Data bus |
| | SCL | **GPIO 22** | Shared I2C Clock bus |
| | VCC / GND | 3.3V / GND | Power supply |
| **DS18B20 Temp Sensor**| DATA | **GPIO 4** | OneWire bus (Requires 4.7kΩ pull-up to 3.3V) |
| | VCC / GND | 3.3V / GND | Power supply |
| **ACS712 20A Current** | VOUT | **GPIO 34** | ADC1_CH6 (Input only pin). See safety note below. |
| | VCC / GND | 5V / GND | ACS712 requires 5V supply |
| **1-Channel 5V Relay** | IN | **GPIO 23** | Active-LOW or configurable. Isolates motor power rail |
| | VCC / GND | 5V / GND | Relay coil supply |
| **5V Active Buzzer** | (+) Signal | **GPIO 18** | Beeps alarm patterns on Warning / Critical |
| **Green LED** | Anode (+) | **GPIO 27** | Normal operation indicator (via 220Ω resistor) |
| **Yellow LED** | Anode (+) | **GPIO 26** | Warning / anomaly indicator (via 220Ω resistor) |
| **Red LED** | Anode (+) | **GPIO 25** | Critical fault indicator (via 220Ω resistor) |
| **L298N Motor Driver** | IN1 | **GPIO 16** | Direction input 1 |
| | IN2 | **GPIO 17** | Direction input 2 |
| | ENA | **GPIO 14** | Motor enable / PWM speed control |
| | 12V / GND | 2S Battery (+) via Relay / Battery (-) | 7.4V nominal battery rail |

---

## ACS712 20A Signal Conditioning & ADC Safety

1. **Operating Principle**:
   - ACS712 operates on a 5V supply.
   - At 0 Amperes, its output is $V_{CC} / 2 \approx 2.50\text{V}$.
   - Sensitivity for the 20A model is **100 mV/A** ($0.100\text{V/A}$).
2. **ESP32 ADC Limits**:
   - The ESP32 ADC has a maximum safe continuous voltage of **3.3V** with `ADC_11db` attenuation.
   - At normal DC motor loads (0A to 3A forward current), the output swings between **2.50V and 2.80V**, which safely falls inside the 3.3V ceiling.
   - If large reverse currents or transient inductive spikes occur, a resistive voltage divider (e.g. 10kΩ / 20kΩ to scale 5V down to 3.3V) or a 3.3V Zener clamp can be placed across VOUT and GND.
3. **Firmware Calibration**:
   - The firmware performs zero-offset calibration during `setup()` by sampling 64 readings to find the rest voltage, eliminating thermal zero drift.

---

## OLED Quick Local Display Layout

Per project specifications, the OLED is strictly a **quick local information display** for an operator physically standing near the motor. The layout is preserved:

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

## Build & Flashing

### Using PlatformIO:
```bash
cd esp32-firmware
pio run --target upload
pio device monitor -b 115200
```

### Using Arduino IDE:
1. Install **ESP32 by Espressif Systems** via Boards Manager.
2. Install libraries via Library Manager:
   - `Adafruit SSD1306`
   - `Adafruit GFX Library`
   - `DallasTemperature`
   - `OneWire`
   - `ArduinoJson`
3. Configure `config/config.h` with your Wi-Fi SSID, password, and backend server IP.
4. Select board **DOIT ESP32 DEVKIT V1**, select your COM port, and click **Upload**.
