/** drizzle-kit が生成したマイグレーションを適用する。 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "./client";
import { DB_PATH, MIGRATIONS_DIR } from "./paths";

const db = createDb();
migrate(db, { migrationsFolder: MIGRATIONS_DIR });
console.log(`[db] migrations applied -> ${DB_PATH}`);
