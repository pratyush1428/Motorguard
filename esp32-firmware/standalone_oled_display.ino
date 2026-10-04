/*
 * ==============================================================================
 * MotorGuard — ESP32 + 0.96" SSD1306 OLED Standalone Display Code
 * ==============================================================================
 * Features:
 *  - MOTOR HEALTH: XX% (Clean header at top, NO clutter, NO progress bar)
 *  - Real-time Vibration (g), Temperature (°C), Current (A)
 *  - Machine Status (NORMAL / WARNING / CRITICAL)
 *  - Action State (RUNNING / MOTOR OFF)
 *
 * Compatible with Arduino IDE & PlatformIO.
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OLED Display Parameters
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1       // Reset pin (-1 if sharing ESP32 reset)
#define OLED_ADDRESS 0x3C   // Default I2C address for 0.96" SSD1306

// Hardware I2C Pins for DOIT ESP32 DevKit V1
#define PIN_I2C_SDA 21
#define PIN_I2C_SCL 22

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Telemetry variables
float vibration   = 0.28; // in g
float temperature = 34.5; // in °C
float current     = 0.85; // in Amperes
const char* status_str = "NORMAL";
const char* action_str = "RUNNING";

unsigned long last_update = 0;
int demo_step = 0;

// Calculates real-time Motor Health % (0-100%) like iPhone Battery Health
int calculateHealth(float temp, float curr, float vib) {
  float score = 100.0f;
  if (temp > 45.0f) score -= (temp - 45.0f) * 2.5f;
  if (curr > 1.80f) score -= (curr - 1.80f) * 35.0f;
  if (vib > 0.60f)  score -= (vib - 0.60f) * 45.0f;
  if (score < 0.0f) score = 0.0f;
  if (score > 100.0f) score = 100.0f;
  return (int)score;
}

// Clean OLED draw: Shows MOTOR HEALTH: XX% at top, full sensor readouts, NO progress bar
void updateOLED(float vib, float temp, float curr, const char* status, const char* action) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  int health = calculateHealth(temp, curr, vib);

  // 1. Top Header: MOTOR HEALTH % (Clean, centered, uncluttered)
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
  if (vib > 1.6f) {
    display.print(F("HIGH ("));
    display.print(vib, 1);
    display.print(F("g)"));
  } else {
    display.print(vib, 2);
    display.print(F("g"));
  }

  // 3. Temperature Readout
  display.setCursor(2, 26);
  display.print(F("Temp      : "));
  display.print(temp, 1);
  display.print((char)248); // Degree symbol ° (CP437 0xF8)
  display.print(F("C"));

  // 4. Current Readout
  display.setCursor(2, 36);
  display.print(F("Current   : "));
  display.print(curr, 2);
  display.print(F("A"));

  // Bottom horizontal divider line
  display.drawLine(0, 47, 127, 47, SSD1306_WHITE);

  // 5. Machine Status & Relay Action
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
  Serial.println(F("\nStarting MotorGuard OLED Display with Clean Health %..."));

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println(F("[ERROR] SSD1306 allocation failed! Check wiring & I2C address (0x3C)."));
    while (true) delay(100);
  }

  Serial.println(F("[OK] OLED Initialized Successfully."));

  // Splash Screen
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(28, 15);
  display.println(F("MOTORGUARD"));
  display.setCursor(18, 30);
  display.println(F("HEALTH MONITOR"));
  display.setCursor(20, 48);
  display.println(F("Initializing..."));
  display.display();
  delay(1500);

  updateOLED(vibration, temperature, current, status_str, action_str);
}

void loop() {
  unsigned long now = millis();

  // Cycle demo telemetry every 3 seconds to demonstrate different health states
  if (now - last_update >= 3000) {
    last_update = now;
    demo_step = (demo_step + 1) % 4;

    switch (demo_step) {
      case 0: // Normal condition (Health: 98%)
        vibration   = 0.32;
        temperature = 35.8;
        current     = 0.88;
        status_str  = "NORMAL";
        action_str  = "RUNNING";
        break;

      case 1: // Moderate Load (Health: 76%)
        vibration   = 0.88;
        temperature = 48.2;
        current     = 1.95;
        status_str  = "WARNING";
        action_str  = "CHECK LOAD";
        break;

      case 2: // Critical Fault condition (Health: 25%)
        vibration   = 2.15;
        temperature = 68.4;
        current     = 3.20;
        status_str  = "CRITICAL";
        action_str  = "MOTOR OFF";
        break;

      case 3: // Standby (Health: 100%)
        vibration   = 0.05;
        temperature = 32.1;
        current     = 0.00;
        status_str  = "STANDBY";
        action_str  = "RELAY OFF";
        break;
    }

    updateOLED(vibration, temperature, current, status_str, action_str);

    Serial.printf("[DISPLAY] Vib: %.2fg | Temp: %.1fC | Current: %.2fA | Health: %d%% | Status: %s\n",
                  vibration, temperature, current, calculateHealth(temperature, current, vibration), status_str);
  }
}
