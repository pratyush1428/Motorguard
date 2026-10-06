/*
 * ==============================================================================
 * MotorGuard — ESP32 + 1.3" / 0.96" OLED Standalone Display Test Code [v1.2 PRO]
 * ==============================================================================
 * Use this sketch to instantly test your OLED display the moment it arrives in your hand!
 *
 * Supported Displays:
 *  - 1.3" I2C OLED (SH1106 controller - default, set USE_1_3_INCH_SH1106 to 1)
 *  - 0.96" I2C OLED (SSD1306 controller - set USE_1_3_INCH_SH1106 to 0)
 *
 * Demonstrates all 6 Enhanced Display Phases:
 *  1. Phase 1: Boot Splash Screen with Smooth Filling Progress Bar
 *  2. Phase 2: Pre-Flight Hardware Self-Test Diagnostic Matrix
 *  3. Phase 3: Live Telemetry Dashboard (H:XX%, Health Gauge, WiFi Pulse, Spinning Rotor)
 *  4. Phase 4: Dynamic Warning State with [!] Badges
 *  5. Phase 5: Two-Frame Alternating Hazard Cutoff Alert & Root-Cause Breakdown
 *  6. Phase 6: Safety Interlock Recovery Screen
 *
 * Wiring (Both 1.3" and 0.96"):
 *  VCC -> 3.3V (or 5V depending on module)
 *  GND -> GND
 *  SDA -> GPIO 21
 *  SCL -> GPIO 22
 * ==============================================================================
 */

#include <Wire.h>
#include <Adafruit_GFX.h>

// DISPLAY CONTROLLER SELECTION:
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
Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
#define OLED_COLOR_WHITE SH110X_WHITE
#define OLED_COLOR_BLACK SH110X_BLACK
#else
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
#define OLED_COLOR_WHITE SSD1306_WHITE
#define OLED_COLOR_BLACK SSD1306_BLACK
#endif

// Rotor animation frames
const char ROTOR_FRAMES[] = {'|', '/', '-', '\\'};
int rotor_frame = 0;
bool tx_pulse = false;

// Demo variables
float vibration   = 0.04;
float temperature = 29.8;
float current     = 0.38;
const char* status_str = "NORMAL";
const char* action_str = "MONITORING";
bool demo_emergency = false;

unsigned long last_cycle = 0;
int demo_step = 0;
unsigned long last_hazard_flash = 0;
bool hazard_invert = false;

// Health % Calculation
int calculateHealth(float temp, float curr, float vib) {
    float score = 100.0f;
    if (temp > 45.0f) score -= (temp - 45.0f) * 2.5f;
    if (curr > 1.80f) score -= (curr - 1.80f) * 35.0f;
    if (vib > 0.60f)  score -= (vib - 0.60f) * 45.0f;
    if (score < 0.0f) score = 0.0f;
    if (score > 100.0f) score = 100.0f;
    return (int)score;
}

// Phase 1: Boot Splash Progress
void showBootSplashProgress(int percent, const char* status_text) {
    display.clearDisplay();
    display.setTextColor(OLED_COLOR_WHITE);

    display.drawRect(0, 0, 128, 64, OLED_COLOR_WHITE);
    display.drawRect(2, 2, 124, 60, OLED_COLOR_WHITE);

    display.setTextSize(1);
    display.setCursor(18, 7);
    display.print(F("M O T O R G U A R D"));
    display.setCursor(14, 18);
    display.print(F("Edge Condition v1.2"));

    int bar_x = 14, bar_y = 31, bar_w = 100, bar_h = 9;
    display.drawRect(bar_x, bar_y, bar_w, bar_h, OLED_COLOR_WHITE);
    int fill_w = (percent * (bar_w - 4)) / 100;
    if (fill_w > 0) {
        display.fillRect(bar_x + 2, bar_y + 2, fill_w, bar_h - 4, OLED_COLOR_WHITE);
    }

    display.setCursor(14, 46);
    display.print(status_text);
    display.setCursor(96, 46);
    display.print(percent);
    display.print(F("%"));
    display.display();
}

// Phase 2: Pre-Flight Hardware Self-Test Checklist
void showDiagnosticStep(int step_index) {
    display.clearDisplay();
    display.setTextColor(OLED_COLOR_WHITE);

    display.setTextSize(1);
    display.setCursor(4, 2);
    display.print(F("PRE-FLIGHT DIAGNOSTICS"));
    display.drawLine(0, 11, 127, 11, OLED_COLOR_WHITE);

    display.setCursor(2, 14);
    if (step_index >= 1) display.print(F("[OK] MPU-6050: 0.02g"));
    else                 display.print(F("[..] Testing MPU-6050"));

    display.setCursor(2, 24);
    if (step_index >= 2) {
        display.print(F("[OK] DS18B20 : 29.4"));
        display.print((char)248);
        display.print(F("C"));
    } else if (step_index == 1) {
        display.print(F("[..] Querying Temp..."));
    }

    display.setCursor(2, 34);
    if (step_index >= 3) display.print(F("[OK] ACS-712 : 2.50V 0A"));
    else if (step_index == 2) display.print(F("[..] Calibrating ACS"));

    display.setCursor(2, 44);
    if (step_index >= 4) display.print(F("[OK] RELAY   : ARMED"));
    else if (step_index == 3) display.print(F("[..] Arming Relay..."));

    display.drawLine(0, 53, 127, 53, OLED_COLOR_WHITE);
    display.setCursor(2, 55);
    if (step_index >= 5) display.print(F("WiFi: OK (192.168.1.4)"));
    else                 display.print(F("NET : Connecting WiFi.."));

    display.display();
}

// Phase 5: Hazard Screen
void showHazardScreen(float vib, float temp, float curr) {
    unsigned long now = millis();
    if (now - last_hazard_flash > 400) {
        last_hazard_flash = now;
        hazard_invert = !hazard_invert;
    }

    display.clearDisplay();
    if (hazard_invert) {
        display.fillRect(0, 0, 128, 64, OLED_COLOR_WHITE);
        display.setTextColor(OLED_COLOR_BLACK);
        display.setTextSize(1);
        display.drawRect(2, 2, 124, 60, OLED_COLOR_BLACK);
        display.setCursor(6, 8);
        display.print(F("! EMERGENCY CUTOFF !"));
        display.setCursor(6, 22);
        display.print(F("RELAY DISCONNECTED"));
        display.setCursor(6, 34);
        display.print(F("MOTOR POWER ISOLATED"));
        display.setCursor(6, 48);
        display.print(F("SAFETY LATCH TRIPPED"));
    } else {
        display.setTextColor(OLED_COLOR_WHITE);
        display.setTextSize(1);
        display.setCursor(4, 2);
        display.print(F("[!] SAFETY SHUTDOWN"));
        display.drawLine(0, 11, 127, 11, OLED_COLOR_WHITE);

        display.setCursor(2, 14);
        display.print(F("TRIP: VIB "));
        display.print(vib, 2);
        display.print(F("g > 1.6g"));

        display.setCursor(2, 25);
        display.print(F("RELAY : OPEN (CUTOFF)"));
        display.setCursor(2, 35);
        display.print(F("SPEED : RESPONSE <8ms"));

        display.drawLine(0, 47, 127, 47, OLED_COLOR_WHITE);
        display.setCursor(2, 51);
        display.print(F("RESET : Restoring..."));
    }
    display.display();
}

// Phase 6: Recovery Screen
void showRecoveryScreen() {
    display.clearDisplay();
    display.setTextColor(OLED_COLOR_WHITE);
    display.drawRect(0, 0, 128, 64, OLED_COLOR_WHITE);
    display.setTextSize(1);
    display.setCursor(10, 8);
    display.print(F("[ SAFETY CLEARED ]"));
    display.drawLine(4, 18, 123, 18, OLED_COLOR_WHITE);
    display.setCursor(14, 26);
    display.print(F("Re-Arming Relay..."));
    display.setCursor(14, 38);
    display.print(F("Restoring Drive..."));
    display.setCursor(24, 50);
    display.print(F("SYSTEM READY"));
    display.display();
    delay(1000);
}

// Phase 3 & 4: Live Telemetry
void updateOLED(float vib, float temp, float curr, const char* status, const char* action, bool emergency) {
    if (emergency) {
        showHazardScreen(vib, temp, curr);
        return;
    }

    int health = calculateHealth(temp, curr, vib);

    display.clearDisplay();
    display.setTextColor(OLED_COLOR_WHITE);

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
    display.print(tx_pulse ? F("[WF*]") : F("[WF ]"));

    display.setCursor(108, 2);
    display.print(F("["));
    display.print(ROTOR_FRAMES[rotor_frame]);
    display.print(F("]"));
    rotor_frame = (rotor_frame + 1) % 4;

    display.drawLine(0, 12, 127, 12, OLED_COLOR_WHITE);

    // Vibration Readout
    display.setCursor(2, 16);
    display.print(F("Vibration : "));
    display.print(vib, 2);
    display.print(F("g"));
    if (vib >= 0.85f) display.print(F(" [!]"));

    // Temperature Readout
    display.setCursor(2, 26);
    display.print(F("Temp      : "));
    display.print(temp, 1);
    display.print((char)248);
    display.print(F("C"));
    if (temp >= 50.0f) display.print(F(" [!]"));

    // Current Readout
    display.setCursor(2, 36);
    display.print(F("Current   : "));
    display.print(curr, 2);
    display.print(F("A"));
    if (curr >= 1.80f) display.print(F(" [!]"));

    display.drawLine(0, 47, 127, 47, OLED_COLOR_WHITE);

    // Status & Action
    display.setCursor(2, 50);
    display.print(F("STATUS: "));
    display.print(status);

    display.setCursor(2, 57);
    display.print(F("ACTION: "));
    display.print(action);

    display.display();
}

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println(F("\n--- MOTORGUARD OLED DEMO TEST ---"));

    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    bool oled_ok = false;
#if OLED_DRIVER_SH1106
    oled_ok = display.begin(0x3C, true);
#else
    oled_ok = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
#endif

    if (!oled_ok) {
        Serial.println(F("[ERROR] OLED Display (0x3C) not found! Check wiring."));
        while (true) delay(100);
    }

    Serial.println(F("[OK] OLED Initialized Successfully. Running Demo Sequence..."));

    // Demo Phase 1: Boot Splash with Smooth Filling Progress Bar
    for (int p = 0; p <= 100; p += 15) {
        showBootSplashProgress(p, p < 70 ? "Booting Drivers..." : "Calibrating ACS...");
        delay(80);
    }
    showBootSplashProgress(100, "Hardware Armed!");
    delay(400);

    // Demo Phase 2: Pre-Flight Hardware Checklist Sweep
    for (int s = 1; s <= 5; s++) {
        showDiagnosticStep(s);
        delay(250);
    }
    delay(1200);
}

void loop() {
    unsigned long now = millis();

    // Toggle TX pulse dot every 1 second
    if (now % 1000 < 200) tx_pulse = true;
    else tx_pulse = false;

    // Cycle through real-world scenarios every 4 seconds to test all screen states
    if (now - last_cycle >= 4000) {
        last_cycle = now;
        demo_step = (demo_step + 1) % 4;

        switch (demo_step) {
            case 0: // Normal condition
                vibration = 0.04;
                temperature = 29.8;
                current = 0.38;
                status_str = "NORMAL";
                action_str = "MONITORING";
                demo_emergency = false;
                break;

            case 1: // Warning condition (Vibration imbalance)
                vibration = 0.94;
                temperature = 34.2;
                current = 0.52;
                status_str = "WARNING";
                action_str = "CHECK COUPLING";
                demo_emergency = false;
                break;

            case 2: // Critical Fault / Emergency cutoff
                vibration = 1.82;
                temperature = 42.1;
                current = 1.20;
                status_str = "CRITICAL";
                action_str = "RELAY OPEN";
                demo_emergency = true;
                break;

            case 3: // Recovery & Reset
                showRecoveryScreen();
                vibration = 0.04;
                temperature = 29.9;
                current = 0.38;
                status_str = "NORMAL";
                action_str = "MONITORING";
                demo_emergency = false;
                break;
        }
    }

    updateOLED(vibration, temperature, current, status_str, action_str, demo_emergency);
    delay(200);
}
