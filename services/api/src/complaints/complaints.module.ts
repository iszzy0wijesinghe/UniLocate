import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

import { AttachmentService } from './attachment.service';
import { ComplaintsAdminController } from './complaints-admin.controller';
import { ComplaintsAuthController } from './complaints-auth.controller';
import { ComplaintsPublicController } from './complaints-public.controller';
import { ComplaintsService } from './complaints.service';
import { RateLimitService } from './rate-limit.service';
import { SecretHashService } from './secret-hash.service';
import { TokenService } from './token.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { CaseSessionGuard } from './guards/case-session.guard';
import { StaffRoleGuard } from './guards/staff-role.guard';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    JwtModule.register({
      global: false,
      secret:
        process.env.JWT_SECRET ??
        process.env.COMPLAINTS_TOKEN_SECRET ??
        'complaints-local-secret',
      signOptions: {
        algorithm: 'HS256',
      },
    }),
  ],
  controllers: [
    ComplaintsPublicController,
    ComplaintsAuthController,
    ComplaintsAdminController,
  ],
  providers: [
    ComplaintsService,
    SecretHashService,
    TokenService,
    RateLimitService,
    AttachmentService,
    PrismaService,
    AdminAuthGuard,
    CaseSessionGuard,
    StaffRoleGuard,
    Reflector,
  ],
})
export class ComplaintsModule {}
