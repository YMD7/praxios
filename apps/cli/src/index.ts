import type { ApplicationError } from "../../../packages/application/src/index.js";

export function formatCliError(error: Pick<ApplicationError, "code" | "message">): string {
  return `${error.code}: ${error.message}`;
}
