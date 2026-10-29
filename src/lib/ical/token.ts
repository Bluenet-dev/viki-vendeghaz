import { randomBytes, timingSafeEqual } from "node:crypto";

// 32 véletlen bájt → 43 karakteres, URL-biztos token.
export function generateExportToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokensEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
