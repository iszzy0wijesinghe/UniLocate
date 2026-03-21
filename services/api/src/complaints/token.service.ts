import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type BasePayload = {
  type: 'admin' | 'case';
  sub: string;
  role?: string;
  anonId?: string;
  exp?: number;
  iat?: number;
};

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(
    payload: Omit<BasePayload, 'exp' | 'iat'>,
    expiresInSeconds: number,
  ): { token: string; expiresAt: string } {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const token = this.jwtService.sign(payload, {
      expiresIn: expiresInSeconds,
    });

    return {
      token,
      expiresAt,
    };
  }

  verify(token: string): BasePayload {
    try {
      return this.jwtService.verify<BasePayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
