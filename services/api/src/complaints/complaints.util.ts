import type { ComplaintSeverity } from './complaints.types';

const HUMAN_ID_PREFIX = 'ANON-';
const SECRET_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

export const EMERGENCY_RESOURCES = [
  'Campus security hotline',
  'National emergency services',
  'University counseling center crisis intake',
];

export function generateAnonId(existingIds: Iterable<string>): string {
  const seen = new Set(existingIds);

  for (let attempt = 0; attempt < 5000; attempt += 1) {
    const candidate = `${HUMAN_ID_PREFIX}${Math.floor(10000 + Math.random() * 90000)}`;
    if (!seen.has(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique anonymous ID');
}

export function generateSecret(length = 32): string {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * SECRET_ALPHABET.length);
    return SECRET_ALPHABET[index];
  }).join('');
}

export function classifySeverity(text: string): ComplaintSeverity {
  const normalized = text.toLowerCase();
  const criticalKeywords = [
    'self-harm',
    'suicide',
    'kill myself',
    'kill him',
    'kill her',
    'weapon',
    'knife',
    'gun',
    'murder',
    'violence threat',
    'threaten to kill',
    'immediate danger',
  ];
  const highKeywords = [
    'threat',
    'violent',
    'assault',
    'ragging',
    'harass',
    'abuse',
    'unsafe',
    'stalking',
  ];

  if (criticalKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'CRITICAL';
  }

  if (highKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'HIGH';
  }

  if (normalized.trim().length > 280) {
    return 'MED';
  }

  return 'LOW';
}

export function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeDisplayFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120);
}
