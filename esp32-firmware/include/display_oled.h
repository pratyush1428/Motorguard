#ifndef DISPLAY_OLED_H
#define DISPLAY_OLED_H

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include "../config/config.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C

class OLEDDisplay {
private:
    Adafruit_SSD1306 display;
    bool is_initialized;
    int rotor_frame;
    bool packet_tx_pulse;
    unsigned long last_hazard_flash;
    bool hazard_invert_state;

public:
    OLEDDisplay() : display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET),
                    is_initialized(false), rotor_frame(0), packet_tx_pulse(false),
                    last_hazard_flash(0), hazard_invert_state(false) {}

    bool begin() {
        if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
            is_initialized = true;
            return true;
        }
        return false;
    }

    void setInverted(bool invert) {
        if (!is_initialized) return;
        display.invertDisplay(invert);
    }

    void setTxPulse(bool pulse) {
        packet_tx_pulse = pulse;
    }

    int calculateHealth(float temp, float current, float vib) {
        float score = 100.0f;
        if (temp > 45.0f) score -= (temp - 45.0f) * 2.5f;
        if (current > CURR_WARN_THRESHOLD) score -= (current - CURR_WARN_THRESHOLD) * 35.0f;
        if (vib > 0.60f) score -= (vib - 0.60f) * 45.0f;
        if (score < 0.0f) score = 0.0f;
        if (score > 100.0f) score = 100.0f;
        return (int)score;
    }

    // Phase 1: Boot Splash & Progress Bar
    void showBootSplashProgress(int percent, const char* status_text) {
        if (!is_initialized) return;
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);

        display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
        display.drawRect(2, 2, 124, 60, SSD1306_WHITE);

        display.setTextSize(1);
        display.setCursor(18, 7);
        display.print(F("M O T O R G U A R D"));
        display.setCursor(14, 18);
        display.print(F("Edge Condition v1.2"));

        int bar_x = 14, bar_y = 31, bar_w = 100, bar_h = 9;
        display.drawRect(bar_x, bar_y, bar_w, bar_h, SSD1306_WHITE);
        int fill_w = (percent * (bar_w - 4)) / 100;
        if (fill_w > 0) {
            display.fillRect(bar_x + 2, bar_y + 2, fill_w, bar_h - 4, SSD1306_WHITE);
        }

        display.setCursor(14, 46);
        display.print(status_text);
        display.setCursor(96, 46);
        display.print(percent);
        display.print(F("%"));
        display.display();
    }

    // Phase 2: Pre-Flight Hardware Diagnostics Checklist
    void showDiagnosticStep(int step_index, float vib_val, float temp_val, float curr_zero_v, bool wifi_ok, const char* ip_str) {
        if (!is_initialized) return;
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);

        display.setTextSize(1);
        display.setCursor(4, 2);
        display.print(F("PRE-FLIGHT DIAGNOSTICS"));
        display.drawLine(0, 11, 127, 11, SSD1306_WHITE);

        display.setCursor(2, 14);
        if (step_index >= 1) {
            display.print(F("[OK] MPU-6050: "));
            display.print(vib_val, 2);
            display.print(F("g"));
        } else {
            display.print(F("[..] Testing MPU-6050"));
        }

        display.setCursor(2, 24);
        if (step_index >= 2) {
            display.print(F("[OK] DS18B20 : "));
            display.print(temp_val, 1);
            display.print((char)248);
            display.print(F("C"));
        } else if (step_index == 1) {
            display.print(F("[..] Querying Temp..."));
        }

        display.setCursor(2, 34);
        if (step_index >= 3) {
            display.print(F("[OK] ACS-712 : "));
            display.print(curr_zero_v, 2);
            display.print(F("V 0A"));
        } else if (step_index == 2) {
            display.print(F("[..] Calibrating ACS"));
        }

        display.setCursor(2, 44);
        if (step_index >= 4) {
            display.print(F("[OK] RELAY   : ARMED"));
        } else if (step_index == 3) {
            display.print(F("[..] Arming Relay..."));
        }

        display.drawLine(0, 53, 127, 53, SSD1306_WHITE);
        display.setCursor(2, 55);
        if (step_index >= 5) {
            if (wifi_ok && ip_str) {
                display.print(F("WiFi: OK ("));
                display.print(ip_str);
                display.print(F(")"));
            } else {
                display.print(F("NET : Standalone Ready"));
            }
        } else {
            display.print(F("NET : Connecting WiFi.."));
        }
        display.display();
    }

    // Phase 5: Hazard Screen
    void showHazardScreen(float vib, float temp, float curr) {
        if (!is_initialized) return;
        unsigned long now = millis();
        if (now - last_hazard_flash > 400) {
            last_hazard_flash = now;
            hazard_invert_state = !hazard_invert_state;
        }

        display.clearDisplay();
        if (hazard_invert_state) {
            display.fillRect(0, 0, 128, 64, SSD1306_WHITE);
            display.setTextColor(SSD1306_BLACK);
            display.setTextSize(1);
            display.drawRect(2, 2, 124, 60, SSD1306_BLACK);
            display.setCursor(6, 8);
            display.print(F("! EMERGENCY CUTOFF !"));
            display.setCursor(6, 22);
            display.print(F("RELAY DISCONNECTED"));
            display.setCursor(6, 34);
            display.print(F("MOTOR POWER ISOLATED"));
            display.setCursor(6, 48);
            display.print(F("SAFETY LATCH TRIPPED"));
        } else {
            display.setTextColor(SSD1306_WHITE);
            display.setTextSize(1);
            display.setCursor(4, 2);
            display.print(F("[!] SAFETY SHUTDOWN"));
            display.drawLine(0, 11, 127, 11, SSD1306_WHITE);

            display.setCursor(2, 14);
            if (vib >= VIB_CRIT_THRESHOLD) {
                display.print(F("TRIP: VIB "));
                display.print(vib, 2);
                display.print(F("g > 1.6g"));
            } else if (temp >= TEMP_CRIT_THRESHOLD) {
                display.print(F("TRIP: TEMP "));
                display.print(temp, 1);
                display.print(F("C > 65C"));
            } else if (curr >= CURR_CRIT_THRESHOLD) {
                display.print(F("TRIP: CURR "));
                display.print(curr, 2);
                display.print(F("A > 2.8A"));
            } else {
                display.print(F("TRIP: E-STOP / REMOTE"));
            }

            display.setCursor(2, 25);
            display.print(F("RELAY : OPEN (CUTOFF)"));
            display.setCursor(2, 35);
            display.print(F("SPEED : RESPONSE <8ms"));

            display.drawLine(0, 47, 127, 47, SSD1306_WHITE);
            display.setCursor(2, 51);
            display.print(F("RESET : Type 'RESET'"));
        }
        display.display();
    }

    // Phase 6: Recovery Screen
    void showRecoveryScreen() {
        if (!is_initialized) return;
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(10, 8);
        display.print(F("[ SAFETY CLEARED ]"));
        display.drawLine(4, 18, 123, 18, SSD1306_WHITE);
        display.setCursor(14, 26);
        display.print(F("Re-Arming Relay..."));
        display.setCursor(14, 38);
        display.print(F("Restoring Drive..."));
        display.setCursor(24, 50);
        display.print(F("SYSTEM READY"));
        display.display();
        delay(600);
    }

    // Phase 3 & 4: Live Telemetry with Health Bar & Spinning Rotor
    void updateStatus(
        float vibration,
        float temperature,
        float current,
        const char* status_str,
        const char* action_str,
        bool is_emergency = false,
        bool relay_is_active = true,
        bool wifi_is_connected = false
    ) {
        if (!is_initialized) return;

        if (is_emergency) {
            showHazardScreen(vibration, temperature, current);
            return;
        }

        const char rotor_chars[] = {'|', '/', '-', '\\'};
        int health = calculateHealth(temperature, current, vibration);

        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);

        // Header: Health + Bar + WiFi Badge + Rotor
        display.setTextSize(1);
        display.setCursor(2, 2);
        display.print(F("H:"));
        display.print(health);
        display.print(F("%"));

        display.setCursor(40, 2);
        int segs = map(constrain(health, 0, 100), 0, 100, 0, 4);
        display.print(F("["));
        for (int b = 0; b < 4; b++) {
            display.print(b < segs ? F("=") : F("."));
        }
        display.print(F("]"));

        display.setCursor(76, 2);
        if (wifi_is_connected) {
            display.print(packet_tx_pulse ? F("[WF*]") : F("[WF ]"));
        } else {
            display.print(F("[-- ]"));
        }

        display.setCursor(108, 2);
        if (relay_is_active) {
            display.print(F("["));
            display.print(rotor_chars[rotor_frame]);
            display.print(F("]"));
            rotor_frame = (rotor_frame + 1) % 4;
        } else {
            display.print(F("[X]"));
        }

        display.drawLine(0, 12, 127, 12, SSD1306_WHITE);

        // Vibration Readout
        display.setCursor(2, 16);
        display.print(F("Vibration : "));
        display.print(vibration, 2);
        display.print(F("g"));
        if (vibration >= VIB_WARN_THRESHOLD) {
            display.print(F(" [!]"));
        }

        // Temperature Readout
        display.setCursor(2, 26);
        display.print(F("Temp      : "));
        display.print(temperature, 1);
        display.print((char)248);
        display.print(F("C"));
        if (temperature >= TEMP_WARN_THRESHOLD) {
            display.print(F(" [!]"));
        }

        // Current Readout
        display.setCursor(2, 36);
        display.print(F("Current   : "));
        display.print(current, 2);
        display.print(F("A"));
        if (current >= CURR_WARN_THRESHOLD) {
            display.print(F(" [!]"));
        }

        display.drawLine(0, 47, 127, 47, SSD1306_WHITE);

        // Machine Status & Relay Action
        display.setCursor(2, 50);
        display.print(F("STATUS: "));
        display.print(status_str);

        display.setCursor(2, 57);
        display.print(F("ACTION: "));
        display.print(action_str);

        display.display();
    }
};

#endif // DISPLAY_OLED_H
