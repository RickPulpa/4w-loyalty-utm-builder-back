import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { env } from "../config/env";
import { pool } from "../config/db";
import { signChallengeToken, signToken, verifyChallengeToken } from "../utils/jwt";
import { UserRow } from "../types";
import { requireAuth } from "../middleware/auth";
import { sendEmail } from "../services/emailService";
import { renderTwoFactorEmail } from "../services/emailTemplates";

export const authRouter = Router();

const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";
// Hash de relleno para que el tiempo de respuesta no delate si el correo existe.
const DUMMY_HASH = bcrypt.hashSync("no-such-user", 10);

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

const verifySchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().trim().regex(/^\d{6}$/, "El código tiene 6 dígitos."),
});

const resendSchema = z.object({ challengeToken: z.string().min(1) });

const hashCode = (userId: number, code: string) =>
  crypto.createHmac("sha256", env.jwtSecret).update(`${userId}:${code}`).digest("hex");

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

async function findUserById(id: number): Promise<UserRow | undefined> {
  const [rows] = await pool.query<any[]>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] as UserRow | undefined;
}

/** Genera un código de 6 dígitos, guarda solo su hash (invalidando los anteriores) y lo envía por correo. */
async function issueAndSendCode(user: UserRow): Promise<void> {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

  await pool.query("UPDATE login_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [user.id]);
  const [result] = await pool.query<any>(
    `INSERT INTO login_codes (user_id, code_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [user.id, hashCode(user.id, code), env.twoFactor.ttlMinutes]
  );

  const email = renderTwoFactorEmail({
    name: user.full_name ?? "",
    code,
    ttlMinutes: env.twoFactor.ttlMinutes,
    sessionDays: 15,
  });

  try {
    await sendEmail({ to: user.email!, ...email });
  } catch (err) {
    await pool.query("DELETE FROM login_codes WHERE id = ?", [result.insertId]);
    throw err;
  }
}

/** Paso 1: correo + contraseña. Si son correctos, envía el código 2FA al correo del usuario. */
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Correo y contraseña son requeridos." });
  }
  const { email, password } = parsed.data;

  const [rows] = await pool.query<any[]>(
    "SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1",
    [email, email]
  );
  const user = rows[0] as UserRow | undefined;

  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) {
    return res.status(401).json({ error: INVALID_CREDENTIALS });
  }
  if (!user.email) {
    return res.status(403).json({
      error: "Tu cuenta no tiene un correo asociado para el código de verificación. Contacta al administrador.",
    });
  }

  try {
    await issueAndSendCode(user);
  } catch (err) {
    console.error("No se pudo enviar el código 2FA:", err instanceof Error ? err.message : err);
    return res.status(502).json({
      error: "No pudimos enviar el código a tu correo. Intenta de nuevo en unos minutos o contacta al administrador.",
    });
  }

  return res.json({
    twoFactorRequired: true,
    challengeToken: signChallengeToken(user.id),
    emailHint: maskEmail(user.email),
    expiresInMinutes: env.twoFactor.ttlMinutes,
  });
});

/** Paso 2: valida el código y entrega la sesión (15 días). */
authRouter.post("/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Ingresa el código de 6 dígitos." });
  }

  let userId: number;
  try {
    userId = verifyChallengeToken(parsed.data.challengeToken);
  } catch {
    return res.status(401).json({ error: "La verificación venció. Inicia sesión de nuevo.", restart: true });
  }

  const [rows] = await pool.query<any[]>(
    `SELECT id, code_hash, attempts, expires_at < NOW() AS expired
     FROM login_codes WHERE user_id = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1`,
    [userId]
  );
  const row = rows[0] as { id: number; code_hash: string; attempts: number; expired: number } | undefined;

  if (!row || row.expired) {
    return res.status(401).json({ error: "El código venció. Solicita uno nuevo.", expired: true });
  }

  // Suma el intento de forma atómica antes de comparar: así no hay carrera entre pruebas simultáneas.
  const [bump] = await pool.query<any>(
    "UPDATE login_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < ?",
    [row.id, env.twoFactor.maxAttempts]
  );
  if (bump.affectedRows === 0) {
    return res.status(429).json({ error: "Demasiados intentos. Solicita un código nuevo.", expired: true });
  }

  const expected = Buffer.from(row.code_hash, "hex");
  const received = Buffer.from(hashCode(userId, parsed.data.code), "hex");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return res.status(401).json({ error: "Código incorrecto." });
  }

  await pool.query("UPDATE login_codes SET used_at = NOW() WHERE id = ?", [row.id]);

  const user = await findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: "Usuario no encontrado.", restart: true });
  }

  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  return res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, fullName: user.full_name, role: user.role },
  });
});

/** Reenvía un código nuevo (con enfriamiento para evitar abuso del envío de correos). */
authRouter.post("/resend", async (req, res) => {
  const parsed = resendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Solicitud inválida." });
  }

  let userId: number;
  try {
    userId = verifyChallengeToken(parsed.data.challengeToken);
  } catch {
    return res.status(401).json({ error: "La verificación venció. Inicia sesión de nuevo.", restart: true });
  }

  const [recent] = await pool.query<any[]>(
    "SELECT id FROM login_codes WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND) LIMIT 1",
    [userId, env.twoFactor.resendCooldownSeconds]
  );
  if (recent.length > 0) {
    return res.status(429).json({
      error: `Espera ${env.twoFactor.resendCooldownSeconds} segundos antes de pedir otro código.`,
    });
  }

  const user = await findUserById(userId);
  if (!user?.email) {
    return res.status(401).json({ error: "Inicia sesión de nuevo.", restart: true });
  }

  try {
    await issueAndSendCode(user);
  } catch (err) {
    console.error("No se pudo reenviar el código 2FA:", err instanceof Error ? err.message : err);
    return res.status(502).json({ error: "No pudimos enviar el código. Intenta de nuevo en unos minutos." });
  }

  return res.json({
    challengeToken: signChallengeToken(user.id),
    emailHint: maskEmail(user.email),
    expiresInMinutes: env.twoFactor.ttlMinutes,
  });
});

authRouter.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});
