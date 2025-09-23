import {
  Controller,
  Post,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('admin/seed')
export class SeedCotroller {
  constructor(private readonly seedService: SeedService) {}

  @Post('')
  async wipe(@Headers('x-admin-token') token: string) {
    const expected = process.env.ADMIN_WIPE_TOKEN;
    if (!expected || token !== expected) {
      throw new ForbiddenException('Token inválido');
    }

    await this.seedService.seed();

    return { ok: true };
  }
}
