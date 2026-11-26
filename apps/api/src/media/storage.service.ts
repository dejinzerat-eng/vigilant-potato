import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { put as blobPut } from '@vercel/blob';
import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../common/config';

/** Úložiště souborů: S3 kompatibilní (AWS, Cloudflare R2, MinIO), nebo lokální disk pro vývoj. */
@Injectable()
export class StorageService {
  private log = new Logger('Storage');
  private s3?: S3Client;
  readonly localDir = join(process.cwd(), 'uploads');

  constructor() {
    if (config.s3.bucket) {
      this.s3 = new S3Client({ region: config.s3.region, endpoint: config.s3.endpoint, forcePathStyle: !!config.s3.endpoint, credentials: { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey } });
      this.log.log(`S3 úložiště: ${config.s3.bucket}`);
    } else if (process.env.BLOB_READ_WRITE_TOKEN) this.log.log('Úložiště: Vercel Blob');
    else this.log.log(`Lokální úložiště: ${this.localDir}`);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const r = await blobPut(key, body, { access: 'public', contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 });
      return r.url;
    }
    if (this.s3) {
      await this.s3.send(new PutObjectCommand({ Bucket: config.s3.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
      return `${config.s3.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    const path = join(this.localDir, key);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, body);
    return `/uploads/${key}`;
  }
}
