import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { FieldLevel } from "../types";

export const generatorRouter = Router();
generatorRouter.use(requireAuth);

const DEFAULT_SETTINGS: Record<string, string> = {
  prefix_campaign: "PE_HONDA_META_",
  prefix_adset: "",
  prefix_ad: "",
  separator: "_",
};

/** GET /api/settings — prefijos y separador usados para armar el nombre final. */
generatorRouter.get("/settings", async (_req, res) => {
  const [rows] = await pool.query<any[]>("SELECT `key`, `value` FROM settings");
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows as { key: string; value: string }[]) {
    settings[row.key] = row.value;
  }
  return res.json(settings);
});

const settingsSchema = z.record(z.string());

/** PUT /api/settings — edita prefijos/separador (solo admin). */
generatorRouter.put("/settings", requireAdmin, async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const entries = Object.entries(parsed.data);
  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO settings (\`key\`, \`value\`) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
      [key, value]
    );
  }
  return res.json({ ok: true });
});

const generateSchema = z.object({
  level: z.enum(["campaign", "adset", "ad"]),
  valueIds: z.array(z.number().int()).min(1),
});

/**
 * POST /api/generate — arma el nombre final a partir de las abreviaturas de
 * los valores elegidos, en el orden en que se enviaron.
 */
generatorRouter.post("/generate", async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { level, valueIds } = parsed.data;

  const [rows] = await pool.query<any[]>(
    `SELECT id, abbreviation FROM catalog_values WHERE id IN (${valueIds.map(() => "?").join(",")})`,
    valueIds
  );
  const byId = new Map<number, string>((rows as any[]).map((r) => [r.id, r.abbreviation]));

  const missing = valueIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return res.status(400).json({ error: `No se encontraron valores con id: ${missing.join(", ")}` });
  }

  const [settingsRows] = await pool.query<any[]>("SELECT `key`, `value` FROM settings");
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of settingsRows as { key: string; value: string }[]) {
    settings[row.key] = row.value;
  }

  const prefixKey = `prefix_${level}` as keyof typeof settings;
  const prefix = settings[prefixKey] ?? "";
  const separator = settings.separator ?? "_";

  const parts = valueIds.map((id) => byId.get(id)!);
  const name = `${prefix}${parts.join(separator)}`;

  return res.json({ name, level });
});
