/**
 * Crea (o actualiza la contraseña de) un usuario del panel. Entra con su correo + contraseña
 * + código 2FA que le llega a ese correo. La contraseña debe cumplir la política (8 caracteres, 10 para
 * admin/super_admin; mayúsculas, minúsculas y números) y el usuario deberá cambiarla en su primer ingreso.
 *
 * Uso:
 *   npm run create-user -- <correo> <password> [super_admin|admin|editor] ["Nombre completo"]
 *
 * Ejemplo:
 *   npm run create-user -- marco_llontop@honda.com.pe "UnaClaveLarga123" admin "Marco Llontop"
 */
import { pool } from "../config/db";
import { hashPassword, recordPasswordHistory, validatePasswordPolicy } from "../utils/passwordPolicy";
import { UserRole } from "../types";

const ROLES = ["super_admin", "admin", "editor"];

async function main() {
  const [rawEmail, password, role = "editor", fullName = null] = process.argv.slice(2);

  if (!rawEmail || !password) {
    console.error('Uso: npm run create-user -- <correo> <password> [super_admin|admin|editor] ["Nombre"]');
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawEmail)) {
    console.error("El primer argumento debe ser un correo válido.");
    process.exit(1);
  }
  if (!ROLES.includes(role)) {
    console.error(`El rol debe ser uno de: ${ROLES.join(", ")}.`);
    process.exit(1);
  }

  const policyError = validatePasswordPolicy(password, role as UserRole);
  if (policyError) {
    console.error(policyError);
    process.exit(1);
  }

  const email = rawEmail.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  await pool.query(
    `INSERT INTO users (username, email, password_hash, full_name, role, must_change_password, password_changed_at)
     VALUES (?, ?, ?, ?, ?, 1, NOW())
     ON DUPLICATE KEY UPDATE email = VALUES(email), password_hash = VALUES(password_hash),
       full_name = VALUES(full_name), role = VALUES(role), must_change_password = 1,
       password_changed_at = NOW(), failed_attempts = 0, locked_at = NULL`,
    [email, email, passwordHash, fullName, role]
  );
  const [rows] = await pool.query<any[]>("SELECT id FROM users WHERE email = ?", [email]);
  await recordPasswordHistory(rows[0].id, passwordHash);

  console.log(`Usuario "${email}" (${role}) listo.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
