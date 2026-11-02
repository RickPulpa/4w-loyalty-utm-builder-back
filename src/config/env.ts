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
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15d",
  isProduction: process.env.NODE_ENV === "production",

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
