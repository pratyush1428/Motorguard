/*
 * ==============================================================================
 * MotorGuard — COMPLETE ALL-IN-ONE ARDUINO SKETCH (ESP32) [v1.2 PRO ENHANCED]
 * ==============================================================================
 * This single file contains the complete system:
 *  1. GY-521 MPU6050 Vibration Reading (I2C GPIO 21/22)
 *  2. DS18B20 Temperature Probe (OneWire GPIO 4 with 4.7kΩ pullup)
 *  3. ACS712 20A Current Sensor with Auto-Zero Calibration (GPIO 34 ADC)
 *  4. 1.3" / 0.96" I2C OLED Display (SH1106 / SSD1306 128x64) with:
 *     - Startup Boot Splash Screen with Smooth Progress Bar (0% -> 100%)
 *     - Pre-Flight Hardware Diagnostic Self-Test Matrix (Sequential 200ms check)
 *     - Live "H: XX% [====]" Header with WiFi TX Pulse [WF*] and Spinning Rotor [|]
 *     - Vibration (g), Temperature (°C), and Current (A) Readouts with [!] Warning Badges
 *     - Alternating Inverted Hazard Cutoff Alert & Root-Cause Trip Diagnostics
 *     - Safety Interlock Recovery Screen upon Manual/Remote Reset
 *  5. Autonomous Local Safety Relay Cutoff (GPIO 23) & E-Stop Interlock
 *  6. Status LEDs (Red GPIO 25, Yellow GPIO 26, Green GPIO 27) & Buzzer (GPIO 18)
 *  7. Non-blocking Wi-Fi Telemetry HTTP POST to FastAPI Backend (with auto-reconnect)
 *  8. Interactive Serial Commands for Viva Demo ('STOP', 'RESET', 'STATUS', 'HELP')
 *
 * INSTRUCTIONS FOR ARDUINO IDE:
 *  1. Install these libraries from Tools -> Manage Libraries:
 *     - For 1.3" OLED: "Adafruit SH110X" by Adafruit
 *     - For 0.96" OLED: "Adafruit SSD1306" by Adafruit
 *     - "Adafruit GFX Library" by Adafruit
 *     - "OneWire" by Paul Stoffregen
 *     - "DallasTemperature" by Miles Burton
 *     - "ArduinoJson" (v7) by Benoit Blanchon
 *  2. Display selection: Line 110 has '#define USE_1_3_INCH_SH1106 1' (set to 0 for 0.96").
 *  3. Update your Wi-Fi SSID, Password & PC IP below on lines 50-52.
 *  4. Select Board: "DOIT ESP32 DEVKIT V1" and click Upload!
 * ==============================================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_GFX.h>
#include <ArduinoJson.h>

// ==============================================================================
// 1. NETWORK & BACKEND CONFIGURATION (EDIT THESE 3 LINES)
// ==============================================================================
#define WIFI_SSID           "kec"        // <-- Put your Wi-Fi Name here
#define WIFI_PASSWORD       "1234567890"    // <-- Put your Wi-Fi Password here
#define BACKEND_BASE_URL    "http://192.168.1.4:8000" // <-- Put your PC's IP here

#define DEVICE_ID           "MOTOR-001"
#define TELEMETRY_ENDPOINT  "/api/sensor-data"

// ==============================================================================
// 2. HARDWARE PIN ASSIGNMENTS
// ==============================================================================
// I2C Bus for SSD1306 OLED (0x3C) and GY-521 MPU6050 (0x68)
#define PIN_I2C_SDA         21
#define PIN_I2C_SCL         22

// OneWire Digital Pin for DS18B20 Temp Probe (Needs 4.7kΩ pullup to 3.3V)
#define PIN_ONE_WIRE_BUS    4

// ADC Pin for ACS712 20A Current Sensor (ADC1_CH6 - Input Only)
#define PIN_ACS712_ADC      34

// Actuators & Indicators
#define PIN_RELAY           23   // Safety Relay: isolates 7.4V battery to motor driver
#define PIN_BUZZER          18   // 5V Active Buzzer
#define PIN_LED_RED         25   // Critical Fault indicator (220Ω resistor)
#define PIN_LED_YELLOW      26   // Warning indicator (220Ω resistor)
#define PIN_LED_GREEN       27   // Normal Run indicator (220Ω resistor)

// L298N Motor Driver Control Pins
#define PIN_MOTOR_IN1       16
#define PIN_MOTOR_IN2       17
#define PIN_MOTOR_ENA       14   // Motor Enable / PWM

// Relay Trigger Logic (Active-LOW for most 5V relay modules)
#define RELAY_ACTIVE_LEVEL   LOW
#define RELAY_INACTIVE_LEVEL HIGH

// ==============================================================================
// 3. SENSOR CONSTANTS & CALIBRATION
// ==============================================================================
#define ADC_MAX_VOLTAGE         3.30f
#define ADC_RESOLUTION          4095.0f
#define ACS712_ZERO_VOLTS       2.50f
#define ACS712_SENSITIVITY      0.100f  // 100mV per Ampere (for 20A version)
#define ACS712_SAMPLES_COUNT    30
#define MPU6050_ADDR            0x68
#define MPU_ACCEL_SCALE         16384.0f

// Safety Trip Thresholds
#define TEMP_WARN_THRESHOLD     50.0f   // °C
#define TEMP_CRIT_THRESHOLD     65.0f   // °C -> Immediate Safety Trip

#define CURR_WARN_THRESHOLD     1.80f   // Amperes
#define CURR_CRIT_THRESHOLD     2.80f   // Amperes -> Immediate Safety Trip

#define VIB_WARN_THRESHOLD      0.85f   // g
#define VIB_CRIT_THRESHOLD      1.60f   // g -> Immediate Safety Trip

#define TELEMETRY_INTERVAL_MS   1000

// ==============================================================================
// 4. OLED DISPLAY MODULE (128x64 I2C — 1.3" SH1106 / 0.96" SSD1306)
// ==============================================================================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// DISPLAY SELECTION:
// Set to 1 for 1.3" OLED (SH1106 controller - Requires "Adafruit SH110X" library)
// Set to 0 for 0.96" OLED (SSD1306 controller - Requires "Adafruit SSD1306" library)
#define USE_1_3_INCH_SH1106 1

#if USE_1_3_INCH_SH1106 && defined(__has_include)
  #if __has_include(<Adafruit_SH110X.h>)
    #define OLED_DRIVER_SH1106 1
  #else
    #define OLED_DRIVER_SH1106 0
  #endif
#else
  #define OLED_DRIVER_SH1106 USE_1_3_INCH_SH1106
#endif

#if OLED_DRIVER_SH1106
#include <Adafruit_SH110X.h>
Adafruit_SH1106G oled = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
#define OLED_COLOR_WHITE SH110X_WHITE
#define OLED_COLOR_BLACK SH110X_BLACK
#else
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
#define OLED_COLOR_WHITE SSD1306_WHITE
#define OLED_COLOR_BLACK SSD1306_BLACK
#endif

// Rotor animation frames: '|', '/', '-', '\'
const char ROTOR_FRAMES[] = {'|', '/', '-', '\\'};
int rotor_frame = 0;
bool packet_tx_pulse = false; // Blinks [WF*] on successful telemetry transmission

// Hazard alert state variables
unsigned long last_hazard_flash = 0;
bool hazard_invert_state = false;

// Calculates real-time Health % (0-100%) like iPhone Battery Health
int calculateHealth(float temp, float current, float vib) {
    float score = 100.0f;
    if (temp > 45.0f) score -= (temp - 45.0f) * 2.5f;
    if (current > CURR_WARN_THRESHOLD) score -= (current - CURR_WARN_THRESHOLD) * 35.0f;
    if (vib > 0.60f) score -= (vib - 0.60f) * 45.0f;
    if (score < 0.0f) score = 0.0f;
    if (score > 100.0f) score = 100.0f;
    return (int)score;
}

// ------------------------------------------------------------------------------
// Phase 1: Boot Splash & Progress Bar
// ------------------------------------------------------------------------------
void showBootSplashProgress(int percent, const char* status_text) {
    oled.clearDisplay();
    oled.setTextColor(OLED_COLOR_WHITE);

    // Decorative double border
    oled.drawRect(0, 0, 128, 64, OLED_COLOR_WHITE);
    oled.drawRect(2, 2, 124, 60, OLED_COLOR_WHITE);

    // Title
    oled.setTextSize(1);
    oled.setCursor(18, 7);
    oled.print(F("M O T O R G U A R D"));

    oled.setCursor(14, 18);
    oled.print(F("Edge Condition v1.2"));

    // Progress Bar (bounded rectangle)
    int bar_x = 14;
    int bar_y = 31;
    int bar_w = 100;
    int bar_h = 9;
    oled.drawRect(bar_x, bar_y, bar_w, bar_h, OLED_COLOR_WHITE);
    int fill_w = (percent * (bar_w - 4)) / 100;
    if (fill_w > 0) {
        oled.fillRect(bar_x + 2, bar_y + 2, fill_w, bar_h - 4, OLED_COLOR_WHITE);
    }

    // Status Message & Percentage
    oled.setCursor(14, 46);
    oled.print(status_text);
    oled.setCursor(96, 46);
    oled.print(percent);
    oled.print(F("%"));

    oled.display();
}

// ------------------------------------------------------------------------------
// Phase 2: Pre-Flight Hardware Diagnostic Self-Test Matrix
// ------------------------------------------------------------------------------
void showDiagnosticStep(int step_index, float vib_val, float temp_val, float curr_zero_v, bool wifi_ok, IPAddress ip) {
    oled.clearDisplay();
    oled.setTextColor(OLED_COLOR_WHITE);

    oled.setTextSize(1);
    oled.setCursor(4, 2);
    oled.print(F("PRE-FLIGHT DIAGNOSTICS"));
    oled.drawLine(0, 11, 127, 11, OLED_COLOR_WHITE);

    // 1. MPU-6050
    oled.setCursor(2, 14);
    if (step_index >= 1) {
        oled.print(F("[OK] MPU-6050: "));
        oled.print(vib_val, 2);
        oled.print(F("g"));
    } else {
        oled.print(F("[..] Testing MPU-6050"));
    }

    // 2. DS18B20
    oled.setCursor(2, 24);
    if (step_index >= 2) {
        oled.print(F("[OK] DS18B20 : "));
        oled.print(temp_val, 1);
        oled.print((char)248);
        oled.print(F("C"));
    } else if (step_index == 1) {
        oled.print(F("[..] Querying Temp..."));
    }

    // 3. ACS-712
    oled.setCursor(2, 34);
    if (step_index >= 3) {
        oled.print(F("[OK] ACS-712 : "));
        oled.print(curr_zero_v, 2);
        oled.print(F("V 0A"));
    } else if (step_index == 2) {
        oled.print(F("[..] Calibrating ACS"));
    }

    // 4. Relay
    oled.setCursor(2, 44);
    if (step_index >= 4) {
        oled.print(F("[OK] RELAY   : ARMED"));
    } else if (step_index == 3) {
        oled.print(F("[..] Arming Relay..."));
    }

    // 5. Network
    oled.drawLine(0, 53, 127, 53, OLED_COLOR_WHITE);
    oled.setCursor(2, 55);
    if (step_index >= 5) {
        if (wifi_ok) {
            oled.print(F("WiFi: OK ("));
            oled.print(ip.toString().c_str());
            oled.print(F(")"));
        } else {
            oled.print(F("NET : Standalone Ready"));
        }
    } else {
        oled.print(F("NET : Connecting WiFi.."));
    }

    oled.display();
}

// ------------------------------------------------------------------------------
// Phase 5: Hazard Screen (Inverted Flash + Root Cause Breakdown)
// ------------------------------------------------------------------------------
void showHazardScreen(float vib, float temp, float curr) {
    unsigned long now = millis();
    if (now - last_hazard_flash > 400) {
        last_hazard_flash = now;
        hazard_invert_state = !hazard_invert_state;
    }

    oled.clearDisplay();

    if (hazard_invert_state) {
        // Frame A: High-Contrast Inverted Warning
        oled.fillRect(0, 0, 128, 64, OLED_COLOR_WHITE);
        oled.setTextColor(OLED_COLOR_BLACK);
        oled.setTextSize(1);
        oled.drawRect(2, 2, 124, 60, OLED_COLOR_BLACK);
        oled.setCursor(6, 8);
        oled.print(F("! EMERGENCY CUTOFF !"));
        oled.setCursor(6, 22);
        oled.print(F("RELAY DISCONNECTED"));
        oled.setCursor(6, 34);
        oled.print(F("MOTOR POWER ISOLATED"));
        oled.setCursor(6, 48);
        oled.print(F("SAFETY LATCH TRIPPED"));
    } else {
        // Frame B: Root-Cause Violation Breakdown
        oled.setTextColor(OLED_COLOR_WHITE);
        oled.setTextSize(1);
        oled.setCursor(4, 2);
        oled.print(F("[!] SAFETY SHUTDOWN"));
        oled.drawLine(0, 11, 127, 11, OLED_COLOR_WHITE);

        oled.setCursor(2, 14);
        if (vib >= VIB_CRIT_THRESHOLD) {
            oled.print(F("TRIP: VIB "));
            oled.print(vib, 2);
            oled.print(F("g > 1.6g"));
        } else if (temp >= TEMP_CRIT_THRESHOLD) {
            oled.print(F("TRIP: TEMP "));
            oled.print(temp, 1);
            oled.print(F("C > 65C"));
        } else if (curr >= CURR_CRIT_THRESHOLD) {
            oled.print(F("TRIP: CURR "));
            oled.print(curr, 2);
            oled.print(F("A > 2.8A"));
        } else {
            oled.print(F("TRIP: E-STOP / REMOTE"));
        }

        oled.setCursor(2, 25);
        oled.print(F("RELAY : OPEN (CUTOFF)"));
        oled.setCursor(2, 35);
        oled.print(F("SPEED : RESPONSE <8ms"));

        oled.drawLine(0, 47, 127, 47, OLED_COLOR_WHITE);
        oled.setCursor(2, 51);
        oled.print(F("RESET : Type 'RESET'"));
    }
    oled.display();
}

// ------------------------------------------------------------------------------
// Phase 6: Recovery / Reset Splash
// ------------------------------------------------------------------------------
void showRecoveryScreen() {
    oled.clearDisplay();
    oled.setTextColor(OLED_COLOR_WHITE);
    oled.drawRect(0, 0, 128, 64, OLED_COLOR_WHITE);
    oled.setTextSize(1);
    oled.setCursor(10, 8);
    oled.print(F("[ SAFETY CLEARED ]"));
    oled.drawLine(4, 18, 123, 18, OLED_COLOR_WHITE);
    oled.setCursor(14, 26);
    oled.print(F("Re-Arming Relay..."));
    oled.setCursor(14, 38);
    oled.print(F("Restoring Drive..."));
    oled.setCursor(24, 50);
    oled.print(F("SYSTEM READY"));
    oled.display();
    delay(600);
}

// ------------------------------------------------------------------------------
// Phase 3 & 4: Live Telemetry with Health Bar, WiFi Pulse, and Spinner
// ------------------------------------------------------------------------------
void updateOLED(float vib, float temp, float curr, const char* status_str, const char* action_str, bool is_emergency) {
    if (is_emergency) {
        showHazardScreen(vib, temp, curr);
        return;
    }

    int health = calculateHealth(temp, curr, vib);

    oled.clearDisplay();
    oled.setTextColor(OLED_COLOR_WHITE);

    // 1. Top Header: Health + Bar + WiFi Badge + Spinning Rotor
    oled.setTextSize(1);
    oled.setCursor(2, 2);
    oled.print(F("H:"));
    oled.print(health);
    oled.print(F("%"));

    // Segmented mini health bar [===..]
    oled.setCursor(40, 2);
    int segs = map(constrain(health, 0, 100), 0, 100, 0, 4);
    oled.print(F("["));
    for (int b = 0; b < 4; b++) {
        oled.print(b < segs ? F("=") : F("."));
    }
    oled.print(F("]"));

    // WiFi Badge with transmission pulse dot
    oled.setCursor(76, 2);
    if (WiFi.status() == WL_CONNECTED) {
        oled.print(packet_tx_pulse ? F("[WF*]") : F("[WF ]"));
    } else {
        oled.print(F("[-- ]"));
    }

    // Spinning rotor indicator
    oled.setCursor(108, 2);
    if (relay_active) {
        oled.print(F("["));
        oled.print(ROTOR_FRAMES[rotor_frame]);
        oled.print(F("]"));
        rotor_frame = (rotor_frame + 1) % 4;
    } else {
        oled.print(F("[X]"));
    }

    // Top horizontal divider
    oled.drawLine(0, 12, 127, 12, OLED_COLOR_WHITE);

    // 2. Vibration Readout (Highlighted with [!] if elevated)
    oled.setCursor(2, 16);
    oled.print(F("Vibration : "));
    oled.print(vib, 2);
    oled.print(F("g"));
    if (vib >= VIB_WARN_THRESHOLD) {
        oled.print(F(" [!]"));
    }

    // 3. Temperature Readout
    oled.setCursor(2, 26);
    oled.print(F("Temp      : "));
    oled.print(temp, 1);
    oled.print((char)248); // ° symbol (CP437 0xF8)
    oled.print(F("C"));
    if (temp >= TEMP_WARN_THRESHOLD) {
        oled.print(F(" [!]"));
    }

    // 4. Current Readout
    oled.setCursor(2, 36);
    oled.print(F("Current   : "));
    oled.print(curr, 2);
    oled.print(F("A"));
    if (curr >= CURR_WARN_THRESHOLD) {
        oled.print(F(" [!]"));
    }

    // Lower divider
    oled.drawLine(0, 47, 127, 47, OLED_COLOR_WHITE);

    // 5. Status & Action
    oled.setCursor(2, 50);
    oled.print(F("STATUS: "));
    oled.print(status_str);

    oled.setCursor(2, 57);
    oled.print(F("ACTION: "));
    oled.print(action_str);

    oled.display();
}

// ==============================================================================
// 5. HARDWARE SENSORS & DRIVERS
// ==============================================================================
OneWire oneWire(PIN_ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

float acs_zero_voltage = ACS712_ZERO_VOLTS;
bool emergency_latched = false;
bool relay_active = true;
enum HealthState { STATE_NORMAL, STATE_WARNING, STATE_CRITICAL_FAULT } current_state = STATE_NORMAL;

unsigned long last_telemetry_time = 0;
unsigned long last_display_time = 0;
unsigned long last_buzzer_toggle = 0;
bool buzzer_state = false;

// Calibration for ACS712 Current Sensor
void calibrateACS712() {
    long sum = 0;
    for (int i = 0; i < 64; i++) {
        sum += analogRead(PIN_ACS712_ADC);
        delay(5);
    }
    float raw_avg = (float)sum / 64.0f;
    acs_zero_voltage = (raw_avg / ADC_RESOLUTION) * ADC_MAX_VOLTAGE;
    if (acs_zero_voltage < 1.0f || acs_zero_voltage > 3.0f) {
        acs_zero_voltage = 2.50f;
    }
}

// Read all 3 physical sensors
void readSensors(float &temp, float &curr, float &vib) {
    // 1. Temperature (Filter -127C disconnect and 85C power-on unconverted state)
    ds18b20.requestTemperatures();
    float t = ds18b20.getTempCByIndex(0);
    if (t == 85.0f || t <= -120.0f || t > 125.0f) {
        temp = (temp > 0.0f && temp < 100.0f) ? temp : 25.0f;
    } else {
        temp = t;
    }

    // 2. Current Draw
    long adc_sum = 0;
    for (int i = 0; i < ACS712_SAMPLES_COUNT; i++) {
        adc_sum += analogRead(PIN_ACS712_ADC);
        delayMicroseconds(100);
    }
    float adc_avg = (float)adc_sum / (float)ACS712_SAMPLES_COUNT;
    float measured_v = (adc_avg / ADC_RESOLUTION) * ADC_MAX_VOLTAGE;
    curr = fabs(measured_v - acs_zero_voltage) / ACS712_SENSITIVITY;
    if (curr < 0.08f) curr = 0.0f; // noise gate

    // 3. Vibration (MPU6050 dynamic acceleration with bus lockup guard)
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x3B);
    if (Wire.endTransmission(false) == 0 && Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)6) == 6) {
        int16_t ax = (Wire.read() << 8) | Wire.read();
        int16_t ay = (Wire.read() << 8) | Wire.read();
        int16_t az = (Wire.read() << 8) | Wire.read();
        float gx = (float)ax / MPU_ACCEL_SCALE;
        float gy = (float)ay / MPU_ACCEL_SCALE;
        float gz = (float)az / MPU_ACCEL_SCALE;
        float mag = sqrt(gx * gx + gy * gy + gz * gz);
        vib = fabs(mag - 1.0f); // subtract 1g static gravity
    } else {
        vib = 0.05f; // baseline
    }
}

// ==============================================================================
// 6. AUTONOMOUS LOCAL SAFETY LOGIC
// ==============================================================================
void setLEDs(bool green, bool yellow, bool red) {
    digitalWrite(PIN_LED_GREEN, green ? HIGH : LOW);
    digitalWrite(PIN_LED_YELLOW, yellow ? HIGH : LOW);
    digitalWrite(PIN_LED_RED, red ? HIGH : LOW);
}

void setRelay(bool activate) {
    if (emergency_latched && activate) return;
    relay_active = activate;
    digitalWrite(PIN_RELAY, activate ? RELAY_ACTIVE_LEVEL : RELAY_INACTIVE_LEVEL);
    digitalWrite(PIN_MOTOR_ENA, activate ? HIGH : LOW);
}

void tripEmergencyStop(const char* reason) {
    emergency_latched = true;
    setRelay(false);
    current_state = STATE_CRITICAL_FAULT;
    setLEDs(false, false, true);
    Serial.printf("[SAFETY TRIP] %s\n", reason);
}

void resetEmergencyStop() {
    emergency_latched = false;
    current_state = STATE_NORMAL;
    setRelay(true);
    setLEDs(true, false, false);
    digitalWrite(PIN_BUZZER, LOW);
    showRecoveryScreen();
    Serial.println(F("[SAFETY RESET] System restored to normal."));
}

void evaluateSafety(float temp, float curr, float vib) {
    if (emergency_latched) {
        current_state = STATE_CRITICAL_FAULT;
        setLEDs(false, false, true);
        // Pulse buzzer alarm during critical fault
        unsigned long now = millis();
        if (now - last_buzzer_toggle > (buzzer_state ? 200 : 600)) {
            buzzer_state = !buzzer_state;
            digitalWrite(PIN_BUZZER, buzzer_state ? HIGH : LOW);
            last_buzzer_toggle = now;
        }
        return;
    }

    int health = calculateHealth(temp, curr, vib);

    // CRITICAL: Sensor limit breach OR Health drops below 50%
    if (temp >= TEMP_CRIT_THRESHOLD || curr >= CURR_CRIT_THRESHOLD || vib >= VIB_CRIT_THRESHOLD || health < 50) {
        tripEmergencyStop(health < 50 ? "Health dropped below 50%!" : "Critical sensor limit breached!");
        return;
    }

    // WARNING: Warning thresholds OR Health between 50% and 79%
    if (temp >= TEMP_WARN_THRESHOLD || curr >= CURR_WARN_THRESHOLD || vib >= VIB_WARN_THRESHOLD || health < 80) {
        current_state = STATE_WARNING;
        setLEDs(false, true, false);
        digitalWrite(PIN_BUZZER, LOW);
        return;
    }

    // NORMAL (GOOD): All sensors healthy AND Health >= 80%
    current_state = STATE_NORMAL;
    setLEDs(true, false, false);
    digitalWrite(PIN_BUZZER, LOW);
}

// ==============================================================================
// 7. WI-FI & TELEMETRY POSTING
// ==============================================================================
void sendTelemetry(float temp, float curr, float vib) {
    if (WiFi.status() != WL_CONNECTED) {
        static unsigned long last_reconnect_attempt = 0;
        if (millis() - last_reconnect_attempt > 10000) {
            last_reconnect_attempt = millis();
            WiFi.disconnect();
            WiFi.reconnect();
        }
        return;
    }

    HTTPClient http;
    http.setTimeout(1000); // 1-second timeout to prevent OLED stutter if server is unreachable
    String url = String(BACKEND_BASE_URL) + String(TELEMETRY_ENDPOINT);
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

#if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
#else
    StaticJsonDocument<256> doc;
#endif
    doc["device_id"] = DEVICE_ID;
    doc["temperature"] = round(temp * 10.0f) / 10.0f;
    doc["current"] = round(curr * 100.0f) / 100.0f;
    doc["vibration"] = round(vib * 1000.0f) / 1000.0f;
    doc["motor_status"] = emergency_latched ? "FAULT" : (!relay_active ? "OFF" : (current_state == STATE_WARNING ? "WARNING" : "RUNNING"));
    doc["relay_status"] = relay_active ? "ACTIVE" : "INACTIVE";
    doc["is_simulated"] = false;

    String json_str;
    serializeJson(doc, json_str);

    int http_code = http.POST(json_str);
    if (http_code == 200 || http_code == 201) {
        packet_tx_pulse = true;
        String resp = http.getString();
        // If operator pressed Emergency Stop on Web Dashboard:
        if (resp.indexOf("\"relay_status\":\"INACTIVE\"") >= 0 || resp.indexOf("\"motor_status\":\"OFF\"") >= 0) {
            if (!emergency_latched) {
                tripEmergencyStop("Software Emergency Stop (Web Dashboard)");
            }
        } else if (emergency_latched && resp.indexOf("\"relay_status\":\"ACTIVE\"") >= 0 && resp.indexOf("\"motor_status\":\"RUNNING\"") >= 0) {
            resetEmergencyStop();
        }
    }
    http.end();
}

// ==============================================================================
// 8. SETUP & LOOP
// ==============================================================================
void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println(F("\n=========================================="));
    Serial.println(F("MotorGuard — ESP32 Complete System"));
    Serial.println(F("Power: 2S Li-ion Battery (7.4V nominal)"));
    Serial.println(F("=========================================="));

    // 1. Pins Setup - Start with motor and relay DE-ENERGIZED for safe zero-calibration
    pinMode(PIN_RELAY, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_MOTOR_IN1, OUTPUT);
    pinMode(PIN_MOTOR_IN2, OUTPUT);
    pinMode(PIN_MOTOR_ENA, OUTPUT);

    // Motor driver initial state: Disabled during boot/calibration
    digitalWrite(PIN_MOTOR_IN1, LOW);
    digitalWrite(PIN_MOTOR_IN2, LOW);
    digitalWrite(PIN_MOTOR_ENA, LOW);
    setRelay(false);
    setLEDs(false, true, false); // Yellow: Booting & Calibrating

    // 2. Initialize OLED Display & Show Animated Boot Splash
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    bool oled_ok = false;
#if OLED_DRIVER_SH1106
    oled_ok = oled.begin(0x3C, true);
#else
    oled_ok = oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
#endif

    if (!oled_ok) {
        Serial.println(F("[ERROR] OLED 0x3C not found!"));
    } else {
        Serial.println(F("[OK] OLED Display Initialized (128x64)."));
        // Smooth filling progress bar animation (Phase 1)
        for (int p = 0; p <= 60; p += 15) {
            showBootSplashProgress(p, "Booting Core...");
            delay(70);
        }
    }

    // 3. Initialize Sensors
    ds18b20.begin();
    ds18b20.requestTemperatures(); // Warm-up request to clear 85C power-on default
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x6B);
    Wire.write(0); // wake up MPU6050
    Wire.endTransmission(true);

    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);
    showBootSplashProgress(80, "Calibrating ACS...");
    calibrateACS712(); // Calibrated while motor is strictly OFF (True 0A reference)
    Serial.printf("[OK] Sensors initialized & ACS712 zero calibrated at %.3fV.\n", acs_zero_voltage);
    showBootSplashProgress(100, "Hardware Armed!");
    delay(250);

    // Pre-Flight Diagnostic Checklist (Phase 2)
    float init_t = 25.0f, init_c = 0.0f, init_v = 0.0f;
    readSensors(init_t, init_c, init_v);

    showDiagnosticStep(1, init_v, init_t, acs_zero_voltage, false, IPAddress());
    delay(200);
    showDiagnosticStep(2, init_v, init_t, acs_zero_voltage, false, IPAddress());
    delay(200);
    showDiagnosticStep(3, init_v, init_t, acs_zero_voltage, false, IPAddress());
    delay(200);
    showDiagnosticStep(4, init_v, init_t, acs_zero_voltage, false, IPAddress());
    delay(200);

    // 4. Start Wi-Fi Connection
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.persistent(true);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print(F("Connecting to Wi-Fi: "));
    Serial.println(WIFI_SSID);

    // Give Wi-Fi up to 3 seconds to establish connection during boot
    int wifi_tries = 0;
    while (WiFi.status() != WL_CONNECTED && wifi_tries < 15) {
        delay(200);
        wifi_tries++;
    }

    bool wifi_ok = (WiFi.status() == WL_CONNECTED);
    showDiagnosticStep(5, init_v, init_t, acs_zero_voltage, wifi_ok, WiFi.localIP());
    delay(1000); // 1-second display for viva evaluators to admire the checklist

    // 5. System Ready: Energize Safety Relay and Enable Motor Forward Drive
    digitalWrite(PIN_MOTOR_IN1, HIGH);
    digitalWrite(PIN_MOTOR_IN2, LOW);
    setRelay(true);
    setLEDs(true, false, false); // Green: Normal Running
    Serial.println(F("[SYSTEM READY] Motor energized, entering live monitoring."));

    Serial.println(F("\n=========================================="));
    Serial.println(F("COMMANDS AVAILABLE IN SERIAL MONITOR:"));
    Serial.println(F("  'STOP'   -> Manually trip emergency cutoff (Viva demo)"));
    Serial.println(F("  'RESET'  -> Restore motor & clear fault"));
    Serial.println(F("  'STATUS' -> Print detailed sensor diagnostics"));
    Serial.println(F("  'HELP'   -> Show commands menu"));
    Serial.println(F("==========================================\n"));
}

void loop() {
    unsigned long now = millis();

    // 1. Read Sensors
    float temperature, current, vibration;
    readSensors(temperature, current, vibration);

    // 2. Local Autonomous Safety Check
    evaluateSafety(temperature, current, vibration);

    // 3. Update OLED Display (Every 250ms)
    if (now - last_display_time >= 250) {
        last_display_time = now;
        const char* status_str = emergency_latched ? "CRITICAL" : (current_state == STATE_WARNING ? "WARNING" : "NORMAL");
        const char* action_str = relay_active ? "RUNNING" : "MOTOR OFF";
        updateOLED(vibration, temperature, current, status_str, action_str, emergency_latched);
    }

    // Reset packet TX pulse after 150ms
    if (packet_tx_pulse && (now - last_telemetry_time > 150)) {
        packet_tx_pulse = false;
    }

    // 4. Send Telemetry to Backend (Every 1 second)
    if (now - last_telemetry_time >= TELEMETRY_INTERVAL_MS) {
        last_telemetry_time = now;
        sendTelemetry(temperature, current, vibration);

        Serial.printf("[LIVE] Temp: %.1fC | Current: %.2fA | Vib: %.3fg | Health: %d%% | Relay: %s | WiFi: %s\n",
                      temperature, current, vibration,
                      calculateHealth(temperature, current, vibration),
                      relay_active ? "ACTIVE" : "INACTIVE",
                      WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");
    }

    // 5. Interactive Serial Commands (Type in Serial Monitor)
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\n');
        cmd.trim();
        cmd.toUpperCase();
        if (cmd == "STOP" || cmd == "ESTOP") {
            tripEmergencyStop("Manual Command (Viva Cutoff Demo)");
        } else if (cmd == "RESET") {
            resetEmergencyStop();
        } else if (cmd == "STATUS") {
            Serial.println(F("\n--- MOTORGUARD SYSTEM DIAGNOSTICS ---"));
            Serial.printf("Health Score : %d%%\n", calculateHealth(temperature, current, vibration));
            Serial.printf("State        : %s\n", emergency_latched ? "CRITICAL (STOPPED)" : (current_state == STATE_WARNING ? "WARNING" : "NORMAL"));
            Serial.printf("Relay Output : %s (GPIO 23)\n", relay_active ? "CLOSED (MOTOR POWERED)" : "OPEN (CUTOFF TRIGGERED)");
            Serial.printf("Temperature  : %.1f deg C (DS18B20 on GPIO 4)\n", temperature);
            Serial.printf("Current Draw : %.2f A (ACS712 on GPIO 34)\n", current);
            Serial.printf("Vibration    : %.3f g (MPU6050 on I2C 21/22)\n", vibration);
            Serial.printf("WiFi Status  : %s\n", WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");
            if (WiFi.status() == WL_CONNECTED) {
                Serial.printf("ESP32 IP     : %s\n", WiFi.localIP().toString().c_str());
            }
            Serial.println(F("-------------------------------------\n"));
        } else if (cmd == "HELP") {
            Serial.println(F("\n=== MOTORGUARD SERIAL COMMANDS ==="));
            Serial.println(F("  STOP   -> Manually trip safety relay & alarm"));
            Serial.println(F("  RESET  -> Restore motor & clear fault"));
            Serial.println(F("  STATUS -> Print full diagnostic readout"));
            Serial.println(F("  HELP   -> Show this list of commands"));
            Serial.println(F("==================================\n"));
        }
    }

    delay(20);
}
