import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createClient } from 'redis';

type Bucket = {
  hits: number[];
};

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly buckets = new Map<string, Bucket>();
  private readonly redisUrl = process.env.REDIS_URL;
  private redisClient?: ReturnType<typeof createClient>;
  private redisConnectPromise?: Promise<ReturnType<typeof createClient> | null>;
  private redisWarningShown = false;

  async consume(key: string, limit: number, windowMs: number) {
    const redisResult = await this.consumeWithRedis(key, limit, windowMs);
    if (redisResult) {
      return redisResult;
    }

    return this.consumeInMemory(key, limit, windowMs);
  }

  async onModuleDestroy() {
    if (this.redisClient?.isOpen) {
      await this.redisClient.quit().catch(() => undefined);
    }
  }

  private consumeInMemory(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((timestamp) => now - timestamp < windowMs);
    bucket.hits.push(now);
    this.buckets.set(key, bucket);

    const remaining = Math.max(0, limit - bucket.hits.length);
    const resetAt = new Date((bucket.hits[0] ?? now) + windowMs).toISOString();
    const allowed = bucket.hits.length <= limit;
    const requiresChallenge = bucket.hits.length >= Math.max(1, Math.ceil(limit * 0.8));

    return {
      allowed,
      remaining,
      resetAt,
      requiresChallenge,
    };
  }

  private async consumeWithRedis(key: string, limit: number, windowMs: number) {
    const client = await this.getRedisClient();
    if (!client) {
      return null;
    }

    const namespacedKey = `complaints:rate-limit:${key}`;
    const result = (await client.eval(
      `
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
          redis.call('PEXPIRE', KEYS[1], ARGV[1])
        end
        local ttl = redis.call('PTTL', KEYS[1])
        return { current, ttl }
      `,
      {
        keys: [namespacedKey],
        arguments: [String(windowMs)],
      },
    )) as [number, number];

    const hits = Number(result[0] ?? 0);
    const ttlMs = Math.max(0, Number(result[1] ?? windowMs));
    const remaining = Math.max(0, limit - hits);
    const resetAt = new Date(Date.now() + ttlMs).toISOString();
    const allowed = hits <= limit;
    const requiresChallenge = hits >= Math.max(1, Math.ceil(limit * 0.8));

    return {
      allowed,
      remaining,
      resetAt,
      requiresChallenge,
    };
  }

  private async getRedisClient() {
    if (!this.redisUrl) {
      return null;
    }

    if (this.redisClient?.isOpen) {
      return this.redisClient;
    }

    if (this.redisConnectPromise) {
      return this.redisConnectPromise;
    }

    this.redisConnectPromise = (async () => {
      const client = createClient({ url: this.redisUrl });
      client.on('error', () => undefined);

      try {
        await client.connect();
        this.redisClient = client;
        return client;
      } catch {
        if (!this.redisWarningShown) {
          this.logger.warn('Redis unavailable for complaints rate limiting. Falling back to memory.');
          this.redisWarningShown = true;
        }
        await client.quit().catch(() => undefined);
        return null;
      } finally {
        this.redisConnectPromise = undefined;
      }
    })();

    return this.redisConnectPromise;
  }
}
