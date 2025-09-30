import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { currentMultiplier } from 'apps/backoffice-api/src/utils/deposits';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import { UserCommonService } from '@domain/users/users.service';
import { CreateQRDto } from './dto/registeracademy.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly userCommon: UserCommonService,
  ) {}

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

  @Get('qr-membership')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async getqrmembership(@CurrentUser() user: { userId: string }) {
    return this.userCommon.getQRMembership(user.userId);
  }

  @Post('create-qr-membership')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateQRDto })
  @ApiOperation({ summary: 'Create QR payment' })
  async createqrmembership(
    @CurrentUser() user: { userId: string },
    @Body() body: CreateQRDto,
  ) {
    await this.userCommon.createMembershipQR(
      user.userId,
      body.membership_type,
      body.network,
    );
    return this.userCommon.getQRMembership(user.userId);
  }

  @Get('/:code')
  @ApiOperation({ summary: 'Get user data from referalCode' })
  async reference(@Param('code') code: string) {
    return this.users.getReferenceCode(code);
  }
}
