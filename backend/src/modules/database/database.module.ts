import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../config/database.config';
import { RedisService } from '../../config/redis.config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DatabaseService, RedisService],
  exports: [DatabaseService, RedisService],
})
export class DatabaseModule {}