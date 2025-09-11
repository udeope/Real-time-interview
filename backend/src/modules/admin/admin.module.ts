import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DatabaseService } from '../../config/database.config';

@Module({
  controllers: [AdminController],
  providers: [AdminService, DatabaseService],
  exports: [AdminService],
})
export class AdminModule {}