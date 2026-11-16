import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { checkDbConnection } from "./config/db";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { categoriesRouter, valuesRouter } from "./routes/categories.routes";
import { generatorRouter } from "./routes/generator.routes";
import { metaRouter } from "./routes/meta.routes";

const app = express();

// Detrás de Apache (proxy en localhost): así req.ip es la IP real del cliente (X-Forwarded-For) y no se puede falsificar.
app.set("trust proxy", "loopback");
app.disable("x-powered-by");

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await checkDbConnection();
    return res.json({ ok: true, db: "up" });
  } catch (err: any) {
    return res.status(503).json({ ok: false, db: "down", error: err?.message });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/values", valuesRouter);
app.use("/api", generatorRouter); // /api/settings, /api/generate
app.use("/api/meta", metaRouter);

// Manejador de errores centralizado
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

const onListening = () => {
  console.log(`UTM Builder API escuchando en http://${env.host ?? "localhost"}:${env.port}`);
};
if (env.host) app.listen(env.port, env.host, onListening);
else app.listen(env.port, onListening);
