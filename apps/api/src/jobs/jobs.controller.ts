import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { JobsService } from './jobs.service';

/** Spouštění pravidelných úloh zvenčí (Vercel Cron / jiný plánovač). Chráněno tajným klíčem CRON_SECRET. */
@Controller('jobs')
export class JobsController {
  constructor(private jobs: JobsService) {}
  @Get('tick')
  async tick(@Headers('authorization') auth?: string) {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret || auth?.trim() !== `Bearer ${secret}`) throw new UnauthorizedException();
    await this.jobs.tick();
    return { ok: true };
  }
}
