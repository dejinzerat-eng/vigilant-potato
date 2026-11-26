import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import { SearchService } from './search/search.service';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService, private search: SearchService) {}
  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, search: this.search.usingMeili ? 'meilisearch' : 'postgres' };
  }
}
