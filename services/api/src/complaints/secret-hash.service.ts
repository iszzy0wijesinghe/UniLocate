import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

type Argon2Lib = {
  hash(value: string): Promise<string>;
  verify(hash: string, value: string): Promise<boolean>;
};

@Injectable()
export class SecretHashService {
  private readonly argon2: Argon2Lib | null = this.loadArgon2();

  private loadArgon2(): Argon2Lib | null {
    try {
      return require('argon2') as Argon2Lib;
    } catch {
      return null;
    }
  }

  async hash(value: string): Promise<string> {
    if (this.argon2) {
      return this.argon2.hash(value);
    }

    const digest = createHash('sha256').update(value).digest('hex');
    return `dev-sha256:${digest}`;
  }

  async verify(hash: string, value: string): Promise<boolean> {
    if (this.argon2) {
      return this.argon2.verify(hash, value);
    }

    return hash === (await this.hash(value));
  }
}
