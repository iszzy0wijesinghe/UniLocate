import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LostFoundModule } from './lost-found/lost-found.module';

@Module({
  imports: [LostFoundModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
