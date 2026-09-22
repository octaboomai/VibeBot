# VibeBot Studio

[![Version](https://img.shields.io/badge/version-0.1.3-blue.svg)](https://github.com/octaboomai/VibeBot/releases)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)](https://code.visualstudio.com/)
[![MAVLink](https://img.shields.io/badge/Protocol-MAVLink-00BCF2.svg)](https://mavlink.io/)
[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/UI-React_18-61DAFB.svg)](https://react.dev/)

> **Live drone and robotics telemetry — inside VS Code. No hardware needed to get started.**

VibeBot Studio is a VS Code sidebar extension that connects to any MAVLink-compatible drone or robot — real hardware, PX4/ArduPilot SITL, or a fake telemetry script — and shows live telemetry without leaving your editor. Built for teams that write, modify, test, and debug flight software on PX4, ArduPilot, and ROS 2.

This is **Month 1 of a 4-phase roadmap** — the telemetry foundation. The AI diagnostic engine (Phase 2), one-click deploy (Phase 3), and the full studio (Phase 4) are on the roadmap below.

---

## What you get

| Panel | Data shown |
|-------|----------|
| **Battery** | Voltage, current draw, % remaining, live bar graph |
| **GPS** | Lat/lon, altitude MSL + relative, fix type, satellite count, HDOP |
| **Attitude** | Artificial horizon (SVG), roll, pitch, yaw + rates |
| **IMU** | Accelerometer (m/s²), gyroscope (°/s), magnetometer, pressure, temperature |
| **Motors** | Per-channel PWM bars for up to 8 channels |
| **VFR HUD** | Airspeed, groundspeed, heading, throttle %, climb rate |
| **System** | Armed/disarmed state, flight mode (PX4 + ArduPilot decoded), vehicle status |

---

## Install

The easiest way — no build required:

1. Download `vibebot-studio-0.1.3.vsix` from this repo (or the [full release](https://github.com/octaboomai/VibeBot/releases/tag/v0.1.3))
2. In VS Code: **Extensions** → `⋯` → **Install from VSIX…** → pick the file
3. Install the Python bridge dependency: `pip install pymavlink`

---

## Try it right now — no drone required

Test the full extension with a fake MAVLink script. No hardware, no SITL install — a complete real-time data pipeline in under 2 minutes.

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

## Build from source

```bash
# 1. Clone and install
git clone https://github.com/octaboomai/VibeBot.git
cd VibeBot
npm install

# 2. Install the Python bridge dependency
pip install pymavlink

# 3. Build (extension + webview)
npm run build

# 4. Open in VS Code and press F5 to launch the Extension Development Host
code .
```

Press **F5** → a new VS Code window opens with the extension loaded.
Click the drone icon in the activity bar → the Telemetry sidebar app appears.

---

## Simulation & real hardware

```bash
# Option A: PX4 SITL with Gazebo
make px4_sitl gazebo_iris        # default port: UDP 14550

# Option B: ArduPilot SITL
sim_vehicle.py -v ArduCopter    # default port: UDP 14550

# Option C: MAVLink router (pipe a real drone to your laptop over WiFi)
mavp2p udps:0.0.0.0:14550 tcp:192.168.1.100:5760
```

In the sidebar: host = your drone's IP, port = `14550` → Connect. Any MAVLink 1 or MAVLink 2 compatible flight controller works.

---

## Windows setup

VS Code on Windows needs to know your exact Python path:

1. Open `Ctrl+,` → search `vibebot.pythonPath`
2. Set it to your full Python path, e.g. `C:\Users\YourName\AppData\Local\Programs\Python\Python314\python.exe`
3. Reload window: `Ctrl+Shift+P` → **Developer: Reload Window**

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| VS Code | ≥ 1.136.0 | `code --version` |
| Node.js | ≥ 18 | only needed to build from source |
| Python | ≥ 3.9 | `python3 --version` |
| pymavlink | latest | `pip install pymavlink` |

---

## Project structure

```
VibeBot/
├─ src/                          Extension host (TypeScript / Node.js)
│  ├─ extension.ts               Activation, command registration
│  ├─ panels/
│  │  └─ TelemetryViewProvider.ts   Sidebar webview lifecycle
│  ├─ connectors/
│  │  └─ MAVLinkConnector.ts       Python subprocess management + IPC
│  └─ types/
│     └─ telemetry.ts             Shared type definitions
│
├─ python/
│  ├─ mavlink_bridge.py           MAVLink UDP → JSON stdout bridge
│  └─ requirements.txt
│
├─ webview/                      React sidebar UI (TypeScript / browser)
│  └─ src/
│     ├─ App.tsx                  Root component + useReducer state
│     ├─ index.tsx                ReactDOM mount
│     ├─ vscode.ts                acquireVsCodeApi() singleton
│     ├─ types.ts                 Webview-side type definitions
│     └─ components/
│        ├─ ConnectionBar.tsx
│        ├─ SystemStatus.tsx
│        ├─ BatteryCard.tsx
│        ├─ GPSCard.tsx
│        ├─ AttitudeCard.tsx      (includes SVG artificial horizon)
│        ├─ IMUCard.tsx
│        └─ MotorCard.tsx
│
├─ resources/
│  └─ icon.png                    Activity bar + marketplace icon
│
├─ esbuild.js                     Builds extension + webview in parallel
├─ package.json                    Extension manifest + npm scripts
└─ tsconfig.json                  Extension host TypeScript config
```

---

## Data flow

```
Drone / SITL / fake_drone.py
    │   UDP MAVLink (port 14550)
    ▼
python/mavlink_bridge.py         → spawned as child process
    │   JSON lines on stdout
    ▼
MAVLinkConnector.ts              → parses stdout, emits typed events
    │   postMessage()
    ▼
TelemetryViewProvider.ts         → VS Code Webview bridge
    │   window.postMessage()
    ▼
App.tsx useReducer               → dispatches telemetry actions
    │   React state
    ▼
Sidebar components               → render the data
```

---

## Settings

```jsonc
// .vscode/settings.json
{
  "vibebot.pythonPath": "python3",   // full path on Windows
  "vibebot.defaultHost": "127.0.0.1",
  "vibebot.defaultPort": 14550,
  "vibebot.telemetryRateHz": 10
}
```

---

## Roadmap

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

## Issues and feedback

Report bugs or feature requests at:
[github.com/octaboomai/VibeBot/issues](https://github.com/octaboomai/VibeBot/issues)

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
