import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryReading, DeviceStatus, SystemSettings } from '../types';
import { api } from '../services/api';

const WS_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/^http/, 'ws');

export function useRealTimeTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryReading | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [recentBuffer, setRecentBuffer] = useState<TelemetryReading[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Poll fallback function if WS is disconnected
  const pollFallback = useCallback(async () => {
    try {
      const [latest, devStatus, sysSettings] = await Promise.all([
        api.getLatest(),
        api.getDeviceStatus(),
        api.getSettings()
      ]);
      if (latest) {
        setTelemetry(latest);
        setRecentBuffer(prev => [...prev.slice(-30), latest]);
      }
      setDeviceStatus(devStatus);
      setSettings(sysSettings);
    } catch (err) {
      console.warn('Fallback polling error:', err);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const socket = new WebSocket(`${WS_BASE_URL}/ws`);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet.type === 'INITIAL_STATE') {
            if (packet.data.latest) setTelemetry(packet.data.latest);
            if (packet.data.device_status) setDeviceStatus(packet.data.device_status);
            if (packet.data.settings) setSettings(packet.data.settings);
          } else if (packet.type === 'TELEMETRY_UPDATE') {
            const data: TelemetryReading = packet.data;
            setTelemetry(data);
            setRecentBuffer(prev => [...prev.slice(-30), data]);
            
            // Sync device status
            setDeviceStatus(prev => prev ? ({
              ...prev,
              last_heartbeat: data.timestamp,
              seconds_since_last_update: 0,
              is_stale: false,
              esp32_connected: true,
              relay_status: data.relay_status,
              motor_status: data.motor_status
            }) : null);
          } else if (packet.type === 'CONTROL_EVENT') {
            setDeviceStatus(prev => prev ? ({
              ...prev,
              relay_status: packet.data.relay_status,
              motor_status: packet.data.motor_status,
              emergency_stop_latched: packet.data.emergency_stop_latched
            }) : null);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (err) {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    pollFallback();
    connectWebSocket();

    // Fallback polling ticker every 2s
    const pollInterval = setInterval(() => {
      if (!isConnected) {
        pollFallback();
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket, pollFallback, isConnected]);

  return {
    telemetry,
    deviceStatus,
    settings,
    isConnected,
    recentBuffer,
    refreshState: pollFallback
  };
}
