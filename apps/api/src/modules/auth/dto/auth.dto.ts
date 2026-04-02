import { z } from 'zod';

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof LoginDto>;

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenDto>;
