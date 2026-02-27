import { Module } from '@nestjs/common';
import { GameProvidersService } from './game-providers.service';
import { GameProvidersController } from './game-providers.controller';
import { DbModule } from 'libs/db/src/db.module';

@Module({
  imports: [DbModule],
  controllers: [GameProvidersController],
  providers: [GameProvidersService],
  exports: [GameProvidersService],
})
export class GameProvidersModule {}
