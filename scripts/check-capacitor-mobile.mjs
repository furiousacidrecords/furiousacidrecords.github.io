import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const requiredFiles = [
  'purple/index.html',
  'purple/core-loop.js',
  '.mobile-web/index.html',
  'capacitor.config.ts'
];

for (const relativePath of requiredFiles) {
  if (!existsSync(resolve(root, relativePath))) {
    throw new Error(`Missing required mobile app file: ${relativePath}`);
  }
}

const config = readFileSync(resolve(root, 'capacitor.config.ts'), 'utf8');
const sourceHtml = readFileSync(resolve(root, 'purple/index.html'), 'utf8');
const mobileHtml = readFileSync(resolve(root, '.mobile-web/index.html'), 'utf8');
const coreLoop = readFileSync(resolve(root, 'purple/core-loop.js'), 'utf8');

const checks = [
  [config.includes("webDir: '.mobile-web'"), 'Capacitor must use the prepared mobile copy.'],
  [!config.includes('server: {\n    url:'), 'The mobile app must not depend on a remote-site wrapper.'],
  [/name=["']viewport["']/i.test(sourceHtml), 'The /purple source must keep a mobile viewport.'],
  [mobileHtml.includes('viewport-fit=cover'), 'The mobile build must fill the device viewport.'],
  [mobileHtml.includes('overflow-y: auto !important'), 'The mobile build must allow vertical scrolling.'],
  [mobileHtml.includes('touch-action: manipulation'), 'The mobile build must keep controls touch-friendly.'],
  [coreLoop.includes('pointerdown'), 'The simulator must keep direct pointer/touch handling.'],
  [coreLoop.includes('touch-action: pan-y'), 'The parts library must keep phone scrolling during touch use.'],
  [!config.toLowerCase().includes('tiktok'), 'TikTok must not be part of the Capacitor app configuration.']
];

for (const [passed, message] of checks) {
  if (!passed) throw new Error(message);
}

console.log('Purple Rabbit Capacitor mobile checks passed.');
