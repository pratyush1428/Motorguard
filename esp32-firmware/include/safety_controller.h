#ifndef SAFETY_CONTROLLER_H
#define SAFETY_CONTROLLER_H

#include <Arduino.h>
#include "../config/config.h"

enum SystemHealthState {
    STATE_NORMAL,
    STATE_WARNING,
    STATE_CRITICAL_FAULT
};

class SafetyController {
private:
    bool emergency_latched;
    bool relay_active;
    SystemHealthState current_state;
    unsigned long last_buzzer_toggle;
    bool buzzer_state;

public:
    SafetyController() : 
        emergency_latched(false), 
        relay_active(true), 
        current_state(STATE_NORMAL),
        last_buzzer_toggle(0),
        buzzer_state(false) {}

    void begin() {
        pinMode(PIN_RELAY, OUTPUT);
        pinMode(PIN_BUZZER, OUTPUT);
        pinMode(PIN_LED_RED, OUTPUT);
        pinMode(PIN_LED_YELLOW, OUTPUT);
        pinMode(PIN_LED_GREEN, OUTPUT);

        // Hardware LED test on boot
        digitalWrite(PIN_LED_GREEN, HIGH); delay(200); digitalWrite(PIN_LED_GREEN, LOW);
        digitalWrite(PIN_LED_YELLOW, HIGH); delay(200); digitalWrite(PIN_LED_YELLOW, LOW);
        digitalWrite(PIN_LED_RED, HIGH); delay(200); digitalWrite(PIN_LED_RED, LOW);

        // Initial default: Relay active (motor powered directly)
        setRelay(true);
        setLEDs(true, false, false); // Green ON
        digitalWrite(PIN_BUZZER, LOW);
    }

    void setLEDs(bool green, bool yellow, bool red) {
        digitalWrite(PIN_LED_GREEN, green ? HIGH : LOW);
        digitalWrite(PIN_LED_YELLOW, yellow ? HIGH : LOW);
        digitalWrite(PIN_LED_RED, red ? HIGH : LOW);
    }

    void setRelay(bool activate) {
        if (emergency_latched && activate) {
            // Cannot activate relay while emergency stop is latched
            return;
        }
        relay_active = activate;
        digitalWrite(PIN_RELAY, activate ? RELAY_ACTIVE_LEVEL : RELAY_INACTIVE_LEVEL);
    }

    void tripEmergencyStop(const char* reason = "Critical Fault") {
        emergency_latched = true;
        setRelay(false);
        current_state = STATE_CRITICAL_FAULT;
        setLEDs(false, false, true); // Red ON
    }

    void resetEmergencyStop() {
        emergency_latched = false;
        current_state = STATE_NORMAL;
        setRelay(true);
        setLEDs(true, false, false); // Green ON
        digitalWrite(PIN_BUZZER, LOW);
    }

    bool isEmergencyLatched() const { return emergency_latched; }
    bool isRelayActive() const { return relay_active; }
    SystemHealthState getState() const { return current_state; }

    void evaluateLocalSafety(float temp, float current, float vib) {
        if (emergency_latched) {
            // Keep in critical state
            current_state = STATE_CRITICAL_FAULT;
            setLEDs(false, false, true);
            // Intermittent alarm beeps (non-annoying pulse: 200ms on, 600ms off)
            unsigned long now = millis();
            if (now - last_buzzer_toggle > (buzzer_state ? 200 : 600)) {
                buzzer_state = !buzzer_state;
                digitalWrite(PIN_BUZZER, buzzer_state ? HIGH : LOW);
                last_buzzer_toggle = now;
            }
            return;
        }

        // Local Autonomous Trip Conditions
        if (temp >= TEMP_CRIT_THRESHOLD || current >= CURR_CRIT_THRESHOLD || vib >= VIB_CRIT_THRESHOLD) {
            tripEmergencyStop("Local threshold breached");
            return;
        }

        // Local Warning Conditions
        if (temp >= TEMP_WARN_THRESHOLD || current >= CURR_WARN_THRESHOLD || vib >= VIB_WARN_THRESHOLD) {
            current_state = STATE_WARNING;
            setLEDs(false, true, false); // Yellow ON
            digitalWrite(PIN_BUZZER, LOW);
            return;
        }

        // Normal Operation
        current_state = STATE_NORMAL;
        setLEDs(true, false, false); // Green ON
        digitalWrite(PIN_BUZZER, LOW);
    }
};

#endif // SAFETY_CONTROLLER_H
