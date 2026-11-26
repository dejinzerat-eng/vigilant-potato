export const config = {
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'),
  publicApiUrl: process.env.PUBLIC_API_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:4000'),
  redisUrl: process.env.REDIS_URL,
  meiliUrl: process.env.MEILI_URL ?? (process.env.VERCEL ? '' : 'http://127.0.0.1:7700'),
  meiliKey: process.env.MEILI_KEY ?? '',
  cookieSecure: process.env.COOKIE_SECURE === '1',
  /** Inzeráty čekají na schválení moderátorem (jinak se zveřejní hned a kontroluje je automat). */
  premoderation: process.env.PREMODERATION === '1',
  listingDays: Number(process.env.LISTING_DAYS ?? 30),
  google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID, teamId: process.env.APPLE_TEAM_ID, keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  gosms: {
    clientId: process.env.GOSMS_CLIENT_ID?.trim(), clientSecret: process.env.GOSMS_CLIENT_SECRET?.trim(),
    channel: process.env.GOSMS_CHANNEL ? Number(process.env.GOSMS_CHANNEL) : undefined,
    apiBase: process.env.GOSMS_API_URL ?? 'https://app.gosms.cz',
  },
  turnstileSecret: process.env.TURNSTILE_SECRET,
  resendKey: process.env.RESEND_API_KEY,
  mailFrom: process.env.MAIL_FROM ?? 'Dejinzerat.cz <noreply@dejinzerat.cz>',
  s3: {
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
    publicUrl: process.env.S3_PUBLIC_URL || '',
  },
};
