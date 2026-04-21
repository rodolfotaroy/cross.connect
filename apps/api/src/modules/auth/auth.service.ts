import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@xc/db';
import * as bcrypt from 'bcryptjs';
import { AppConfig } from '../../app.config';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const REFRESH_TOKEN_HASH_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: AppConfig,
  ) {}

  async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { org: { select: { name: true } } },
    });
    if (!user || !user.isActive) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return user;
  }

  async login(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.jwtSecret,
        expiresIn: this.config.jwtExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.jwtRefreshExpiresIn as any,
      }),
    ]);

    // Hash the issued refresh token before persisting so a DB leak cannot
    // be replayed.  refreshTokenExpiresAt is parsed from the token itself to
    // allow stale-token pruning without a separate lookup.
    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    const refreshTokenExpiresAt = new Date(decoded.exp * 1000);
    const refreshTokenHash = await bcrypt.hash(refreshToken, REFRESH_TOKEN_HASH_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), refreshTokenHash, refreshTokenExpiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
        orgName: (user as any).org?.name ?? null,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        orgId: true,
        isActive: true,
        refreshTokenHash: true,
        refreshTokenExpiresAt: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user || !user.isActive)
      throw new UnauthorizedException('Account not found or deactivated');

    // Verify the presented token matches the stored hash to detect token reuse
    // after a logout or a previous rotation.
    if (!user.refreshTokenHash) throw new UnauthorizedException('No active refresh token');
    const hashMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!hashMatch) throw new UnauthorizedException('Refresh token has been revoked or rotated');

    // login() issues a fresh pair of tokens AND updates refreshTokenHash, completing rotation.
    return this.login(user as unknown as User);
  }

  async logout(userId: string): Promise<void> {
    // Clearing the stored hash invalidates the refresh token immediately.
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
        org: { select: { id: true, name: true, code: true, orgType: true } },
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return user;
  }
}
