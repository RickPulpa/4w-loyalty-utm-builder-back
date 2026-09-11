import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { suggestAbbreviation } from "../utils/abbreviation";
import { CatalogValueRow, CategoryRow, FieldLevel } from "../types";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

const LEVELS: FieldLevel[] = ["campaign", "adset", "ad"];

/** GET /api/categories?level=campaign|adset|ad — devuelve categorías con sus valores anidados. */
categoriesRouter.get("/", async (req, res) => {
  const level = req.query.level as string | undefined;
  const params: any[] = [];
  let sql = "SELECT * FROM categories";
  if (level) {
    sql += " WHERE level = ?";
    params.push(level);
  }
  sql += " ORDER BY level, sort_order, id";

  const [categories] = await pool.query<any[]>(sql, params);
  const [values] = await pool.query<any[]>(
    "SELECT * FROM catalog_values ORDER BY sort_order, id"
  );

  const valuesByCategory = new Map<number, CatalogValueRow[]>();
  for (const v of values as CatalogValueRow[]) {
    const list = valuesByCategory.get(v.category_id) ?? [];
    list.push(v);
    valuesByCategory.set(v.category_id, list);
  }

  const result = (categories as CategoryRow[]).map((c) => ({
    ...c,
    values: valuesByCategory.get(c.id) ?? [],
  }));

  return res.json(result);
});

const categorySchema = z.object({
  level: z.enum(["campaign", "adset", "ad"]),
  key: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "key debe ser snake_case (solo minúsculas, números y _)"),
  label: z.string().min(1),
  is_required: z.boolean().optional().default(false),
  field_type: z.enum(["select", "multi_select", "month", "age_range"]).optional().default("select"),
  sort_order: z.number().int().optional().default(0),
});

/** POST /api/categories — crea un nuevo campo/categoría (solo admin). */
categoriesRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { level, key, label, is_required, field_type, sort_order } = parsed.data;

  try {
    const [result] = await pool.query<any>(
      `INSERT INTO categories (level, \`key\`, label, is_required, field_type, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [level, key, label, is_required, field_type, sort_order]
    );
    return res
      .status(201)
      .json({ id: result.insertId, level, key, label, is_required, field_type, sort_order, values: [] });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: `Ya existe una categoría con la clave "${key}".` });
    }
    throw err;
  }
});

const categoryUpdateSchema = categorySchema.partial();

/** PUT /api/categories/:id — edita un campo/categoría (solo admin). */
categoriesRouter.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = categoryUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const fields = parsed.data;
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    return res.status(400).json({ error: "No hay campos para actualizar." });
  }

  const setSql = entries.map(([k]) => (k === "key" ? "`key` = ?" : `${k} = ?`)).join(", ");
  const values = entries.map(([, v]) => v);

  await pool.query(`UPDATE categories SET ${setSql} WHERE id = ?`, [...values, id]);
  return res.json({ ok: true });
});

/** DELETE /api/categories/:id — borra el campo y sus valores (solo admin). */
categoriesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await pool.query("DELETE FROM categories WHERE id = ?", [id]);
  return res.json({ ok: true });
});

const valueSchema = z.object({
  label: z.string().min(1),
  abbreviation: z.string().min(1).max(32),
  sort_order: z.number().int().optional().default(0),
});

/** POST /api/categories/:id/values — agrega un valor al catálogo de esa categoría (solo admin). */
categoriesRouter.post("/:id/values", requireAdmin, async (req, res) => {
  const categoryId = Number(req.params.id);
  const parsed = valueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { label, abbreviation, sort_order } = parsed.data;

  const [result] = await pool.query<any>(
    `INSERT INTO catalog_values (category_id, label, abbreviation, sort_order)
     VALUES (?, ?, ?, ?)`,
    [categoryId, label, abbreviation, sort_order]
  );
  return res.status(201).json({ id: result.insertId, category_id: categoryId, label, abbreviation, sort_order });
});

/** GET /api/categories/suggest-abbreviation?label=... — sugerencia editable, no se guarda sola. */
categoriesRouter.get("/suggest-abbreviation", (req, res) => {
  const label = (req.query.label as string | undefined) ?? "";
  const maxLength = Number(req.query.maxLength ?? 4);
  return res.json({ suggestion: suggestAbbreviation(label, maxLength) });
});

export const valuesRouter = Router();
valuesRouter.use(requireAuth);

const valueUpdateSchema = valueSchema.partial();

/** PUT /api/values/:id — edita label y/o abreviatura de un valor (solo admin). */
valuesRouter.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = valueUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const entries = Object.entries(parsed.data);
  if (entries.length === 0) {
    return res.status(400).json({ error: "No hay campos para actualizar." });
  }
  const setSql = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);

  await pool.query(`UPDATE catalog_values SET ${setSql} WHERE id = ?`, [...values, id]);
  return res.json({ ok: true });
});

/** DELETE /api/values/:id — borra un valor del catálogo (solo admin). */
valuesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await pool.query("DELETE FROM catalog_values WHERE id = ?", [id]);
  return res.json({ ok: true });
});
