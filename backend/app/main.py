import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .database.schema import init_db
from .api.endpoints import router as api_router
from .services.websocket_manager import ws_manager
from .services.data_service import DataService
from .services.simulation_service import simulation_engine
from .services.device_service import DeviceService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite schema
    init_db()
    
    # Check if simulation should start on launch
    settings = DataService.get_settings()
    if settings.system_mode == "SIMULATION":
        simulation_engine.start()
    
    yield
    
    # Graceful shutdown
    simulation_engine.stop()

app = FastAPI(
    title="MotorGuard - IoT Predictive Maintenance & Condition Monitoring",
    description="Backend API and Real-Time Telemetry Engine for DC Motor Intelligent Health Monitoring",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Immediately send current state and latest reading upon connect
        latest = DataService.get_latest_data()
        device_status = DeviceService.get_status()
        settings = DataService.get_settings()
        
        init_payload = {
            "type": "INITIAL_STATE",
            "data": {
                "latest": latest,
                "device_status": device_status.model_dump(),
                "settings": settings.model_dump()
            }
        }
        await websocket.send_json(init_payload)

        # Keep connection open and listen for ping / client commands
        while True:
            data = await websocket.receive_text()
            # Respond to client ping heartbeats
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

@app.get("/")
def root():
    return {
        "system": "MotorGuard API",
        "status": "ONLINE",
        "power_specification": "2S Li-ion Battery Pack — 7.4V nominal",
        "endpoints": {
            "docs": "/docs",
            "telemetry": "/api/latest",
            "history": "/api/history",
            "health": "/api/health",
            "websocket": "/ws"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
