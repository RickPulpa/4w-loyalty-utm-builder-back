import { env, isMetaConfigured } from "../config/env";
import { FieldLevel } from "../types";

const EDGE_BY_LEVEL: Record<FieldLevel, string> = {
  campaign: "campaigns",
  adset: "adsets",
  ad: "ads",
};

interface GraphErrorBody {
  error?: { message: string; type: string; code: number };
}

function assertConfigured() {
  if (!isMetaConfigured()) {
    throw new Error(
      "Meta no está configurado. Definí META_ACCESS_TOKEN y META_AD_ACCOUNT_ID en el .env del backend."
    );
  }
}

function buildUrl(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams({ ...params, access_token: env.meta.accessToken });
  return `https://graph.facebook.com/${env.meta.graphApiVersion}/${path}?${search.toString()}`;
}

/** GET simple (una sola llamada, sin paginar) contra la Graph API. Solo lectura. */
async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  assertConfigured();
  const response = await fetch(buildUrl(path, params));
  const json = (await response.json()) as T & GraphErrorBody;

  if (!response.ok || json.error) {
    const message = json.error?.message ?? `Meta respondió con estado ${response.status}`;
    throw new Error(`Error consultando Meta: ${message}`);
  }
  return json;
}

interface GraphListResponse<T> {
  data: T[];
  paging?: { next?: string };
  error?: { message: string; type: string; code: number };
}

/** GET paginado: junta todas las páginas de un edge (campaigns/adsets/ads/etc). Solo lectura. */
async function graphGetAll<T>(path: string, params: Record<string, string>): Promise<T[]> {
  assertConfigured();
  let url: string | undefined = buildUrl(path, params);
  const items: T[] = [];
  let guard = 0;

  while (url && guard < 50) {
    guard += 1;
    const response = await fetch(url);
    const json = (await response.json()) as GraphListResponse<T>;

    if (!response.ok || json.error) {
      const message = json.error?.message ?? `Meta respondió con estado ${response.status}`;
      throw new Error(`Error consultando Meta: ${message}`);
    }

    items.push(...(json.data ?? []));
    url = json.paging?.next;
  }

  return items;
}

// ------------------------------------------------------------------------
// Chequeo de duplicados (lo que ya usa el Generador)
// ------------------------------------------------------------------------

export async function fetchExistingNames(level: FieldLevel): Promise<string[]> {
  const edge = EDGE_BY_LEVEL[level];
  const items = await graphGetAll<{ id: string; name: string }>(`${env.meta.adAccountId}/${edge}`, {
    fields: "name",
    limit: "500",
  });
  return items.map((i) => i.name);
}

export interface DuplicateCheckResult {
  exists: boolean;
  exactMatches: string[];
  similarMatches: string[];
}

export async function checkDuplicateName(level: FieldLevel, candidateName: string): Promise<DuplicateCheckResult> {
  const existing = await fetchExistingNames(level);
  const normalizedCandidate = candidateName.trim().toUpperCase();

  const exactMatches = existing.filter((n) => n.trim().toUpperCase() === normalizedCandidate);
  const similarMatches = existing.filter(
    (n) =>
      n.trim().toUpperCase() !== normalizedCandidate &&
      n.trim().toUpperCase().includes(normalizedCandidate)
  );

  return {
    exists: exactMatches.length > 0,
    exactMatches,
    similarMatches: similarMatches.slice(0, 10),
  };
}

// ------------------------------------------------------------------------
// Explorador de cuenta: campañas -> conjuntos de anuncios -> anuncios,
// cada uno con métricas de rendimiento. Todo de solo lectura (ads_read).
// ------------------------------------------------------------------------

export interface MetaInsights {
  spend: string | null;
  impressions: string | null;
  clicks: string | null;
  reach: string | null;
  ctr: string | null;
}

export interface MetaAccountInfo {
  id: string;
  name: string;
  currency: string;
}

export interface MetaCampaignSummary {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective: string | null;
  daily_budget: string | null;
  lifetime_budget: string | null;
  insights: MetaInsights | null;
}

export interface MetaAdSetSummary {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  daily_budget: string | null;
  lifetime_budget: string | null;
  insights: MetaInsights | null;
}

export interface MetaAdSummary {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  insights: MetaInsights | null;
}

const INSIGHTS_FIELDS = "spend,impressions,clicks,reach,ctr";

/** Extrae el primer (único) registro de insights que devuelve Meta, o null si no hay datos en el rango. */
function firstInsight(raw: any): MetaInsights | null {
  const row = raw?.insights?.data?.[0];
  if (!row) return null;
  return {
    spend: row.spend ?? null,
    impressions: row.impressions ?? null,
    clicks: row.clicks ?? null,
    reach: row.reach ?? null,
    ctr: row.ctr ?? null,
  };
}

export async function fetchAccountInfo(): Promise<MetaAccountInfo> {
  return graphGet<MetaAccountInfo>(env.meta.adAccountId, { fields: "name,currency" });
}

export async function fetchCampaigns(datePreset: string): Promise<MetaCampaignSummary[]> {
  const raw = await graphGetAll<any>(`${env.meta.adAccountId}/campaigns`, {
    fields: `name,status,effective_status,objective,daily_budget,lifetime_budget,insights.date_preset(${datePreset}){${INSIGHTS_FIELDS}}`,
    limit: "100",
  });
  return raw.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    effective_status: c.effective_status,
    objective: c.objective ?? null,
    daily_budget: c.daily_budget ?? null,
    lifetime_budget: c.lifetime_budget ?? null,
    insights: firstInsight(c),
  }));
}

export async function fetchAdSets(campaignId: string, datePreset: string): Promise<MetaAdSetSummary[]> {
  const raw = await graphGetAll<any>(`${campaignId}/adsets`, {
    fields: `name,status,effective_status,daily_budget,lifetime_budget,insights.date_preset(${datePreset}){${INSIGHTS_FIELDS}}`,
    limit: "100",
  });
  return raw.map((a) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    effective_status: a.effective_status,
    daily_budget: a.daily_budget ?? null,
    lifetime_budget: a.lifetime_budget ?? null,
    insights: firstInsight(a),
  }));
}

export async function fetchAds(adsetId: string, datePreset: string): Promise<MetaAdSummary[]> {
  const raw = await graphGetAll<any>(`${adsetId}/ads`, {
    fields: `name,status,effective_status,insights.date_preset(${datePreset}){${INSIGHTS_FIELDS}}`,
    limit: "100",
  });
  return raw.map((a) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    effective_status: a.effective_status,
    insights: firstInsight(a),
  }));
}
