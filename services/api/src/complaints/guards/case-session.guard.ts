import { CanActivate, Injectable, UnauthorizedException } from '@nestjs/common';

import { TokenService } from '../token.service';

@Injectable()
export class CaseSessionGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: import('@nestjs/common').ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing case session token');
    }

    const payload = this.tokenService.verify(token);
    if (payload.type !== 'case') {
      throw new UnauthorizedException('Invalid case session token');
    }

    request.caseSession = {
      caseId: payload.sub,
      anonId: payload.anonId,
    };

    return true;
  }
}
