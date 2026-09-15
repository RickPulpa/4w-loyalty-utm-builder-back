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

// Formatos crudos aceptados para campos que no usan catalog_values.
const RAW_VALUE_PATTERNS: Record<string, RegExp> = {
  month: /^\d{6}$/, // AñoMes en formato YYYYMM
  age_range: /^\d{1,3}-\d{1,3}$/, // "MIN-MAX", ej. 18-65
};

const partSchema = z.object({
  categoryId: z.number().int(),
  valueIds: z.array(z.number().int()).optional(),
  rawValue: z.string().optional(),
});

const generateSchema = z.object({
  level: z.enum(["campaign", "adset", "ad"]),
  parts: z.array(partSchema).min(1),
});

/**
 * POST /api/generate — arma el nombre final juntando, para cada categoría (en
 * el orden en que se enviaron), la abreviatura de su(s) valor(es) elegidos —o
 * un valor crudo validado para campos tipo mes/rango de edad— con el prefijo
 * y separador configurados.
 */
generatorRouter.post("/generate", async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { level, parts } = parsed.data;

  const categoryIds = parts.map((p) => p.categoryId);
  const [categoryRows] = await pool.query<any[]>(
    `SELECT id, field_type FROM categories WHERE id IN (${categoryIds.map(() => "?").join(",")})`,
    categoryIds
  );
  const fieldTypeById = new Map<number, string>((categoryRows as any[]).map((r) => [r.id, r.field_type]));

  const missingCategories = categoryIds.filter((id) => !fieldTypeById.has(id));
  if (missingCategories.length > 0) {
    return res
      .status(400)
      .json({ error: `No se encontraron categorías con id: ${missingCategories.join(", ")}` });
  }

  const allValueIds = parts.flatMap((p) => p.valueIds ?? []);
  const byValueId = new Map<number, string>();
  if (allValueIds.length > 0) {
    const [valueRows] = await pool.query<any[]>(
      `SELECT id, abbreviation FROM catalog_values WHERE id IN (${allValueIds.map(() => "?").join(",")})`,
      allValueIds
    );
    for (const r of valueRows as any[]) byValueId.set(r.id, r.abbreviation);

    const missingValues = allValueIds.filter((id) => !byValueId.has(id));
    if (missingValues.length > 0) {
      return res.status(400).json({ error: `No se encontraron valores con id: ${missingValues.join(", ")}` });
    }
  }

  const nameParts: string[] = [];
  for (const part of parts) {
    const fieldType = fieldTypeById.get(part.categoryId)!;

    if (fieldType === "select" || fieldType === "multi_select" || fieldType === "chip_select") {
      if (!part.valueIds || part.valueIds.length === 0) {
        return res.status(400).json({ error: `Falta seleccionar un valor para la categoría ${part.categoryId}.` });
      }
      nameParts.push(part.valueIds.map((id) => byValueId.get(id)!).join("-"));
      continue;
    }

    // 'month' / 'age_range': usan un valor crudo validado en vez de catalog_values.
    const pattern = RAW_VALUE_PATTERNS[fieldType];
    if (!part.rawValue || !pattern.test(part.rawValue)) {
      return res
        .status(400)
        .json({ error: `Valor inválido para la categoría ${part.categoryId} (tipo "${fieldType}").` });
    }
    nameParts.push(part.rawValue);
  }

  const [settingsRows] = await pool.query<any[]>("SELECT `key`, `value` FROM settings");
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of settingsRows as { key: string; value: string }[]) {
    settings[row.key] = row.value;
  }

  const prefixKey = `prefix_${level}` as keyof typeof settings;
  const prefix = settings[prefixKey] ?? "";
  const separator = settings.separator ?? "_";

  const name = `${prefix}${nameParts.join(separator)}`;

  return res.json({ name, level });
});
