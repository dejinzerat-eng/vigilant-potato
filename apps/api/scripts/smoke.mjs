// Zkušební spuštění API: nastartuje dist/main.js nad databází s výchozími daty (po `pnpm seed`)
// a ověří hlavní cesty. Spouští se v GitHub kontrole a lze ho pustit i lokálně: `pnpm --filter @dej/api smoke`.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = process.env.SMOKE_PORT ?? '4100';
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ['dist/main.js'], {
  env: { ...process.env, PORT: port, DISABLE_JOBS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
api.stdout.on('data', (d) => (log += d));
api.stderr.on('data', (d) => (log += d));

const checks = [];
const check = async (name, fn) => {
  try { await fn(); checks.push(`ok   ${name}`); }
  catch (e) { checks.push(`FAIL ${name}: ${e.message}`); }
};
const json = async (path, init) => {
  const r = await fetch(base + path, init);
  return { status: r.status, body: await r.json().catch(() => null), headers: r.headers };
};

try {
  const deadline = Date.now() + 30_000;
  for (;;) {
    if (api.exitCode !== null) throw new Error(`API skončilo s kódem ${api.exitCode}`);
    try { if ((await fetch(`${base}/health`)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error('API nenaběhlo do 30 s');
    await new Promise((r) => setTimeout(r, 500));
  }

  await check('GET /health', async () => {
    const { status, body } = await json('/health');
    assert.equal(status, 200);
    assert.equal(body.ok, true);
  });
  await check('GET /categories vrací 20 kategorií', async () => {
    const { status, body } = await json('/categories');
    assert.equal(status, 200);
    assert.equal(body.length, 20);
  });
  await check('GET /search najde inzeráty', async () => {
    const { status, body } = await json('/search?q=kolo');
    assert.equal(status, 200);
    assert.ok(body.hits.length > 0, 'žádné výsledky pro „kolo“');
  });
  await check('GET /listings/featured', async () => {
    const { status, body } = await json('/listings/featured');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body) && body.length > 0);
  });
  await check('POST /auth/login odmítne špatné heslo', async () => {
    const { status } = await json('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo1@dejinzerat.cz', password: 'spatne-heslo' }) });
    assert.ok(status >= 400 && status < 500, `stav ${status}`);
  });
  await check('POST /auth/login přihlásí ukázkového uživatele', async () => {
    const { status, headers } = await json('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo1@dejinzerat.cz', password: 'Heslo1234' }) });
    assert.ok(status === 200 || status === 201, `stav ${status}`);
    assert.ok(headers.getSetCookie().length > 0, 'chybí přihlašovací cookie');
  });
  await check('GET /admin/audit bez přihlášení je zakázané', async () => {
    const { status } = await json('/admin/audit');
    assert.ok(status === 401 || status === 403, `stav ${status}`);
  });
} catch (e) {
  checks.push(`FAIL start: ${e.message}`);
} finally {
  api.kill();
}

console.log(checks.join('\n'));
if (checks.some((c) => c.startsWith('FAIL'))) {
  console.log('\n--- výpis API ---\n' + log.replace(/\x1b\[[0-9;]*m/g, '').slice(-4000));
  process.exit(1);
}
