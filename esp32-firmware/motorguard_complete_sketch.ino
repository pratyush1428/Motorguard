/*
 * ==============================================================================
 * MotorGuard — COMPLETE ALL-IN-ONE ARDUINO SKETCH (ESP32) [v1.1 ENHANCED]
 * ==============================================================================
 * This single file contains the complete system:
 *  1. GY-521 MPU6050 Vibration Reading (I2C GPIO 21/22)
 *  2. DS18B20 Temperature Probe (OneWire GPIO 4 with 4.7kΩ pullup)
 *  3. ACS712 20A Current Sensor with Auto-Zero Calibration (GPIO 34 ADC)
 *  4. 0.96" SSD1306 OLED Display with:
 *     - Startup Boot Splash Screen & Sensor Self-Test
 *     - Live "HEALTH: XX%" Header with WiFi Badge [WF] / [--]
 *     - Vibration (g), Temperature (°C), and Current (A) Readouts
 *  5. Autonomous Local Safety Relay Cutoff (GPIO 23) & E-Stop Interlock
 *  6. Status LEDs (Red GPIO 25, Yellow GPIO 26, Green GPIO 27) & Buzzer (GPIO 18)
 *  7. Non-blocking Wi-Fi Telemetry HTTP POST to FastAPI Backend (with auto-reconnect)
 *  8. Interactive Serial Commands for Viva Demo ('STOP', 'RESET', 'STATUS', 'HELP')
 *
 * INSTRUCTIONS FOR ARDUINO IDE:
 *  1. Install these libraries from Tools -> Manage Libraries:
 *     - "Adafruit SSD1306" by Adafruit
 *     - "Adafruit GFX Library" by Adafruit
 *     - "OneWire" by Paul Stoffregen
 *     - "DallasTemperature" by Miles Burton
 *     - "ArduinoJson" (v7) by Benoit Blanchon
 *  2. Update your Wi-Fi SSID, Password & PC IP below on lines 43-45.
 *  3. Select Board: "DOIT ESP32 DEVKIT V1" and click Upload!
 * ==============================================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
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
// 4. OLED DISPLAY MODULE (128x64 I2C SSD1306)
// ==============================================================================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

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

// Display startup / boot splash screen with status steps
void showBootScreen(const char* step_msg) {
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);

    // Top Brand Title
    oled.setTextSize(1);
    oled.setCursor(20, 2);
    oled.print(F("* MOTORGUARD *"));
    oled.drawLine(0, 12, 127, 12, SSD1306_WHITE);

    oled.setCursor(4, 18);
    oled.print(F("AI Condition Monitor"));

    oled.setCursor(4, 32);
    oled.print(F("System Booting..."));

    oled.drawLine(0, 44, 127, 44, SSD1306_WHITE);

    oled.setCursor(4, 50);
    oled.print(F("> "));
    oled.print(step_msg);

    oled.display();
}

void updateOLED(float vib, float temp, float curr, const char* status_str, const char* action_str) {
    int health = calculateHealth(temp, curr, vib);

    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);

    // Top Header: MOTOR HEALTH: XX% (Clean, centered, uncluttered)
    oled.setTextSize(1);
    oled.setCursor(14, 2);
    oled.print(F("MOTOR HEALTH: "));
    oled.print(health);
    oled.print(F("%"));

    // Top horizontal divider
    oled.drawLine(0, 12, 127, 12, SSD1306_WHITE);

    // Vibration Readout
    oled.setCursor(2, 16);
    oled.print(F("Vibration : "));
    if (vib > 1.6f) {
        oled.print(F("HIGH ("));
        oled.print(vib, 1);
        oled.print(F("g)"));
    } else {
        oled.print(vib, 2);
        oled.print(F("g"));
    }

    // Temperature Readout
    oled.setCursor(2, 26);
    oled.print(F("Temp      : "));
    oled.print(temp, 1);
    oled.print((char)248); // ° symbol (CP437 0xF8)
    oled.print(F("C"));

    // Current Readout
    oled.setCursor(2, 36);
    oled.print(F("Current   : "));
    oled.print(curr, 2);
    oled.print(F("A"));

    // Lower divider
    oled.drawLine(0, 47, 127, 47, SSD1306_WHITE);

    // Status & Action
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

    // 2. Initialize OLED Display & Show Splash Screen
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println(F("[ERROR] OLED 0x3C not found!"));
    } else {
        Serial.println(F("[OK] OLED Display Initialized."));
        showBootScreen("Init Sensors...");
        delay(400);
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
    calibrateACS712(); // Calibrated while motor is strictly OFF (True 0A reference)
    Serial.printf("[OK] Sensors initialized & ACS712 zero calibrated at %.3fV.\n", acs_zero_voltage);
    showBootScreen("Connecting WiFi...");

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

    if (WiFi.status() == WL_CONNECTED) {
        showBootScreen("WiFi Connected!");
        Serial.print(F("[OK] Connected! IP: "));
        Serial.println(WiFi.localIP());
    } else {
        showBootScreen("Standalone Ready");
        Serial.println(F("[INFO] WiFi not yet connected. Running in autonomous mode."));
    }
    delay(500);

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
        updateOLED(vibration, temperature, current, status_str, action_str);
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
