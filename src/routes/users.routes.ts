import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import {
  applyNewPassword,
  hashPassword,
  isAdminRole,
  recordPasswordHistory,
  validatePasswordPolicy,
} from "../utils/passwordPolicy";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireSuperAdmin);

const roleSchema = z.enum(["super_admin", "admin", "editor"]);

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido."),
  full_name: z.string().trim().min(1, "El nombre es requerido."),
  role: roleSchema,
  password: z.string().min(1, "La contraseña inicial es requerida."),
});

const updateSchema = z.object({
  full_name: z.string().trim().min(1).optional(),
  role: roleSchema.optional(),
  password: z.string().min(1).optional(),
});

async function countOtherSuperAdmins(excludeId: number): Promise<number> {
  const [rows] = await pool.query<any[]>(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin' AND id <> ?",
    [excludeId]
  );
  return Number(rows[0].n);
}

/** GET /api/users — lista de usuarios (sin hashes), con su estado de bloqueo y de contraseña. */
usersRouter.get("/", async (_req, res) => {
  const [rows] = await pool.query<any[]>(
    `SELECT id, email, username, full_name, role, created_at, password_changed_at,
            (locked_at IS NOT NULL) AS locked, must_change_password, failed_attempts
     FROM users ORDER BY created_at, id`
  );
  return res.json(
    rows.map((r) => ({ ...r, locked: Boolean(r.locked), must_change_password: Boolean(r.must_change_password) }))
  );
});

/**
 * POST /api/users — crea un usuario; entra con su correo + contraseña + código por correo.
 * La contraseña inicial es temporal: la política depende del rol y el usuario debe cambiarla en su primer ingreso.
 */
usersRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." });
  }
  const { email, full_name, role, password } = parsed.data;

  const policyError = validatePasswordPolicy(password, role);
  if (policyError) return res.status(400).json({ error: policyError });

  const passwordHash = await hashPassword(password);
  try {
    const [result] = await pool.query<any>(
      `INSERT INTO users (username, email, password_hash, full_name, role, must_change_password, password_changed_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [email, email, passwordHash, full_name, role]
    );
    await recordPasswordHistory(result.insertId, passwordHash);
    return res.status(201).json({ id: result.insertId, email, username: email, full_name, role });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe un usuario con ese correo." });
    }
    throw err;
  }
});

/** PUT /api/users/:id — cambia nombre, rol o restablece la contraseña (el usuario deberá cambiarla al ingresar). */
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

  const effectiveRole = role ?? target.role;
  if (password !== undefined) {
    const policyError = validatePasswordPolicy(password, effectiveRole);
    if (policyError) return res.status(400).json({ error: policyError });
  }

  const sets: string[] = [];
  const values: any[] = [];
  if (full_name !== undefined) { sets.push("full_name = ?"); values.push(full_name); }
  if (role !== undefined) { sets.push("role = ?"); values.push(role); }
  // Al ascender a un rol administrativo se exige una contraseña de 10+ caracteres en el próximo ingreso.
  if (role !== undefined && isAdminRole(role) && !isAdminRole(target.role)) sets.push("must_change_password = 1");
  if (sets.length === 0 && password === undefined) {
    return res.status(400).json({ error: "No hay campos para actualizar." });
  }

  if (sets.length > 0) await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
  if (password !== undefined) await applyNewPassword(id, password, true);
  return res.json({ ok: true });
});

/** POST /api/users/:id/unlock — desbloquea una cuenta bloqueada por intentos fallidos. */
usersRouter.post("/:id/unlock", async (req, res) => {
  const id = Number(req.params.id);
  const [result] = await pool.query<any>(
    "UPDATE users SET failed_attempts = 0, locked_at = NULL WHERE id = ?",
    [id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "Usuario no encontrado." });
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
