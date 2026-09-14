import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

export const CONFIG = {
  // Personal Bot Config (ZCA-JS)
  PERSONAL: {
    CRED_PATH: process.env.ZALO_CRED_PATH || path.resolve("./credentials.json"),
    DEFAULT_PREFIX: "!",
  },

  // Zalo Official Account (OA) Config
  OA: {
    APP_ID: process.env.ZALO_OA_APP_ID || "",
    APP_SECRET: process.env.ZALO_OA_APP_SECRET || "",
    ACCESS_TOKEN: process.env.ZALO_OA_ACCESS_TOKEN || "",
    REFRESH_TOKEN: process.env.ZALO_OA_REFRESH_TOKEN || "",
    BASE_URL: "https://openapi.zalo.me/v3.0/oa",
  }
};
