import { CanActivate, Injectable, UnauthorizedException } from '@nestjs/common';

import { TokenService } from '../token.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: import('@nestjs/common').ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing admin token');
    }

    const payload = this.tokenService.verify(token);
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid admin token');
    }

    request.admin = {
      id: payload.sub,
      role: payload.role,
    };

    return true;
  }
}
