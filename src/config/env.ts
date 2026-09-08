import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno ${name}. Revisá tu archivo .env (mirá .env.example).`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:4200",

  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",

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
