import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfig {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('API_PORT', 3100);
  }

  get host(): string {
    return this.configService.get<string>('API_HOST', '0.0.0.0');
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  get jwtSecret(): string {
    return this.configService.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '15m');
  }

  get jwtRefreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  get s3Endpoint(): string {
    return this.configService.getOrThrow<string>('S3_ENDPOINT');
  }

  get s3Region(): string {
    return this.configService.get<string>('S3_REGION', 'us-east-1');
  }

  get s3Bucket(): string {
    return this.configService.getOrThrow<string>('S3_BUCKET');
  }

  get s3AccessKey(): string {
    return this.configService.getOrThrow<string>('S3_ACCESS_KEY');
  }

  get s3SecretKey(): string {
    return this.configService.getOrThrow<string>('S3_SECRET_KEY');
  }

  get jobsSchema(): string {
    return this.configService.get<string>('JOBS_SCHEMA', 'xc_jobs');
  }

  get corsOrigins(): string[] {
    const raw = this.configService.get<string>('CORS_ORIGINS', 'http://localhost:3210');
    return raw.split(',').map((s) => s.trim());
  }

  get throttleTtl(): number {
    return this.configService.get<number>('THROTTLE_TTL_SECONDS', 60);
  }

  get throttleLimit(): number {
    return this.configService.get<number>('THROTTLE_LIMIT', 100);
  }
}
