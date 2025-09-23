// src/firestore-wipe/firestore-wipe.controller.ts
import { Controller, Post, Body, Headers, ForbiddenException } from '@nestjs/common';
import { FirestoreWipeService } from './firestore-wipe.service';

@Controller('admin/firestore')
export class FirestoreWipeController {
  constructor(private readonly wipeService: FirestoreWipeService) {}

  @Post('wipe')
  async wipe(
    @Headers('x-admin-token') token: string,
    @Body()
    body: {
      dryRun?: boolean;
      batchSize?: number;
      concurrency?: number;
      keep?: string[];
      confirm?: string; // debe ser "YES_I_UNDERSTAND"
    }
  ) {
    const expected = process.env.ADMIN_WIPE_TOKEN;
    if (!expected || token !== expected) {
      throw new ForbiddenException('Token inválido');
    }
    if (body.dryRun !== true && body.confirm !== 'YES_I_UNDERSTAND') {
      throw new ForbiddenException('Debes confirmar con "YES_I_UNDERSTAND"');
    }

    await this.wipeService.wipeAll({
      dryRun: body.dryRun ?? false,
      batchSize: body.batchSize,
      concurrency: body.concurrency,
      keep: body.keep,
    });

    return { ok: true, dryRun: body.dryRun ?? false };
  }
}
