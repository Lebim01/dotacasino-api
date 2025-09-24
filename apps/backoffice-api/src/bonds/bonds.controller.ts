import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BondsService } from './bonds.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { USER_ROLES } from '../auth/auth.constants';
import { JwtAuthGuard } from '@security/jwt.guard';
import { Roles } from '@security/roles.decorator';

@Controller('bonds')
export class BondsController {
  constructor(private readonly bondsService: BondsService) {}

  @Post('pay-direct-sale')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  async payDirectSale(@Body() body: any) {
    return this.bondsService.execUserDirectBond(
      body.registerUserId,
      body.membership_price,
    );
  }
}
