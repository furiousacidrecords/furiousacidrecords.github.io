import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const manualPath = path.join(root, 'purple', 'manual', 'index.html');
const homeLoaderPath = path.join(root, 'index.html');

const manual = fs.readFileSync(manualPath, 'utf8');
const homeLoader = fs.readFileSync(homeLoaderPath, 'utf8');

test('manual provides the requested title, table of contents, and top-down tree', () => {
  assert.match(manual, /<title>Purple Rabbit Chemistry Simulation Manual<\/title>/);
  assert.match(manual, /Table of contents/);
  assert.match(manual, /id="top-down-tree"/);
  assert.match(manual, /Build → Validate → Run → Interpret → Save or Present/);
});

test('manual covers the operational simulator modules', () => {
  const requiredSections = [
    'quick-start',
    'interface',
    'build-scene',
    'validate-run',
    'outcomes',
    'principles',
    'molecule-canvas',
    'iodine-workflow',
    'stage-studio',
    'save-export',
    'shortcuts',
    'prompt-instructions',
    'troubleshooting',
    'module-map',
  ];

  requiredSections.forEach((id) => {
    assert.match(manual, new RegExp(`id="${id}"`), `missing manual section ${id}`);
  });

  assert.match(manual, /core-loop\.js/);
  assert.match(manual, /lab-principles\.js/);
  assert.match(manual, /molecule-draw\.js/);
  assert.match(manual, /iupac-engine\.js/);
  assert.match(manual, /stage-studio\.js/);
});

test('manual includes searchable prompt instructions and safety boundaries', () => {
  assert.match(manual, /id="manualSearch"/);
  assert.match(manual, /data-prompt/);
  assert.match(manual, /Copy prompt/);
  assert.match(manual, /Simulation is not physical authorization/);
  assert.match(manual, /Do not provide a laboratory procedure/);
});

test('homepage loader inserts the manual link in the updates panel', () => {
  assert.match(homeLoader, /href="\/purple\/manual\/"/);
  assert.match(homeLoader, /Purple Rabbit Chemistry Simulation Manual/);
  assert.match(homeLoader, /update-manual-link/);
  assert.match(homeLoader, /simulatorLink \+ manualLink/);
});
