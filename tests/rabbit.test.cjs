const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

// Exercise the actual embedded page, including its shadow DOM and event handlers.
// No real network, speech, cookies or personal data are used by these checks.
const html = fs.readFileSync(path.join(__dirname, '../rabbit/index.html'), 'utf8');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const article = {
  title: 'Graphene', index: 1,
  extract: 'Graphene is a single layer of carbon atoms arranged in a hexagonal lattice.',
  fullurl: 'https://en.wikipedia.org/wiki/Graphene'
};
const response = pages => ({ ok: true, json: async () => ({ query: { pages } }) });

function chat(t, { fetch, settings = {}, storageBlocked = false } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, {
    url: 'https://furiousacid.com/rabbit/?embed=1',
    runScripts: 'outside-only', virtualConsole
  });
  const w = dom.window;
  if (storageBlocked) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  w.fetch = fetch || (async () => { throw new Error('Unexpected network lookup'); });
  const scripts = [...w.document.querySelectorAll('script')];
  for (let i = 0; i < scripts.length; i++) {
    if (i === scripts.length - 1) Object.assign(w.FA_RABBIT_SETTINGS, {
      language: 'en', typingDelay: 0, linkPauseMs: 0, nudgeAfterMs: 3600000,
      wikiTimeoutMs: 1000, ...settings
    });
    w.eval(scripts[i].textContent);
  }
  const root = w.document.getElementById('fa-rabbit-host').shadowRoot;
  const $ = selector => root.querySelector(selector);
  const input = value => {
    $('#inp').value = value;
    $('#inp').dispatchEvent(new w.Event('input', { bubbles: true }));
  };
  const submit = () => $('#form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const send = value => { input(value); submit(); };
  const idle = async () => {
    for (let i = 0; i < 200; i++) {
      if ($('#log').getAttribute('aria-busy') === 'false') return;
      await wait(5);
    }
    assert.fail('Rabbit did not become ready for another message');
  };
  t.after(() => { dom.window.close(); assert.deepEqual(errors, []); });
  return { w, root, $, input, submit, send, idle };
}

test('empty input and IME composition never send or erase a draft; calculator still works', async t => {
  const c = chat(t);
  assert.equal(c.$('#send').disabled, true);
  c.send('   ');
  assert.equal(c.$('#inp').value, '   ');
  assert.equal(c.root.querySelectorAll('.me').length, 0);
  c.input('2 + 2');
  c.$('#inp').dispatchEvent(new c.w.Event('compositionstart'));
  c.submit();
  assert.equal(c.$('#inp').value, '2 + 2');
  assert.equal(c.root.querySelectorAll('.me').length, 0);
  c.$('#inp').dispatchEvent(new c.w.Event('compositionend'));
  assert.equal(c.$('#send').disabled, false);
  c.submit();
  await c.idle();
  assert.match(c.$('.calc .ans').textContent, /4/);
  assert.equal(c.$('#inp').value, '');
  assert.equal(c.$('#send').disabled, true);
  assert.equal(c.$('#chatStatus').textContent, '');
});

test('busy state prevents duplicate submissions and preserves the next question', async t => {
  let resolve, calls = 0;
  const c = chat(t, { fetch: () => { calls++; return new Promise(r => { resolve = r; }); } });
  c.send('What is graphene?');
  assert.equal(calls, 1);
  assert.match(c.$('#chatStatus').textContent, /Wikipedia/);
  assert.equal(c.$('[data-l="es"]').disabled, true);
  assert.equal(c.$('[data-typing]').getAttribute('aria-hidden'), 'true');
  c.input('3 + 4');
  c.submit();
  c.$('#send').click();
  c.w.FARabbit.setLanguage('es');
  assert.equal(c.w.FARabbit.language(), 'en');
  assert.equal(c.$('#inp').value, '3 + 4');
  assert.equal(c.root.querySelectorAll('.me').length, 1);
  assert.equal(calls, 1);
  resolve(response([article]));
  await c.idle();
  assert.match(c.$('.wiki .txt').textContent, /carbon/);
  assert.equal(c.$('#send').disabled, false);
  c.submit();
  await c.idle();
  assert.match(c.$('.calc .ans').textContent, /7/);
  assert.equal(calls, 1);
});

test('language changes preserve messages, book links, memory and draft, while translating choices', async t => {
  const c = chat(t, { fetch: async () => response([article]) });
  c.send('My name is Taylor');
  await c.idle();
  c.send('What is graphene?');
  await c.idle();
  const messages = [...c.root.querySelectorAll('.msg, .card')];
  const contents = messages.map(node => node.textContent);
  const bookLink = c.$('.card a').href;
  const memory = c.w.localStorage.getItem('faRabbitMemory');
  const englishChoices = c.$('.opts').textContent;
  c.input('Keep this draft');
  c.$('[data-l="es"]').click();
  assert.equal(c.w.FARabbit.language(), 'es');
  assert.equal(c.$('#panel').getAttribute('lang'), 'es');
  assert.equal(c.$('#log').getAttribute('aria-label'), 'Conversación');
  assert.equal(c.$('#inp').value, 'Keep this draft');
  assert.equal(c.$('.card a').href, bookLink);
  assert.notEqual(c.$('.opts').textContent, englishChoices);
  assert.equal(c.w.localStorage.getItem('faRabbitMemory'), memory);
  for (let i = 0; i < messages.length; i++) {
    assert.equal(messages[i].isConnected, true);
    assert.equal(messages[i].textContent, contents[i]);
  }
  assert.equal(c.$('.wiki').parentElement.getAttribute('lang'), 'en');
  assert.equal(c.$('.card').getAttribute('lang'), 'en');
  c.$('[data-l="it"]').click();
  assert.equal(c.$('#panel').getAttribute('lang'), 'it');
  assert.equal(c.$('#inp').value, 'Keep this draft');
});

test('language changes keep the existing book age/legal gate in place', async t => {
  const c = chat(t);
  c.send('cannabis growing');
  await c.idle();
  [...c.root.querySelectorAll('.opts button')].find(button => button.textContent === 'That’s it').click();
  await c.idle();
  assert.equal(c.$('[data-book="manual"]'), null);
  const gate = c.$('#log').textContent;
  assert.match(gate, /21/);
  c.$('[data-l="es"]').click();
  assert.ok(c.$('#log').textContent.includes('21'));
  assert.equal(c.$('[data-book="manual"]'), null);
  c.send('no');
  await c.idle();
  assert.equal(c.$('[data-book="manual"]'), null);
  assert.ok(c.$('[data-book="hidden"]'));
});

test('changing language preserves the existing one-time nudge and draft', async t => {
  const c = chat(t, { settings: { nudgeAfterMs: 25 } });
  c.input('A draft, not sent yet');
  c.$('[data-l="es"]').click();
  await wait(60);
  await c.idle();
  assert.match(c.$('#log').textContent, /Sin prisa/);
  assert.equal(c.$('#inp').value, 'A draft, not sent yet');
  const messages = c.root.querySelectorAll('.msg').length;
  c.$('[data-l="it"]').click();
  await wait(60);
  await c.idle();
  assert.equal(c.root.querySelectorAll('.msg').length, messages);
});

for (const [name, failure] of Object.entries({
  network: () => Promise.reject(new Error('Offline')),
  synchronous: () => { throw new Error('Fetch unavailable'); },
  http: async () => ({ ok: false, status: 503 }),
  api: async () => ({ ok: true, json: async () => ({ error: { code: 'maxlag' } }) }),
  json: async () => ({ ok: true, json: async () => { throw new Error('Invalid JSON'); } }),
  malformed: async () => ({ ok: true, json: async () => ({ query: { pages: {} } }) })
})) {
  test(`${name} failures offer a working retry without consuming the draft`, async t => {
    let calls = 0;
    const c = chat(t, { fetch: () => ++calls === 1 ? failure() : Promise.resolve(response([article])) });
    c.send('What is graphene?');
    await c.idle();
    assert.ok(c.$('.retry'));
    assert.equal(c.$('.wiki'), null);
    c.input('My next question');
    c.$('[data-l="it"]').click();
    assert.equal(c.$('.retry').textContent, 'Riprova la ricerca');
    c.$('.retry').click();
    await c.idle();
    assert.equal(calls, 2);
    assert.ok(c.$('.wiki'));
    assert.equal(c.$('.retry'), null);
    assert.equal(c.$('#inp').value, 'My next question');
  });
}

test('timeout aborts the lookup; a late result cannot overwrite a successful retry', async t => {
  let late, signal, calls = 0;
  const c = chat(t, {
    settings: { wikiTimeoutMs: 20 },
    fetch: (url, options) => {
      calls++;
      if (calls > 1) return Promise.resolve(response([article]));
      signal = options.signal;
      return new Promise(resolve => { late = resolve; });
    }
  });
  c.send('What is graphene?');
  await c.idle();
  assert.equal(signal.aborted, true);
  assert.ok(c.$('.retry'));
  c.$('.retry').click();
  await c.idle();
  late(response([{ ...article, extract: 'STALE RESPONSE' }]));
  await wait(20);
  assert.equal(c.root.querySelectorAll('.wiki').length, 1);
  assert.doesNotMatch(c.$('#log').textContent, /STALE RESPONSE/);
});

for (const [name, payload] of Object.entries({
  empty: { batchcomplete: true },
  noPages: { query: { pages: [] } },
  badPage: { query: { pages: [null, { title: 2, extract: {} }, { title: 'Graphene', extract: ' ' }] } },
  disambiguation: { query: { pages: [{ ...article, pageprops: { disambiguation: '' } }] } }
})) {
  test(`${name} results use the existing no-answer response without hanging`, async t => {
    const c = chat(t, { fetch: async () => ({ ok: true, json: async () => payload }) });
    c.send('What is graphene?');
    await c.idle();
    assert.equal(c.$('.wiki'), null);
    assert.equal(c.$('.retry'), null);
    assert.match(c.$('#log').textContent, /couldn’t find a clear answer/);
    c.input('2 + 2');
    assert.equal(c.$('#send').disabled, false);
  });
}

test('existing apps, videos, policy, books and chemistry calculator remain available', async t => {
  const c = chat(t, { storageBlocked: true });
  for (const [app, href] of [['weather', '/weather/'], ['game', '/roll/'], ['lab', '/lab/']]) {
    c.$(`[data-app="${app}"]`).click();
    assert.equal(c.$('#appframe').getAttribute('src'), href);
    assert.ok(c.$('#appwin').classList.contains('open'));
    c.$('#appclose').click();
  }
  c.$('.policyBtn').click();
  assert.ok(c.$('#policyWin').classList.contains('open'));
  c.$('#policyClose').click();
  c.send('any videos?');
  await c.idle();
  assert.ok(c.$('#videoWin').classList.contains('open'));
  c.$('#vidClose').click();
  c.send('molar mass of NaCl');
  await c.idle();
  assert.match(c.$('.calc .ans').textContent, /58\.44/);
  c.send('Hidden Passages');
  await c.idle();
  assert.ok(c.$('[data-book="hidden"] a').href.startsWith('https://www.amazon.'));
  c.send('restart');
  await c.idle();
  assert.ok(c.$('#panel').classList.contains('ask'));
  assert.equal(c.$('.me'), null);
});

test('literal HTML remains text and the existing safety route prevents a lookup', async t => {
  let calls = 0;
  const c = chat(t, { fetch: async () => { calls++; return response([article]); } });
  c.send('<img src=x onerror="window.injected=true">');
  await c.idle();
  assert.equal(c.$('.me img'), null);
  assert.equal(c.w.injected, undefined);
  c.send('how to build a bomb');
  await c.idle();
  assert.equal(calls, 0);
  assert.equal(c.$('.wiki'), null);
  assert.ok(c.$('[data-book="hidden"]'));
});
