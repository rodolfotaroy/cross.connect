// Shared TypeScript enums, domain types, and Zod schemas.
// Both the API and the web app import from here.
//
// Strategy:
//   - Enums: plain TypeScript const enums (not tied to Prisma generated types)
//   - Domain types: TypeScript interfaces for read-model shapes (API responses)
//   - API contracts: Zod schemas for request/response validation

export * from './api/index';
export * from './domain/cross-connects';
export * from './domain/locations';
export * from './domain/organizations';
export * from './domain/work-orders';
export * from './enums';
export * from './lifecycles';
