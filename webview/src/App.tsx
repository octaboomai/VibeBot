import React, { useEffect, useReducer } from 'react';
import vscode from './vscode';
import type { AppState, AppAction } from './types';
import { ConnectionBar } from './components/ConnectionBar';
import { SystemStatus }  from './components/SystemStatus';
import { BatteryCard }   from './components/BatteryCard';
import { GPSCard }       from './components/GPSCard';
import { AttitudeCard }  from './components/AttitudeCard';
import { IMUCard }       from './components/IMUCard';
import { MotorCard }     from './components/MotorCard';

// ── Initial state ─────────────────────────────────────────────────────────────

const INIT: AppState = {
  status:        'idle',
  statusMsg:     '',
  error:         null,
  connectedHost: '127.0.0.1',
  connectedPort: 14550,
  connectedAt:   null,
  telemetry: {
    battery:  null,
    attitude: null,
    gps:      null,
    position: null,
    imu:      null,
    motors:   null,
    vfr:      null,
    system:   null,
  },
};

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CONNECTING':
      return {
        ...state,
        status:        'connecting',
        error:         null,
        connectedHost: action.host,
        connectedPort: action.port,
        connectedAt:   null,
      };

    case 'CONNECTED':
      return {
        ...state,
        status:        'connected',
        error:         null,
        connectedHost: action.host,
        connectedPort: action.port,
        connectedAt:   Date.now(),
      };

    case 'DISCONNECTED':
      return {
        ...INIT,
        status:   'idle',
        statusMsg: action.reason,
      };

    case 'ERROR':
      return {
        ...state,
        status: 'error',
        error:  action.message,
        connectedAt: null,
      };

    case 'STATUS':
      return {
        ...state,
        // If the extension says we're already connected on startup (retained context)
        ...(action.connected && state.status !== 'connected'
          ? { status: 'connected', connectedAt: state.connectedAt ?? Date.now() }
          : {}),
        ...(action.message ? { statusMsg: action.message } : {}),
      };

    case 'TELEMETRY_BATTERY':
      return { ...state, telemetry: { ...state.telemetry, battery: action.data } };
    case 'TELEMETRY_ATTITUDE':
      return { ...state, telemetry: { ...state.telemetry, attitude: action.data } };
    case 'TELEMETRY_GPS':
      return { ...state, telemetry: { ...state.telemetry, gps: action.data } };
    case 'TELEMETRY_POSITION':
      return { ...state, telemetry: { ...state.telemetry, position: action.data } };
    case 'TELEMETRY_IMU':
      return { ...state, telemetry: { ...state.telemetry, imu: action.data } };
    case 'TELEMETRY_MOTORS':
      return { ...state, telemetry: { ...state.telemetry, motors: action.data } };
    case 'TELEMETRY_VFR':
      return { ...state, telemetry: { ...state.telemetry, vfr: action.data } };
    case 'TELEMETRY_SYSTEM':
      return { ...state, telemetry: { ...state.telemetry, system: action.data } };

    default:
      return state;
  }
}

// ── Message → Action mapper ───────────────────────────────────────────────────
// Maps raw JSON envelopes from the extension host into typed Redux actions.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function msgToAction(msg: any): AppAction | null {
  switch (msg.type) {
    case 'connected':
      return { type: 'CONNECTED', host: msg.data?.host ?? '?', port: msg.data?.port ?? 0 };
    case 'disconnected':
      return { type: 'DISCONNECTED', reason: msg.data?.reason ?? 'Disconnected' };
    case 'error':
      return { type: 'ERROR', message: msg.data?.message ?? 'Unknown error' };
    case 'status':
      return { type: 'STATUS', connected: !!msg.data?.connected, message: msg.data?.message };
    case 'battery':
      return { type: 'TELEMETRY_BATTERY', data: msg.data };
    case 'attitude':
      return { type: 'TELEMETRY_ATTITUDE', data: msg.data };
    case 'gps':
      return { type: 'TELEMETRY_GPS', data: msg.data };
    case 'position':
      return { type: 'TELEMETRY_POSITION', data: msg.data };
    case 'imu':
      return { type: 'TELEMETRY_IMU', data: msg.data };
    case 'motors':
      return { type: 'TELEMETRY_MOTORS', data: msg.data };
    case 'vfr':
      return { type: 'TELEMETRY_VFR', data: msg.data };
    case 'system':
      return { type: 'TELEMETRY_SYSTEM', data: msg.data };
    // battery_detail: merge into battery for now (Phase 2 will split this out)
    case 'battery_detail':
      // Only update remaining/consumed; don't clobber voltage/current from SYS_STATUS
      return null;
    default:
      return null;
  }
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const { status, error, connectedHost, connectedPort, connectedAt, telemetry } = state;

  // ── Listen for messages from the extension host ────────────────────────────
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg?.type) return;
      const action = msgToAction(msg);
      if (action) dispatch(action);
    }
    window.addEventListener('message', onMessage);
    // Tell the extension we're mounted and ready
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const isConnected = status === 'connected';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      height:         '100%',
      overflow:       'hidden',
      background:     'var(--vscode-sideBar-background)',
    }}>
      {/* ── Always-visible connection bar ── */}
      <ConnectionBar
        status={status}
        connectedHost={connectedHost}
        connectedPort={connectedPort}
        error={error}
      />

      {/* ── Scrollable telemetry area ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {isConnected ? (
          <>
            <SystemStatus
              system={telemetry.system}
              vfr={telemetry.vfr}
              connectedAt={connectedAt}
            />
            <BatteryCard  data={telemetry.battery}  />
            <GPSCard      gps={telemetry.gps} position={telemetry.position} />
            <AttitudeCard data={telemetry.attitude} />
            <IMUCard      data={telemetry.imu}      />
            <MotorCard    data={telemetry.motors}   />
          </>
        ) : (
          <EmptyState status={status} />
        )}
      </div>
    </div>
  );
}

// ── Empty / connecting state ──────────────────────────────────────────────────

const EmptyState: React.FC<{ status: string }> = ({ status }) => (
  <div style={{
    padding:    24,
    textAlign:  'center',
    color:      'var(--vscode-descriptionForeground)',
  }}>
    {status === 'connecting' ? (
      <>
        <div style={{ fontSize: 13, marginBottom: 8 }}>Connecting…</div>
        <div style={{ fontSize: 11 }}>
          Waiting for heartbeat from drone or SITL.
        </div>
      </>
    ) : (
      <>
        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>✈</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          No drone connected
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
          Enter the IP and port above, then click <b>Connect</b>.
          <br /><br />
          For PX4/ArduPilot SITL use:
          <br />
          <code style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)' }}>
            127.0.0.1 : 14550
          </code>
        </div>
      </>
    )}
  </div>
);
