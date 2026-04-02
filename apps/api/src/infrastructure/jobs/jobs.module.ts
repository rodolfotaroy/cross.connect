import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../../app.config';
import { JobsService } from './jobs.service';

@Global()
@Module({
  providers: [JobsService, AppConfig],
  exports: [JobsService],
})
export class JobsModule {}
