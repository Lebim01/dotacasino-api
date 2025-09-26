import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';
import { CurrentUser } from '@security/current-user.decorator';
import { UserCommonService } from '@domain/users/users.service';

@ApiTags('Memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(
    private readonly service: MembershipsService,
    private readonly users: UserCommonService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Get memberships',
  })
  async list(@CurrentUser() _user: { userId?: string }) {
    let current_membership = 'free';
    if (_user && _user.userId) {
      const user = await this.users.getUserByIdFirebase(_user.userId);
      current_membership = user.get('membership');
      if (user.get('membership_status') != 'paid') {
        current_membership = 'free';
      }
    }
    return [
      {
        id: 'p-100',
        name: 'Basic',
        benefits: [
          'Generates up to 10x points (1K)',
          'Unlock 7% of second level',
        ],
        active: current_membership == 'free',
      },
      {
        id: 'p-500',
        name: 'Advanced',
        benefits: [
          'Generates up to 10x points (5K)',
          'Unlock 7% of thrid level',
        ],
        active: current_membership == 'free' || current_membership == 'p-100',
      },
      {
        id: 'p-1000',
        name: 'Pro',
        benefits: [
          'Generates up to 10x points (10K)',
          'Unlock 7% of fourth level',
        ],
        active:
          current_membership == 'free' ||
          current_membership == 'p-100' ||
          current_membership == 'p-500',
      },
    ];
  }
}
