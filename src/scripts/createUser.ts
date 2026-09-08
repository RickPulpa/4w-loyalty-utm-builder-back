/**
 * Crea (o actualiza la contraseña de) un usuario del panel.
 *
 * Uso:
 *   npm run create-user -- <username> <password> [admin|editor] ["Nombre completo"]
 *
 * Ejemplo:
 *   npm run create-user -- rick "unaClaveLarga123!" admin "Rick"
 */
import bcrypt from "bcryptjs";
import { pool } from "../config/db";

async function main() {
  const [username, password, role = "editor", fullName = null] = process.argv.slice(2);

  if (!username || !password) {
    console.error("Uso: npm run create-user -- <username> <password> [admin|editor] [\"Nombre\"]");
    process.exit(1);
  }
  if (role !== "admin" && role !== "editor") {
    console.error('El rol debe ser "admin" o "editor".');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (username, password_hash, full_name, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name), role = VALUES(role)`,
    [username, passwordHash, fullName, role]
  );

  console.log(`Usuario "${username}" (${role}) listo.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
