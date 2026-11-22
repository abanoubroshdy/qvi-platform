/** Cloudflare Web Analytics (RUM) via Account GraphQL. */

export const CF_GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";

/** Cloudflare samples RUM; keep windows within typical dashboard limits. */
export const TRAFFIC_MAX_RANGE_DAYS = 31;
export const TRAFFIC_TOP_LIMIT = 15;

export type TrafficBreakdownRow = {
  label: string;
  pageViews: number;
  visits: number;
};

export type TrafficSummary = {
  visits: number;
  pageViews: number;
  since: string;
  until: string;
  configured: boolean;
  topPages: TrafficBreakdownRow[];
  topCountries: TrafficBreakdownRow[];
  /** Present when the requested window was shortened. */
  rangeClamped?: boolean;
  graphqlErrors?: string[];
};

export function resolveCloudflareAnalyticsConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): { token: string; accountId: string; siteTag: string } | null {
  const token = env.CF_ANALYTICS_API_TOKEN?.trim();
  const accountId = env.CF_ACCOUNT_ID?.trim();
  const siteTag = env.CF_WEB_ANALYTICS_SITE_TAG?.trim();
  if (!token || !accountId || !siteTag) return null;
  return { token, accountId, siteTag };
}

export function clampTrafficWindow(
  since: string,
  until: string,
  maxDays = TRAFFIC_MAX_RANGE_DAYS,
): { since: string; until: string; clamped: boolean } {
  const untilMs = new Date(until).getTime();
  const sinceMs = new Date(since).getTime();
  if (Number.isNaN(untilMs) || Number.isNaN(sinceMs)) {
    return { since, until, clamped: false };
  }
  const maxMs = maxDays * 24 * 60 * 60 * 1000;
  if (untilMs - sinceMs <= maxMs) {
    return { since, until, clamped: false };
  }
  const clampedSince = new Date(untilMs - maxMs).toISOString();
  return { since: clampedSince, until, clamped: true };
}

function defaultWindow(): { since: string; until: string } {
  const until = new Date();
  const since = new Date(until.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { since: since.toISOString(), until: until.toISOString() };
}

const TRAFFIC_RUM_QUERY = `
  query AdminRumTraffic(
    $accountTag: String!
    $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!
    $topLimit: Int!
  ) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        totals: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 1) {
          count
          sum {
            visits
          }
        }
        topPages: rumPageloadEventsAdaptiveGroups(
          filter: $filter
          limit: $topLimit
          orderBy: [count_DESC]
        ) {
          count
          sum {
            visits
          }
          dimensions {
            requestPath
          }
        }
        topCountries: rumPageloadEventsAdaptiveGroups(
          filter: $filter
          limit: $topLimit
          orderBy: [count_DESC]
        ) {
          count
          sum {
            visits
          }
          dimensions {
            countryName
          }
        }
      }
    }
  }
`;

type RumGroup = {
  count?: number | null;
  sum?: { visits?: number | null } | null;
  dimensions?: {
    requestPath?: string | null;
    countryName?: string | null;
  } | null;
};

function parseRumGroups(groups: RumGroup[] | null | undefined): { pageViews: number; visits: number } {
  let pageViews = 0;
  let visits = 0;
  for (const row of groups ?? []) {
    pageViews += Number(row.count) || 0;
    visits += Number(row.sum?.visits) || 0;
  }
  return { pageViews, visits };
}

function mapDimensionRows(
  groups: RumGroup[] | null | undefined,
  pickLabel: (dimensions: RumGroup["dimensions"]) => string,
): TrafficBreakdownRow[] {
  return (groups ?? [])
    .map((row) => ({
      label: pickLabel(row.dimensions) || "—",
      pageViews: Number(row.count) || 0,
      visits: Number(row.sum?.visits) || 0,
    }))
    .filter((row) => row.label !== "—" || row.pageViews > 0);
}

export function formatGraphqlErrors(errors: Array<{ message?: string }> | undefined): string[] {
  return (errors ?? []).map((entry) => entry.message?.trim() || "Unknown GraphQL error.").filter(Boolean);
}

export async function fetchTrafficSummary(
  options?: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
    since?: string;
    until?: string;
    topLimit?: number;
  },
): Promise<TrafficSummary> {
  const env = options?.env ?? (process.env as Record<string, string | undefined>);
  const config = resolveCloudflareAnalyticsConfig(env);
  const window = defaultWindow();
  const requestedSince = options?.since ?? window.since;
  const requestedUntil = options?.until ?? window.until;
  const { since, until, clamped } = clampTrafficWindow(requestedSince, requestedUntil);
  const topLimit = Math.min(Math.max(options?.topLimit ?? TRAFFIC_TOP_LIMIT, 1), 100);

  const empty: TrafficSummary = {
    visits: 0,
    pageViews: 0,
    since,
    until,
    configured: false,
    topPages: [],
    topCountries: [],
    rangeClamped: clamped || undefined,
  };

  if (!config) return empty;

  const filter = {
    AND: [
      { datetime_geq: since, datetime_leq: until },
      { siteTag: config.siteTag },
      { bot: 0 },
    ],
  };

  const fetchImpl = options?.fetchImpl ?? fetch;
  const response = await fetchImpl(CF_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: TRAFFIC_RUM_QUERY,
      variables: {
        accountTag: config.accountId,
        filter,
        topLimit,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare analytics request failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    errors?: Array<{ message?: string }>;
    data?: {
      viewer?: {
        accounts?: Array<{
          totals?: RumGroup[] | null;
          topPages?: RumGroup[] | null;
          topCountries?: RumGroup[] | null;
        } | null> | null;
      } | null;
    } | null;
  };

  const graphqlErrors = formatGraphqlErrors(payload.errors);
  if (graphqlErrors.length) {
    throw new Error(graphqlErrors.join("; "));
  }

  const account = payload.data?.viewer?.accounts?.[0];
  if (!account) {
    return {
      ...empty,
      configured: true,
      graphqlErrors: ["No account data in GraphQL response."],
    };
  }

  const totals = parseRumGroups(account.totals);
  const topPages = mapDimensionRows(account.topPages, (d) => d?.requestPath?.trim() ?? "");
  const topCountries = mapDimensionRows(account.topCountries, (d) => d?.countryName?.trim() ?? "");

  return {
    visits: totals.visits,
    pageViews: totals.pageViews,
    since,
    until,
    configured: true,
    topPages,
    topCountries,
    rangeClamped: clamped || undefined,
    graphqlErrors: undefined,
  };
}