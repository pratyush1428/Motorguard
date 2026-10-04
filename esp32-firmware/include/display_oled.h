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

public:
    OLEDDisplay() : display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET), is_initialized(false) {}

    bool begin() {
        if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
            is_initialized = true;
            display.clearDisplay();
            display.setTextColor(SSD1306_WHITE);
            display.setTextSize(1);
            display.setCursor(20, 16);
            display.println(F("MOTORGUARD"));
            display.setCursor(14, 34);
            display.println(F("Health Monitor"));
            display.setCursor(16, 50);
            display.println(F("Initializing..."));
            display.display();
            return true;
        }
        return false;
    }

    // Toggle between normal (dark background) and inverted (light/bright background)
    void setInverted(bool invert) {
        if (!is_initialized) return;
        display.invertDisplay(invert);
    }

    // Calculates real-time Health % (0-100%) like iPhone Battery Health
    int calculateHealth(float temp, float current, float vib) {
        float score = 100.0f;
        // Thermal deduction (above 45°C)
        if (temp > 45.0f) {
            score -= (temp - 45.0f) * 2.5f;
        }
        // Current deduction (above warning threshold)
        if (current > CURR_WARN_THRESHOLD) {
            score -= (current - CURR_WARN_THRESHOLD) * 35.0f;
        }
        // Vibration deduction (above 0.60g)
        if (vib > 0.60f) {
            score -= (vib - 0.60f) * 45.0f;
        }
        if (score < 0.0f) score = 0.0f;
        if (score > 100.0f) score = 100.0f;
        return (int)score;
    }

    // Clean OLED layout: Shows MOTOR HEALTH: XX% at top, full sensor readouts, NO progress bar
    void updateStatus(
        float vibration,
        float temperature,
        float current,
        const char* status_str,
        const char* action_str
    ) {
        if (!is_initialized) return;

        int health = calculateHealth(temperature, current, vibration);

        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);

        // 1. Top Header: MOTOR HEALTH % (Clean text, no bar)
        display.setTextSize(1);
        display.setCursor(14, 2);
        display.print(F("MOTOR HEALTH: "));
        display.print(health);
        display.print(F("%"));

        // Top horizontal divider line
        display.drawLine(0, 12, 127, 12, SSD1306_WHITE);

        // 2. Vibration Readout
        display.setCursor(2, 16);
        display.print(F("Vibration : "));
        if (vibration > 1.6f) {
            display.print(F("HIGH ("));
            display.print(vibration, 1);
            display.print(F("g)"));
        } else {
            display.print(vibration, 2);
            display.print(F("g"));
        }

        // 3. Temperature Readout
        display.setCursor(2, 26);
        display.print(F("Temp      : "));
        display.print(temperature, 1);
        display.print((char)248); // Degree symbol ° (CP437 0xF8)
        display.print(F("C"));

        // 4. Current Readout
        display.setCursor(2, 36);
        display.print(F("Current   : "));
        display.print(current, 2);
        display.print(F("A"));

        // Bottom horizontal divider line
        display.drawLine(0, 47, 127, 47, SSD1306_WHITE);

        // 5. Machine Status & Relay Action
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
