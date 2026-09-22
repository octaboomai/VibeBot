// ─────────────────────────────────────────────────────────────────────────────
// Webview telemetry types — mirrors src/types/telemetry.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface BatteryData {
  voltage: number;
  current: number;
  remaining: number;
  consumed: number;
}

export interface AttitudeData {
  roll: number;
  pitch: number;
  yaw: number;
  rollRate: number;
  pitchRate: number;
  yawRate: number;
}

export interface GPSData {
  lat: number;
  lon: number;
  alt: number;
  fixType: number;
  fixLabel: string;
  satellites: number;
  hdop: number | null;
  vdop: number | null;
  speed: number | null;
}

export interface PositionData {
  lat: number;
  lon: number;
  alt: number;
  relAlt: number;
  vx: number;
  vy: number;
  vz: number;
  hdg: number;
}

export interface IMUData {
  xacc: number;
  yacc: number;
  zacc: number;
  xgyro: number;
  ygyro: number;
  zgyro: number;
  xmag: number;
  ymag: number;
  zmag: number;
  pressure: number | null;
  temperature: number | null;
}

export interface MotorData {
  pwm: number[];
  port: number;
}

export interface VFRData {
  airspeed: number;
  groundspeed: number;
  heading: number;
  throttle: number;
  alt: number;
  climb: number;
}

export interface SystemData {
  armed: boolean;
  mode: string;
  systemStatus: string;
  mavType: number;
}

// ── App state types ───────────────────────────────────────────────────────────

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface AppState {
  status: ConnectionStatus;
  statusMsg: string;
  error: string | null;
  connectedHost: string;
  connectedPort: number;
  connectedAt: number | null;
  telemetry: {
    battery:  BatteryData | null;
    attitude: AttitudeData | null;
    gps:      GPSData | null;
    position: PositionData | null;
    imu:      IMUData | null;
    motors:   MotorData | null;
    vfr:      VFRData | null;
    system:   SystemData | null;
  };
}

export type AppAction =
  | { type: 'CONNECTING';   host: string; port: number }
  | { type: 'CONNECTED';    host: string; port: number }
  | { type: 'DISCONNECTED'; reason: string }
  | { type: 'ERROR';        message: string }
  | { type: 'STATUS';       connected: boolean; message?: string }
  | { type: 'TELEMETRY_BATTERY';  data: BatteryData }
  | { type: 'TELEMETRY_ATTITUDE'; data: AttitudeData }
  | { type: 'TELEMETRY_GPS';      data: GPSData }
  | { type: 'TELEMETRY_POSITION'; data: PositionData }
  | { type: 'TELEMETRY_IMU';      data: IMUData }
  | { type: 'TELEMETRY_MOTORS';   data: MotorData }
  | { type: 'TELEMETRY_VFR';      data: VFRData }
  | { type: 'TELEMETRY_SYSTEM';   data: SystemData };
