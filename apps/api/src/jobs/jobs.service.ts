import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { SearchParams, toSearchString } from '@dej/shared';
import { config } from '../common/config';
import { MailerService } from '../common/mailer.service';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { SearchService } from '../search/search.service';

/**
 * Pravidelné úlohy (každých 5 minut, zámek v Redisu → běží jen na jedné instanci):
 * - upozornění na brzy končící inzeráty (3 dny předem) a jejich expirace,
 * - chytrá upozornění na nové inzeráty odpovídající uloženému hledání.
 */
@Injectable()
export class JobsService implements OnApplicationBootstrap, OnModuleDestroy {
  private log = new Logger('Jobs');
  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService, private redis: RedisService, private search: SearchService, private mail: MailerService) {}

  onApplicationBootstrap() {
    if (process.env.DISABLE_JOBS === '1') return;
    this.timer = setInterval(() => void this.tick(), 5 * 60_000);
    setTimeout(() => void this.tick(), 15_000);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async tick() {
    if (!(await this.redis.lock('jobs:tick', 240))) return;
    try { await this.expiry(); await this.savedSearchAlerts(); } catch (e) { this.log.error((e as Error).stack); }
  }

  async expiry() {
    const soon = await this.prisma.listing.findMany({ where: { status: 'ACTIVE', expiresAt: { lte: new Date(Date.now() + 3 * 864e5) }, expiryNotifiedAt: null }, include: { user: true }, take: 500 });
    for (const l of soon) {
      await this.prisma.notification.create({ data: { userId: l.userId, type: 'expiry', title: `Inzerát „${l.title}“ brzy skončí`, body: 'Prodlužte ho jedním kliknutím, ať ho kupující dál vidí.', link: '/muj-ucet/inzeraty' } });
      await this.mail.send(l.user.email, `Váš inzerát „${l.title}“ za 3 dny skončí`, `<p>Prodloužit ho můžete zdarma v <a href="${config.webOrigin}/muj-ucet/inzeraty">Mých inzerátech</a>.</p>`);
      await this.prisma.listing.update({ where: { id: l.id }, data: { expiryNotifiedAt: new Date() } });
    }
    const expired = await this.prisma.listing.findMany({ where: { status: { in: ['ACTIVE', 'RESERVED'] }, expiresAt: { lte: new Date() } }, select: { id: true }, take: 1000 });
    if (expired.length) {
      await this.prisma.listing.updateMany({ where: { id: { in: expired.map((e) => e.id) } }, data: { status: 'EXPIRED' } });
      for (const e of expired) await this.search.index(e.id);
      this.log.log(`Expirováno ${expired.length} inzerátů`);
    }
  }

  async savedSearchAlerts() {
    const searches = await this.prisma.savedSearch.findMany({ where: { notify: true, lastCheckedAt: { lte: new Date(Date.now() - 4 * 60_000) } }, include: { user: true }, take: 2000 });
    for (const s of searches) {
      const since = s.lastCheckedAt;
      const r = await this.search.search(s.query as SearchParams, { createdAfter: since, limit: 10 });
      await this.prisma.savedSearch.update({ where: { id: s.id }, data: { lastCheckedAt: new Date() } });
      const fresh = r.hits.filter((h) => h.createdAt > since.getTime());
      if (!fresh.length) continue;
      const link = `/hledat?${toSearchString(s.query as SearchParams)}`;
      await this.prisma.notification.create({ data: { userId: s.userId, type: 'saved-search', title: `${fresh.length}× nový inzerát: ${s.name}`, body: fresh.slice(0, 3).map((h) => h.title).join(' · '), link } });
      await this.mail.send(s.user.email, `Nové inzeráty pro „${s.name}“`, `<p>Našli jsme nové nabídky:</p><ul>${fresh.map((h) => `<li><a href="${config.webOrigin}/inzerat/${h.id}/${h.slug}">${h.title}</a> – ${h.price ?? 'dohodou'} Kč, ${h.city}</li>`).join('')}</ul><p><a href="${config.webOrigin}${link}">Zobrazit vše</a></p>`);
    }
  }
}
