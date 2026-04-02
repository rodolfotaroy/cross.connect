import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../../app.config';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [StorageService, AppConfig],
  exports: [StorageService],
})
export class StorageModule {}
