import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ChipsService } from './chips.service';
import { AdjustChipsDto } from './dto/adjust-chips.dto';

@Controller('admin/chips')
export class ChipsController {
  constructor(private readonly chips: ChipsService) {}

  /**
   * POST /admin/chips/adjust
   * Ajusta fichas de una wallet (CREDIT/DEBIT).
   */
  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  async adjust(@Body() dto: AdjustChipsDto) {
    const result = await this.chips.adjust(dto);
    return {
      ok: true,
      idempotent: result.idempotent,
      wallet: result.wallet,
      ledger: result.ledger,
    };
  }
}
