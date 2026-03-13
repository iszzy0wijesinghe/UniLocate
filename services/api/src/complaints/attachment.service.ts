import { BadRequestException, Injectable } from '@nestjs/common';

import type { AttachmentInput } from './complaints.types';
import { sanitizeDisplayFilename } from './complaints.util';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'mp4', 'mp3', 'm4a', 'wav', 'pdf', 'docx'];
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Injectable()
export class AttachmentService {
  readonly maxFileSizeBytes = 50 * 1024 * 1024;
  readonly maxCaseSizeBytes = 300 * 1024 * 1024;

  validateAttachment(input: AttachmentInput): AttachmentInput {
    const ext = input.originalName.split('.').pop()?.toLowerCase() ?? '';

    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(input.mimeType)) {
      throw new BadRequestException('Unsupported attachment type');
    }

    if (input.sizeBytes <= 0 || input.sizeBytes > this.maxFileSizeBytes) {
      throw new BadRequestException('Attachment exceeds 50MB limit');
    }

    return {
      ...input,
      originalName: sanitizeDisplayFilename(input.originalName),
    };
  }

  ensureCaseQuota(currentTotal: number, nextBytes: number) {
    if (currentTotal + nextBytes > this.maxCaseSizeBytes) {
      throw new BadRequestException('Case attachment quota exceeded');
    }
  }

  createSignedUpload(storageKey: string) {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      uploadUrl: `https://storage.example.invalid/upload/${storageKey}`,
      expiresAt,
      headers: {
        'x-malware-scan-hook': 'pending',
      },
    };
  }

  createSignedDownload(storageKey: string) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return {
      downloadUrl: `https://storage.example.invalid/download/${storageKey}`,
      expiresAt,
    };
  }
}
