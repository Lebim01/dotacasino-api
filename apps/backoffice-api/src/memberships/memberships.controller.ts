import { Controller, Get } from '@nestjs/common';
import { memberships_object } from '../constants';

@Controller('memberships')
export class MembershipsController {
  @Get('')
  getmemberships() {
    return Object.keys(memberships_object).map((key) => ({
      label: memberships_object[key as Memberships].display,
      value: key,
    }));
  }
}
