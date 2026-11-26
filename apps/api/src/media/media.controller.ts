import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { Auth, AuthUser, CurrentUser } from '../common/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from './storage.service';

const MAX = 15 * 1024 * 1024;

@Controller('media')
export class MediaController {
  constructor(private storage: StorageService, private prisma: PrismaService) {}

  /** Nahrání fotky: odstraní EXIF (GPS!), zmenší na 1600 px a vytvoří náhled 480 px ve WebP. */
  @Auth()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX } }))
  async image(@UploadedFile() file: Express.Multer.File, @CurrentUser() u: AuthUser) {
    if (!file) throw new BadRequestException('Chybí soubor.');
    if (!/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.mimetype)) throw new BadRequestException('Podporujeme JPG, PNG, WebP a HEIC.');
    let img: sharp.Sharp;
    let meta: sharp.Metadata;
    try { img = sharp(file.buffer, { failOn: 'error' }).rotate(); meta = await img.metadata(); } catch { throw new BadRequestException('Soubor není platný obrázek.'); }
    const id = randomBytes(10).toString('hex');
    const prefix = `listings/${new Date().toISOString().slice(0, 7)}/${id}`;
    const large = await img.clone().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const thumb = await img.clone().resize({ width: 640, height: 480, fit: 'cover' }).webp({ quality: 76 }).toBuffer();
    const [url, thumbUrl] = await Promise.all([this.storage.put(`${prefix}.webp`, large.data, 'image/webp'), this.storage.put(`${prefix}_t.webp`, thumb, 'image/webp')]);
    const rec = await this.prisma.listingImage.create({ data: { ownerId: u.id, url, thumbUrl, width: large.info.width, height: large.info.height } });
    void meta;
    return { id: rec.id, url, thumbUrl, width: rec.width, height: rec.height };
  }

  /** Obrázek do konverzace */
  @Auth()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('message-image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX } }))
  async messageImage(@UploadedFile() file: Express.Multer.File) {
    if (!file || !/^image\//.test(file.mimetype)) throw new BadRequestException('Chybí obrázek.');
    const buf = await sharp(file.buffer).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer().catch(() => { throw new BadRequestException('Soubor není platný obrázek.'); });
    const url = await this.storage.put(`messages/${randomBytes(12).toString('hex')}.webp`, buf, 'image/webp');
    return { url };
  }
}
