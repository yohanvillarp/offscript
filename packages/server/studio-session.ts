import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createStudioSession() {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  let entry: Readonly<{ digest: Buffer; expiresAt: number }> | undefined;
  let session: Buffer | undefined;
  return Object.freeze({
    issueEntry() {
      const token = randomBytes(32).toString("base64url");
      entry = { digest: digest(token), expiresAt: Date.now() + 300_000 };
      return token;
    },
    exchange(value: unknown) {
      if (typeof value !== "string" || value.length !== 43 || !entry || entry.expiresAt <= Date.now() || !timingSafeEqual(entry.digest, digest(value))) return undefined;
      entry = undefined;
      const token = randomBytes(32).toString("base64url");
      session = digest(token);
      return token;
    },
    accepts(cookie: string | undefined) {
      if (!cookie || !session) return false;
      const values = cookie.split(";").map(value => value.trim()).filter(value => value.startsWith("offscript_session="));
      const token = values[0]?.slice("offscript_session=".length);
      return values.length === 1 && token?.length === 43 && timingSafeEqual(session, digest(token));
    },
  });
}
export type StudioSession = ReturnType<typeof createStudioSession>;
