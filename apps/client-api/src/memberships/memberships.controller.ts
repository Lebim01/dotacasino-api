import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';

@ApiTags('Memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Get()
  @ApiOkResponse({
    description: 'Get memberships',
  })
  async list() {
    return [
      {
        id: 'p-100',
        name: 'Basic',
        benefits: [
          'Generates up to 10x points (1K)',
          'Unlock 7% of second level'
        ]
      },
      {
        id: 'p-500',
        name: 'Advanced',
        benefits: [
          'Generates up to 10x points (5K)',
          'Unlock 7% of thrid level'
        ]
      },
      {
        id: 'p-1000',
        name: 'Pro',
        benefits: [
          'Generates up to 10x points (10K)',
          'Unlock 7% of fourth level'
        ]
      }
    ]
  }
}
