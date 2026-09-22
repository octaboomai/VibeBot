// acquireVsCodeApi() must be called EXACTLY ONCE per webview lifetime.
// Export this singleton everywhere instead of calling it directly.

interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

const vscode: VSCodeAPI =
  typeof acquireVsCodeApi !== 'undefined'
    ? acquireVsCodeApi()
    : {
        // Fallback for running the webview outside VS Code (browser dev mode)
        postMessage: (msg) => console.log('[vscode.postMessage]', msg),
        getState:    () => null,
        setState:    (s) => console.log('[vscode.setState]', s),
      };

export default vscode;
