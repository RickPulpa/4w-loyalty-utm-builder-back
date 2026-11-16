import { Request, Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { describeDuration, env } from "../config/env";
import { pool } from "../config/db";
import { signChallengeToken, signPasswordChangeToken, signToken, verifyChallengeToken } from "../utils/jwt";
import { UserRow } from "../types";
import { requireAuthAllowPasswordChange } from "../middleware/auth";
import { isAdminNetworkAllowed } from "../utils/network";
import {
  BCRYPT_ROUNDS,
  MAX_FAILED_LOGINS,
  PASSWORD_HISTORY_SIZE,
  PASSWORD_MAX_AGE_DAYS,
  applyNewPassword,
  isPasswordReused,
  validatePasswordPolicy,
} from "../utils/passwordPolicy";
import { sendEmail } from "../services/emailService";
import { renderTwoFactorEmail } from "../services/emailTemplates";

export const authRouter = Router();

const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";
// Hash de relleno para que el tiempo de respuesta no delate si el correo existe.
const DUMMY_HASH = bcrypt.hashSync("no-such-user", BCRYPT_ROUNDS);
const LOCKED_MESSAGE =
  "Tu cuenta está bloqueada por demasiados intentos fallidos. Contacta a un administrador para desbloquearla.";

// Límite por IP (capa extra al bloqueo por cuenta). Holgado para que una oficina entera tras una sola IP no se bloquee.
const limiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiados intentos desde tu red. Espera unos minutos e inténtalo de nuevo." },
  });

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

const verifySchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().trim().regex(/^\d{6}$/, "El código tiene 6 dígitos."),
});

const resendSchema = z.object({ challengeToken: z.string().min(1) });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
  newPassword: z.string().min(1, "Ingresa la nueva contraseña."),
});

const hashCode = (userId: number, code: string) =>
  crypto.createHmac("sha256", env.jwtSecret).update(`${userId}:${code}`).digest("hex");

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

type UserWithExpiry = UserRow & { password_expired: number };

async function findUserById(id: number): Promise<UserWithExpiry | undefined> {
  const [rows] = await pool.query<any[]>(
    `SELECT *, (password_changed_at IS NULL OR password_changed_at < DATE_SUB(NOW(), INTERVAL ? DAY)) AS password_expired
     FROM users WHERE id = ? LIMIT 1`,
    [PASSWORD_MAX_AGE_DAYS, id]
  );
  return rows[0] as UserWithExpiry | undefined;
}

/** Suma un intento fallido; al llegar a MAX_FAILED_LOGINS la cuenta queda bloqueada hasta que un super admin la libere. */
async function registerFailedAttempt(userId: number): Promise<boolean> {
  // En MySQL las asignaciones se evalúan de izquierda a derecha: aquí failed_attempts ya viene incrementado.
  await pool.query(
    `UPDATE users SET failed_attempts = failed_attempts + 1,
       locked_at = IF(failed_attempts >= ?, COALESCE(locked_at, NOW()), locked_at)
     WHERE id = ?`,
    [MAX_FAILED_LOGINS, userId]
  );
  const [rows] = await pool.query<any[]>("SELECT locked_at FROM users WHERE id = ?", [userId]);
  return Boolean(rows[0]?.locked_at);
}

/** Motivo por el que debe cambiar la contraseña antes de usar la app (o null si no hace falta). */
function passwordChangeReason(user: UserWithExpiry): "must_change" | "expired" | null {
  if (Boolean(user.must_change_password)) return "must_change";
  if (Boolean(user.password_expired)) return "expired";
  return null;
}

function publicUser(user: UserRow, req: Request) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    // Si es false el front oculta Administrar/Usuarios (el backend igual los bloquea).
    adminAccess: isAdminNetworkAllowed(req),
  };
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
    sessionLabel: describeDuration(env.jwtExpiresIn),
  });

  try {
    await sendEmail({ to: user.email!, ...email });
  } catch (err) {
    await pool.query("DELETE FROM login_codes WHERE id = ?", [result.insertId]);
    throw err;
  }
}

/** Paso 1: correo + contraseña. Si son correctos, envía el código 2FA al correo del usuario. */
authRouter.post("/login", limiter(50), async (req, res) => {
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

  if (user?.locked_at) {
    return res.status(423).json({ error: LOCKED_MESSAGE, locked: true });
  }

  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) {
    if (user && (await registerFailedAttempt(user.id))) {
      return res.status(423).json({ error: LOCKED_MESSAGE, locked: true });
    }
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

/** Paso 2: valida el código y entrega la sesión (JWT_EXPIRES_IN). Si debe cambiar la contraseña, la sesión es restringida. */
authRouter.post("/verify", limiter(50), async (req, res) => {
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

  if (user.locked_at) {
    return res.status(423).json({ error: LOCKED_MESSAGE, locked: true, restart: true });
  }
  await pool.query("UPDATE users SET failed_attempts = 0 WHERE id = ?", [user.id]);

  const payload = { sub: user.id, username: user.username, role: user.role };
  const reason = passwordChangeReason(user);
  if (reason) {
    return res.json({
      token: signPasswordChangeToken(payload),
      user: publicUser(user, req),
      passwordChangeRequired: true,
      reason,
    });
  }
  return res.json({ token: signToken(payload), user: publicUser(user, req), passwordChangeRequired: false });
});

/** Reenvía un código nuevo (con enfriamiento para evitar abuso del envío de correos). */
authRouter.post("/resend", limiter(15), async (req, res) => {
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

/** Datos de la sesión actual (también con la sesión restringida, para que el front sepa que debe cambiar la clave). */
authRouter.get("/me", requireAuthAllowPasswordChange, async (req, res) => {
  const user = await findUserById(req.user!.sub);
  if (!user || user.locked_at) {
    return res.status(401).json({ error: "Sesión no válida. Inicia sesión de nuevo." });
  }
  return res.json({ user: publicUser(user, req), passwordChangeRequired: Boolean(req.user!.pwdChange) });
});

/**
 * Cambio de contraseña del propio usuario (primer ingreso, vencimiento a 90 días o cambio voluntario).
 * Exige la contraseña actual, cumplir la política según el rol y no repetir las últimas 5.
 */
authRouter.post("/change-password", limiter(20), requireAuthAllowPasswordChange, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await findUserById(req.user!.sub);
  if (!user) return res.status(401).json({ error: "Sesión no válida. Inicia sesión de nuevo." });
  if (user.locked_at) return res.status(423).json({ error: LOCKED_MESSAGE, locked: true });

  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    if (await registerFailedAttempt(user.id)) {
      return res.status(423).json({ error: LOCKED_MESSAGE, locked: true });
    }
    return res.status(401).json({ error: "La contraseña actual es incorrecta." });
  }

  const policyError = validatePasswordPolicy(newPassword, user.role);
  if (policyError) return res.status(400).json({ error: policyError });

  if (await isPasswordReused(user.id, newPassword, user.password_hash)) {
    return res.status(400).json({
      error: `No puedes reutilizar ninguna de tus últimas ${PASSWORD_HISTORY_SIZE} contraseñas, incluida la actual.`,
    });
  }

  await applyNewPassword(user.id, newPassword, false);
  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  return res.json({ token, user: publicUser(user, req) });
});
