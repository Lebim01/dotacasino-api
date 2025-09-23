import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { currentMultiplier } from 'apps/backoffice-api/src/utils/deposits';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { db } from 'apps/backoffice-api/src/firebase/admin';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('current-multiplier')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async currentMultiplier(@CurrentUser() user: { userId: string }) {
    const userpsql = await this.users.getUserById(user.userId);
    return currentMultiplier(userpsql!.firebaseId);
  }

  @Get('current-membership')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async currentmembership(@CurrentUser() user: { userId: string }) {
    const userpsql = await this.users.getUserById(user.userId);
    const userfb = await db.collection('users').doc(userpsql!.firebaseId).get();
    return {
      membership: userfb.get('membership'),
    };
  }

  @Get('/:code')
  @ApiOkResponse({
    description: 'Get user reference',
  })
  async reference(@Param('code') code: string) {
    return this.users.getReferenceCode(code);
  }
}
