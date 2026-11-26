import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';

export class ZodPipe<T> implements PipeTransform {
  constructor(private schema: ZodType<T>) {}
  transform(value: unknown): T {
    const r = this.schema.safeParse(value);
    if (!r.success) {
      const issue = r.error.issues[0];
      throw new BadRequestException({ message: issue?.message ?? 'Neplatná data', field: issue?.path.join('.') });
    }
    return r.data;
  }
}
