#ifndef NETWORK_CLIENT_H
#define NETWORK_CLIENT_H

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "../config/config.h"
#include "sensor_manager.h"
#include "safety_controller.h"

class NetworkClient {
private:
    unsigned long last_connect_attempt;
    bool is_online;

public:
    NetworkClient() : last_connect_attempt(0), is_online(false) {}

    void begin() {
        WiFi.mode(WIFI_STA);
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        last_connect_attempt = millis();
    }

    void handleWiFiReconnect() {
        if (WiFi.status() == WL_CONNECTED) {
            is_online = true;
            return;
        }

        is_online = false;
        // Non-blocking reconnect attempt every 10 seconds
        if (millis() - last_connect_attempt > 10000) {
            last_connect_attempt = millis();
            WiFi.disconnect();
            WiFi.reconnect();
        }
    }

    bool isConnected() const {
        return WiFi.status() == WL_CONNECTED;
    }

    void sendTelemetry(const SensorData& data, SafetyController& safety) {
        if (WiFi.status() != WL_CONNECTED) {
            return;
        }

        HTTPClient http;
        String url = String(BACKEND_BASE_URL) + String(TELEMETRY_ENDPOINT);
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        http.setTimeout(1500); // 1.5s timeout to prevent locking main loop

        // Construct JSON Payload
        StaticJsonDocument<384> doc;
        doc["device_id"] = DEVICE_ID;
        doc["temperature"] = round(data.temperature * 10.0) / 10.0;
        doc["current"] = round(data.current * 100.0) / 100.0;
        doc["vibration"] = round(data.vibration * 1000.0) / 1000.0;
        doc["raw_vib_x"] = round(data.raw_accel_x * 1000.0) / 1000.0;
        doc["raw_vib_y"] = round(data.raw_accel_y * 1000.0) / 1000.0;
        doc["raw_vib_z"] = round(data.raw_accel_z * 1000.0) / 1000.0;
        
        if (safety.isEmergencyLatched() || !safety.isRelayActive()) {
            doc["motor_status"] = "OFF";
            doc["relay_status"] = "INACTIVE";
        } else if (safety.getState() == STATE_WARNING) {
            doc["motor_status"] = "WARNING";
            doc["relay_status"] = "ACTIVE";
        } else {
            doc["motor_status"] = "RUNNING";
            doc["relay_status"] = "ACTIVE";
        }
        doc["is_simulated"] = false;

        String requestBody;
        serializeJson(doc, requestBody);

        int httpResponseCode = http.POST(requestBody);
        if (httpResponseCode > 0) {
            String response = http.getString();
            if (response.indexOf("\"relay_status\":\"INACTIVE\"") >= 0 || response.indexOf("\"motor_status\":\"OFF\"") >= 0) {
                if (!safety.isEmergencyLatched()) {
                    safety.tripEmergencyStop("Software Emergency Stop (Web Dashboard)");
                }
            } else if (safety.isEmergencyLatched() && response.indexOf("\"relay_status\":\"ACTIVE\"") >= 0 && response.indexOf("\"motor_status\":\"RUNNING\"") >= 0) {
                safety.resetEmergencyStop();
            }
        }
        http.end();
    }
};

#endif // NETWORK_CLIENT_H
