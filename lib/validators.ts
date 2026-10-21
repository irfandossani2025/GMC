import { z } from 'zod';

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().optional());

const optionalDate = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  return value;
}, z.coerce.date().optional());

const nullableOptionalDate = z.preprocess((value) => {
  if (value === '' || value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value;
}, z.coerce.date().nullable().optional());

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  active: z.boolean().optional(),
});

export const createMemberSchema = z.object({
  patientId: optionalTrimmedString.pipe(z.string().max(64).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Use letters, numbers, hyphens or underscores for the patient ID.').optional()),
  packageId: optionalTrimmedString.pipe(z.string().max(100).optional()),
  name: z.string().min(2, 'Name is required'),
  email: optionalTrimmedString.pipe(z.string().email('Invalid email').optional()),
  phone: z.string().min(10, 'Invalid phone number'),
  dateOfBirth: optionalDate,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  state: optionalTrimmedString,
  zipCode: optionalTrimmedString,
  bloodGroup: optionalTrimmedString,
  emergencyContact: optionalTrimmedString,
  emergencyPhone: optionalTrimmedString,
  membershipType: z.enum(['STANDARD', 'PREMIUM', 'CORPORATE']).default('STANDARD'),
  expiryDate: z.coerce.date(),
});

export const updateMemberSchema = z.object({
  name: z.string().min(2).optional(),
  email: optionalTrimmedString.pipe(z.string().email().optional()),
  phone: z.string().min(10).optional(),
  dateOfBirth: nullableOptionalDate,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  state: optionalTrimmedString,
  zipCode: optionalTrimmedString,
  bloodGroup: optionalTrimmedString,
  emergencyContact: optionalTrimmedString,
  emergencyPhone: optionalTrimmedString,
  membershipType: z.enum(['STANDARD', 'PREMIUM', 'CORPORATE']).optional(),
  expiryDate: optionalDate,
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED']).optional(),
});

export const generateCardSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
});

export const createTreatmentPackageSchema = z.object({
  treatmentName: z.string().min(2, 'Treatment name is required'),
  category: z.string().min(2, 'Category is required'),
  description: optionalTrimmedString,
  durationMinutes: z.coerce.number().min(1, 'Duration must be at least 1 minute').default(30),
  treatmentPrice: z.coerce.number().min(0, 'Treatment price must be zero or more').default(0),
  packageName: z.string().min(2, 'Package name is required'),
  sessionCount: z.coerce.number().min(1, 'Session count must be at least 1'),
  packagePrice: z.coerce.number().min(0, 'Package price must be zero or more'),
  validityMonths: z.coerce.number().min(1, 'Validity must be at least one month').default(6),
});

export const purchasePackageSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
});

export const processSessionSchema = z.object({
  barcode: optionalTrimmedString,
  memberId: optionalTrimmedString,
  packageId: optionalTrimmedString,
  notes: optionalTrimmedString,
}).refine((value) => Boolean(value.barcode) || Boolean(value.memberId), {
  message: 'Barcode or member identifier is required',
  path: ['barcode'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type GenerateCardInput = z.infer<typeof generateCardSchema>;
export type CreateTreatmentPackageInput = z.infer<typeof createTreatmentPackageSchema>;
export type PurchasePackageInput = z.infer<typeof purchasePackageSchema>;
export type ProcessSessionInput = z.infer<typeof processSessionSchema>;
