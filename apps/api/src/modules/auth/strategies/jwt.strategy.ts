import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../../../app.config';
import type { JwtPayload } from '../../../common/types/jwt-payload.type';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: AppConfig,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  // Verify the user still exists and is active on every authenticated request.
  // This ensures deactivated accounts lose access immediately without waiting
  // for the 15-minute access token TTL to expire.
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, orgId: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is deactivated or does not exist');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };
  }
}
