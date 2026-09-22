import React from 'react';
import type { IMUData } from '../types';

interface Props { data: IMUData | null }

function fmt(n: number, d = 2): string {
  return (n >= 0 ? ' ' : '') + n.toFixed(d);
}

export const IMUCard: React.FC<Props> = ({ data }) => (
  <div style={card}>
    <SectionLabel>IMU</SectionLabel>

    {data ? (
      <>
        {/* Accelerometer */}
        <div style={{ marginTop: 4 }}>
          <div style={subLabel}>Accelerometer  (m/s²)</div>
          <div style={grid3}>
            <AxisVal axis="X" value={fmt(data.xacc)} />
            <AxisVal axis="Y" value={fmt(data.yacc)} />
            <AxisVal axis="Z" value={fmt(data.zacc)} />
          </div>
        </div>

        {/* Gyroscope */}
        <div style={{ marginTop: 5 }}>
          <div style={subLabel}>Gyroscope  (°/s)</div>
          <div style={grid3}>
            <AxisVal axis="X" value={fmt(data.xgyro)} />
            <AxisVal axis="Y" value={fmt(data.ygyro)} />
            <AxisVal axis="Z" value={fmt(data.zgyro)} />
          </div>
        </div>

        {/* Temperature / pressure if available */}
        {(data.temperature !== null || data.pressure !== null) && (
          <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
            {data.temperature !== null && <Stat label="Temp" value={`${data.temperature.toFixed(1)} °C`} />}
            {data.pressure !== null    && <Stat label="Baro" value={`${data.pressure.toFixed(1)} hPa`} />}
          </div>
        )}
      </>
    ) : (
      <NoData />
    )}
  </div>
);

// ── Sub-components ────────────────────────────────────────────────────────────

const AxisVal: React.FC<{ axis: string; value: string }> = ({ axis, value }) => (
  <div>
    <span style={{ ...labelStyle, marginRight: 3 }}>{axis}</span>
    <span style={mono}>{value}</span>
  </div>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={labelStyle}>{label}</div>
    <div style={mono}>{value}</div>
  </div>
);

const NoData: React.FC = () => (
  <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginTop: 4, display: 'block' }}>
    Awaiting data…
  </span>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize:      10,
    fontWeight:    600,
    color:         'var(--vscode-descriptionForeground)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  }}>
    {children}
  </div>
);

const card: React.CSSProperties = {
  padding:      '7px 10px',
  borderBottom: '1px solid var(--vscode-panel-border)',
};

const subLabel: React.CSSProperties = {
  fontSize:      9,
  color:         'var(--vscode-descriptionForeground)',
  marginBottom:  2,
};

const grid3: React.CSSProperties = {
  display:             'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap:                 4,
};

const labelStyle: React.CSSProperties = {
  fontSize:  9,
  color:     'var(--vscode-descriptionForeground)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const mono: React.CSSProperties = {
  fontFamily: 'var(--vscode-editor-font-family, monospace)',
  fontSize:   11,
  color:      'var(--vscode-foreground)',
};
