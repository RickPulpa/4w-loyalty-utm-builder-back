import mysql from "mysql2/promise";
import { env } from "./env";

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  // mysql2 devuelve TINYINT(1)/BOOLEAN como 0/1 por defecto — lo casteamos a
  // boolean real para que coincida con los tipos de TypeScript (CategoryRow.is_required)
  // y con lo que espera el frontend al reenviar el valor en un PUT.
  typeCast: (field, next) => {
    if (field.type === "TINY" && field.length === 1) {
      return field.string() === "1";
    }
    return next();
  },
});

export async function checkDbConnection(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}
