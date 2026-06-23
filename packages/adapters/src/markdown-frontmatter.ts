import { parse, stringify } from "yaml";

export interface MarkdownDocument<TFrontmatter> {
  readonly frontmatter: TFrontmatter;
  readonly body: string;
}

export type ValidationSchema<TValue> = {
  safeParse(value: unknown):
    | { readonly success: true; readonly data: TValue }
    | { readonly success: false; readonly error: unknown };
};

export class MarkdownFrontmatterError extends Error {
  readonly code = "invalid_frontmatter";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "MarkdownFrontmatterError";
    this.cause = cause;
  }
}

export function parseMarkdownFrontmatter<TFrontmatter>(
  content: string,
  schema: ValidationSchema<TFrontmatter>,
): MarkdownDocument<TFrontmatter> {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/u.exec(content);

  if (!match) {
    throw new MarkdownFrontmatterError("Markdown frontmatter block is missing or malformed.");
  }

  let rawFrontmatter: unknown;
  try {
    rawFrontmatter = parse(match[1]) as unknown;
  } catch (error) {
    throw new MarkdownFrontmatterError("Markdown frontmatter YAML failed parsing.", error);
  }

  const result = schema.safeParse(rawFrontmatter);

  if (!result.success) {
    throw new MarkdownFrontmatterError("Markdown frontmatter failed validation.", result.error);
  }

  return {
    frontmatter: result.data,
    body: match[2],
  };
}

export function stringifyMarkdownFrontmatter<TFrontmatter>(
  document: MarkdownDocument<TFrontmatter>,
): string {
  const yaml = stringify(document.frontmatter).trimEnd();
  const body = document.body.startsWith("\n") ? document.body.slice(1) : document.body;
  return `---\n${yaml}\n---\n${body}`;
}

export function buildMarkdownFileName(input: {
  readonly id: string;
  readonly title: string;
}): string {
  return `${slugify(input.title)}.md`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);

  return slug.length > 0 ? slug : "untitled";
}
