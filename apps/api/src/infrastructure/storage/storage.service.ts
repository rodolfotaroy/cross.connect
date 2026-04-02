import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfig } from '../../app.config';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: S3Client;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: AppConfig) {}

  onModuleInit() {
    this.client = new S3Client({
      endpoint: this.config.s3Endpoint,
      region: this.config.s3Region,
      credentials: {
        accessKeyId: this.config.s3AccessKey,
        secretAccessKey: this.config.s3SecretKey,
      },
      forcePathStyle: true, // required for MinIO and most S3-compatible services
    });
    this.logger.log(`Storage connected to ${this.config.s3Endpoint}`);
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.s3Bucket, Key: key }),
    );
  }

  buildKey(docType: string, entityId: string, filename: string): string {
    const timestamp = Date.now();
    return `${docType}/${entityId}/${timestamp}-${filename}`;
  }
}
