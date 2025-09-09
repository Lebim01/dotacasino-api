import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BondsService } from './bonds.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { HasRoles } from '../auth/roles/roles.decorator';
import { USER_ROLES } from '../auth/auth.constants';
import { JWTAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';

@Controller('bonds')
export class BondsController {
  constructor(private readonly bondsService: BondsService) {}

  @Post('pay-direct-sale')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  async payDirectSale(@Body() body: any) {
    return this.bondsService.execUserDirectBond(
      body.registerUserId,
      body.membership_price,
    );
  }
}
