/** Builds the standard paginated response envelope used by all list endpoints. */
export function buildPaginatedMeta(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
