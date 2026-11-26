import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from './config';

/** Redis pro cache a zámky. Pokud není dostupný, služba degraduje na in-memory cache. */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private log = new Logger('Redis');
  client?: Redis;
  private mem = new Map<string, { v: string; exp: number }>();

  constructor() {
    if (config.redisUrl) {
      this.client = new Redis(config.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 1, enableOfflineQueue: false });
      this.client.on('error', (e) => this.log.warn(`Redis: ${e.message}`));
    }
  }
  private ok() { return this.client?.status === 'ready'; }

  async get(key: string): Promise<string | null> {
    if (this.ok()) return this.client!.get(key);
    const e = this.mem.get(key);
    if (!e || e.exp < Date.now()) return null;
    return e.v;
  }
  async set(key: string, value: string, ttlSec: number) {
    if (this.ok()) { await this.client!.set(key, value, 'EX', ttlSec); return; }
    this.mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
  }
  async del(key: string) {
    if (this.ok()) { await this.client!.del(key); return; }
    this.mem.delete(key);
  }
  /** Distribuovaný zámek – aby úlohy běžely jen na jedné instanci. */
  async lock(key: string, ttlSec: number): Promise<boolean> {
    if (this.ok()) return (await this.client!.set(key, '1', 'EX', ttlSec, 'NX')) === 'OK';
    if (await this.get(key)) return false;
    await this.set(key, '1', ttlSec);
    return true;
  }
  /** Počítadlo s expirací (rate-limit, anti-spam). */
  async incr(key: string, ttlSec: number): Promise<number> {
    if (this.ok()) {
      const n = await this.client!.incr(key);
      if (n === 1) await this.client!.expire(key, ttlSec);
      return n;
    }
    const cur = Number((await this.get(key)) ?? 0) + 1;
    await this.set(key, String(cur), ttlSec);
    return cur;
  }
  async onModuleDestroy() { await this.client?.quit().catch(() => undefined); }
}
