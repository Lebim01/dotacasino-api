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
import { db } from '../firebase/admin';
import { firestore } from 'firebase-admin';
import { PayloadAssignBinaryPosition } from './types';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
} from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { HasRoles } from '../auth/roles/roles.decorator';
import { USER_ROLES } from '../auth/auth.constants';
import { RolesGuard } from '../auth/roles/roles.guard';
import { HttpGoogleTaskInterceptor } from '../auth/interceptors/google-task';
import { MEMBERSHIP_PRICES } from '../constants';
import { sleep } from '../utils/firebase';
import { Memberships } from '../types';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  @ApiExcludeEndpoint()
  @Get('isActiveUser')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Check user status [SYSTEM]' })
  isActiveUser(@Query('idUser') idUser: string) {
    return this.subscriptionService.isActiveUser(idUser);
  }

  @ApiExcludeEndpoint()
  @Post('activeWithoutVolumen')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Active without volumen [ADMIN]' })
  async activeWithoutVolumen(@Body() body: any) {
    if (!body.email) throw new Error('email required');
    if (!body.membership) throw new Error('membership required');

    const res = await db
      .collection('users')
      .where('email', '==', body.email)
      .get();

    const user_id = res.docs[0].id;
    const user = await db.collection('users').doc(user_id).get();

    if (user.get('is_new')) {
      await db
        .collection('users')
        .doc(user.get('sponsor_id'))
        .update({
          count_direct_people: firestore.FieldValue.increment(1),
        });
    }

    await db.collection('admin-activations').add({
      id_user: user.id,
      name: user.get('name'),
      email: user.get('email'),
      created_at: new Date(),
      membership: body.membership,
    });

    await sleep(3000);

    await this.subscriptionService.assingMembership(
      user.id,
      body.membership,
      null,
      false,
      false,
    );

    if (!user.get('parent_binary_user_id')) {
      await this.subscriptionService.assignBinaryPosition(
        {
          id_user: user.id,
          txn_id: '',
          points: MEMBERSHIP_PRICES[body.membership as Memberships],
        },
        false,
      );
    }

    return {
      status: 200,
    };
  }

  @ApiExcludeEndpoint()
  @Post('activeWithVolumen')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Active with volumen [ADMIN]' })
  async activeWithVolumen(@Body() body: any) {
    if (!body.email) throw new Error('email required');
    if (!body.membership) throw new Error('membership required');

    const user = await db
      .collection('users')
      .where('email', '==', body.email)
      .get()
      .then((r) => (r.empty ? null : r.docs[0]));

    if (user?.exists) {
      await db.collection('admin-activations-with-volume').add({
        id: user.id,
        membership: body.membership,
        email: user.get('email'),
        name: user.get('name') || '',
        last_name: user.get('last_name') || '',
        created_at: new Date(),
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
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Inactive an user [ADMIN]' })
  async inactiveUser(@Body() body: any) {
    if (!body.user_id) throw new Error('user_id required');

    await db
      .collection('admin-inactive-user')
      .add({ ...body, created_at: new Date() });

    await db.collection('users').doc(body.user_id).update({
      membership_expires_at: new Date(),
      membership_status: 'expired',
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
    return this.subscriptionService.assignBinaryPosition(body);
  }

  @ApiExcludeEndpoint()
  @Post('ipn')
  async ipn(@Body() body: any) {
    if (!body.txn_id) throw new Error('INVALID');

    const txn = await db
      .collection('disruptive-academy')
      .doc(body.txn_id)
      .get();

    if (
      !txn.exists ||
      !['paid', 'admin-activation'].includes(txn.get('payment_status')) ||
      txn.get('process_status') == 'completed'
    ) {
      return 'INVALID';
    }

    await this.subscriptionService.onPaymentMembership(
      txn.get('user_id'),
      txn.get('membership_type'),
      txn.id,
      txn.get('payment_status') == 'admin-activation'
        ? txn.get('volumen')
        : true,
    );

    await txn.ref.update({
      process_status: 'completed',
    });
  }
}
