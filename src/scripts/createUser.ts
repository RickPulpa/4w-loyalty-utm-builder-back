/**
 * Crea (o actualiza la contraseña de) un usuario del panel. Entra con su correo + contraseña
 * + código 2FA que le llega a ese correo.
 *
 * Uso:
 *   npm run create-user -- <correo> <password> [super_admin|admin|editor] ["Nombre completo"]
 *
 * Ejemplo:
 *   npm run create-user -- marco_llontop@honda.com.pe "unaClaveLarga123!" admin "Marco Llontop"
 */
import bcrypt from "bcryptjs";
import { pool } from "../config/db";

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

  const email = rawEmail.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (username, email, password_hash, full_name, role)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE email = VALUES(email), password_hash = VALUES(password_hash),
       full_name = VALUES(full_name), role = VALUES(role)`,
    [email, email, passwordHash, fullName, role]
  );

  console.log(`Usuario "${email}" (${role}) listo.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
