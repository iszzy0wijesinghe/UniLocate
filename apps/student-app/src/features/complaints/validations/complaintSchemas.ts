import { z } from 'zod';

export const createComplaintSchema = z.object({
  title: z.string().min(4, 'Add a short title'),
  category: z.enum([
    'ragging',
    'harassment',
    'mental_health',
    'discrimination',
    'lecturer_behavior',
    'other',
  ]),
  description: z.string().min(20, 'Describe what happened in a little more detail'),
  locationText: z.string().optional(),
  incidentAt: z.string().optional(),
  peopleInvolved: z.string().optional(),
  consent: z
    .boolean()
    .refine((value) => value, 'You must confirm the safety notice and consent.'),
});

export const reconnectSchema = z.object({
  anonId: z.string().regex(/^ANON-\d{5}$/, 'Use the format ANON-12345'),
  secret: z.string().min(24, 'Enter the full secret'),
});

export const identityDisclosureSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  notes: z.string().optional(),
});
