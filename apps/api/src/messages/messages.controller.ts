import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { Auth, AuthUser, CurrentUser } from '../common/auth.guard';
import { MailerService } from '../common/mailer.service';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { ZodPipe } from '../common/zod';
import { assessMessage } from '../listings/moderation';
import { config } from '../common/config';

const MsgDto = z.object({ body: z.string().trim().max(4000).default(''), imageUrl: z.string().max(500).optional() }).refine((d) => d.body.length > 0 || d.imageUrl, 'Zpráva je prázdná.');
type Msg = z.infer<typeof MsgDto>;

@Auth()
@Controller()
export class MessagesController {
  constructor(private prisma: PrismaService, private redis: RedisService, private mail: MailerService) {}

  private async blocked(a: string, b: string) {
    return !!(await this.prisma.block.findFirst({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } }));
  }

  @Get('conversations')
  async list(@CurrentUser() u: AuthUser) {
    const convs = await this.prisma.conversation.findMany({
      where: { OR: [{ buyerId: u.id }, { sellerId: u.id }] }, orderBy: { lastMessageAt: 'desc' }, take: 100,
      include: {
        listing: { select: { id: true, title: true, slug: true, price: true, priceNegotiable: true, status: true, images: { take: 1, orderBy: { position: 'asc' } } } },
        buyer: { select: { id: true, name: true, avatarUrl: true } }, seller: { select: { id: true, name: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: { where: { readAt: null, senderId: { not: u.id } } } } },
      },
    });
    return convs.map((c) => ({
      id: c.id, listing: { ...c.listing, image: c.listing.images[0]?.thumbUrl ?? null, images: undefined },
      other: c.buyerId === u.id ? c.seller : c.buyer, role: c.buyerId === u.id ? 'buyer' : 'seller',
      lastMessage: c.messages[0] ?? null, unread: c._count.messages, lastMessageAt: c.lastMessageAt,
    }));
  }

  @Get('conversations/:id')
  async get(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    const c = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true, slug: true, price: true, priceNegotiable: true, status: true, userId: true, images: { take: 1, orderBy: { position: 'asc' } } } },
        buyer: { select: { id: true, name: true, avatarUrl: true, phoneVerifiedAt: true } }, seller: { select: { id: true, name: true, avatarUrl: true, phoneVerifiedAt: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 500 },
        reviews: { where: { authorId: u.id } },
      },
    });
    if (!c) throw new NotFoundException();
    if (c.buyerId !== u.id && c.sellerId !== u.id) throw new ForbiddenException();
    await this.prisma.message.updateMany({ where: { conversationId: id, senderId: { not: u.id }, readAt: null }, data: { readAt: new Date() } });
    const otherId = c.buyerId === u.id ? c.sellerId : c.buyerId;
    const iBlocked = !!(await this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: u.id, blockedId: otherId } } }));
    const replies = { mine: c.messages.some((m) => m.senderId === u.id), theirs: c.messages.some((m) => m.senderId === otherId) };
    return {
      id: c.id, listing: { ...c.listing, image: c.listing.images[0]?.thumbUrl ?? null, images: undefined },
      other: c.buyerId === u.id ? c.seller : c.buyer, role: c.buyerId === u.id ? 'buyer' : 'seller',
      messages: c.messages.map((m) => ({ ...m, warning: m.senderId !== u.id ? assessMessage(m.body) : null })),
      iBlocked, blocked: await this.blocked(u.id, otherId),
      // Hodnotit lze jen po skutečné oboustranné komunikaci
      canReview: c.buyerId === u.id && replies.mine && replies.theirs && c.reviews.length === 0,
      myReview: c.reviews[0] ?? null,
    };
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('listings/:id/message')
  async start(@Param('id') listingId: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(MsgDto)) dto: Msg) {
    const l = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!l || !['ACTIVE', 'RESERVED'].includes(l.status)) throw new NotFoundException('Inzerát není aktivní.');
    if (l.userId === u.id) throw new BadRequestException('Nemůžete psát sami sobě.');
    if (await this.blocked(u.id, l.userId)) throw new ForbiddenException('Komunikace s tímto uživatelem není možná.');
    if ((await this.redis.incr(`newconv:${u.id}`, 3600)) > 30) throw new BadRequestException('Příliš mnoho nových konverzací. Zkuste to později.');
    const conv = await this.prisma.conversation.upsert({ where: { listingId_buyerId: { listingId, buyerId: u.id } }, create: { listingId, buyerId: u.id, sellerId: l.userId }, update: {} });
    await this.send(conv.id, u, dto);
    return { conversationId: conv.id };
  }

  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Post('conversations/:id/messages')
  async send(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(MsgDto)) dto: Msg) {
    const c = await this.prisma.conversation.findUnique({ where: { id }, include: { listing: { select: { title: true } } } });
    if (!c || (c.buyerId !== u.id && c.sellerId !== u.id)) throw new ForbiddenException();
    const otherId = c.buyerId === u.id ? c.sellerId : c.buyerId;
    if (await this.blocked(u.id, otherId)) throw new ForbiddenException('Komunikace s tímto uživatelem byla zablokována.');
    if (dto.imageUrl && !/^(\/uploads\/messages\/|https:\/\/)/.test(dto.imageUrl)) throw new BadRequestException('Neplatný obrázek.');
    const msg = await this.prisma.message.create({ data: { conversationId: id, senderId: u.id, body: dto.body, imageUrl: dto.imageUrl } });
    await this.prisma.conversation.update({ where: { id }, data: { lastMessageAt: msg.createdAt } });
    // Notifikace – e-mail max. 1× za 30 min na konverzaci
    await this.prisma.notification.create({ data: { userId: otherId, type: 'message', title: `Nová zpráva od ${u.name}`, body: dto.body.slice(0, 140), link: `/zpravy/${id}` } });
    if (await this.redis.lock(`msgmail:${id}:${otherId}`, 1800)) {
      const other = await this.prisma.user.findUnique({ where: { id: otherId } });
      if (other) await this.mail.send(other.email, `Nová zpráva k inzerátu „${c.listing.title}“`, `<p>${u.name} vám napsal(a):</p><blockquote>${escapeHtml(dto.body.slice(0, 500))}</blockquote><p><a href="${config.webOrigin}/zpravy/${id}">Odpovědět</a></p>`);
    }
    return msg;
  }

  @Post('users/:id/block')
  async block(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    if (id === u.id) throw new BadRequestException();
    await this.prisma.block.upsert({ where: { blockerId_blockedId: { blockerId: u.id, blockedId: id } }, create: { blockerId: u.id, blockedId: id }, update: {} });
    return { ok: true };
  }

  @Post('users/:id/unblock')
  async unblock(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    await this.prisma.block.deleteMany({ where: { blockerId: u.id, blockedId: id } });
    return { ok: true };
  }

  @Post('conversations/:id/review')
  async review(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ rating: z.number().int().min(1).max(5), text: z.string().trim().max(1000).optional() }))) dto: { rating: number; text?: string }) {
    const c = await this.get(id, u);
    if (!c.canReview) throw new BadRequestException('Hodnotit můžete až po vzájemné komunikaci s prodejcem, a to jen jednou.');
    const conv = await this.prisma.conversation.findUniqueOrThrow({ where: { id } });
    await this.prisma.review.create({ data: { authorId: u.id, sellerId: conv.sellerId, conversationId: id, rating: dto.rating, text: dto.text } });
    await this.prisma.notification.create({ data: { userId: conv.sellerId, type: 'review', title: `${u.name} vás ohodnotil(a) ${'★'.repeat(dto.rating)}`, link: `/uzivatel/${conv.sellerId}` } });
    return { ok: true };
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
