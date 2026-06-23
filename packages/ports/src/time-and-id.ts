import type { IdPrefix } from "../../core/src/index.js";

export interface IdGenerator {
  generate(prefix: IdPrefix): string;
}

export interface Clock {
  now(): Date;
}
