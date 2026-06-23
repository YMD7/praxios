import { z } from "zod";

import {
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  SensitivitySchema,
} from "./common.schema.js";
import { SourceIdSchema } from "./ids.schema.js";

export const SourceStatusSchema = z.enum(["captured", "processed", "archived"]);

export const SourceFrontmatterSchema = z.object({
  id: SourceIdSchema,
  type: z.literal("source"),
  title: NonEmptyStringSchema,
  status: SourceStatusSchema,
  created: IsoDateTimeSchema,
  updated: IsoDateTimeSchema,
  origin: NonEmptyStringSchema,
  observed_at: IsoDateTimeSchema,
  content_hash: NonEmptyStringSchema,
  sensitivity: SensitivitySchema,
});

export type SourceStatus = z.infer<typeof SourceStatusSchema>;
export type SourceFrontmatter = z.infer<typeof SourceFrontmatterSchema>;
