#include <Arduino.h>
#include "../config/config.h"
#include "../include/display_oled.h"
#include "../include/sensor_manager.h"
#include "../include/safety_controller.h"
#include "../include/network_client.h"

// Core System Modules
OLEDDisplay      oled;
SensorManager    sensors;
SafetyController safety;
NetworkClient    network;

unsigned long last_telemetry_time = 0;
unsigned long last_display_time = 0;

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println(F("\n=================================================="));
    Serial.println(F("MotorGuard — IoT Motor Condition Monitoring"));
    Serial.println(F("Power: 2S Li-ion Battery Pack (7.4V nominal)"));
    Serial.println(F("=================================================="));

    // 1. Initialize OLED (Preserving exact layout)
    if (!oled.begin()) {
        Serial.println(F("[ERROR] SSD1306 OLED initialization failed!"));
    } else {
        Serial.println(F("[OK] OLED display initialized (0x3C)."));
    }

    // 2. Initialize Sensors (MPU6050, DS18B20, ACS712)
    sensors.begin();
    Serial.println(F("[OK] Sensors initialized & ACS712 zero calibrated."));

    // 3. Initialize Safety Controller (LEDs, Buzzer, Relay, L298N)
    safety.begin();
    Serial.println(F("[OK] Local safety controller & relay initialized."));

    // 4. Initialize Network Connection
    network.begin();
    Serial.println(F("[INFO] Wi-Fi connection process started."));
}

void loop() {
    unsigned long now = millis();

    // 1. Sensor Acquisition
    SensorData data = sensors.readAll();

    // 2. Autonomous Local Safety Evaluation (Runs independently of Wi-Fi)
    safety.evaluateLocalSafety(data.temperature, data.current, data.vibration);

    // 3. OLED Quick Local Display Update (Every 250ms for responsive readout)
    if (now - last_display_time >= 250) {
        last_display_time = now;

        const char* status_str = "NORMAL";
        const char* action_str = "RUNNING";

        if (safety.isEmergencyLatched()) {
            status_str = "CRITICAL FAULT";
            action_str = "MOTOR OFF";
        } else if (safety.getState() == STATE_WARNING) {
            status_str = "WARNING";
            action_str = "CHECK LOAD";
        } else if (!safety.isRelayActive()) {
            status_str = "STANDBY";
            action_str = "RELAY OFF";
        }

        oled.updateStatus(data.vibration, data.temperature, data.current, status_str, action_str);
    }

    // 4. Handle Wi-Fi Reconnect (Non-blocking)
    network.handleWiFiReconnect();

    // 5. Send Telemetry to Backend (Every TELEMETRY_INTERVAL_MS)
    if (now - last_telemetry_time >= TELEMETRY_INTERVAL_MS) {
        last_telemetry_time = now;
        network.sendTelemetry(data, safety);
        
        // Debug Serial Output
        Serial.printf(
            "[TELEMETRY] Temp: %.1fC | Current: %.2fA | Vib: %.3fg | State: %s | Relay: %s | WiFi: %s\n",
            data.temperature,
            data.current,
            data.vibration,
            safety.getState() == STATE_NORMAL ? "NORMAL" : (safety.getState() == STATE_WARNING ? "WARN" : "CRIT"),
            safety.isRelayActive() ? "ACTIVE" : "INACTIVE",
            network.isConnected() ? "CONNECTED" : "OFFLINE"
        );
    }

    // 6. Handle Direct Serial Commands for Benchtop Testing
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\n');
        cmd.trim();
        cmd.toUpperCase();
        if (cmd == "STOP" || cmd == "ESTOP") {
            safety.tripEmergencyStop("Serial Emergency Stop");
            Serial.println(F("[COMMAND] Emergency Stop engaged."));
        } else if (cmd == "RESET") {
            safety.resetEmergencyStop();
            Serial.println(F("[COMMAND] Safety interlock reset."));
        } else if (cmd == "RELAY_OFF") {
            safety.setRelay(false);
            Serial.println(F("[COMMAND] Relay set to INACTIVE."));
        } else if (cmd == "RELAY_ON") {
            safety.setRelay(true);
            Serial.println(F("[COMMAND] Relay set to ACTIVE."));
        }
    }

    delay(20); // Small cycle delay
}
