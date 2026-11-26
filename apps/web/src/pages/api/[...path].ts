import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';
// sharp je nativní knihovna: web ji načte (Vercel ji tak správně zahrne do funkce) a předá zabalenému API.
import sharp from 'sharp';

(globalThis as { __dejSharp?: unknown }).__dejSharp = sharp;

/**
 * Na Vercelu běží backend (NestJS) uvnitř této funkce: /api/* → aplikace z apps/api.
 * Lokálně se /api/* přesměruje na samostatný server (viz next.config.ts).
 */
export const config = { api: { bodyParser: false, externalResolver: true, responseLimit: false } };

type Handler = (req: NextApiRequest, res: NextApiResponse) => void;
let app: Promise<Handler> | undefined;

function load(): Promise<Handler> {
  const candidates = [join(process.cwd(), '.api/server.js'), join(process.cwd(), 'apps/web/.api/server.js')];
  const file = candidates.find((f) => existsSync(f));
  if (!file) throw new Error('Chybí zabalené API (.api/server.js).');
  const req = eval('require') as NodeRequire;
  const mod = req(file) as { createApp: () => Promise<any> };
  return mod.createApp().then(async (nest) => {
    await nest.init();
    return nest.getHttpAdapter().getInstance() as Handler;
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    app ??= load();
    const express = await app;
    req.url = (req.url ?? '/').replace(/^\/api(?=\/|\?|$)/, '') || '/';
    await new Promise<void>((resolve) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      express(req, res);
    });
  } catch (e) {
    app = undefined;
    console.error(e);
    if (!res.headersSent) res.status(500).json({ message: 'Služba je dočasně nedostupná.' });
  }
}
