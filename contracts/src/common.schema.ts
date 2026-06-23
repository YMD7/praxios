import { z } from "zod";

export const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const SensitivitySchema = z.enum(["public", "internal", "confidential", "restricted"]);

export const NonEmptyStringSchema = z.string().trim().min(1);

export const OptionalStringArraySchema = z.array(z.string()).default([]);
