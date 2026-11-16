import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno ${name}. Revisá tu archivo .env (mirá .env.example).`);
  }
  return value;
}

// CORS_ORIGIN acepta uno o varios orígenes separados por coma (ej:
// "http://localhost:4200,https://4w-loyalty-utm-builder-front.mayu.digital").
// Sin configurar, solo permite localhost:4200 (dev).
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:4200")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: corsOrigins,

  jwtSecret: required("JWT_SECRET"),
  // Duración de la sesión una vez que el usuario validó el código 2FA.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  isProduction: process.env.NODE_ENV === "production",
  // En producción el API solo escucha en localhost (Apache hace de proxy); en dev, en todas las interfaces.
  host: process.env.HOST ?? (process.env.NODE_ENV === "production" ? "127.0.0.1" : undefined),

  // IPs (o rangos IPv4 CIDR, ej. 203.0.113.0/24) desde las que se permite usar el panel administrativo
  // (Administrar y Usuarios). Vacío = sin restricción (útil en desarrollo).
  adminAllowedIps: (process.env.ADMIN_ALLOWED_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),

  twoFactor: {
    ttlMinutes: Number(process.env.TWO_FACTOR_TTL_MIN ?? 10),
    maxAttempts: 5,
    resendCooldownSeconds: 60,
  },

  email: {
    provider: (process.env.EMAIL_PROVIDER ?? "console") as "resend" | "sendgrid" | "console",
    apiKey: process.env.EMAIL_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "Honda UTM Builder <no-reply@example.com>",
  },

  db: {
    host: required("DB_HOST", "localhost"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER", "root"),
    password: process.env.DB_PASSWORD ?? "",
    database: required("DB_NAME", "utm_builder"),
  },

  meta: {
    accessToken: process.env.META_ACCESS_TOKEN ?? "",
    adAccountId: process.env.META_AD_ACCOUNT_ID ?? "",
    graphApiVersion: process.env.META_GRAPH_API_VERSION ?? "v21.0",
  },
};

export const isMetaConfigured = () =>
  Boolean(env.meta.accessToken && env.meta.adAccountId);

/** "8h" -> "8 horas", "15d" -> "15 días", "30m" -> "30 minutos" (para los textos del correo). */
export function describeDuration(expr: string): string {
  const m = /^(\d+)\s*([smhd])$/.exec(expr.trim());
  if (!m) return expr;
  const n = Number(m[1]);
  const units: Record<string, [string, string]> = {
    s: ["segundo", "segundos"],
    m: ["minuto", "minutos"],
    h: ["hora", "horas"],
    d: ["día", "días"],
  };
  const [one, many] = units[m[2]];
  return `${n} ${n === 1 ? one : many}`;
}
