import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');

test('Capacitor uses the current Purple Rabbit source without replacing the website', () => {
  const sourceBefore = readFileSync(resolve(root, 'purple/index.html'), 'utf8');

  execFileSync(process.execPath, ['scripts/prepare-capacitor-web.mjs'], {
    cwd: root,
    stdio: 'pipe'
  });

  const sourceAfter = readFileSync(resolve(root, 'purple/index.html'), 'utf8');
  const mobileHtml = readFileSync(resolve(root, '.mobile-web/index.html'), 'utf8');
  const config = readFileSync(resolve(root, 'capacitor.config.ts'), 'utf8');

  assert.equal(sourceAfter, sourceBefore, 'Preparing the app must not rewrite /purple.');
  assert.match(config, /webDir:\s*['"]\.mobile-web['"]/);
  assert.match(mobileHtml, /viewport-fit=cover/);
  assert.match(mobileHtml, /overflow-y:\s*auto\s*!important/);
  assert.match(mobileHtml, /touch-action:\s*manipulation/);
  assert.doesNotMatch(config, /tiktok/i);
});

test('Purple Rabbit keeps direct touch controls', () => {
  const coreLoop = readFileSync(resolve(root, 'purple/core-loop.js'), 'utf8');

  assert.match(coreLoop, /pointerdown/);
  assert.match(coreLoop, /pointermove/);
  assert.match(coreLoop, /pointerup/);
  assert.match(coreLoop, /touch-action:\s*pan-y/);
  assert.match(coreLoop, /touch-action:\s*none/);
});
