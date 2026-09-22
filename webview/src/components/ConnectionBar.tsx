import React, { useState } from 'react';
import vscode from '../vscode';
import type { ConnectionStatus } from '../types';

interface Props {
  status: ConnectionStatus;
  connectedHost: string;
  connectedPort: number;
  error: string | null;
}

const DOT_COLOR: Record<ConnectionStatus, string> = {
  idle:       'var(--vscode-descriptionForeground)',
  connecting: 'var(--vscode-charts-yellow, #cca700)',
  connected:  'var(--vscode-charts-green,  #4ec94e)',
  error:      'var(--vscode-charts-red,    #f14c4c)',
};

export const ConnectionBar: React.FC<Props> = ({ status, connectedHost, connectedPort, error }) => {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('14550');

  const isConnected  = status === 'connected';
  const isConnecting = status === 'connecting';
  const disabled     = isConnecting;

  function handleConnect() {
    const p = parseInt(port, 10);
    if (!host.trim() || isNaN(p) || p < 1 || p > 65535) return;
    vscode.postMessage({ type: 'connect', host: host.trim(), port: p });
  }

  function handleDisconnect() {
    vscode.postMessage({ type: 'disconnect' });
  }

  // ── Input row (shown when not connected) ──────────────────────────────────
  const inputRow = (
    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
      <input
        type="text"
        value={host}
        onChange={e => setHost(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleConnect()}
        placeholder="127.0.0.1"
        disabled={disabled}
        style={{
          flex: 3,
          background: 'var(--vscode-input-background)',
          color:       'var(--vscode-input-foreground)',
          border:      '1px solid var(--vscode-input-border)',
          borderRadius: 3,
          padding:     '3px 6px',
          fontSize:    11,
          outline:     'none',
        }}
      />
      <input
        type="text"
        value={port}
        onChange={e => setPort(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleConnect()}
        placeholder="14550"
        disabled={disabled}
        style={{
          flex: 1,
          background: 'var(--vscode-input-background)',
          color:       'var(--vscode-input-foreground)',
          border:      '1px solid var(--vscode-input-border)',
          borderRadius: 3,
          padding:     '3px 6px',
          fontSize:    11,
          outline:     'none',
        }}
      />
      <button
        onClick={handleConnect}
        disabled={disabled}
        style={{
          background:    'var(--vscode-button-background)',
          color:         'var(--vscode-button-foreground)',
          border:        'none',
          borderRadius:  3,
          padding:       '3px 10px',
          fontSize:      11,
          cursor:        disabled ? 'default' : 'pointer',
          opacity:       disabled ? 0.6 : 1,
          whiteSpace:    'nowrap',
        }}
      >
        {isConnecting ? '…' : 'Connect'}
      </button>
    </div>
  );

  // ── Connected status row ──────────────────────────────────────────────────
  const connectedRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
        {connectedHost}:{connectedPort}
      </span>
      <button
        onClick={handleDisconnect}
        style={{
          background:   'transparent',
          color:        'var(--vscode-descriptionForeground)',
          border:       '1px solid var(--vscode-panel-border)',
          borderRadius: 3,
          padding:      '2px 8px',
          fontSize:     11,
          cursor:       'pointer',
        }}
      >
        Disconnect
      </button>
    </div>
  );

  return (
    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
      {/* Status indicator row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Pulsing dot */}
        <span style={{
          display:       'inline-block',
          width:         7,
          height:        7,
          borderRadius:  '50%',
          background:    DOT_COLOR[status],
          flexShrink:    0,
        }} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {isConnecting ? 'Connecting…'
           : isConnected ? 'Connected'
           : status === 'error' ? 'Connection failed'
           : 'Not connected'}
        </span>
      </div>

      {/* Error message */}
      {error && status === 'error' && (
        <div style={{
          marginTop:  4,
          fontSize:   10,
          color:      'var(--vscode-charts-red, #f14c4c)',
          lineHeight: 1.4,
          wordBreak:  'break-word',
        }}>
          {error}
        </div>
      )}

      {isConnected ? connectedRow : inputRow}
    </div>
  );
};
