import React, { useEffect, useState } from 'react';
import type { SystemData, VFRData } from '../types';

interface Props {
  system:     SystemData | null;
  vfr:        VFRData | null;
  connectedAt: number | null;
}

function fmtUptime(startMs: number): string {
  const s = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function fmtNum(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export const SystemStatus: React.FC<Props> = ({ system, vfr, connectedAt }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const armed = system?.armed ?? false;

  const label: React.CSSProperties = {
    fontSize:    10,
    color:       'var(--vscode-descriptionForeground)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  };

  const val: React.CSSProperties = {
    fontFamily: 'var(--vscode-editor-font-family, monospace)',
    fontSize:   12,
    color:      'var(--vscode-foreground)',
  };

  return (
    <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
      {/* Armed / Mode / Uptime row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Armed badge */}
        <span style={{
          padding:      '1px 7px',
          borderRadius: 2,
          fontSize:     11,
          fontWeight:   700,
          background:   armed
            ? 'var(--vscode-charts-red,   #c72e2e)'
            : 'var(--vscode-charts-green, #1e6e1e)',
          color:        '#fff',
          letterSpacing: '0.06em',
        }}>
          {armed ? 'ARMED' : 'DISARMED'}
        </span>

        {/* Mode */}
        {system && (
          <span style={{ ...val, fontWeight: 600, fontSize: 11 }}>
            {system.mode}
          </span>
        )}

        {/* Uptime — right-aligned */}
        {connectedAt && (
          <span style={{ ...label, marginLeft: 'auto', fontSize: 10 }}>
            {fmtUptime(connectedAt)}
          </span>
        )}
      </div>

      {/* VFR HUD strip (only when we have data) */}
      {vfr && (
        <div style={{
          display:   'flex',
          gap:       10,
          marginTop: 5,
          flexWrap:  'wrap',
        }}>
          <Cell label="GS"  value={`${fmtNum(vfr.groundspeed)} m/s`} />
          <Cell label="ALT" value={`${fmtNum(vfr.alt)} m`} />
          <Cell label="CLB" value={`${vfr.climb >= 0 ? '+' : ''}${fmtNum(vfr.climb)} m/s`} />
          <Cell label="HDG" value={`${vfr.heading}°`} />
          <Cell label="THR" value={`${vfr.throttle}%`} />
        </div>
      )}

      {/* System status sub-label */}
      {system && system.systemStatus !== 'ACTIVE' && (
        <div style={{ ...label, marginTop: 3, color: 'var(--vscode-charts-yellow, #cca700)' }}>
          {system.systemStatus}
        </div>
      )}
    </div>
  );
};

const Cell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={{
      fontSize:      9,
      color:         'var(--vscode-descriptionForeground)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {label}
    </div>
    <div style={{
      fontFamily: 'var(--vscode-editor-font-family, monospace)',
      fontSize:   11,
      color:      'var(--vscode-foreground)',
      lineHeight: 1.2,
    }}>
      {value}
    </div>
  </div>
);
