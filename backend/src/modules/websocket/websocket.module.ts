import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InterviewGateway } from './gateways/interview.gateway';
import { WebSocketAuthService } from './services/websocket-auth.service';
import { SessionManagerService } from './services/session-manager.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { InterviewSessionModule } from '../interview-session/interview-session.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    InterviewSessionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    InterviewGateway,
    WebSocketAuthService,
    SessionManagerService,
  ],
  exports: [InterviewGateway, SessionManagerService],
})
export class WebSocketModule {}