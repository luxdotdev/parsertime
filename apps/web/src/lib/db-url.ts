/** Drops libpq's "use the OS trust store" sentinel from a connection
 * string; pg would readFileSync a file literally named "system". Node's
 * default CA verification is the equivalent, so the param can simply go
 * away (real file paths stay). */
export function sanitizeDatabaseUrl(
  raw: string | undefined
): string | undefined {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (url.searchParams.get("sslrootcert") === "system") {
      url.searchParams.delete("sslrootcert");
    }
    return url.toString();
  } catch {
    return raw;
  }
}
