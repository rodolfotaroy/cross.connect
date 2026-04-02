// Re-export PrismaClient and all generated types so consumers
// import from '@xc/db' rather than from the generated path directly.
// Run `pnpm --filter @xc/db db:generate` before this resolves.
export type * from './generated/client';
export { Prisma, PrismaClient } from './generated/client';

