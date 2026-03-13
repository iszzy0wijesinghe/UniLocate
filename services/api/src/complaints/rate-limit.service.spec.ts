import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  it('blocks after the configured limit', async () => {
    const service = new RateLimitService();

    for (let count = 0; count < 4; count += 1) {
      expect((await service.consume('submit:1.1.1.1', 5, 1000)).allowed).toBe(true);
    }

    const fifth = await service.consume('submit:1.1.1.1', 5, 1000);
    const sixth = await service.consume('submit:1.1.1.1', 5, 1000);

    expect(fifth.allowed).toBe(true);
    expect(fifth.requiresChallenge).toBe(true);
    expect(sixth.allowed).toBe(false);
  });
});
