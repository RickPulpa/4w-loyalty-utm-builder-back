import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { isMetaConfigured } from "../config/env";
import {
  checkDuplicateName,
  fetchAccountInfo,
  fetchAdSets,
  fetchAds,
  fetchCampaigns,
} from "../services/metaService";

export const metaRouter = Router();
metaRouter.use(requireAuth);

const DATE_PRESETS = [
  "today",
  "yesterday",
  "last_3d",
  "last_7d",
  "last_14d",
  "last_30d",
  "last_90d",
  "this_month",
  "last_month",
  "this_quarter",
  "this_year",
  "last_year",
  "maximum",
] as const;

function parseDatePreset(value: unknown): string {
  if (typeof value === "string" && (DATE_PRESETS as readonly string[]).includes(value)) {
    return value;
  }
  return "last_30d";
}

function requireMetaConfigured(res: import("express").Response): boolean {
  if (!isMetaConfigured()) {
    res.status(409).json({
      error: "Meta no está configurado todavía. Completá META_ACCESS_TOKEN y META_AD_ACCOUNT_ID en el .env.",
    });
    return false;
  }
  return true;
}

metaRouter.get("/status", (_req, res) => {
  return res.json({ configured: isMetaConfigured() });
});

const checkSchema = z.object({
  level: z.enum(["campaign", "adset", "ad"]),
  name: z.string().min(1),
});

/**
 * POST /api/meta/check-duplicate — consulta (solo lectura) los nombres que ya
 * existen en Meta para ese nivel y avisa si el nombre propuesto se repite.
 */
metaRouter.post("/check-duplicate", async (req, res) => {
  if (!requireMetaConfigured(res)) return;

  const parsed = checkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await checkDuplicateName(parsed.data.level, parsed.data.name);
    return res.json(result);
  } catch (err: any) {
    return res.status(502).json({ error: err?.message ?? "Error consultando Meta." });
  }
});

/** GET /api/meta/account — nombre y moneda de la cuenta publicitaria conectada. */
metaRouter.get("/account", async (_req, res) => {
  if (!requireMetaConfigured(res)) return;
  try {
    const account = await fetchAccountInfo();
    return res.json(account);
  } catch (err: any) {
    return res.status(502).json({ error: err?.message ?? "Error consultando Meta." });
  }
});

/**
 * GET /api/meta/campaigns?range=last_30d — campañas de la cuenta con métricas
 * de rendimiento (gasto, impresiones, clics, alcance) en el rango pedido.
 * Solo lectura.
 */
metaRouter.get("/campaigns", async (req, res) => {
  if (!requireMetaConfigured(res)) return;
  try {
    const campaigns = await fetchCampaigns(parseDatePreset(req.query.range));
    return res.json(campaigns);
  } catch (err: any) {
    return res.status(502).json({ error: err?.message ?? "Error consultando Meta." });
  }
});

/** GET /api/meta/campaigns/:id/adsets?range=last_30d — conjuntos de anuncios de una campaña. */
metaRouter.get("/campaigns/:id/adsets", async (req, res) => {
  if (!requireMetaConfigured(res)) return;
  try {
    const adsets = await fetchAdSets(req.params.id, parseDatePreset(req.query.range));
    return res.json(adsets);
  } catch (err: any) {
    return res.status(502).json({ error: err?.message ?? "Error consultando Meta." });
  }
});

/** GET /api/meta/adsets/:id/ads?range=last_30d — anuncios de un conjunto de anuncios. */
metaRouter.get("/adsets/:id/ads", async (req, res) => {
  if (!requireMetaConfigured(res)) return;
  try {
    const ads = await fetchAds(req.params.id, parseDatePreset(req.query.range));
    return res.json(ads);
  } catch (err: any) {
    return res.status(502).json({ error: err?.message ?? "Error consultando Meta." });
  }
});
