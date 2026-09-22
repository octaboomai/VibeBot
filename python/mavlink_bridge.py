#!/usr/bin/env python3
"""
VibeBot Studio — MAVLink Bridge v0.1.3
========================================
Spawned by the VS Code extension as a subprocess.
Connects to a drone or PX4/ArduPilot SITL over UDP MAVLink and streams
structured telemetry as newline-delimited JSON to stdout.

The extension host reads stdout line-by-line and posts each JSON object
to the webview via VS Code's postMessage API.

Supported MAVLink message types:
  HEARTBEAT, SYS_STATUS, BATTERY_STATUS, ATTITUDE,
  GPS_RAW_INT, GLOBAL_POSITION_INT, HIGHRES_IMU, RAW_IMU,
  SERVO_OUTPUT_RAW, VFR_HUD

Usage:
  python3 mavlink_bridge.py --host 127.0.0.1 --port 14550
"""

import argparse
import json
import math
import sys
import time

# ── Dependency check ──────────────────────────────────────────────────────────

try:
    from pymavlink import mavutil
except ImportError:
    _err = json.dumps({
        "type": "error",
        "data": {"message": "pymavlink not installed. Run: pip install pymavlink"},
        "ts": time.time(),
    })
    print(_err, flush=True)
    sys.exit(1)

# ── Helpers ───────────────────────────────────────────────────────────────────

GPS_FIX_LABEL = {
    0: "No GPS",
    1: "No Fix",
    2: "2D Fix",
    3: "3D Fix",
    4: "DGPS",
    5: "RTK Float",
    6: "RTK Fixed",
    7: "Static",
    8: "PPP",
}

MAV_STATE_LABEL = {
    0: "UNINIT",
    1: "BOOT",
    2: "CALIBRATING",
    3: "STANDBY",
    4: "ACTIVE",
    5: "CRITICAL",
    6: "EMERGENCY",
    7: "POWEROFF",
    8: "FLIGHT_TERM",
}

# ── PX4 mode encoding (custom_mode bits 16–23) ────────────────────────────────
PX4_MAIN_MODES = {
    0: "MANUAL",
    1: "ALTCTL",
    2: "POSCTL",
    3: "AUTO",
    4: "ACRO",
    5: "OFFBOARD",
    6: "STABILIZED",
    7: "RATTITUDE",
    8: "SIMPLE",
}

# ── ArduPilot Copter mode mapping (custom_mode integer) ───────────────────────
ARDUPILOT_COPTER_MODES = {
    0:  "STABILIZE",
    1:  "ACRO",
    2:  "ALT_HOLD",
    3:  "AUTO",
    4:  "GUIDED",
    5:  "LOITER",
    6:  "RTL",
    7:  "CIRCLE",
    9:  "LAND",
    11: "DRIFT",
    13: "SPORT",
    14: "FLIP",
    15: "AUTOTUNE",
    16: "POSHOLD",
    17: "BRAKE",
    18: "THROW",
    19: "AVOID_ADSB",
    20: "GUIDED_NOGPS",
    21: "SMART_RTL",
    22: "FLOWHOLD",
    23: "FOLLOW",
    24: "ZIGZAG",
    25: "SYSTEMID",
    26: "AUTOROTATE",
    27: "AUTO_RTL",
}

# ── ArduPilot Plane mode mapping ──────────────────────────────────────────────
ARDUPILOT_PLANE_MODES = {
    0:  "MANUAL",
    1:  "CIRCLE",
    2:  "STABILIZE",
    3:  "TRAINING",
    4:  "ACRO",
    5:  "FLY_BY_WIRE_A",
    6:  "FLY_BY_WIRE_B",
    7:  "CRUISE",
    8:  "AUTOTUNE",
    10: "AUTO",
    11: "RTL",
    12: "LOITER",
    13: "TAKEOFF",
    14: "AVOID_ADSB",
    15: "GUIDED",
    17: "QSTABILIZE",
    18: "QHOVER",
    19: "QLOITER",
    20: "QLAND",
    21: "QRTL",
    22: "QAUTOTUNE",
    23: "QACRO",
    24: "THERMAL",
}

# MAVLink vehicle type constants
MAV_TYPE_FIXED_WING     = 1
MAV_TYPE_QUADROTOR      = 2
MAV_TYPE_HELICOPTER     = 4
MAV_TYPE_TRICOPTER      = 13
MAV_TYPE_HEXAROTOR      = 13
MAV_TYPE_OCTOROTOR      = 14
MAV_TYPE_VTOL_RESERVED1 = 19

def _mode_string(mav_type: int, custom_mode: int, base_mode: int) -> str:
    """Best-effort human-readable mode string from a HEARTBEAT message.
    Handles both PX4 and ArduPilot mode encoding correctly.
    """
    # PX4 sets MAV_MODE_FLAG_CUSTOM_MODE_ENABLED and encodes mode in bits 16–23
    if base_mode & mavutil.mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED:
        main = (custom_mode >> 16) & 0xFF
        if main != 0:
            # PX4 style — non-zero main mode in upper bits
            return PX4_MAIN_MODES.get(main, f"PX4_MODE_{main}")
        else:
            # ArduPilot style — custom_mode is a flat integer
            if mav_type in (MAV_TYPE_FIXED_WING,):
                return ARDUPILOT_PLANE_MODES.get(custom_mode, f"MODE_{custom_mode}")
            else:
                # Copter, Heli, VTOL, etc.
                return ARDUPILOT_COPTER_MODES.get(custom_mode, f"MODE_{custom_mode}")

    # Fallback: decode base_mode flags
    if base_mode & mavutil.mavlink.MAV_MODE_FLAG_AUTO_ENABLED:
        return "AUTO"
    if base_mode & mavutil.mavlink.MAV_MODE_FLAG_STABILIZE_ENABLED:
        return "STABILIZE"
    if base_mode & mavutil.mavlink.MAV_MODE_FLAG_GUIDED_ENABLED:
        return "GUIDED"
    if base_mode & mavutil.mavlink.MAV_MODE_FLAG_MANUAL_INPUT_ENABLED:
        return "MANUAL"
    return "UNKNOWN"

def emit(msg_type: str, data: dict) -> None:
    """Write a single newline-terminated JSON envelope to stdout."""
    payload = json.dumps({"type": msg_type, "data": data, "ts": time.time()})
    print(payload, flush=True)

def safe_hdop(raw: int) -> float | None:
    """Convert raw HDOP/VDOP (cm units, 65535 = unknown) to float or None."""
    return round(raw / 100.0, 2) if raw != 65535 else None

def safe_vel(raw: int) -> float | None:
    """Convert cm/s to m/s; treat 65535 as unknown."""
    return round(raw / 100.0, 2) if raw != 65535 else None

# ── Main bridge loop ──────────────────────────────────────────────────────────
def run(host: str, port: int) -> None:
    conn_str = f"udpin:{host}:{port}"
    emit("status", {"message": f"Connecting — {conn_str} …"})

    try:
        mav = mavutil.mavlink_connection(
            conn_str,
            dialect="ardupilotmega",   # superset; works for PX4 too
            autoreconnect=True,
        )
    except Exception as exc:
        emit("error", {"message": f"Failed to open connection: {exc}"})
        return

    emit("status", {"message": "Waiting for heartbeat (timeout 12 s)…"})

    heartbeat = mav.wait_heartbeat(timeout=12)
    if heartbeat is None:
        emit("error", {
            "message": (
                f"No heartbeat received from {host}:{port} within 12 s. "
                "Is your drone powered on, or is PX4/ArduPilot SITL running?"
            )
        })
        emit("disconnected", {"reason": "No heartbeat"})
        return

    emit("connected", {
        "host":   host,
        "port":   port,
        "sysid":  mav.target_system,
        "compid": mav.target_component,
    })

    # Track which IMU message type the autopilot sends so we don't emit
    # both HIGHRES_IMU and RAW_IMU (prefer HIGHRES when available).
    seen_highres_imu = False

    # Track relative altitude from GLOBAL_POSITION_INT
    rel_alt_m = None

    try:
        while True:
            msg = mav.recv_match(blocking=True, timeout=5.0)
            if msg is None:
                # Timeout — send a GCS heartbeat to keep link alive
                if mav.target_system:
                    mav.mav.heartbeat_send(
                        mavutil.mavlink.MAV_TYPE_GCS,
                        mavutil.mavlink.MAV_AUTOPILOT_INVALID,
                        0, 0, 0,
                    )
                continue

            t = msg.get_type()

            # ── HEARTBEAT ────────────────────────────────────────────────────
            if t == "HEARTBEAT":
                emit("system", {
                    "armed":        bool(msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED),
                    "mode":         _mode_string(msg.type, msg.custom_mode, msg.base_mode),
                    "systemStatus": MAV_STATE_LABEL.get(msg.system_status, "UNKNOWN"),
                    "mavType":      msg.type,
                })

            # ── SYS_STATUS (battery overview) ────────────────────────────────
            elif t == "SYS_STATUS":
                emit("battery", {
                    "voltage":   round(msg.voltage_battery / 1000.0, 3),   # mV → V
                    "current":   round(msg.current_battery / 100.0, 2),    # cA → A
                    "remaining": int(msg.battery_remaining),
                    "consumed":  -1,
                })

            # ── BATTERY_STATUS (extended battery info from PX4) ───────────────
            elif t == "BATTERY_STATUS":
                valid_voltages = [v for v in msg.voltages if v != 65535]
                total_v = sum(valid_voltages) / 1000.0 if valid_voltages else 0.0
                emit("battery_detail", {
                    "id":             msg.id,
                    "voltage":        round(total_v, 3),
                    "remaining":      int(msg.battery_remaining),
                    "consumed":       int(msg.current_consumed),   # mAh
                    "energyConsumed": int(msg.energy_consumed),    # hJ
                    "temperature": (
                        round(msg.temperature / 100.0, 1)
                        if msg.temperature != 32767 else None
                    ),
                })

            # ── ATTITUDE ─────────────────────────────────────────────────────
            elif t == "ATTITUDE":
                emit("attitude", {
                    "roll":      round(math.degrees(msg.roll), 2),
                    "pitch":     round(math.degrees(msg.pitch), 2),
                    "yaw":       round(math.degrees(msg.yaw), 2),
                    "rollRate":  round(math.degrees(msg.rollspeed), 2),
                    "pitchRate": round(math.degrees(msg.pitchspeed), 2),
                    "yawRate":   round(math.degrees(msg.yawspeed), 2),
                })

            # ── GPS_RAW_INT ───────────────────────────────────────────────────
            elif t == "GPS_RAW_INT":
                emit("gps", {
                    "lat":        round(msg.lat / 1e7, 7),
                    "lon":        round(msg.lon / 1e7, 7),
                    "altMSL":     round(msg.alt / 1000.0, 2),     # mm → m (MSL)
                    "altRel":     rel_alt_m,                        # from GLOBAL_POSITION_INT
                    "fixType":    int(msg.fix_type),
                    "fixLabel":   GPS_FIX_LABEL.get(msg.fix_type, "Unknown"),
                    "satellites": int(msg.satellites_visible),
                    "hdop":       safe_hdop(msg.eph),
                    "vdop":       safe_hdop(msg.epv),
                    "speed":      safe_vel(msg.vel),
                })

            # ── GLOBAL_POSITION_INT ───────────────────────────────────────────
            elif t == "GLOBAL_POSITION_INT":
                rel_alt_m = round(msg.relative_alt / 1000.0, 2)   # cache for GPS card
                emit("position", {
                    "lat":    round(msg.lat / 1e7, 7),
                    "lon":    round(msg.lon / 1e7, 7),
                    "altMSL": round(msg.alt / 1000.0, 2),
                    "altRel": rel_alt_m,                            # above takeoff point
                    "vx":     round(msg.vx / 100.0, 2),            # cm/s → m/s
                    "vy":     round(msg.vy / 100.0, 2),
                    "vz":     round(msg.vz / 100.0, 2),
                    "hdg":    round(msg.hdg / 100.0, 1),            # cdeg → deg
                })

            # ── HIGHRES_IMU (preferred) ───────────────────────────────────────
            elif t == "HIGHRES_IMU":
                seen_highres_imu = True
                emit("imu", {
                    "xacc":        round(msg.xacc, 4),              # m/s²
                    "yacc":        round(msg.yacc, 4),
                    "zacc":        round(msg.zacc, 4),
                    "xgyro":       round(math.degrees(msg.xgyro), 3),  # rad/s → deg/s
                    "ygyro":       round(math.degrees(msg.ygyro), 3),
                    "zgyro":       round(math.degrees(msg.zgyro), 3),
                    "xmag":        round(msg.xmag, 6),
                    "ymag":        round(msg.ymag, 6),
                    "zmag":        round(msg.zmag, 6),
                    "pressure":    round(msg.abs_pressure, 2),
                    "temperature": round(msg.temperature, 1),
                })

            # ── RAW_IMU (fallback for older firmware) ─────────────────────────
            elif t == "RAW_IMU" and not seen_highres_imu:
                emit("imu", {
                    "xacc":        round(msg.xacc * 9.80665 / 1000.0, 4),
                    "yacc":        round(msg.yacc * 9.80665 / 1000.0, 4),
                    "zacc":        round(msg.zacc * 9.80665 / 1000.0, 4),
                    "xgyro":       round(math.degrees(msg.xgyro / 1000.0), 3),
                    "ygyro":       round(math.degrees(msg.ygyro / 1000.0), 3),
                    "zgyro":       round(math.degrees(msg.zgyro / 1000.0), 3),
                    "xmag":        msg.xmag,
                    "ymag":        msg.ymag,
                    "zmag":        msg.zmag,
                    "pressure":    None,
                    "temperature": None,
                })

            # ── SERVO_OUTPUT_RAW (motor PWM) ──────────────────────────────────
            elif t == "SERVO_OUTPUT_RAW":
                emit("motors", {
                    "pwm": [
                        msg.servo1_raw, msg.servo2_raw,
                        msg.servo3_raw, msg.servo4_raw,
                        msg.servo5_raw, msg.servo6_raw,
                        msg.servo7_raw, msg.servo8_raw,
                    ],
                    "port": int(msg.port),
                })

            # ── VFR_HUD (airspeed, throttle, climb rate) ─────────────────────
            elif t == "VFR_HUD":
                emit("vfr", {
                    "airspeed":    round(msg.airspeed, 2),      # m/s
                    "groundspeed": round(msg.groundspeed, 2),   # m/s
                    "heading":     int(msg.heading),             # deg 0–360
                    "throttle":    int(msg.throttle),            # % 0–100
                    "alt":         round(msg.alt, 2),            # m MSL
                    "climb":       round(msg.climb, 2),          # m/s (+ = up)
                })

    except KeyboardInterrupt:
        emit("disconnected", {"reason": "Interrupted"})
    except Exception as exc:
        emit("error",        {"message": str(exc)})
        emit("disconnected", {"reason": str(exc)})

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="VibeBot MAVLink Bridge — streams telemetry as JSON to stdout"
    )
    parser.add_argument("--host", default="127.0.0.1", help="MAVLink host IP")
    parser.add_argument("--port", type=int, default=14550, help="MAVLink UDP port")
    args = parser.parse_args()

    run(args.host, args.port)
