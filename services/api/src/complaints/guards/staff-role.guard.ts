import {
  CanActivate,
  ForbiddenException,
  Injectable,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { StaffRole } from '../complaints.types';

@Injectable()
export class StaffRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles =
      this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const currentRole = request.admin?.role as StaffRole | undefined;
    if (!currentRole || !roles.includes(currentRole)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
