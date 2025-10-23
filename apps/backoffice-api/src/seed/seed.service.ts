import { UserCommonService } from '@domain/users/users.service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly userCommon: UserCommonService) {}

  async seed() {
    await this.userCommon.createUser(
      'codigo1@dota.click',
      '11111111',
      'MX',
      '',
      'left',
    );
  }
}
