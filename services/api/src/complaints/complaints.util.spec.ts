import { classifySeverity, generateAnonId, generateSecret } from './complaints.util';
import { SecretHashService } from './secret-hash.service';

describe('complaints credentials', () => {
  it('generates unique anonymous IDs and strong secrets', async () => {
    const anonId = generateAnonId(['ANON-12345']);
    const secret = generateSecret();
    const hashService = new SecretHashService();
    const hash = await hashService.hash(secret);

    expect(anonId).toMatch(/^ANON-\d{5}$/);
    expect(secret).toHaveLength(32);
    await expect(hashService.verify(hash, secret)).resolves.toBe(true);
    await expect(hashService.verify(hash, `${secret}x`)).resolves.toBe(false);
  });
});

describe('severity classifier', () => {
  it('escalates critical keywords', () => {
    expect(classifySeverity('I am thinking about suicide after repeated threats')).toBe(
      'CRITICAL',
    );
  });

  it('marks violent or ragging complaints as high severity', () => {
    expect(classifySeverity('This ragging incident felt unsafe and threatening')).toBe('HIGH');
  });
});
