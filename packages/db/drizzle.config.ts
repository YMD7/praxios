import { defineConfig } from "drizzle-kit";
import { DB_PATH } from "./src/paths";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: DB_PATH },
});
