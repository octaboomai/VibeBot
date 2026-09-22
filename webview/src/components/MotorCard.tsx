import React from 'react';
import type { MotorData } from '../types';

interface Props { data: MotorData | null }

const PWM_MIN = 1000;
const PWM_MAX = 2000;

function pwmPct(pwm: number): number {
  return Math.max(0, Math.min(100, ((pwm - PWM_MIN) / (PWM_MAX - PWM_MIN)) * 100));
}

function pwmColor(pwm: number): string {
  const pct = pwmPct(pwm);
  if (pct > 75) return 'var(--vscode-charts-red,    #f14c4c)';
  if (pct > 40) return 'var(--vscode-charts-yellow, #cca700)';
  return                 'var(--vscode-charts-green, #4ec94e)';
}

const MotorBar: React.FC<{ index: number; pwm: number }> = ({ index, pwm }) => {
  const isOff = pwm < 900;
  const pct   = isOff ? 0 : pwmPct(pwm);
  const color = isOff ? 'var(--vscode-panel-border)' : pwmColor(pwm);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 16 }}>
      {/* Channel label */}
      <span style={{
        ...mono,
        fontSize:   9,
        color:      'var(--vscode-descriptionForeground)',
        width:      16,
        flexShrink: 0,
        textAlign:  'right',
      }}>
        M{index + 1}
      </span>

      {/* Bar track */}
      <div style={{
        flex:         1,
        height:       5,
        background:   'var(--vscode-panel-border)',
        borderRadius: 3,
        overflow:     'hidden',
      }}>
        <div style={{
          width:        `${pct}%`,
          height:       '100%',
          background:   color,
          borderRadius: 3,
          transition:   'width 0.15s ease',
        }} />
      </div>

      {/* µs value */}
      <span style={{
        ...mono,
        fontSize:   9,
        color:      isOff ? 'var(--vscode-panel-border)' : 'var(--vscode-foreground)',
        width:      32,
        flexShrink: 0,
        textAlign:  'right',
      }}>
        {isOff ? '—' : `${pwm}`}
      </span>
    </div>
  );
};

export const MotorCard: React.FC<Props> = ({ data }) => {
  // Figure out how many channels have non-zero PWM so we can decide what to show
  const channels = data?.pwm ?? Array(8).fill(0);
  const activeCount = channels.filter(p => p >= 900).length;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel>Motors (PWM µs)</SectionLabel>
        {data && (
          <span style={{ fontSize: 9, color: 'var(--vscode-descriptionForeground)' }}>
            {activeCount} active
          </span>
        )}
      </div>

      {data ? (
        <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {channels.map((pwm, i) => (
            <MotorBar key={i} index={i} pwm={pwm} />
          ))}
        </div>
      ) : (
        <NoData />
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

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

const mono: React.CSSProperties = {
  fontFamily: 'var(--vscode-editor-font-family, monospace)',
  color:      'var(--vscode-foreground)',
};
