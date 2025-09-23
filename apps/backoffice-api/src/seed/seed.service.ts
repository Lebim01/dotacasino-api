import { UserCommonService } from '@domain/users/users.service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly userCommon: UserCommonService) {}

  async seed() {
    await this.userCommon.createUser(
      'victoralvarezsaucedo@gmail.com',
      '11111111',
      'MX',
      '',
      'left',
    );
    await this.userCommon.createUser(
      'marcoslevagomez@gmail.com',
      '11111111',
      'MX',
      '',
      'left',
    );
  }
}
