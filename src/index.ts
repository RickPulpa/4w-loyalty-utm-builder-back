import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { checkDbConnection } from "./config/db";
import { authRouter } from "./routes/auth.routes";
import { categoriesRouter, valuesRouter } from "./routes/categories.routes";
import { generatorRouter } from "./routes/generator.routes";
import { metaRouter } from "./routes/meta.routes";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await checkDbConnection();
    return res.json({ ok: true, db: "up" });
  } catch (err: any) {
    return res.status(503).json({ ok: false, db: "down", error: err?.message });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/values", valuesRouter);
app.use("/api", generatorRouter); // /api/settings, /api/generate
app.use("/api/meta", metaRouter);

// Manejador de errores centralizado
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

app.listen(env.port, () => {
  console.log(`UTM Builder API escuchando en http://localhost:${env.port}`);
});
