// ─────────────────────────────────────────────────────────────────────────────
// VibeBot Studio — Shared telemetry type definitions
// Used by: extension host, webview (via copy in webview/src/types.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface BatteryData {
  voltage: number;      // Volts
  current: number;      // Amperes
  remaining: number;    // Percentage 0-100
  consumed: number;     // mAh (−1 if unavailable)
}

export interface AttitudeData {
  roll: number;       // degrees, positive = right wing down
  pitch: number;      // degrees, positive = nose up
  yaw: number;        // degrees, 0 = north, clockwise
  rollRate: number;   // degrees/s
  pitchRate: number;  // degrees/s
  yawRate: number;    // degrees/s
}

export interface GPSData {
  lat: number;          // decimal degrees
  lon: number;          // decimal degrees
  alt: number;          // metres MSL
  fixType: number;      // 0=none,2=2D,3=3D,4=DGPS,5=RTK float,6=RTK fixed
  fixLabel: string;
  satellites: number;
  hdop: number | null;  // null = unavailable
  vdop: number | null;
  speed: number | null; // m/s ground speed
}

export interface PositionData {
  lat: number;
  lon: number;
  alt: number;      // MSL metres
  relAlt: number;   // AGL metres
  vx: number;       // m/s (North)
  vy: number;       // m/s (East)
  vz: number;       // m/s (Down)
  hdg: number;      // degrees
}

export interface IMUData {
  xacc: number;   // m/s² accelerometer
  yacc: number;
  zacc: number;
  xgyro: number;  // degrees/s gyroscope
  ygyro: number;
  zgyro: number;
  xmag: number;   // raw magnetometer
  ymag: number;
  zmag: number;
  pressure: number | null;    // hPa
  temperature: number | null; // °C
}

export interface MotorData {
  pwm: number[];  // 8 channels, µs (1000=min, 1500=mid, 2000=max)
  port: number;
}

export interface VFRData {
  airspeed: number;    // m/s
  groundspeed: number; // m/s
  heading: number;     // degrees
  throttle: number;    // percentage 0-100
  alt: number;         // m
  climb: number;       // m/s (positive = climbing)
}

export interface SystemData {
  armed: boolean;
  mode: string;
  systemStatus: string;
  mavType: number;
}

// ─── Messages flowing FROM Python bridge → extension host → webview ──────────

export type TelemetryMessageType =
  | 'battery'
  | 'attitude'
  | 'gps'
  | 'position'
  | 'imu'
  | 'motors'
  | 'vfr'
  | 'system'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'status'
  | 'battery_detail';

export interface TelemetryEnvelope {
  type: TelemetryMessageType;
  data: unknown;
  ts: number; // Unix timestamp from Python
}

// ─── Messages flowing FROM webview → extension host ──────────────────────────

export type WebviewMessage =
  | { type: 'connect'; host: string; port: number }
  | { type: 'disconnect' }
  | { type: 'ready' }
  | { type: 'importLog'; path: string };
