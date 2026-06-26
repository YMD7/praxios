import { createDb, createRepositories } from "@praxios/db";

/** プロセス内で 1 度だけ DB を開き、リポジトリ束を共有する。 */
export const db = createDb();
export const repositories = createRepositories(db);
