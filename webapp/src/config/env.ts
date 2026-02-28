import { z } from "zod";

const envSchema = z.object({
  MISTRAL_API_KEY: z.string().optional(),
  POLYMARKET_WS_URL: z
    .string()
    .url()
    .default("wss://clob.polymarket.com/v1/ws"),
});

export const env = envSchema.parse({
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  POLYMARKET_WS_URL: process.env.POLYMARKET_WS_URL,
});
