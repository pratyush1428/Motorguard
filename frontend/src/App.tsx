import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { PredictiveMaintenance } from './pages/PredictiveMaintenance';
import { FaultDetection } from './pages/FaultDetection';
import { Maintenance } from './pages/Maintenance';
import { HistoryPage } from './pages/HistoryPage';
import { HardwareSpec } from './pages/HardwareSpec';
import { SettingsPage } from './pages/SettingsPage';
import { ThemeProvider } from './context/ThemeContext';
import { useRealTimeTelemetry } from './hooks/useRealTimeTelemetry';

export function App() {
  const {
    telemetry,
    deviceStatus,
    settings,
    isConnected,
    recentBuffer,
    refreshState
  } = useRealTimeTelemetry();

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-industrial-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
        {/* Top Sticky Header */}
        <Navbar
          deviceStatus={deviceStatus}
          settings={settings}
          isWsConnected={isConnected}
          onRefresh={refreshState}
        />

        {/* Main Content Layout */}
        <div className="flex flex-1">
          {/* Left Navigation Sidebar */}
          <Sidebar
            deviceStatus={deviceStatus}
            onRefresh={refreshState}
          />

          {/* Main Router Outlet */}
          <main className="flex-1 overflow-y-auto bg-industrial-950 min-h-[calc(100vh-61px)]">
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    telemetry={telemetry}
                    deviceStatus={deviceStatus}
                    settings={settings}
                    recentBuffer={recentBuffer}
                    onRefresh={refreshState}
                  />
                }
              />
              <Route
                path="/live"
                element={
                  <LiveMonitoring
                    telemetry={telemetry}
                    settings={settings}
                  />
                }
              />
              <Route
                path="/predictive"
                element={
                  <PredictiveMaintenance
                    telemetry={telemetry}
                    settings={settings}
                  />
                }
              />
              <Route
                path="/faults"
                element={
                  <FaultDetection
                    settings={settings}
                    onRefresh={refreshState}
                  />
                }
              />
              <Route
                path="/maintenance"
                element={
                  <Maintenance
                    telemetry={telemetry}
                  />
                }
              />
              <Route
                path="/history"
                element={<HistoryPage />}
              />
              <Route
                path="/hardware"
                element={<HardwareSpec />}
              />
              <Route
                path="/settings"
                element={
                  <SettingsPage
                    settings={settings}
                    onRefresh={refreshState}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  </ThemeProvider>
  );
}

export default App;
