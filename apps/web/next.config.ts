import { join } from 'node:path';
import type { NextConfig } from 'next';

const api = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
/** Na Vercelu běží API přímo ve webu (src/pages/api), lokálně jako samostatný server. */
const embeddedApi = !!process.env.VERCEL;

const config: NextConfig = {
  transpilePackages: ['@dej/shared'],
  poweredByHeader: false,
  outputFileTracingRoot: join(__dirname, '../..'),
  outputFileTracingIncludes: { '/api/**': ['./.api/**', '../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/**'] },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: 'localhost' }] },
  async rewrites() {
    if (embeddedApi) return [{ source: '/uploads/:path*', destination: '/api/uploads/:path*' }];
    return [
      { source: '/api/:path*', destination: `${api}/:path*` },
      { source: '/uploads/:path*', destination: `${api}/uploads/:path*` },
    ];
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self)' },
    ] }];
  },
};
export default config;
