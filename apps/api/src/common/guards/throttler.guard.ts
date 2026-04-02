import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler guard that tracks rate limits per authenticated user ID
 * instead of per client IP address.
 *
 * The global ThrottlerGuard runs before controller-level JwtAuthGuard so
 * req.user is not yet populated.  We decode the JWT payload directly (no
 * signature verification needed — just to derive a stable throttle key).
 *
 * Falls back to IP tracking for unauthenticated requests (e.g. /auth/login).
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const authHeader: string | undefined = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = this.decodeJwtPayload(authHeader.slice(7));
      if (payload?.sub) {
        return String(payload.sub);
      }
    }
    return req.ip ?? 'anonymous';
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const json = Buffer.from(parts[1], 'base64url').toString('utf-8');
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

