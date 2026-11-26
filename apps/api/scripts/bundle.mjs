// Zabalí zkompilované API (dist/) do jednoho souboru, který web na Vercelu spouští v /api/*.
// - Prisma klient se přibalí a vedle balíčku se zkopíruje query engine a schema.prisma
//   (Prisma je hledá ve složce balíčku), takže funkce nezávisí na node_modules.
// - sharp (nativní knihovna) předává za běhu web: globalThis.__dejSharp (viz apps/web/src/pages/api).
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const out = '../web/.api';
mkdirSync(out, { recursive: true });

const sharpShim = {
  name: 'sharp-shim',
  setup(b) {
    b.onResolve({ filter: /^sharp$/ }, () => ({ path: 'sharp', namespace: 'sharp-shim' }));
    b.onLoad({ filter: /.*/, namespace: 'sharp-shim' }, () => ({
      contents: "module.exports = globalThis.__dejSharp || eval('require')('sharp');",
      loader: 'js',
    }));
  },
};

await build({
  entryPoints: ['dist/main.js'],
  outfile: join(out, 'server.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  logLevel: 'warning',
  keepNames: true,
  plugins: [sharpShim],
  external: [
    // volitelné moduly NestJS, které nepoužíváme
    '@nestjs/microservices', '@nestjs/microservices/*', '@nestjs/websockets', '@nestjs/websockets/*',
    'class-transformer', 'class-transformer/*', 'class-validator', '@fastify/*',
  ],
});

// Query engine a schéma Prisma vedle balíčku
const require = createRequire(import.meta.url);
const generated = join(dirname(require.resolve('@prisma/client/package.json')), '..', '..', '.prisma', 'client');
const files = readdirSync(generated).filter((f) => f === 'schema.prisma' || (/^libquery_engine-.*\.node$/.test(f) && (!process.env.VERCEL || f.includes('rhel-openssl-3.0.x'))));
for (const f of files) copyFileSync(join(generated, f), join(out, f));
if (!files.some((f) => f.includes('rhel-openssl-3.0.x'))) throw new Error('Chybí Prisma engine pro Vercel (rhel-openssl-3.0.x).');
console.log(`API zabaleno do apps/web/.api/server.js (+ ${files.join(', ')})`);
