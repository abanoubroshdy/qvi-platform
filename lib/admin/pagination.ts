export type PaginationParams = {
  limit: number;
  offset: number;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export function parsePaginationFromUrl(url: URL): PaginationParams {
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");

  const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  const offsetParsed = offsetRaw ? Number.parseInt(offsetRaw, 10) : 0;

  const limit = Number.isFinite(limitParsed)
    ? Math.min(MAX_LIMIT, Math.max(1, limitParsed))
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(offsetParsed) ? Math.max(0, offsetParsed) : 0;

  return { limit, offset };
}