import { Module } from '@nestjs/common';
import { LostFoundController } from './lost-found.controller';
import { LostFoundService } from './lost-found.service';

@Module({
  controllers: [LostFoundController],
  providers: [LostFoundService],
})
export class LostFoundModule {}

