import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../config/db";
import { signToken } from "../utils/jwt";
import { UserRow } from "../types";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Usuario y contraseña son requeridos." });
  }
  const { username, password } = parsed.data;

  const [rows] = await pool.query<any[]>(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [username]
  );
  const user = rows[0] as UserRow | undefined;

  if (!user) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }

  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  return res.json({
    token,
    user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
  });
});

authRouter.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});
