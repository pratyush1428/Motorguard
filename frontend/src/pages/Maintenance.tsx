import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { MaintenanceEvent, TelemetryReading } from '../types';
import { api } from '../services/api';
import { Wrench, Calendar, ClipboardCheck, Plus, CheckCircle2 } from 'lucide-react';

interface MaintenanceProps {
  telemetry: TelemetryReading | null;
}

export const Maintenance: React.FC<MaintenanceProps> = ({ telemetry }) => {
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [eventType, setEventType] = useState<string>('Visual Inspection');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [inspectionArea, setInspectionArea] = useState<string>('Motor Mounting & Coupling');
  const [notes, setNotes] = useState<string>('');

  const loadMaintenance = async () => {
    try {
      const data = await api.getMaintenance(50);
      setEvents(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMaintenance();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMaintenance({
        event_type: eventType,
        priority: priority as any,
        description: `Logged maintenance for ${inspectionArea}`,
        inspection_area: inspectionArea,
        notes: notes
      });
      setShowModal(false);
      setNotes('');
      loadMaintenance();
    } catch (err) {
      console.error(err);
    }
  };

  const urgency = telemetry?.health?.urgency ?? 'Routine';
  const recommendation = telemetry?.health?.recommendation ?? 'All systems nominal. Perform routine check.';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: Condition & Quick Add Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-industrial-800">
        <div>
          <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            MAINTENANCE & INSPECTION MANAGEMENT
          </h2>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            Predictive maintenance guidelines, inspection checklists, and field service log
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shadow-glow-cyan/30 transition-all"
        >
          <Plus className="h-4 w-4" />
          Log Maintenance Event
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card title="Maintenance Urgency">
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-mono font-bold text-white uppercase">{urgency}</span>
            <StatusBadge status={urgency === 'Immediate' ? 'CRITICAL' : urgency === 'Scheduled' ? 'WARNING' : 'HEALTHY'} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Target window: {urgency === 'Immediate' ? 'Immediate action required' : urgency === 'Scheduled' ? 'Next 24-48 Hours' : 'Monthly routine'}
          </p>
        </Card>

        <Card title="Last Servicing Date">
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <span className="text-lg font-mono font-bold text-white">2 Days Ago</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Baseline sensor calibration & coupling torque check
          </p>
        </Card>

        <Card title="Next Recommended Inspection">
          <div className="flex items-center gap-2 mt-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-400" />
            <span className="text-lg font-mono font-bold text-white">In 5 Days</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            DS18B20 thermal contact verify & ACS712 zero null check
          </p>
        </Card>
      </div>

      {/* Recommended Inspection Checklist */}
      <Card title="Subsystem Inspection Protocols" subtitle="Actionable diagnostic guidelines derived from sensor trends">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800 space-y-2">
            <div className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              1. Mechanical & Mounting
            </div>
            <p className="text-xs text-gray-300 font-sans leading-relaxed">
              If vibration increases, inspect motor mounting bolts to breadboard/chassis. Inspect geared shaft coupling for eccentric wobble or set-screw slippage.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800 space-y-2">
            <div className="text-xs font-mono font-bold text-rose-300 uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              2. Thermal & Ventilation
            </div>
            <p className="text-xs text-gray-300 font-sans leading-relaxed">
              If temperature rises, verify waterproof probe thermal bonding to motor can. Inspect for blocked ventilation, continuous duty cycle overload, or ambient heat entrapment.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800 space-y-2">
            <div className="text-xs font-mono font-bold text-emerald-300 uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              3. Electrical & Drive Circuit
            </div>
            <p className="text-xs text-gray-300 font-sans leading-relaxed">
              If current spikes, check for mechanical shaft binding or gear stall. Inspect L298N driver terminal tightness, relay contact resistance, and 2S battery pack voltage (7.4V nominal).
            </p>
          </div>
        </div>
      </Card>

      {/* Maintenance History Table */}
      <Card title="Maintenance History Log" subtitle="Audit trail of inspections and repairs">
        {events.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-gray-500 text-xs font-mono">
            No maintenance records logged.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-gray-400 border-b border-industrial-800 uppercase">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Subsystem / Area</th>
                  <th className="pb-3">Notes & Findings</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800/60 text-gray-300">
                {events.map((e, i) => (
                  <tr key={e.id || i} className="hover:bg-industrial-850/50">
                    <td className="py-3 text-gray-400 whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleDateString()} {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 font-bold text-white">{e.event_type}</td>
                    <td className="py-3"><StatusBadge status={e.priority} size="sm" /></td>
                    <td className="py-3 text-cyan-300">{e.inspection_area}</td>
                    <td className="py-3 text-gray-300 max-w-sm">{e.notes || e.description}</td>
                    <td className="py-3"><StatusBadge status={e.status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Maintenance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
              <Wrench className="h-5 w-5 text-cyan-400" />
              Log Field Maintenance Event
            </h3>
            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-gray-400 mb-1">EVENT TYPE</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-industrial-950 border border-industrial-700 rounded p-2 text-white"
                >
                  <option value="Visual Inspection">Visual Inspection</option>
                  <option value="Torque & Tightening">Torque & Tightening</option>
                  <option value="Sensor Calibration">Sensor Calibration</option>
                  <option value="Relay / Driver Test">Relay / Driver Test</option>
                  <option value="Motor Replacement">Motor Replacement</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">PRIORITY</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-industrial-950 border border-industrial-700 rounded p-2 text-white"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">INSPECTION AREA</label>
                <input
                  type="text"
                  value={inspectionArea}
                  onChange={(e) => setInspectionArea(e.target.value)}
                  className="w-full bg-industrial-950 border border-industrial-700 rounded p-2 text-white"
                  placeholder="e.g. Motor Coupling, DS18B20 Probe"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">NOTES & OBSERVATIONS</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-industrial-950 border border-industrial-700 rounded p-2 text-white"
                  placeholder="Document findings, bolt torque, visual abnormalities..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded bg-industrial-800 text-gray-300 hover:bg-industrial-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
