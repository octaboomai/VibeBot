import * as vscode from 'vscode';
import type { MAVLinkConnector } from '../connectors/MAVLinkConnector';
import type { WebviewMessage } from '../types/telemetry';

export class TelemetryViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vibebot.telemetryView';

  private _view?: vscode.WebviewView;
  private _telemetrySub?: vscode.Disposable;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _connector: MAVLinkConnector,
  ) {}

  // ── VS Code lifecycle ───────────────────────────────────────────────────────

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview')],
    };

    webviewView.webview.html = this._buildHtml(webviewView.webview);

    // ── Inbound: messages from the webview ────────────────────────────────────
    webviewView.webview.onDidReceiveMessage((raw: WebviewMessage) => {
      this._handleWebviewMessage(raw);
    });

    // ── Outbound: telemetry from connector → webview ──────────────────────────
    this._telemetrySub?.dispose();
    this._telemetrySub = this._connector.onTelemetry((msg) => {
      this._post(msg);
    });

    // When the panel becomes visible again, send current connection state
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._post({ type: 'status', data: { connected: this._connector.isConnected }, ts: 0 });
      }
    });
  }

  // ── Public API (called from extension.ts command handlers) ─────────────────

  async connect(host: string, port: number): Promise<void> {
    this._post({ type: 'status', data: { message: `Connecting to ${host}:${port}…` }, ts: 0 });
    try {
      await this._connector.connect(host, port);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`VibeBot: ${msg}`);
      this._post({ type: 'error', data: { message: msg }, ts: 0 });
    }
  }

  disconnect(): void {
    this._connector.disconnect();
  }

  dispose(): void {
    this._telemetrySub?.dispose();
    this._connector.dispose();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private _handleWebviewMessage(msg: WebviewMessage): void {
    switch (msg.type) {
      case 'connect':
        void this.connect(msg.host, msg.port);
        break;
      case 'disconnect':
        this.disconnect();
        break;
      case 'ready':
        // Webview finished mounting — send current state
        this._post({
          type: 'status',
          data: { connected: this._connector.isConnected },
          ts: 0,
        });
        break;
      case 'importLog':
        // Handled by extension.ts command; shouldn't arrive here, but guard anyway
        void vscode.commands.executeCommand('vibebot.importFlightLog');
        break;
    }
  }

  private _post(msg: object): void {
    this._view?.webview.postMessage(msg);
  }

  private _buildHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'webview.js'),
    );
    // Nonce prevents inline script injection; matches the CSP below
    const nonce = randomNonce();

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource} 'unsafe-inline';
             script-src 'nonce-${nonce}';" />
  <title>VibeBot Telemetry</title>
  <style>
    html, body, #root {
      margin: 0; padding: 0;
      height: 100%;
      background: transparent;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function randomNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
