import { z } from "zod";

import { NonEmptyStringSchema } from "./common.schema.js";

export const LintSeveritySchema = z.enum(["high", "medium", "low"]);

export const LintIssueSchema = z.object({
  severity: LintSeveritySchema,
  code: NonEmptyStringSchema,
  message: NonEmptyStringSchema,
  target: NonEmptyStringSchema,
  suggested_action: NonEmptyStringSchema.optional(),
});

export const LintReportSchema = z.object({
  issues: z.array(LintIssueSchema),
});

export type LintSeverity = z.infer<typeof LintSeveritySchema>;
export type LintIssue = z.infer<typeof LintIssueSchema>;
export type LintReport = z.infer<typeof LintReportSchema>;
