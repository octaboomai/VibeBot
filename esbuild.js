// @ts-check
const esbuild = require('esbuild');

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

const sharedOptions = {
  bundle: true,
  minify: isProduction,
  sourcemap: !isProduction ? 'inline' : false,
  logLevel: 'info',
};

async function main() {
  // ── Extension host ──────────────────────────────────────────────────────────
  // Runs in Node.js inside VS Code. CommonJS, no browser globals.
  const extensionCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    format: 'cjs',
    platform: 'node',
    external: ['vscode'], // provided at runtime by VS Code
  });

  // ── Webview (sidebar panel) ─────────────────────────────────────────────────
  // Runs in a sandboxed browser context inside a VS Code WebviewView.
  // Must be a self-contained IIFE — no require(), no top-level import().
  const webviewCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ['webview/src/index.tsx'],
    outfile: 'dist/webview/webview.js',
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    define: {
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
    },
  });

  if (isWatch) {
    await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
    console.log('[vibebot] Watching for changes — press Ctrl+C to stop.');
  } else {
    await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
    await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
    console.log('[vibebot] Build complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
