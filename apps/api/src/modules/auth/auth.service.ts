import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@xc/db';
import * as bcrypt from 'bcryptjs';
import { AppConfig } from '../../app.config';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { PrismaService } from '../../infrastructure/database/prisma.service';

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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new NotFoundException('User not found');

    return this.login(user);
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
