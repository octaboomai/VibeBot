import React from 'react';
import type { BatteryData } from '../types';

interface Props { data: BatteryData | null }

function barColor(pct: number): string {
  if (pct > 50) return 'var(--vscode-charts-green, #4ec94e)';
  if (pct > 20) return 'var(--vscode-charts-yellow, #cca700)';
  return 'var(--vscode-charts-red, #f14c4c)';
}

export const BatteryCard: React.FC<Props> = ({ data }) => {
  const pct = data?.remaining ?? 0;
  const color = barColor(pct);

  return (
    <div style={card}>
      <SectionLabel>Battery</SectionLabel>

      {data ? (
        <>
          {/* Percentage + bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{
              flex: 1,
              height: 6,
              background: 'var(--vscode-panel-border)',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                width:        `${Math.max(0, Math.min(100, pct))}%`,
                height:       '100%',
                background:   color,
                borderRadius: 3,
                transition:   'width 0.4s ease',
              }} />
            </div>
            <span style={{ ...mono, fontSize: 13, fontWeight: 700, color }}>
              {pct}%
            </span>
          </div>

          {/* Voltage / current row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <Stat label="Voltage" value={`${data.voltage.toFixed(2)} V`} />
            <Stat label="Current" value={`${data.current.toFixed(1)} A`} />
            {data.consumed >= 0 && (
              <Stat label="Used" value={`${data.consumed} mAh`} />
            )}
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
  fontSize:  9,
  color:     'var(--vscode-descriptionForeground)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const mono: React.CSSProperties = {
  fontFamily: 'var(--vscode-editor-font-family, monospace)',
  fontSize:   12,
  color:      'var(--vscode-foreground)',
  lineHeight: 1.3,
};
