import React from 'react';
import type { GPSData, PositionData } from '../types';

interface Props {
  gps:      GPSData      | null;
  position: PositionData | null;
}

function fixColor(fixType: number): string {
  if (fixType >= 5) return 'var(--vscode-charts-green, #4ec94e)';
  if (fixType >= 3) return 'var(--vscode-charts-green, #4ec94e)';
  if (fixType === 2) return 'var(--vscode-charts-yellow, #cca700)';
  return 'var(--vscode-charts-red, #f14c4c)';
}

export const GPSCard: React.FC<Props> = ({ gps, position }) => {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel>GPS</SectionLabel>
        {gps && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Fix type badge */}
            <span style={{
              fontSize:     10,
              fontWeight:   700,
              color:        fixColor(gps.fixType),
              border:       `1px solid ${fixColor(gps.fixType)}`,
              borderRadius: 2,
              padding:      '0px 5px',
            }}>
              {gps.fixLabel}
            </span>
            {/* Satellites */}
            <span style={{ ...mono, fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
              {gps.satellites} sat{gps.satellites !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {gps ? (
        <>
          {/* Lat / Lon */}
          <div style={{ display: 'flex', gap: 10, marginTop: 5 }}>
            <Stat label="Lat" value={gps.lat.toFixed(6)} />
            <Stat label="Lon" value={gps.lon.toFixed(6)} />
          </div>

          {/* Altitude row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Stat label="MSL" value={`${gps.alt.toFixed(1)} m`} />
            {position && <Stat label="AGL" value={`${position.relAlt.toFixed(1)} m`} />}
            {gps.hdop !== null && <Stat label="HDOP" value={gps.hdop.toFixed(2)} />}
            {gps.speed !== null && <Stat label="GS" value={`${gps.speed.toFixed(1)} m/s`} />}
          </div>
        </>
      ) : (
        <NoData />
      )}
    </div>
  );
};

// ── Shared sub-components ────────────────────────────────────────────────────

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

const labelStyle: React.CSSProperties = {
  fontSize:      9,
  color:         'var(--vscode-descriptionForeground)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const mono: React.CSSProperties = {
  fontFamily: 'var(--vscode-editor-font-family, monospace)',
  fontSize:   12,
  color:      'var(--vscode-foreground)',
  lineHeight: 1.3,
};
