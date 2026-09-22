import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { TelemetryEnvelope } from '../types/telemetry';

type TelemetryListener = (msg: TelemetryEnvelope) => void;

export class MAVLinkConnector {
  private _proc?: cp.ChildProcess;
  private _emitter = new EventEmitter();
  private _connected = false;
  private _buffer = '';   // incomplete line buffer from stdout
  private readonly _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    // Prevent Node from throwing on unhandled 'error' events from the emitter
    this._emitter.setMaxListeners(20);
  }

  get isConnected(): boolean {
    return this._connected;
  }

  /** Subscribe to all telemetry messages from the bridge. */
  onTelemetry(listener: TelemetryListener): vscode.Disposable {
    this._emitter.on('telemetry', listener);
    return new vscode.Disposable(() => this._emitter.off('telemetry', listener));
  }

  /** Connect to a drone or SITL instance over UDP. Returns when first heartbeat is received. */
  async connect(host: string, port: number): Promise<void> {
    if (this._proc) {
      this.disconnect();
    }

    const pythonPath = this._getPythonPath();
    const bridgePath = path.join(this._context.extensionPath, 'python', 'mavlink_bridge.py');

    this._emit({ type: 'status', data: { message: `Starting bridge — python: ${pythonPath}` }, ts: Date.now() / 1000 });

    return new Promise<void>((resolve, reject) => {
      let resolved = false;

      const TIMEOUT_MS = 14_000;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this._proc?.kill('SIGTERM');
          reject(new Error(`Connection timed out after ${TIMEOUT_MS / 1000}s. Is the drone/SITL running at ${host}:${port}?`));
        }
      }, TIMEOUT_MS);

      try {
        this._proc = cp.spawn(pythonPath, [
          bridgePath,
          '--host', host,
          '--port', String(port),
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env },
        });
      } catch (spawnErr: unknown) {
        clearTimeout(timer);
        const msg = spawnErr instanceof Error ? spawnErr.message : String(spawnErr);
        reject(new Error(`Failed to spawn Python: ${msg}\nCheck vibebot.pythonPath in settings.`));
        return;
      }

      this._proc.stdout?.on('data', (chunk: Buffer) => {
        this._buffer += chunk.toString('utf8');
        const lines = this._buffer.split('\n');
        // Keep the last partial line in the buffer
        this._buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg = JSON.parse(trimmed) as TelemetryEnvelope;
            this._emit(msg);

            if (msg.type === 'connected' && !resolved) {
              resolved = true;
              this._connected = true;
              clearTimeout(timer);
              resolve();
            } else if ((msg.type === 'error' || msg.type === 'disconnected') && !resolved) {
              resolved = true;
              clearTimeout(timer);
              const errData = msg.data as { message?: string; reason?: string };
              reject(new Error(errData.message ?? errData.reason ?? 'Bridge reported an error'));
            }
          } catch {
            // Non-JSON line — log for debugging but don't crash
            console.warn('[VibeBot] Non-JSON from bridge:', trimmed);
          }
        }
      });

      this._proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8').trim();
        console.error('[VibeBot bridge stderr]', text);
        // Surface Python import errors prominently
        if (text.includes('ModuleNotFoundError') || text.includes('ImportError')) {
          const friendly = text.includes('pymavlink')
            ? 'pymavlink not found. Run: pip install pymavlink'
            : text;
          this._emit({ type: 'error', data: { message: friendly }, ts: Date.now() / 1000 });
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            reject(new Error(friendly));
          }
        }
      });

      this._proc.on('close', (code) => {
        const wasConnected = this._connected;
        this._connected = false;
        this._proc = undefined;
        this._buffer = '';
        this._emit({
          type: 'disconnected',
          data: { reason: `Bridge process exited (code ${code ?? 'null'})` },
          ts: Date.now() / 1000,
        });
        if (!resolved && wasConnected === false) {
          // Process died before we ever connected
          resolved = true;
          clearTimeout(timer);
          reject(new Error(`Bridge process exited before connecting (code ${code})`));
        }
      });

      this._proc.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(new Error(`Failed to start bridge: ${err.message}`));
        }
      });
    });
  }

  disconnect(): void {
    if (this._proc) {
      this._proc.kill('SIGTERM');
      // Force-kill after 2s if SIGTERM is ignored
      const proc = this._proc;
      setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 2000);
      this._proc = undefined;
    }
    this._buffer = '';
    if (this._connected) {
      this._connected = false;
      this._emit({
        type: 'disconnected',
        data: { reason: 'User disconnected' },
        ts: Date.now() / 1000,
      });
    }
  }

  dispose(): void {
    this.disconnect();
    this._emitter.removeAllListeners();
  }

  private _emit(msg: TelemetryEnvelope): void {
    this._emitter.emit('telemetry', msg);
  }

  private _getPythonPath(): string {
    const cfg = vscode.workspace.getConfiguration('vibebot');
    return cfg.get<string>('pythonPath') ?? 'python3';
  }
}
