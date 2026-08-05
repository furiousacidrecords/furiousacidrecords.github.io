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

test('manual is organized around using the program', () => {
  assert.match(manual, /<title>Purple Rabbit Chemistry Simulation Manual<\/title>/);
  assert.match(manual, /How to use the program/);
  assert.match(manual, /Table of contents/);
  assert.match(manual, /id="top-down-tree"/);
  assert.match(manual, /Add → Place → Validate → Run → Report → Revise → Save or Present/);
});

test('manual covers the visible simulator workflow and controls', () => {
  const requiredSections = [
    'start-here',
    'screen-map',
    'new-scene',
    'parts-library',
    'add-parts',
    'amounts-vessels',
    'arrange-remove',
    'validate-scene',
    'run-simulation',
    'read-report',
    'revise-compare',
    'molecule-drawing',
    'stage-studio',
    'save-load-export',
    'phone-use',
    'chatgpt-help',
    'troubleshooting',
  ];

  requiredSections.forEach((id) => {
    assert.match(manual, new RegExp(`id="${id}"`), `missing manual section ${id}`);
  });

  const visibleControls = [
    '\\+ Part',
    'Parts Library',
    'Storage',
    'Compounds',
    'Reagents',
    'Conditions',
    'Equipment',
    'Simulator',
    'Stage',
    'Report',
    'New',
    'Save',
    'Load',
    'Run',
    'Clear',
    'Validate Scene',
    'Identify molecule',
    'Load SMILES',
    'PNG',
    'PDF',
  ];

  visibleControls.forEach((label) => {
    assert.match(manual, new RegExp(label, 'i'), `missing visible control or category ${label}`);
  });
});

test('manual explains what users should read in the report', () => {
  ['Name', 'Amount', 'Formula', 'Moles', 'MW', 'Conversion', 'Selectivity', 'Drift'].forEach((field) => {
    assert.match(manual, new RegExp(`>${field}<|<strong>${field}<`, 'i'), `missing report field ${field}`);
  });

  assert.match(manual, /Clean/);
  assert.match(manual, /Partial/);
  assert.match(manual, /Failed/);
});

test('manual stays user-facing and excludes developer documentation', () => {
  const forbidden = [
    /\bcore-loop\.js\b/i,
    /\blab-principles\.js\b/i,
    /\bmolecule-draw\.js\b/i,
    /\biupac-engine\.js\b/i,
    /\bstage-studio\.js\b/i,
    /module map/i,
    /repository[- ]scanned/i,
    /source basis/i,
    /current main[- ]branch modules/i,
  ];

  forbidden.forEach((pattern) => {
    assert.doesNotMatch(manual, pattern, `manual contains developer-facing language: ${pattern}`);
  });
});

test('manual keeps search, focused ChatGPT prompts, mobile help, and a safety boundary', () => {
  assert.match(manual, /id="manualSearch"/);
  assert.match(manual, /data-prompt/);
  assert.match(manual, /Focus only on using the program/);
  assert.match(manual, /Use it on a phone/);
  assert.match(manual, /Educational simulation only/);
});

test('homepage loader keeps the manual link in the updates panel', () => {
  assert.match(homeLoader, /href="\/purple\/manual\/"/);
  assert.match(homeLoader, /Purple Rabbit Chemistry Simulation Manual/);
  assert.match(homeLoader, /update-manual-link/);
  assert.match(homeLoader, /simulatorLink \+ manualLink/);
});
