#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "../config/config.h"

struct SensorData {
    float temperature;
    float current;
    float vibration;
    float raw_accel_x;
    float raw_accel_y;
    float raw_accel_z;
    bool is_valid;
};

class SensorManager {
private:
    OneWire oneWire;
    DallasTemperature ds18b20;
    float zero_current_voltage;
    
    // Moving average buffers for sensor smoothing
    float vib_history[10];
    int vib_idx;

public:
    SensorManager() : oneWire(PIN_ONE_WIRE_BUS), ds18b20(&oneWire), zero_current_voltage(ACS712_ZERO_VOLTS), vib_idx(0) {
        for (int i = 0; i < 10; i++) vib_history[i] = 0.0f;
    }

    void begin() {
        // Initialize OneWire Temperature Sensor
        ds18b20.begin();
        ds18b20.requestTemperatures(); // Warm-up request to clear 85C power-on default

        // Initialize MPU6050 via Wire I2C
        Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
        Wire.beginTransmission(MPU6050_ADDR);
        Wire.write(0x6B); // PWR_MGMT_1 register
        Wire.write(0);    // Wake up MPU6050
        Wire.endTransmission(true);

        // Configure ESP32 ADC attenuation for ACS712
        analogReadResolution(12);
        analogSetAttenuation(ADC_11db); // Full-scale voltage approx 0 - 3.3V

        // Perform zero-current offset calibration for ACS712
        calibrateACS712Zero();
    }

    void calibrateACS712Zero() {
        long sum = 0;
        for (int i = 0; i < 64; i++) {
            sum += analogRead(PIN_ACS712_ADC);
            delay(5);
        }
        float raw_avg = (float)sum / 64.0f;
        // Convert to voltage (assuming 3.3V full scale on ESP32 ADC)
        zero_current_voltage = (raw_avg / ADC_RESOLUTION) * ADC_MAX_VOLTAGE;
    }

    SensorData readAll() {
        SensorData data;
        data.is_valid = true;

        // 1. Read DS18B20 Temperature
        ds18b20.requestTemperatures();
        float tempC = ds18b20.getTempCByIndex(0);
        // Error checking for disconnected sensor (DallasTemp returns -127°C or 85°C on power-on reset)
        if (tempC == 85.0f || tempC <= -120.0f || tempC > 125.0f) {
            data.temperature = (data.temperature > 0.0f && data.temperature < 100.0f) ? data.temperature : 25.0f; // fallback nominal
        } else {
            data.temperature = tempC;
        }

        // 2. Read ACS712 Current with Over-sampling & RMS filtering
        long adc_sum = 0;
        for (int i = 0; i < ACS712_SAMPLES_COUNT; i++) {
            adc_sum += analogRead(PIN_ACS712_ADC);
            delayMicroseconds(100);
        }
        float adc_avg = (float)adc_sum / (float)ACS712_SAMPLES_COUNT;
        float measured_v = (adc_avg / ADC_RESOLUTION) * ADC_MAX_VOLTAGE;
        
        // Signal conditioning calculation:
        // Current = (Measured_Voltage - Zero_Voltage) / Sensitivity
        float calculated_curr = fabs(measured_v - zero_current_voltage) / ACS712_SENSITIVITY;
        if (calculated_curr < 0.08f) calculated_curr = 0.0f; // Noise cutoff gate
        data.current = calculated_curr;

        // 3. Read MPU6050 Accelerometer
        Wire.beginTransmission(MPU6050_ADDR);
        Wire.write(0x3B); // ACCEL_XOUT_H
        if (Wire.endTransmission(false) == 0 && Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)6) == 6) {
            int16_t ax = Wire.read() << 8 | Wire.read();
            int16_t ay = Wire.read() << 8 | Wire.read();
            int16_t az = Wire.read() << 8 | Wire.read();

            data.raw_accel_x = (float)ax / MPU_ACCEL_SCALE;
            data.raw_accel_y = (float)ay / MPU_ACCEL_SCALE;
            data.raw_accel_z = (float)az / MPU_ACCEL_SCALE;

            // Total acceleration magnitude
            float total_mag = sqrt(
                data.raw_accel_x * data.raw_accel_x +
                data.raw_accel_y * data.raw_accel_y +
                data.raw_accel_z * data.raw_accel_z
            );
            
            // Dynamic vibration magnitude = magnitude minus static gravity 1.0g
            float dynamic_vib = fabs(total_mag - 1.0f);
            
            // Smoothing filter
            vib_history[vib_idx] = dynamic_vib;
            vib_idx = (vib_idx + 1) % 10;
            float smooth_vib = 0.0f;
            for (int i = 0; i < 10; i++) smooth_vib += vib_history[i];
            data.vibration = smooth_vib / 10.0f;
        } else {
            data.raw_accel_x = 0.0f;
            data.raw_accel_y = 0.0f;
            data.raw_accel_z = 1.0f;
            data.vibration = 0.15f; // Baseline nominal
        }

        return data;
    }
};

#endif // SENSOR_MANAGER_H
