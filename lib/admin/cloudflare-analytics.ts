export type TrafficSummary = {
  visits: number;
  since: string;
  until: string;
  configured: boolean;
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

function defaultWindow(): { since: string; until: string } {
  const until = new Date();
  const since = new Date(until.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { since: since.toISOString(), until: until.toISOString() };
}

const TRAFFIC_QUERY = `
  query AdminWebAnalytics($accountTag: String!, $siteTag: String!, $since: Time!, $until: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        webAnalyticsSites(filter: { siteTag: $siteTag }) {
          total: totals(since: $since, until: $until) {
            visits
          }
        }
      }
    }
  }
`;

export async function fetchTrafficSummary(
  options?: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
    since?: string;
    until?: string;
  },
): Promise<TrafficSummary> {
  const env = options?.env ?? (process.env as Record<string, string | undefined>);
  const config = resolveCloudflareAnalyticsConfig(env);
  const window = defaultWindow();
  const since = options?.since ?? window.since;
  const until = options?.until ?? window.until;

  if (!config) {
    return { visits: 0, since, until, configured: false };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: TRAFFIC_QUERY,
      variables: {
        accountTag: config.accountId,
        siteTag: config.siteTag,
        since,
        until,
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
          webAnalyticsSites?: Array<{
            total?: { visits?: number | null } | null;
          }>;
        }>;
      };
    };
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? "Cloudflare analytics GraphQL error.");
  }

  const visits = payload.data?.viewer?.accounts?.[0]?.webAnalyticsSites?.[0]?.total?.visits ?? 0;

  return {
    visits: Number(visits) || 0,
    since,
    until,
    configured: true,
  };
}