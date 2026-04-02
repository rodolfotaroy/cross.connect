import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as PgBoss from 'pg-boss';
import { AppConfig } from '../../app.config';

export type JobHandler<T extends object> = (job: PgBoss.Job<T>) => Promise<void>;

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private boss: PgBoss;
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly config: AppConfig) {}

  async onModuleInit() {
    this.boss = new PgBoss({
      connectionString: this.config.databaseUrl,
      schema: this.config.jobsSchema,
    });
    this.boss.on('error', (err) => this.logger.error('pg-boss error', err));
    await this.boss.start();
    this.logger.log('Job queue started');
  }

  async onModuleDestroy() {
    await this.boss.stop();
    this.logger.log('Job queue stopped');
  }

  async send<T extends object>(
    queue: string,
    data: T,
    options?: PgBoss.SendOptions,
  ): Promise<string | null> {
    return options ? this.boss.send(queue, data, options) : this.boss.send(queue, data);
  }

  async sendAfter<T extends object>(
    queue: string,
    data: T,
    afterDate: Date,
  ): Promise<string | null> {
    return this.boss.send(queue, data, { startAfter: afterDate });
  }

  async work<T extends object>(queue: string, handler: JobHandler<T>): Promise<void> {
    await this.boss.work<T>(queue, (jobs) => handler(jobs[0]));
  }
}
