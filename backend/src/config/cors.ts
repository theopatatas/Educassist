// src/config/cors.ts
import type { CorsOptions } from "cors";
import { env } from "./env";

export const corsOptions: CorsOptions = {
  origin: env.CORS_ORIGIN,
  credentials: true,
};
