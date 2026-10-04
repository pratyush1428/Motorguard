from .connection import get_db

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Sensor Readings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                temperature REAL NOT NULL,
                current REAL NOT NULL,
                vibration REAL NOT NULL,
                raw_vib_x REAL,
                raw_vib_y REAL,
                raw_vib_z REAL,
                motor_status TEXT NOT NULL,
                relay_status TEXT NOT NULL,
                is_simulated INTEGER NOT NULL DEFAULT 0
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON sensor_readings(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_readings_device ON sensor_readings(device_id);")

        # Health Evaluations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS health_evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reading_id INTEGER,
                timestamp TEXT NOT NULL,
                health_score REAL NOT NULL,
                health_status TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                risk_reasons TEXT NOT NULL,
                urgency TEXT NOT NULL,
                recommendation TEXT NOT NULL,
                observation TEXT NOT NULL,
                rate_of_change_temp REAL DEFAULT 0,
                rate_of_change_current REAL DEFAULT 0,
                rate_of_change_vib REAL DEFAULT 0,
                anomalies_detected TEXT,
                FOREIGN KEY (reading_id) REFERENCES sensor_readings(id) ON DELETE SET NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_health_timestamp ON health_evaluations(timestamp);")

        # Fault Records table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fault_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                fault_name TEXT NOT NULL,
                severity TEXT NOT NULL,
                sensor TEXT NOT NULL,
                current_value REAL NOT NULL,
                threshold REAL NOT NULL,
                duration_seconds REAL NOT NULL,
                reason TEXT NOT NULL,
                recommended_action TEXT NOT NULL,
                is_resolved INTEGER NOT NULL DEFAULT 0
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_faults_timestamp ON fault_records(timestamp);")

        # Alert Events table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alert_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                severity TEXT NOT NULL,
                parameter TEXT NOT NULL,
                value REAL NOT NULL,
                threshold REAL NOT NULL,
                duration TEXT NOT NULL,
                reason TEXT NOT NULL,
                recommended_action TEXT NOT NULL,
                acknowledged INTEGER NOT NULL DEFAULT 0
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alert_events(timestamp);")

        # Maintenance Events table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                priority TEXT NOT NULL,
                description TEXT NOT NULL,
                inspection_area TEXT NOT NULL,
                notes TEXT,
                status TEXT NOT NULL DEFAULT 'OPEN'
            );
        """)

        # Control & Safety Events table (Emergency Stops, Relay trips, Manual resets)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS control_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                command TEXT NOT NULL,
                source TEXT NOT NULL,
                previous_state TEXT,
                new_state TEXT,
                reason TEXT
            );
        """)

        # System Settings table (Key/Value JSON storage)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)

        # Device State table (Tracks ESP32 status, heartbeat, latch state)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS device_state (
                device_id TEXT PRIMARY KEY,
                last_heartbeat TEXT,
                is_connected INTEGER DEFAULT 0,
                emergency_stop_latched INTEGER DEFAULT 0,
                relay_state TEXT DEFAULT 'ACTIVE',
                motor_state TEXT DEFAULT 'RUNNING',
                ip_address TEXT,
                firmware_version TEXT DEFAULT '1.0.0'
            );
        """)

        # Seed initial device state if empty
        cursor.execute("SELECT COUNT(*) FROM device_state WHERE device_id = 'MOTOR-001'")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO device_state (device_id, last_heartbeat, is_connected, emergency_stop_latched, relay_state, motor_state)
                VALUES ('MOTOR-001', datetime('now'), 1, 0, 'ACTIVE', 'RUNNING');
            """)

        # Seed initial maintenance sample log if empty
        cursor.execute("SELECT COUNT(*) FROM maintenance_events")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO maintenance_events (timestamp, event_type, priority, description, inspection_area, notes, status)
                VALUES (datetime('now', '-2 days'), 'Routine Check', 'LOW', 'Baseline sensor calibration & coupling inspection', 'Motor Shaft & Mount', 'Mounting bolts torqued, sensor baseline zeroed.', 'RESOLVED');
            """)
