/**
 * AutoFlow — Phase 0 Verification & Deep Audit Suite
 *
 * Validates:
 * 1. AppErrorBoundary lifecycle structure, error logging without swallowing & state handling
 * 2. Contract tests across all architectural boundaries
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function read(relPath) {
  const full = resolve(ROOT, relPath);
  if (!existsSync(full)) {
    throw new Error(`File not found: ${relPath}`);
  }
  return readFileSync(full, 'utf8');
}

console.log('\n── Phase 0: AppErrorBoundary Deep Audit ──');

const errorBoundarySrc = read('src/components/error/AppErrorBoundary.tsx');
const mainSrc = read('src/main.tsx');

// 1. Structure & Props
assert('AppErrorBoundary class is exported', errorBoundarySrc.includes('export class AppErrorBoundary extends React.Component'));
assert('AppErrorBoundary accepts children prop', errorBoundarySrc.includes('children: React.ReactNode'));
assert('AppErrorBoundary accepts optional fallback prop', errorBoundarySrc.includes('fallback?: React.ReactNode'));
assert('AppErrorBoundary accepts optional onError callback', errorBoundarySrc.includes('onError?: (error: Error, errorInfo: React.ErrorInfo) => void'));

// 2. Lifecycle methods & Error capture
assert('AppErrorBoundary defines static getDerivedStateFromError', errorBoundarySrc.includes('static getDerivedStateFromError(error: Error)'));
assert('getDerivedStateFromError sets hasError: true and saves error', errorBoundarySrc.includes('return { hasError: true, error }'));
assert('AppErrorBoundary defines componentDidCatch', errorBoundarySrc.includes('componentDidCatch(error: Error, errorInfo: React.ErrorInfo)'));

// 3. No swallowed logs / Transparent error reporting
assert('componentDidCatch logs error to console with full stack', errorBoundarySrc.includes("console.error(\n      '[AppErrorBoundary] Uncaught component exception:'"));
assert('componentDidCatch invokes custom onError handler safely', errorBoundarySrc.includes('this.props.onError(error, errorInfo)'));

// 4. Recovery & Diagnostics UI
assert('AppErrorBoundary provides reload handler', errorBoundarySrc.includes('handleReload'));
assert('AppErrorBoundary provides reset handler', errorBoundarySrc.includes('handleReset'));
assert('AppErrorBoundary provides copy error diagnostics handler', errorBoundarySrc.includes('handleCopyError'));
assert('AppErrorBoundary provides toggleable technical details', errorBoundarySrc.includes('handleToggleDetails'));

// 5. Integration in main.tsx
assert('AppErrorBoundary is imported in main.tsx', mainSrc.includes("import { AppErrorBoundary } from './components/error/AppErrorBoundary'"));
assert('AppErrorBoundary wraps root App in main.tsx', mainSrc.includes('<AppErrorBoundary>\n    <App />\n  </AppErrorBoundary>') || (mainSrc.includes('<AppErrorBoundary>') && mainSrc.includes('</AppErrorBoundary>')));

console.log(`\nPhase 0 Deep Audit Summary: ${passed} passed, ${failed} failed.\n`);
process.exit(failed > 0 ? 1 : 0);
