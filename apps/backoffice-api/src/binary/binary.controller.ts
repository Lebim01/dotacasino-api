import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
} from '@nestjs/swagger';
import { USER_ROLES } from '../auth/auth.constants';
import { BinaryService } from '../binary/binary.service';
import { db } from '../firebase/admin';
import { JwtAuthGuard } from '@security/jwt.guard';
import { Roles } from '@security/roles.decorator';
import { CurrentUser } from '@security/current-user.decorator';

@Controller('binary')
export class BinaryController {
  constructor(private readonly binaryService: BinaryService) {}

  @ApiExcludeEndpoint()
  @Post('/corte-manual')
  @ApiOperation({ summary: '[ADMIN]' })
  async cortemanual() {
    const users = await db
      .collection('users')
      .where('left_points', '>', 0)
      .where('right_points', '>', 0)
      .get();

    const response = await Promise.allSettled(
      users.docs.map((u) => this.binaryService.matchBinaryPoints(u.id)),
    );

    console.log('corte binario manual', response);

    return response;
  }

  @ApiExcludeEndpoint()
  @Post('/match-points')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: '[ADMIN]' })
  async matchPoints(@Body() body: { userId: string }) {
    await this.binaryService.matchBinaryPoints(body.userId);
    return { success: true, message: 'Points matched successfully.' };
  }

  @ApiExcludeEndpoint()
  @Post('/pay')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
  @ApiOperation({ summary: '[ADMIN]' })
  async payBinary(@Body() body: { registerUserId: string; points: number }) {
    if (!body.registerUserId) throw new Error('registerUserId required');
    if (!body.points) throw new Error('points required');
    return this.binaryService.increaseBinaryPoints(
      body.registerUserId,
      body.points,
    );
  }

  @Get('get-tree/:userid')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user binary tree' })
  gettree(
    @CurrentUser() user: { userId: string },
    @Param('userid') userid: string,
  ) {
    return this.binaryService.getBinaryUsers(user.userId, userid, 3, 1, {});
  }

  @Delete('delete-points')
  deletepoints() {
    return this.binaryService.deleteExpiredPoints();
  }
}
