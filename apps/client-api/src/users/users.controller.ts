import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { currentMultiplier } from 'apps/backoffice-api/src/utils/deposits';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import { UserCommonService } from '@domain/users/users.service';
import { CreateQRDto } from './dto/registeracademy.dto';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { google } from '@google-cloud/tasks/build/protos/protos';
import {
  addToQueue,
  getPathQueue,
} from 'apps/backoffice-api/src/googletask/utils';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly userCommon: UserCommonService,
    private readonly disruptiveService: DisruptiveService,
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

  @Post('qr-membership-polling')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async getqrmembershippolling(
    @CurrentUser() user: { userId: string },
    @Body() body,
  ) {
    const transaction = await this.disruptiveService.getTransactionAcademy(
      body.address,
    );

    if (!transaction) throw new HttpException('not found', 401);

    const status = await this.disruptiveService.validateStatus(
      transaction.get('network'),
      body.address,
    );

    if (status) {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `${process.env.API_URL}/subscriptions/ipn`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(
            JSON.stringify({
              txn_id: transaction.id,
            }),
          ),
        },
      };
      await addToQueue(task, getPathQueue('active-user-membership'));
    }

    return status ? transaction.get('status') : 'NO';
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

  @Delete('qr-membership')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete current QR payment' })
  async deleteqrmembership(@CurrentUser() user: { userId: string }) {
    return this.userCommon.deleteQRMembership(user.userId);
  }

  @Get('/:code')
  @ApiOperation({ summary: 'Get user data from referalCode' })
  async reference(@Param('code') code: string) {
    return this.users.getReferenceCode(code);
  }
}
