import bcrypt from "bcryptjs";
import { pool } from "../config/db";
import { UserRole } from "../types";

// Política de contraseñas (checklist de seguridad de Honda).
export const PASSWORD_MIN_LENGTH = { regular: 8, admin: 10 } as const;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt ignora lo que pase de 72 bytes
export const PASSWORD_MAX_AGE_DAYS = 90;
export const PASSWORD_HISTORY_SIZE = 5;
export const MAX_FAILED_LOGINS = 10;
export const BCRYPT_ROUNDS = 12;

export const isAdminRole = (role: UserRole) => role === "admin" || role === "super_admin";

export const minLengthForRole = (role: UserRole) =>
  isAdminRole(role) ? PASSWORD_MIN_LENGTH.admin : PASSWORD_MIN_LENGTH.regular;

/** Devuelve el mensaje de error si la contraseña no cumple la política, o null si es válida. */
export function validatePasswordPolicy(password: string, role: UserRole): string | null {
  const min = minLengthForRole(role);
  if (password.length < min) {
    return `La contraseña debe tener al menos ${min} caracteres${isAdminRole(role) ? " (cuentas administrativas)" : ""}.`;
  }
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "La contraseña debe incluir mayúsculas, minúsculas y números.";
  }
  return null;
}

/** ¿La contraseña coincide con la actual o con alguna de las últimas 5 usadas? */
export async function isPasswordReused(userId: number, plain: string, currentHash: string): Promise<boolean> {
  const [rows] = await pool.query<any[]>(
    "SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY id DESC LIMIT ?",
    [userId, PASSWORD_HISTORY_SIZE]
  );
  const hashes = [currentHash, ...rows.map((r) => r.password_hash as string)];
  for (const hash of hashes) {
    if (await bcrypt.compare(plain, hash)) return true;
  }
  return false;
}

/**
 * Guarda una contraseña nueva: actualiza el hash, la fecha de cambio (vigencia de 90 días), limpia el
 * bloqueo e inserta el hash en el historial. `mustChange` fuerza otro cambio en el próximo ingreso
 * (contraseña inicial o restablecida por un administrador).
 */
export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS);

export async function applyNewPassword(userId: number, plain: string, mustChange: boolean): Promise<void> {
  const hash = await hashPassword(plain);
  await pool.query(
    `UPDATE users SET password_hash = ?, password_changed_at = NOW(), must_change_password = ?,
       failed_attempts = 0, locked_at = NULL WHERE id = ?`,
    [hash, mustChange ? 1 : 0, userId]
  );
  await recordPasswordHistory(userId, hash);
}

/** Inserta el hash en el historial y poda los más antiguos. */
export async function recordPasswordHistory(userId: number, hash: string): Promise<void> {
  await pool.query("INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)", [userId, hash]);
  // Conserva solo lo necesario (el doble de la ventana) para que la tabla no crezca sin límite.
  await pool.query(
    `DELETE FROM password_history WHERE user_id = ? AND id NOT IN (
       SELECT id FROM (SELECT id FROM password_history WHERE user_id = ? ORDER BY id DESC LIMIT ?) keep)`,
    [userId, userId, PASSWORD_HISTORY_SIZE * 2]
  );
}
