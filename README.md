# VibeBot Studio

> **Live drone and robotics telemetry — inside VS Code. No hardware needed to get started.**

VibeBot Studio is an AI-powered IDE layer for drone and robotics engineers. Connect to any MAVLink-compatible drone or robot, and see live telemetry — battery, GPS, attitude, IMU, and motor PWM — without leaving your editor.

Built for teams that write, modify, test, and debug flight software on PX4, ArduPilot, and ROS 2.

---

## ✅ Try it right now — no drone required

You can test the full extension with a **fake MAVLink script** that runs on your laptop. No hardware. No SITL install. Full real-time data pipeline in under 2 minutes.

**Step 1** — Install pymavlink (one time):
```bash
pip install pymavlink
```

**Step 2** — Save this as `fake_drone.py` and run it:
```python
import time, math
from pymavlink import mavutil

conn = mavutil.mavlink_connection('udpout:127.0.0.1:14550', source_system=1)
start = time.time()
t = 0

print("Sending MAVLink telemetry to 127.0.0.1:14550 ...")
while True:
    t += 0.1
    ms = int((time.time() - start) * 1000)
    conn.mav.heartbeat_send(mavutil.mavlink.MAV_TYPE_QUADROTOR,
                            mavutil.mavlink.MAV_AUTOPILOT_ARDUPILOTMEGA, 0, 0, 0)
    conn.mav.attitude_send(ms, math.sin(t)*0.26, math.cos(t)*0.17,
                           t*0.5 % (2*math.pi), 0.01, 0.01, 0.01)
    conn.mav.gps_raw_int_send(ms, 3, int(28.6139*1e7), int(77.2090*1e7),
                               50000, 100, 100, 0, 0, 12)
    conn.mav.sys_status_send(0,0,0,500,12600,-1,75,0,0,0,0,0,0)
    time.sleep(0.1)
```

```bash
python fake_drone.py
```

**Step 3** — Click the VibeBot icon in the VS Code activity bar → connect to `127.0.0.1:14550`

All panels light up with live moving data immediately.

---

## What you get

| Panel | Data shown |
|---|---|
| **Battery** | Voltage, current draw, % remaining, live bar graph |
| **GPS** | Lat/lon, altitude MSL + relative, fix type, satellite count, HDOP |
| **Attitude** | Artificial horizon (SVG), roll, pitch, yaw + rates |
| **IMU** | Accelerometer (m/s²), gyroscope (°/s), magnetometer, pressure, temperature |
| **Motors** | Per-channel PWM bars for up to 8 channels |
| **VFR HUD** | Airspeed, groundspeed, heading, throttle %, climb rate |
| **System** | Armed/disarmed state, flight mode, vehicle status |

---

## Compatible autopilots

- **PX4** — all versions, full mode decoding
- **ArduPilot** — ArduCopter, ArduPlane, ArduRover (all flight modes decoded)
- Any MAVLink 1 or MAVLink 2 compatible flight controller

---

## Real hardware connection

Connect VS Code directly to your drone over UDP:

```
Drone WiFi / telemetry radio → UDP 14550 → VibeBot Studio
```

In the sidebar: set host to your drone's IP, port `14550` → Connect.

### PX4 SITL (full simulation)
```bash
# Docker (easiest, no install)
docker run --rm -it jonasvautherin/px4-gazebo-headless:latest

# Or build from source
make px4_sitl gazebo_iris
```

### ArduPilot SITL
```bash
sim_vehicle.py -v ArduCopter --console --map
```

Both stream MAVLink to `127.0.0.1:14550` by default.

---

## Windows setup

VS Code on Windows needs to know your exact Python path:

1. Open `Ctrl+,` → search `vibebot.pythonPath`
2. Set it to your full Python path:
   ```
   C:\Users\YourName\AppData\Local\Programs\Python\Python314\python.exe
   ```
3. Reload window: `Ctrl+Shift+P` → **Developer: Reload Window**

---

## Requirements

| Tool | Version |
|---|---|
| VS Code | ≥ 1.136.0 |
| Python | ≥ 3.9 |
| pymavlink | latest (`pip install pymavlink`) |

---

## Roadmap

This is **Month 1 of 4** — the telemetry foundation.

**Month 2 — Intelligence layer**
- [ ] Flight log importer (ArduPilot `.bin` / PX4 `.ulg`)
- [ ] Telemetry timeline — scrollable, zoomable, with event markers
- [ ] ROS 2 connector (rosbridge WebSocket)
- [ ] Anomaly detection — battery drain rate, IMU drift alerts

**Month 3 — Developer tools**
- [ ] AI code review with MAVLink/ROS context awareness
- [ ] One-click SITL launch from inside VS Code
- [ ] Performance diff — how a code change affects battery drain or motor load

**Month 4 — Full studio**
- [ ] Security audit layer for flight-critical firmware
- [ ] Team license + organisation dashboard
- [ ] Multi-vehicle support

---

## Data flow

```
Drone / SITL / fake_drone.py
        │  UDP MAVLink (port 14550)
        ▼
python/mavlink_bridge.py       ← spawned as child process
        │  JSON lines on stdout
        ▼
MAVLinkConnector.ts            ← parses stdout, emits typed events
        │  postMessage()
        ▼
TelemetryViewProvider.ts       ← VS Code WebviewView bridge
        │  window.postMessage()
        ▼
App.tsx useReducer             ← dispatches telemetry actions
        │  React state
        ▼
Sidebar components             ← render the live data
```

---

## Settings

```jsonc
{
  "vibebot.pythonPath":     "python3",     // full path on Windows
  "vibebot.defaultHost":    "127.0.0.1",
  "vibebot.defaultPort":    14550,
  "vibebot.telemetryRateHz": 10
}
```

---

## Issues and feedback

Report bugs or feature requests at:
[github.com/octaboomai/VibeBot-studio/issues](https://github.com/octaboomai/VibeBot-studio/issues)

---

## License

Apache 2.0 — see `LICENSE`.
