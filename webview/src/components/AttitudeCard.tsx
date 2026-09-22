import React from 'react';
import type { AttitudeData } from '../types';

interface Props { data: AttitudeData | null }

// ── SVG Artificial Horizon ───────────────────────────────────────────────────
// roll  > 0 → right wing down  (horizon tilts CCW in display)
// pitch > 0 → nose up          (horizon moves down in display)

const ArtificialHorizon: React.FC<{ roll: number; pitch: number }> = ({ roll, pitch }) => {
  const S  = 110;                // viewBox side length
  const cx = S / 2;              // 55
  const cy = S / 2;              // 55
  const r  = S / 2 - 3;         // clip radius = 52

  // pixels per degree of pitch; clamp so horizon stays within clip circle
  const PPD = r / 35;
  const pitchPx = Math.max(-r + 4, Math.min(r - 4, pitch * PPD));

  // Tick angles for roll indicator (±30°, ±60°, ±90°)
  const rollTicks = [30, 60, 90];

  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      style={{ display: 'block' }}
      aria-label={`Artificial horizon: roll ${roll.toFixed(1)}° pitch ${pitch.toFixed(1)}°`}
    >
      <defs>
        <clipPath id="ah-clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* ── Clipped scene (sky + ground, rotated by roll, pitched) ── */}
      <g clipPath="url(#ah-clip)">
        {/* Rotate entire scene by -roll around center */}
        <g transform={`rotate(${-roll}, ${cx}, ${cy})`}>
          {/* Sky — large rect from top to horizon */}
          <rect
            x={cx - r * 3}
            y={cy - r * 3}
            width={r * 6}
            height={r * 3 + pitchPx}
            fill="#152d44"
          />
          {/* Ground — large rect from horizon to bottom */}
          <rect
            x={cx - r * 3}
            y={cy + pitchPx}
            width={r * 6}
            height={r * 3}
            fill="#3d2410"
          />
          {/* Horizon line */}
          <line
            x1={cx - r * 3} y1={cy + pitchPx}
            x2={cx + r * 3} y2={cy + pitchPx}
            stroke="rgba(255,255,255,0.75)"
            strokeWidth={1.5}
          />
          {/* Pitch ladder: ±10°, ±20° */}
          {([-20, -10, 10, 20] as const).map(deg => {
            const y   = cy + pitchPx - deg * PPD;
            const len = Math.abs(deg) >= 20 ? 18 : 12;
            return (
              <g key={deg}>
                <line
                  x1={cx - len} y1={y} x2={cx + len} y2={y}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={0.8}
                />
              </g>
            );
          })}
        </g>
      </g>

      {/* ── Fixed aircraft reference symbol ── */}
      {/* Left wing */}
      <line x1={cx - 28} y1={cy} x2={cx - 9}  y2={cy} stroke="#f5c518" strokeWidth={2.5} strokeLinecap="round" />
      {/* Right wing */}
      <line x1={cx + 9}  y1={cy} x2={cx + 28} y2={cy} stroke="#f5c518" strokeWidth={2.5} strokeLinecap="round" />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="#f5c518" />
      {/* Tail */}
      <line x1={cx} y1={cy - 5} x2={cx} y2={cy - 11} stroke="#f5c518" strokeWidth={2} strokeLinecap="round" />

      {/* ── Roll arc tick marks ── */}
      {rollTicks.map(a =>
        ([a, -a] as number[]).map(deg => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const x1  = cx + (r - 8) * Math.cos(rad);
          const y1  = cy + (r - 8) * Math.sin(rad);
          const x2  = cx + r       * Math.cos(rad);
          const y2  = cy + r       * Math.sin(rad);
          return (
            <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={deg === 90 || deg === -90 ? 1.5 : 1}
            />
          );
        })
      )}

      {/* ── Roll pointer triangle (rotates with aircraft roll) ── */}
      {(() => {
        const rad = ((-roll - 90) * Math.PI) / 180;
        // Tip of triangle (closer to center)
        const tx  = cx + (r - 11) * Math.cos(rad);
        const ty  = cy + (r - 11) * Math.sin(rad);
        // Base left and right (on the ring)
        const lx  = cx + (r - 3) * Math.cos(rad - 0.22);
        const ly  = cy + (r - 3) * Math.sin(rad - 0.22);
        const rx2 = cx + (r - 3) * Math.cos(rad + 0.22);
        const ry  = cy + (r - 3) * Math.sin(rad + 0.22);
        return (
          <polygon
            points={`${tx},${ty} ${lx},${ly} ${rx2},${ry}`}
            fill="rgba(255,255,255,0.75)"
          />
        );
      })()}

      {/* ── Outer ring ── */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1.2}
      />
    </svg>
  );
};

// ── AttitudeCard ─────────────────────────────────────────────────────────────

export const AttitudeCard: React.FC<Props> = ({ data }) => {
  return (
    <div style={card}>
      <SectionLabel>Attitude</SectionLabel>

      {data ? (
        <>
          {/* Artificial horizon centered */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <ArtificialHorizon roll={data.roll} pitch={data.pitch} />
          </div>

          {/* Euler angles row */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 5 }}>
            <Stat label="Roll"  value={`${data.roll.toFixed(1)}°`}  />
            <Stat label="Pitch" value={`${data.pitch.toFixed(1)}°`} />
            <Stat label="Yaw"   value={`${data.yaw.toFixed(1)}°`}   />
          </div>

          {/* Angular rates row */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 3 }}>
            <Stat label="Ṙ" value={`${data.rollRate.toFixed(1)}°/s`}  dim />
            <Stat label="Ṗ" value={`${data.pitchRate.toFixed(1)}°/s`} dim />
            <Stat label="Ẏ" value={`${data.yawRate.toFixed(1)}°/s`}   dim />
          </div>
        </>
      ) : (
        <NoData />
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const Stat: React.FC<{ label: string; value: string; dim?: boolean }> = ({ label, value, dim }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={labelStyle}>{label}</div>
    <div style={{
      ...mono,
      fontSize: dim ? 10 : 12,
      color: dim ? 'var(--vscode-descriptionForeground)' : 'var(--vscode-foreground)',
    }}>
      {value}
    </div>
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
