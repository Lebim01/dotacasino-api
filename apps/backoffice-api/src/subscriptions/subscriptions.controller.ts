import {
  Controller,
  Get,
  Query,
  Body,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PayloadAssignBinaryPosition } from './types';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
} from '@nestjs/swagger';
import { USER_ROLES } from '../auth/auth.constants';
import { HttpGoogleTaskInterceptor } from '../auth/interceptors/google-task';
import { MEMBERSHIP_PRICES } from '../constants';
import { Memberships } from '../types';
import { Roles } from '@security/roles.decorator';
import { JwtAuthGuard } from '@security/jwt.guard';
import { PrismaService } from 'libs/db/src/prisma.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionService: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiExcludeEndpoint()
  @Get('isActiveUser')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: 'Check user status [SYSTEM]' })
  isActiveUser(@Query('idUser') idUser: string) {
    return this.subscriptionService.isActiveUser(idUser);
  }

  @ApiExcludeEndpoint()
  @Post('activeWithoutVolumen')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: 'Active without volumen [ADMIN]' })
  async activeWithoutVolumen(@Body() body: any) {
    if (!body.email) throw new Error('email required');
    if (!body.membership) throw new Error('membership required');

    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user) throw new Error('User not found');

    if (user.isNew) {
      await this.prisma.user.update({
        where: { id: user.sponsorId! },
        data: {
          countDirectPeople: { increment: 1 },
        },
      });
    }

    await this.prisma.adminLog.create({
      data: {
        type: 'activation-no-volume',
        userId: user.id,
        data: {
          name: user.displayName,
          email: user.email,
          membership: body.membership,
        },
      },
    });

    await this.subscriptionService.assingMembership(
      user.id,
      body.membership,
      null,
      false,
      false,
    );

    if (!user.parentBinaryUserId) {
      await this.subscriptionService.addQueueBinaryPosition({
        id_user: user.id,
        txn_id: '',
        points: MEMBERSHIP_PRICES[body.membership as Memberships],
      });
    }

    return {
      status: 200,
    };
  }

  @ApiExcludeEndpoint()
  @Post('activeWithVolumen')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: 'Active with volumen [ADMIN]' })
  async activeWithVolumen(@Body() body: any) {
    if (!body.email) throw new Error('email required');
    if (!body.membership) throw new Error('membership required');

    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (user) {
      await this.prisma.adminLog.create({
        data: {
          type: 'activation-volume',
          userId: user.id,
          data: {
            membership: body.membership,
            email: user.email,
            name: user.displayName,
          },
        },
      });

      await this.subscriptionService.onPaymentMembership(
        user.id,
        body.membership,
        null,
        true,
      );
      return 'OK';
    } else {
      throw new Error('User not found');
    }
  }

  @ApiExcludeEndpoint()
  @Post('inactiveUser')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: 'Inactive an user [ADMIN]' })
  async inactiveUser(@Body() body: any) {
    if (!body.user_id) throw new Error('user_id required');

    await this.prisma.adminLog.create({
      data: {
        type: 'inactive-user',
        userId: body.user_id,
        data: body,
      },
    });

    await this.prisma.user.update({
      where: { id: body.user_id },
      data: {
        membershipExpiresAt: new Date(),
        membershipStatus: 'expired',
      },
    });
  }

  @ApiExcludeEndpoint()
  @Post('assignBinaryPosition')
  @UseInterceptors(HttpGoogleTaskInterceptor)
  @ApiOperation({ summary: 'Assign binary position [SYSTEM]' })
  async assignBinaryPosition(
    @Body()
    body: PayloadAssignBinaryPosition,
  ) {
    return this.subscriptionService.addQueueBinaryPosition(body);
  }

  @ApiExcludeEndpoint()
  @Post('ipn')
  async ipn(@Body() body: any) {
    if (!body.txn_id) throw new Error('INVALID');

    const txn = await this.prisma.nodePayment.findUnique({
      where: { id: body.txn_id },
    });

    if (
      !txn ||
      !['paid', 'admin-activation'].includes(txn.paymentStatus!) ||
      txn.processStatus == 'completed'
    ) {
      return 'INVALID';
    }

    await this.subscriptionService.onPaymentMembership(
      txn.userId!,
      txn.type as Memberships,
      txn.id,
      txn.paymentStatus == 'admin-activation'
        ? (txn as any).volumen // Deberíamos asegurar que volumen existe en schema o pasarlo explícitamente
        : true,
    );

    await this.prisma.nodePayment.update({
      where: { id: txn.id },
      data: {
        processStatus: 'completed',
      },
    });
  }
}
