import { createRuntimeConfig } from "../config.js";
import { openDatabase } from "./client.js";

const config = createRuntimeConfig();
const { sqlite } = openDatabase(config);

sqlite.close();

console.log(`Initialized Praxios SQLite database at ${config.dbPath}`);
