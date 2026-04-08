import { z } from 'zod';

// Enhanced email validation
const emailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must be less than 254 characters')
  .toLowerCase()
  .trim();

// Enhanced password validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Enhanced validation schemas
export const enhancedRegisterBody = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const enhancedLoginBody = z.object({
  email: emailSchema,
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters')
});

// Sanitization helper
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

// Rate limit bypass check for development
export function shouldBypassRateLimit(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.BYPASS_RATE_LIMIT === 'true';
}
