/**
 * Desbloquea una cuenta bloqueada por intentos fallidos (comando de emergencia, por si queda bloqueado
 * el único super admin y no hay quien lo libere desde la pantalla Usuarios).
 *
 * Uso:
 *   npm run unlock-user -- <correo>
 */
import { pool } from "../config/db";

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) {
    console.error("Uso: npm run unlock-user -- <correo>");
    process.exit(1);
  }

  const [result] = await pool.query<any>(
    "UPDATE users SET failed_attempts = 0, locked_at = NULL WHERE email = ? OR username = ?",
    [email, email]
  );
  console.log(result.affectedRows > 0 ? `Cuenta "${email}" desbloqueada.` : `No existe el usuario "${email}".`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
