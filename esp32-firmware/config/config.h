#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ==============================================================================
// DEVICE & NETWORK SETTINGS
// ==============================================================================
#define DEVICE_ID           "MOTOR-001"
#define WIFI_SSID           "kec"
#define WIFI_PASSWORD       "1234567890"

// Change this to the IP address of the machine running the FastAPI backend
#define BACKEND_BASE_URL    "http://192.168.1.4:8000"
#define TELEMETRY_ENDPOINT  "/api/sensor-data"
#define STATUS_ENDPOINT     "/api/device-status"

// ==============================================================================
// HARDWARE PIN ASSIGNMENTS (DO NOT CHANGE WITHOUT WIRING MODIFICATION)
// ==============================================================================
// I2C Bus for SSD1306 OLED (0x3C) and GY-521 MPU6050 (0x68)
#define PIN_I2C_SDA         21
#define PIN_I2C_SCL         22

// OneWire Digital Pin for DS18B20 Temperature Sensor (Needs 4.7kΩ pullup to 3.3V)
#define PIN_ONE_WIRE_BUS    4

// ADC Pin for ACS712 20A Current Sensor (ADC1_CH6 - Input Only)
#define PIN_ACS712_ADC      34

// Actuators & Indicators
#define PIN_RELAY           23   // Safety Relay: isolates 7.4V battery to motor driver
#define PIN_BUZZER          18   // 5V Active Buzzer
#define PIN_LED_RED         25   // Critical Fault indicator (220Ω resistor)
#define PIN_LED_YELLOW      26   // Warning / Anomaly indicator (220Ω resistor)
#define PIN_LED_GREEN       27   // Normal Operation indicator (220Ω resistor)

// L298N Motor Driver Control Pins
#define PIN_MOTOR_IN1       16
#define PIN_MOTOR_IN2       17
#define PIN_MOTOR_ENA       14   // PWM or Digital Enable

// ==============================================================================
// RELAY LOGIC (Active-LOW or Active-HIGH depending on relay module)
// ==============================================================================
#define RELAY_ACTIVE_LEVEL   LOW    // Typical 1-channel 5V relay module engages on LOW
#define RELAY_INACTIVE_LEVEL HIGH   // Power cut / isolated when HIGH

// ==============================================================================
// SENSOR CALIBRATION CONSTANTS
// ==============================================================================
// ACS712 20A calibration:
// Sensitivity: 100 mV per Ampere (0.100 V/A).
// Quiescent voltage at 0A: ~2.50V (on 5V VCC).
// For ESP32 12-bit ADC (0-4095) with 11dB attenuation (approx 0 - 3.3V range):
#define ADC_MAX_VOLTAGE         3.30f
#define ADC_RESOLUTION          4095.0f
#define ACS712_ZERO_VOLTS       2.50f   // Baseline zero-current voltage
#define ACS712_SENSITIVITY      0.100f  // 100mV per Ampere
#define ACS712_SAMPLES_COUNT    30      // Over-sampling count for smoothing

// MPU6050 sensitivity (+/- 2g range = 16384 LSB/g)
#define MPU6050_ADDR            0x68
#define MPU_ACCEL_SCALE         16384.0f

// ==============================================================================
// LOCAL SAFETY & TRIP THRESHOLDS
// ==============================================================================
#define TEMP_WARN_THRESHOLD     50.0f   // °C
#define TEMP_CRIT_THRESHOLD     65.0f   // °C -> Immediate Safety Trip

#define CURR_WARN_THRESHOLD     1.80f   // Amperes
#define CURR_CRIT_THRESHOLD     2.80f   // Amperes -> Immediate Safety Trip

#define VIB_WARN_THRESHOLD      0.85f   // g
#define VIB_CRIT_THRESHOLD      1.60f   // g -> Immediate Safety Trip

// Telemetry interval (ms)
#define TELEMETRY_INTERVAL_MS   1000

#endif // CONFIG_H
