import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsentService, ConsentType } from '../services/consent.service';

export const REQUIRED_CONSENTS_KEY = 'requiredConsents';
export const RequiredConsents = (...consents: ConsentType[]) =>
  SetMetadata(REQUIRED_CONSENTS_KEY, consents);

@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private consentService: ConsentService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredConsents = this.reflector.getAllAndOverride<ConsentType[]>(
      REQUIRED_CONSENTS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredConsents || requiredConsents.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has all required consents
    for (const consentType of requiredConsents) {
      const hasConsent = await this.consentService.hasConsent(user.id, consentType);
      if (!hasConsent) {
        throw new ForbiddenException(
          `Missing required consent: ${consentType}. Please update your privacy preferences.`,
        );
      }
    }

    return true;
  }
}