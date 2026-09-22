# VibeBot Studio — Month 1 Scaffold

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)](https://code.visualstudio.com/)
[![MAVLink](https://img.shields.io/badge/Protocol-MAVlink-00BCF2.svg)](https://mavlink.io/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)

> Live drone telemetry inside VS Code. Phase 1 of 4.

## What this is

A VS Code sidebar extension that connects to a drone or PX4/ArduPilot SITL
over MAVLink UDP and shows live telemetry — battery, GPS, attitude (with
artificial horizon), IMU, and motor PWM — without leaving your editor.

This is Month 1 of a 12-month roadmap. The AI diagnostic engine (Phase 2),
one-click deploy (Phase 3), and the full studio (Phase 4) are not here yet.

<!-- TODO: Add a screenshot or GIF of the sidebar here -->
<!-- ![VibeBot Sidebar](docs/screenshot.png) -->

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ↥ 18 | `node -v` |
| Python | ↥ 3.9 | `python3 --version` |
| pymavlink | latest | `pip install pymavlink` |
| VS Code | ↥ 1.85 | |

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/octaboomai/VibeBot.git
cd VibeBot
npm install

# 2. Install Python bridge dependency
pip install pymavlink

# 3. Build (extension + webview)
npm run build

# 4. Open in VS Code and press F5 to launch Extension Development Host
code .
```

Press **F5** → a new VS Code window opens with the extension loaded.
Click the drone icon in the activity bar → the Telemetry sidebar app appears.

---

## Testing with PX4 SITL (no hardware needed)

```bash
# Option A: PX4 SITL with Gazebo
make px4_sitl gazebo_iris        # default port: UDP 14550

# Option B: ArduPilot SITL
sim_vehicle.py -v ArduCopter    # default port: UDP 14550

# Option C: MAVLink router (pipe a real drone to your laptop over WiFi)
mavp2p udps:0.0.0.0:14550 tpc:192.168.1.100:5760
```

In the sidebar: host = `127.0.0.1`, port = `14550` → Connect.

---

## Project structure

```
vibebot-studio/
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
│  ├─ mavlink_bridge.py          MAVLink UDP → JSON stdout bridge
│  └─ requirements.txt
│
├─ webview/                      React sidebar UI (TypeScript / browser)
│  ├─ src/
│  │  ├─ App.tsx                 Root component + useReducer state
│  │  ├─ index.tsx               ReactDOM mount
│  │  ├─ vscode.ts               acquireVsCodeApi() singleton
│  │  ├─ types.ts                Webview-side type definitions
│  │  └─ components/
│  │     ├─ ConnectionBar.tsx
│  │     ├─ SystemStatus.tsx
│  │     ├─ BatteryCard.tsx
│  │     ├─ GPSCard.tsx
│  │     ├─ AttitudeCard.tsx     (includes SVG artificial horizon)
│  │     ├─ IMUCard.tsx
│  │     └─ MotorCard.tsx
│  │
│  ├─ resources/
│  │  └─ icon.svg                Activity bar icon
│  │
│  ├─ esbuild.js                 Builds extension + webview in parallel
│  ├─ package.json               Extension manifest + npm scripts
│  └─ tsconfig.json              Extension host TypeScript config
```

---

## Data flow

```
Drone / SITL
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

## VS Code settings

```jsonc
// .vscode/settings.json
{
  "vibebot.pythonPath": "python3",   // or full path if needed
  "vibebot.defaultHost": "127.0.0.1",
  "vibebot.defaultPort": 14550
}
```

---

## Month 2 checklist (next sprint)

- [ ] ROS 2 telemetry connector (rosbridge WebSocket)
- [ ] Flight log importer (pymavlink .bin / pyulog .ulg)
- [ ] Telemetry timeline view (scrollable, zoomable, event markers)
- [ ] Integrate Robot Developer Extensions (RDE) as a peer dependency
- [ ] Anomaly detection stubs (battery drain rate, IMU drift)

---

## License

Apache 2.0 — see `LICENSE`.