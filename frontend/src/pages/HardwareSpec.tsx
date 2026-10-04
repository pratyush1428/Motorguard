import React from 'react';
import { Card } from '../components/Card';
import {
  Cpu,
  BatteryCharging,
  Zap,
  Activity,
  Thermometer,
  Shield,
  Volume2,
  Tv,
  Wifi,
  Database,
  Monitor,
  AlertTriangle,
  ArrowDown
} from 'lucide-react';

export const HardwareSpec: React.FC = () => {
  const hardwareList = [
    {
      name: 'ESP32 Development Board',
      role: 'Main System Controller (Layer 1)',
      purpose: 'Reads sensors, handles local safety thresholds, drives OLED/LEDs/buzzer/relay, and broadcasts Wi-Fi telemetry to backend.',
      pins: 'I2C (GPIO 21, 22), OneWire (GPIO 4), ADC (GPIO 34), Outputs (GPIO 23, 18, 25, 26, 27, 16, 17, 14)',
      power: '3.3V Core / 5V USB'
    },
    {
      name: 'GY-521 MPU6050 Vibration Sensor',
      role: 'Dynamic Vibration & Acceleration Monitor',
      purpose: '3-axis MEMS accelerometer sampling dynamic vibration, rotor imbalance, and mechanical loose mounting.',
      pins: 'SDA (GPIO 21), SCL (GPIO 22)',
      power: '3.3V via ESP32 rail'
    },
    {
      name: 'DS18B20 Waterproof Temperature Sensor',
      role: 'Motor Thermal Monitor',
      purpose: 'Measures motor casing temperature with ±0.5°C accuracy to detect overheating and thermal buildup.',
      pins: 'DATA (GPIO 4) with 4.7kΩ pull-up resistor',
      power: '3.3V'
    },
    {
      name: 'ACS712 20A Current Sensor',
      role: 'Motor Electrical Load & Stall Monitor',
      purpose: 'Hall-effect current transducer measuring motor load in Amperes to detect mechanical stall, gear jamming, and electrical overload.',
      pins: 'VOUT (GPIO 34 / ADC1_CH6). Sensitivity: 100mV/A. Safe operating range conditioned for ESP32 ADC.',
      power: '5.0V supply'
    },
    {
      name: '12V DC Geared Motor',
      role: 'Plant Under Condition Monitoring',
      purpose: 'The monitored electromechanical actuator, running on 7.4V nominal 2S battery pack.',
      pins: 'Connected to L298N OUT1 & OUT2',
      power: 'Powered from 2S Li-ion pack (7.4V nominal)'
    },
    {
      name: 'DC-DC Boost Converter (Step-Up)',
      role: 'Voltage & Torque Step-Up Stage',
      purpose: 'Steps up 2S Li-ion battery voltage (7.4V nominal) to 12.0V DC to drive the motor at its full rated voltage and deliver maximum torque and current.',
      pins: 'VIN+ from Battery (+), VIN- to Common GND, VOUT+ (12V) to Relay COM, VOUT- to Common GND',
      power: '7.4V Input ──► 12V Output'
    },
    {
      name: 'L298N Dual H-Bridge Motor Driver',
      role: 'Motor Power Stage',
      purpose: 'Switches power and drives the DC motor with forward/reverse control and enable gate.',
      pins: 'IN1 (GPIO 16), IN2 (GPIO 17), ENA (GPIO 14)',
      power: '12V Rail from Boost Converter'
    },
    {
      name: '1-Channel 5V Relay Module',
      role: 'Safety Interlock & Emergency Disconnect',
      purpose: 'Hardware emergency shutdown switch. Isolates 12V boosted power rail from motor driver on critical fault or manual E-stop.',
      pins: 'COM from Boost VOUT+ (12V), NO to L298N (+12V terminal), IN to GPIO 23 (Active-LOW)',
      power: '5V supply'
    },
    {
      name: '0.96-Inch SSD1306 I2C OLED Display',
      role: 'Quick Local Status Display',
      purpose: 'Strictly a local status readout for an operator physically standing near the motor. Displays vibration, temp, current, status, and action.',
      pins: 'SDA (GPIO 21), SCL (GPIO 22), Address: 0x3C',
      power: '3.3V'
    },
    {
      name: '5V Active Buzzer',
      role: 'Acoustic Alert',
      purpose: 'Emits audible alert pulses during warning or critical threshold breach.',
      pins: 'Signal (+) to GPIO 18',
      power: '5V'
    },
    {
      name: 'Status LEDs (Green, Yellow, Red)',
      role: 'Visual State Annunciator',
      purpose: 'Green: Normal Operation; Yellow: Warning/Anomaly; Red: Critical Fault / E-Stop trip.',
      pins: 'Green (GPIO 27), Yellow (GPIO 26), Red (GPIO 25) with 220Ω current limiting resistors',
      power: '3.3V GPIO'
    },
    {
      name: '2S Li-ion Battery Pack (2 × 3.7V 18650)',
      role: 'Motor Power Source',
      purpose: 'Two 18650 lithium-ion cells in series delivering ~7.4V nominal (~8.4V fully charged). Safe, isolated DC power.',
      pins: 'Connected through 2-cell holder, terminal block, and Relay to L298N',
      power: '7.4V nominal (8.4V max)'
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="pb-2 border-b border-industrial-800">
        <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
          <Cpu className="h-6 w-6 text-cyan-400" />
          SYSTEM HARDWARE & ARCHITECTURE SPECIFICATION
        </h2>
        <p className="text-xs text-gray-400 font-sans mt-0.5">
          Comprehensive Bill of Materials (BOM), power system topology, and end-to-end signal flow
        </p>
      </div>

      {/* Critical Power System Callout */}
      <div className="p-4 rounded-xl bg-industrial-900 border border-emerald-500/40 flex items-start gap-3 shadow-card-dark">
        <BatteryCharging className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-gray-300 font-sans space-y-1">
          <div className="font-bold font-mono text-emerald-300 text-sm">
            POWER ARCHITECTURE: 2S Li-ion Battery Pack (7.4V) ──► DC-DC Boost Converter (12.0V)
          </div>
          <p>
            The motor system is powered by two 3.7V 18650 lithium-ion cells in series, delivering approximately <strong>7.4V nominal</strong> (8.4V fully charged). A <strong>DC-DC Boost Converter</strong> steps up this voltage to a steady <strong>12.0V DC</strong>, delivering full rated voltage, torque, and maximum current to the 12V DC motor.
          </p>
          <p className="text-gray-400">
            • Safety relay isolates battery input before the boost stage. • Common GND shared across battery, boost, driver, and ESP32.
          </p>
        </div>
      </div>

      {/* Visual End-to-End Architecture Diagram */}
      <Card title="End-to-End System Architecture Flow">
        <div className="p-6 rounded-xl bg-industrial-950 border border-industrial-800/90 font-mono text-xs text-gray-300">
          <div className="flex flex-col items-center space-y-4">
            {/* Power Stage */}
            <div className="w-full max-w-2xl p-3 rounded-lg bg-emerald-950/40 border border-emerald-600/50 flex items-center justify-between">
              <span className="font-bold text-emerald-400">2S Li-ion Battery Pack (7.4V nominal)</span>
              <span className="text-gray-400">Power Rail</span>
            </div>

            <ArrowDown className="h-4 w-4 text-emerald-400" />

            {/* Boost Converter */}
            <div className="w-full max-w-2xl p-3 rounded-lg bg-amber-950/40 border border-amber-600/50 flex items-center justify-between">
              <span className="font-bold text-amber-400">DC-DC Boost Converter (7.4V → 12.0V Step-Up)</span>
              <span className="text-gray-400">Torque & Full Current Rail</span>
            </div>

            <ArrowDown className="h-4 w-4 text-amber-400" />

            {/* Safety Relay */}
            <div className="w-full max-w-2xl p-3 rounded-lg bg-rose-950/40 border border-rose-600/50 flex items-center justify-between">
              <span className="font-bold text-rose-400">1-Channel 5V Safety Relay (GPIO 23)</span>
              <span className="text-gray-400">Hardware Interlock (Cuts 12V on E-Stop)</span>
            </div>

            <ArrowDown className="h-4 w-4 text-rose-400" />

            {/* Motor Driver & Motor */}
            <div className="w-full max-w-2xl p-3 rounded-lg bg-industrial-900 border border-industrial-700 flex items-center justify-between">
              <span className="font-bold text-white">L298N Motor Driver → 12V DC Geared Motor</span>
              <span className="text-gray-400">Electromechanical Plant</span>
            </div>

            <div className="w-full max-w-2xl border-t border-dashed border-industrial-700 my-2 text-center text-gray-500 text-[10px]">
              PHYSICAL SENSOR TRANSDUCTION
            </div>

            {/* Sensors to ESP32 */}
            <div className="w-full max-w-2xl grid grid-cols-3 gap-3">
              <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-700/50 text-center">
                <span className="text-cyan-300 font-bold block">GY-521 MPU6050</span>
                <span className="text-[10px] text-gray-400">Vibration (I2C)</span>
              </div>
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-700/50 text-center">
                <span className="text-rose-300 font-bold block">DS18B20 Probe</span>
                <span className="text-[10px] text-gray-400">Temperature (OneWire)</span>
              </div>
              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-700/50 text-center">
                <span className="text-emerald-300 font-bold block">ACS712 20A</span>
                <span className="text-[10px] text-gray-400">Current (ADC GPIO 34)</span>
              </div>
            </div>

            <ArrowDown className="h-4 w-4 text-cyan-400" />

            {/* ESP32 & Local Actuators */}
            <div className="w-full max-w-2xl p-4 rounded-xl bg-industrial-900 border-2 border-cyan-500/50 shadow-glow-cyan/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-cyan-300 text-sm">LAYER 1 — ESP32 MICROCONTROLLER</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-600 text-cyan-200">
                  Autonomous Safety
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[11px] text-center pt-2 border-t border-industrial-800">
                <span className="p-1.5 rounded bg-industrial-950 text-gray-300">0.96" OLED (0x3C)</span>
                <span className="p-1.5 rounded bg-industrial-950 text-gray-300">5V Active Buzzer</span>
                <span className="p-1.5 rounded bg-industrial-950 text-gray-300">LEDs (G, Y, R)</span>
                <span className="p-1.5 rounded bg-industrial-950 text-gray-300">Wi-Fi Client</span>
              </div>
            </div>

            <ArrowDown className="h-4 w-4 text-cyan-400" />

            {/* Layer 2 Backend */}
            <div className="w-full max-w-2xl p-3 rounded-lg bg-industrial-900 border border-industrial-700 flex items-center justify-between">
              <span className="font-bold text-white">LAYER 2 — FASTAPI BACKEND + SQLITE</span>
              <span className="text-gray-400">Validation, Analytics & WebSocket Broadcast</span>
            </div>

            <ArrowDown className="h-4 w-4 text-cyan-400" />

            {/* Layer 3 Web Software */}
            <div className="w-full max-w-2xl p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/50 flex items-center justify-between">
              <span className="font-bold text-cyan-300">LAYER 3 — REACT MONITORING SOFTWARE</span>
              <span className="text-gray-400">Dashboard, Trends, Anomaly & Risk Estimation</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Bill of Materials & Pinout Reference */}
      <Card title="Component List & Pin Interconnection Matrix">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="text-gray-400 border-b border-industrial-800 uppercase">
              <tr>
                <th className="pb-3">Component</th>
                <th className="pb-3">Subsystem Role</th>
                <th className="pb-3">ESP32 Pinout / Interconnection</th>
                <th className="pb-3">Power</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 text-gray-300">
              {hardwareList.map((hw, i) => (
                <tr key={i} className="hover:bg-industrial-850/50">
                  <td className="py-3 font-bold text-white whitespace-nowrap">{hw.name}</td>
                  <td className="py-3 text-cyan-300">{hw.role}</td>
                  <td className="py-3 text-gray-300 max-w-md">{hw.pins}</td>
                  <td className="py-3 text-emerald-400 whitespace-nowrap">{hw.power}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
