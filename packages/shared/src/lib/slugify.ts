export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug) return slug;

  // Fallback to a short hash for inputs that contain no usable characters
  const hash = Array.from(new TextEncoder().encode(input))
    .reduce((acc, byte) => acc + byte, 0)
    .toString(16)
    .slice(0, 8);
  return `page-${hash}`;
}
