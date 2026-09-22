import * as vscode from 'vscode';
import { TelemetryViewProvider } from './panels/TelemetryViewProvider';
import { MAVLinkConnector } from './connectors/MAVLinkConnector';

export function activate(context: vscode.ExtensionContext): void {
  console.log('[VibeBot Studio] Activating…');

  // ── Core objects ─────────────────────────────────────────────────────────────
  const connector = new MAVLinkConnector(context);
  const provider  = new TelemetryViewProvider(context.extensionUri, connector);

  // ── Register sidebar view ────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      TelemetryViewProvider.viewType,
      provider,
      {
        // Keep the webview alive even when the sidebar is hidden so telemetry
        // doesn't stall every time the user switches panels.
        webviewOptions: { retainContextWhenHidden: true },
      },
    ),
    provider,
  );

  // ── Command: Connect via MAVLink ─────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('vibebot.connectMAVLink', async () => {
      const cfg = vscode.workspace.getConfiguration('vibebot');

      const host = await vscode.window.showInputBox({
        title:       'VibeBot — Connect to Drone',
        prompt:      'Drone IP address (or 127.0.0.1 for SITL)',
        value:       cfg.get<string>('defaultHost') ?? '127.0.0.1',
        placeHolder: '192.168.1.100',
        ignoreFocusOut: true,
      });
      if (host === undefined) return;

      const portStr = await vscode.window.showInputBox({
        title:       'VibeBot — MAVLink Port',
        prompt:      'UDP port (14550 = QGroundControl default, 14560 = second SITL instance)',
        value:       String(cfg.get<number>('defaultPort') ?? 14550),
        ignoreFocusOut: true,
        validateInput: (v) => (isNaN(parseInt(v, 10)) ? 'Must be a number' : null),
      });
      if (portStr === undefined) return;

      await provider.connect(host.trim(), parseInt(portStr, 10));
    }),
  );

  // ── Command: Disconnect ──────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('vibebot.disconnect', () => {
      provider.disconnect();
    }),
  );

  // ── Command: Import flight log ───────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('vibebot.importFlightLog', async () => {
      const uris = await vscode.window.showOpenDialog({
        title:   'Select flight log',
        filters: {
          'Flight Logs': ['bin', 'ulg'],
          'ArduPilot (.bin)': ['bin'],
          'PX4 ULog (.ulg)':  ['ulg'],
        },
        canSelectMany: false,
      });
      if (!uris?.length) return;

      const logPath = uris[0].fsPath;
      const ext = logPath.toLowerCase().endsWith('.bin') ? 'ArduPilot .bin' : 'PX4 .ulg';
      vscode.window.showInformationMessage(
        `VibeBot: Flight log imported (${ext}) — log analysis coming in Phase 2.`,
        'OK',
      );
      // Phase 2: parse the log and render a timeline in a new panel.
    }),
  );

  console.log('[VibeBot Studio] Ready.');
}

export function deactivate(): void {
  console.log('[VibeBot Studio] Deactivating.');
  // provider.dispose() is called automatically via context.subscriptions
}
