import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../config/db";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireSuperAdmin);

const roleSchema = z.enum(["super_admin", "admin", "editor"]);

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido."),
  full_name: z.string().trim().min(1, "El nombre es requerido."),
  role: roleSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

const updateSchema = z.object({
  full_name: z.string().trim().min(1).optional(),
  role: roleSchema.optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").optional(),
});

async function countOtherSuperAdmins(excludeId: number): Promise<number> {
  const [rows] = await pool.query<any[]>(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin' AND id <> ?",
    [excludeId]
  );
  return Number(rows[0].n);
}

/** GET /api/users — lista de usuarios (sin hashes). */
usersRouter.get("/", async (_req, res) => {
  const [rows] = await pool.query<any[]>(
    "SELECT id, email, username, full_name, role, created_at FROM users ORDER BY created_at, id"
  );
  return res.json(rows);
});

/** POST /api/users — crea un usuario; entra con su correo + contraseña + código por correo. */
usersRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." });
  }
  const { email, full_name, role, password } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query<any>(
      "INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)",
      [email, email, passwordHash, full_name, role]
    );
    return res.status(201).json({ id: result.insertId, email, username: email, full_name, role });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe un usuario con ese correo." });
    }
    throw err;
  }
});

/** PUT /api/users/:id — cambia nombre, rol o restablece la contraseña. */
usersRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." });
  }
  const { full_name, role, password } = parsed.data;

  const [rows] = await pool.query<any[]>("SELECT id, role FROM users WHERE id = ?", [id]);
  const target = rows[0];
  if (!target) return res.status(404).json({ error: "Usuario no encontrado." });

  if (role && target.role === "super_admin" && role !== "super_admin" && (await countOtherSuperAdmins(id)) === 0) {
    return res.status(409).json({ error: "Debe quedar al menos un super admin." });
  }

  const sets: string[] = [];
  const values: any[] = [];
  if (full_name !== undefined) { sets.push("full_name = ?"); values.push(full_name); }
  if (role !== undefined) { sets.push("role = ?"); values.push(role); }
  if (password !== undefined) { sets.push("password_hash = ?"); values.push(await bcrypt.hash(password, 10)); }
  if (sets.length === 0) return res.status(400).json({ error: "No hay campos para actualizar." });

  await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
  return res.json({ ok: true });
});

/** DELETE /api/users/:id — no permite borrarse a sí mismo ni dejar el sistema sin super admin. */
usersRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.sub) {
    return res.status(409).json({ error: "No puedes eliminar tu propio usuario." });
  }

  const [rows] = await pool.query<any[]>("SELECT id, role FROM users WHERE id = ?", [id]);
  const target = rows[0];
  if (!target) return res.status(404).json({ error: "Usuario no encontrado." });

  if (target.role === "super_admin" && (await countOtherSuperAdmins(id)) === 0) {
    return res.status(409).json({ error: "Debe quedar al menos un super admin." });
  }

  await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return res.json({ ok: true });
});
