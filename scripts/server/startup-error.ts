/** Report actionable categories without exposing credentials or exception contents. */
export function startupError(error: unknown): string {
  const seen = new Set<unknown>();
  let current = error;
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    const code = "code" in current ? current.code : undefined;
    if (code === "EADDRINUSE") return "Port is already in use. Choose --port 0 or another port.";
    if (code === "EACCES" || code === "EPERM") return "Access denied. Check project/storage permissions and the selected port.";
    if (code === "ENOENT" || code === "ENOTDIR") return "Project, storage, or distribution path is unavailable. Check the selected directories.";
    current = current.cause;
  }
  return "Host could not start. Check project, port, storage, and installed distribution compatibility.";
}
