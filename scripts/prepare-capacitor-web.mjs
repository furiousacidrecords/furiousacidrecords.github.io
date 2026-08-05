import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceDir = resolve(root, 'purple');
const outputDir = resolve(root, '.mobile-web');
const sourceIndex = resolve(sourceDir, 'index.html');
const outputIndex = resolve(outputDir, 'index.html');

if (!existsSync(sourceIndex)) {
  throw new Error('Purple Rabbit source was not found at purple/index.html.');
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(dirname(outputDir), { recursive: true });
cpSync(sourceDir, outputDir, { recursive: true });

let html = readFileSync(outputIndex, 'utf8');

const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />';
if (/<meta\s+name=["']viewport["'][^>]*>/i.test(html)) {
  html = html.replace(/<meta\s+name=["']viewport["'][^>]*>/i, viewport);
} else {
  html = html.replace(/<head([^>]*)>/i, `<head$1>\n    ${viewport}`);
}

const marker = '<!-- purple-rabbit-capacitor-mobile -->';
const mobileOverrides = `${marker}
    <meta name="theme-color" content="#6f00ff" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <style id="purple-rabbit-capacitor-mobile-style">
      html {
        width: 100%;
        min-height: 100%;
        min-height: 100dvh;
        background: #6f00ff;
        -webkit-text-size-adjust: 100%;
      }

      body {
        width: 100%;
        min-height: 100%;
        min-height: 100dvh;
        margin: 0;
        overflow-x: hidden;
        overflow-y: auto !important;
        overscroll-behavior-y: auto;
        -webkit-overflow-scrolling: touch;
        padding-top: env(safe-area-inset-top);
        padding-right: env(safe-area-inset-right);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
      }

      button,
      a,
      input,
      select,
      textarea,
      [role="button"],
      [role="tab"] {
        touch-action: manipulation;
      }

      .lab-object,
      .workbench {
        -webkit-user-select: none;
        user-select: none;
      }
    </style>`;

if (!html.includes(marker)) {
  html = html.replace(/<\/head>/i, `${mobileOverrides}\n  </head>`);
}

writeFileSync(outputIndex, html, 'utf8');
console.log('Prepared .mobile-web from the current /purple source.');
