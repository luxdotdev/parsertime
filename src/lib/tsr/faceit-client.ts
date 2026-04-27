// FACEIT Data API quirks worth remembering:
//   - /championships/{id} 404s for many active and archived events. Use the
//     match payload's competition_name/organizer_id instead.
//   - Pro players' FACEIT nicknames often differ from their in-game handle
//     (e.g. pge → "pge4"); the exact-nickname endpoint 404s in that case,
//     so fall back to /search/players.
//   - Some endpoints serve Cloudflare interstitials to bare curl but answer
//     Node/Bun fetch normally.

const FACEIT_BASE = "https://open.faceit.com/data/v4";

export class FaceitApiError extends Error {
  readonly status: number;
  readonly path: string;
  constructor(status: number, path: string, body: string) {
    super(`FACEIT ${status} ${path}: ${body.slice(0, 300)}`);
    this.status = status;
    this.path = path;
  }
}

export type FaceitClientOptions = {
  apiKey?: string;
  baseUrl?: string;
};

function getApiKey(opts?: FaceitClientOptions): string {
  const key = opts?.apiKey ?? process.env.FACEIT_API_KEY;
  if (!key) {
    throw new Error("FACEIT_API_KEY not configured");
  }
  return key;
}

async function faceitFetch<T>(
  path: string,
  opts?: FaceitClientOptions
): Promise<T> {
  const base = opts?.baseUrl ?? FACEIT_BASE;
  const res = await fetch(`${base}${path}`, {
    headers: {
      Authorization: `Bearer ${getApiKey(opts)}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new FaceitApiError(res.status, path, body);
  }
  return (await res.json()) as T;
}

export type FaceitPlayerLookupResult = {
  player_id: string;
  nickname: string;
  country?: string;
  verified?: boolean;
  games?: Record<
    string,
    {
      game_player_id?: string;
      game_player_name?: string;
      region?: string;
      skill_level?: number | string;
    }
  >;
};

export async function lookupPlayerByNickname(
  nickname: string,
  opts?: FaceitClientOptions
): Promise<FaceitPlayerLookupResult | null> {
  try {
    return await faceitFetch<FaceitPlayerLookupResult>(
      `/players?nickname=${encodeURIComponent(nickname)}&game=ow2`,
      opts
    );
  } catch (err) {
    if (err instanceof FaceitApiError && err.status === 404) return null;
    throw err;
  }
}

export async function lookupPlayerByBattletag(
  battletag: string,
  opts?: FaceitClientOptions
): Promise<FaceitPlayerLookupResult | null> {
  try {
    return await faceitFetch<FaceitPlayerLookupResult>(
      `/players?game=ow2&game_player_id=${encodeURIComponent(battletag)}`,
      opts
    );
  } catch (err) {
    if (err instanceof FaceitApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getPlayerById(
  playerId: string,
  opts?: FaceitClientOptions
): Promise<FaceitPlayerLookupResult> {
  return faceitFetch<FaceitPlayerLookupResult>(`/players/${playerId}`, opts);
}

export type FaceitPlayerSearchItem = {
  player_id: string;
  nickname: string;
  country?: string;
  verified?: boolean;
  games?: { name: string; skill_level?: number | string }[];
};

export type FaceitPlayerSearchResponse = {
  items: FaceitPlayerSearchItem[];
};

export async function searchPlayers(
  query: string,
  opts?: FaceitClientOptions
): Promise<FaceitPlayerSearchItem[]> {
  const data = await faceitFetch<FaceitPlayerSearchResponse>(
    `/search/players?nickname=${encodeURIComponent(query)}&game=ow2&offset=0&limit=20`,
    opts
  );
  return (data.items ?? []).filter((p) =>
    p.games?.some((g) => g.name === "ow2")
  );
}

export type FaceitHistoryItem = {
  match_id: string;
  competition_id?: string;
  competition_type?: string;
  competition_name?: string;
  organizer_id?: string;
  status?: string;
  finished_at?: number;
  started_at?: number;
};

export type FaceitHistoryResponse = {
  items: FaceitHistoryItem[];
  start: number;
  end: number;
};

const HISTORY_PAGE_LIMIT = 100;

export async function* iteratePlayerHistory(
  playerId: string,
  opts?: FaceitClientOptions & { maxPages?: number }
): AsyncGenerator<FaceitHistoryItem, void, unknown> {
  const maxPages = opts?.maxPages ?? 50;
  for (let page = 0; page < maxPages; page++) {
    const offset = page * HISTORY_PAGE_LIMIT;
    const data = await faceitFetch<FaceitHistoryResponse>(
      `/players/${playerId}/history?game=ow2&offset=${offset}&limit=${HISTORY_PAGE_LIMIT}`,
      opts
    );
    if (!data.items?.length) return;
    for (const item of data.items) yield item;
    if (data.items.length < HISTORY_PAGE_LIMIT) return;
  }
}

export async function getPlayerHistory(
  playerId: string,
  opts?: FaceitClientOptions & { maxPages?: number }
): Promise<FaceitHistoryItem[]> {
  const all: FaceitHistoryItem[] = [];
  for await (const item of iteratePlayerHistory(playerId, opts)) {
    all.push(item);
  }
  return all;
}

export type FaceitMatchDetail = {
  match_id: string;
  competition_id?: string;
  competition_type?: string;
  competition_name?: string;
  organizer_id?: string;
  region?: string;
  status: string;
  best_of?: number;
  finished_at?: number;
  started_at?: number;
  results?: {
    winner?: string;
    score?: { faction1?: number; faction2?: number };
  };
  teams?: {
    faction1?: {
      name?: string;
      roster?: { player_id: string; nickname: string }[];
    };
    faction2?: {
      name?: string;
      roster?: { player_id: string; nickname: string }[];
    };
  };
};

export async function getMatch(
  matchId: string,
  opts?: FaceitClientOptions
): Promise<FaceitMatchDetail> {
  return faceitFetch<FaceitMatchDetail>(`/matches/${matchId}`, opts);
}

export type FaceitChampionshipListItem = {
  championship_id: string;
  name: string;
  organizer_id: string;
  game_id?: string;
  region?: string;
  start_date?: number;
};

export type FaceitChampionshipListResponse = {
  items: FaceitChampionshipListItem[];
};

export async function listOrganizerChampionships(
  organizerId: string,
  opts?: FaceitClientOptions & { maxPages?: number }
): Promise<FaceitChampionshipListItem[]> {
  const maxPages = opts?.maxPages ?? 10;
  const limit = 100;
  const all: FaceitChampionshipListItem[] = [];
  for (let page = 0; page < maxPages; page++) {
    const data = await faceitFetch<FaceitChampionshipListResponse>(
      `/organizers/${organizerId}/championships?offset=${page * limit}&limit=${limit}`,
      opts
    );
    if (!data.items?.length) break;
    all.push(...data.items);
    if (data.items.length < limit) break;
  }
  return all;
}

export type FaceitChampionshipMatchListItem = {
  match_id: string;
  status: string;
  finished_at?: number;
};

export type FaceitChampionshipMatchListResponse = {
  items: FaceitChampionshipMatchListItem[];
};

const CHAMPIONSHIP_MATCHES_PAGE_LIMIT = 100;

// FACEIT serves a championship's match list at /championships/{id}/matches.
// Unlike /championships/{id} (which 404s for many active events), this
// endpoint is reliable. type=past returns finished matches.
export async function* iterateChampionshipMatches(
  championshipId: string,
  opts?: FaceitClientOptions & {
    type?: "past" | "ongoing" | "upcoming";
    maxPages?: number;
  }
): AsyncGenerator<FaceitChampionshipMatchListItem, void, unknown> {
  const type = opts?.type ?? "past";
  const maxPages = opts?.maxPages ?? 20;
  for (let page = 0; page < maxPages; page++) {
    const offset = page * CHAMPIONSHIP_MATCHES_PAGE_LIMIT;
    const data = await faceitFetch<FaceitChampionshipMatchListResponse>(
      `/championships/${championshipId}/matches?type=${type}&offset=${offset}&limit=${CHAMPIONSHIP_MATCHES_PAGE_LIMIT}`,
      opts
    );
    if (!data.items?.length) return;
    for (const item of data.items) yield item;
    if (data.items.length < CHAMPIONSHIP_MATCHES_PAGE_LIMIT) return;
  }
}
